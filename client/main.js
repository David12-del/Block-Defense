import {
  CLIENT_PING_INTERVAL_MS,
  CLIENT_PREDICTED_BULLET_TTL_MS,
  BULLET_RADIUS,
  BULLET_SPEED,
  FIRE_COOLDOWN_MS,
  MAX_INPUT_DT_MS,
  PLAYER_MAX_HP,
  PLAYER_SIZE
} from "../shared/constants.js";
import {
  applyInputMovement,
  normalizeVector,
  sanitizeNickname,
  segmentIntersectsCircle
} from "../shared/utils.js";
import { createInputController, getInputSignature, getMovementInput, hasMovement } from "./input.js";
import { createNetwork } from "./network.js";
import {
  createLocalPlayer,
  createRemotePlayer,
  pushRemoteSnapshot,
  reconcileLocalPlayer,
  recordPendingInput
} from "./player.js";
import { createRenderer } from "./render.js";

const elements = getElements();
const renderer = createRenderer(elements.gameCanvas, elements.minimapCanvas);

const gameState = {
  connected: false,
  joining: false,
  joined: false,
  nickname: elements.nicknameInput.value,
  localPlayer: null,
  localPlayerId: null,
  remotePlayers: new Map(),
  obstacles: [],
  bullets: new Map(),
  predictedBullets: new Map(),
  nextInputSeq: 1,
  nextShotId: 1,
  lastInputSignature: "0000",
  lastShotAt: -FIRE_COOLDOWN_MS,
  pingMs: 0,
  fps: 0,
  devVisible: false
};

const network = createNetwork({
  onInit: handleInit,
  onSnapshot: handleSnapshot,
  onConnectionChange: handleConnectionChange,
  onPong: handlePong
});

const input = createInputController(elements.gameCanvas, handleShoot);

bindUiEvents();
renderer.resize();
updateUi(performance.now());

window.setInterval(() => {
  if (gameState.connected) {
    network.requestPing(performance.now());
  }
}, CLIENT_PING_INTERVAL_MS);

let lastFrameAt = performance.now();
requestAnimationFrame(frame);

function frame(now) {
  const deltaMs = Math.min(now - lastFrameAt, MAX_INPUT_DT_MS);
  lastFrameAt = now;

  gameState.fps = gameState.fps === 0
    ? 1000 / Math.max(deltaMs, 1)
    : gameState.fps * 0.9 + (1000 / Math.max(deltaMs, 1)) * 0.1;

  sendMovementInput(deltaMs);
  updatePredictedBullets(deltaMs / 1000, now);
  renderer.render(gameState, now);
  updateUi(now);

  requestAnimationFrame(frame);
}

function bindUiEvents() {
  elements.joinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nickname = sanitizeNickname(elements.nicknameInput.value);
    elements.nicknameInput.value = nickname;
    elements.menuStatus.textContent = "Connecting to match...";
    elements.joinButton.disabled = true;

    gameState.joining = true;
    gameState.nickname = nickname;
    localStorage.setItem("block-defense:nickname", nickname);

    network.join(nickname);
    updateUi(performance.now());
  });

  window.addEventListener("resize", () => renderer.resize());
  window.addEventListener("keydown", (event) => {
    if (event.code !== "NumLock" || event.repeat) {
      return;
    }

    gameState.devVisible = !gameState.devVisible;
    elements.devPanel.classList.toggle("is-hidden", !gameState.devVisible);
  });
}

function handleConnectionChange(connected) {
  gameState.connected = connected;

  if (!connected) {
    elements.joinButton.disabled = false;

    if (!gameState.joined) {
      elements.menuStatus.textContent = gameState.joining
        ? "Waiting for server..."
        : "Enter nickname to join.";
    }
  } else if (!gameState.joined && gameState.joining) {
    elements.menuStatus.textContent = "Authorizing player...";
  }
}

function handleInit(payload) {
  if (!payload?.snapshot?.you) {
    return;
  }

  gameState.joined = true;
  gameState.joining = false;
  gameState.localPlayerId = payload.id;
  gameState.localPlayer = createLocalPlayer(payload.snapshot.you);
  gameState.remotePlayers.clear();
  gameState.bullets.clear();
  gameState.predictedBullets.clear();
  gameState.obstacles = payload.snapshot.world?.obstacles ?? [];
  gameState.nextInputSeq = payload.snapshot.you.lastProcessedInputSeq + 1;
  gameState.nextShotId = 1;
  gameState.lastInputSignature = "0000";
  gameState.lastShotAt = -FIRE_COOLDOWN_MS;
  gameState.nickname = payload.nick;

  applySnapshot(payload.snapshot);

  elements.menuOverlay.classList.add("is-hidden");
  elements.joinButton.disabled = false;
  elements.menuStatus.textContent = "Enter nickname to join.";
}

function handleSnapshot(snapshot) {
  if (!snapshot || !gameState.localPlayer) {
    return;
  }

  applySnapshot(snapshot);
}

function applySnapshot(snapshot) {
  const receivedAt = performance.now();

  reconcileLocalPlayer(gameState.localPlayer, snapshot.you, gameState.obstacles);

  const seenRemoteIds = new Set();
  for (const player of snapshot.players) {
    if (player.id === gameState.localPlayerId) {
      continue;
    }

    seenRemoteIds.add(player.id);

    const existing = gameState.remotePlayers.get(player.id);
    if (!existing) {
      gameState.remotePlayers.set(player.id, createRemotePlayer(player, receivedAt));
      continue;
    }

    pushRemoteSnapshot(existing, player, receivedAt);
  }

  for (const remoteId of [...gameState.remotePlayers.keys()]) {
    if (!seenRemoteIds.has(remoteId)) {
      gameState.remotePlayers.delete(remoteId);
    }
  }

  const serverBullets = new Map();
  for (const bullet of snapshot.bullets) {
    if (bullet.ownerId === gameState.localPlayerId && Number.isInteger(bullet.clientShotId)) {
      gameState.predictedBullets.delete(bullet.clientShotId);
    }

    serverBullets.set(bullet.id, {
      ...bullet,
      receivedAt
    });
  }

  gameState.bullets = serverBullets;
}

function sendMovementInput(deltaMs) {
  if (!gameState.connected || !gameState.localPlayer) {
    return;
  }

  const movement = getMovementInput(input);
  const signature = getInputSignature(movement);
  const moving = hasMovement(movement);

  if (!gameState.localPlayer.alive) {
    gameState.lastInputSignature = signature;
    return;
  }

  if (!moving && signature === gameState.lastInputSignature) {
    return;
  }

  const packet = {
    seq: gameState.nextInputSeq++,
    dt: Math.round(deltaMs),
    ...movement
  };

  gameState.lastInputSignature = signature;
  network.sendInput(packet);

  recordPendingInput(gameState.localPlayer, packet);
  applyInputMovement(gameState.localPlayer, packet, packet.dt / 1000, gameState.obstacles);
}

function handleShoot({ screenX, screenY }) {
  if (!gameState.localPlayer || !gameState.localPlayer.alive || !gameState.connected) {
    return;
  }

  const now = performance.now();
  if (now - gameState.lastShotAt < FIRE_COOLDOWN_MS) {
    return;
  }

  const target = renderer.screenToWorld(screenX, screenY);
  const direction = normalizeVector(target.x - gameState.localPlayer.x, target.y - gameState.localPlayer.y);
  if (direction.x === 0 && direction.y === 0) {
    return;
  }

  gameState.lastShotAt = now;
  const clientShotId = gameState.nextShotId++;
  const spawnDistance = PLAYER_SIZE / 2 + BULLET_RADIUS + 2;

  gameState.predictedBullets.set(clientShotId, {
    id: clientShotId,
    x: gameState.localPlayer.x + direction.x * spawnDistance,
    y: gameState.localPlayer.y + direction.y * spawnDistance,
    vx: direction.x * BULLET_SPEED,
    vy: direction.y * BULLET_SPEED,
    expiresAt: now + CLIENT_PREDICTED_BULLET_TTL_MS
  });

  network.sendShoot({
    clientShotId,
    originX: gameState.localPlayer.x,
    originY: gameState.localPlayer.y,
    targetX: target.x,
    targetY: target.y
  });
}

function handlePong({ clientTime } = {}) {
  if (!Number.isFinite(clientTime)) {
    return;
  }

  gameState.pingMs = Math.max(0, Math.round(performance.now() - clientTime));
}

function updatePredictedBullets(deltaSeconds, now) {
  for (const [shotId, bullet] of gameState.predictedBullets.entries()) {
    const previousX = bullet.x;
    const previousY = bullet.y;
    bullet.x += bullet.vx * deltaSeconds;
    bullet.y += bullet.vy * deltaSeconds;

    let blocked = false;
    for (const obstacle of gameState.obstacles) {
      if (
        segmentIntersectsCircle(
          previousX,
          previousY,
          bullet.x,
          bullet.y,
          obstacle.x,
          obstacle.y,
          obstacle.radius + BULLET_RADIUS
        )
      ) {
        blocked = true;
        break;
      }
    }

    if (blocked || now >= bullet.expiresAt) {
      gameState.predictedBullets.delete(shotId);
    }
  }
}

function updateUi(now) {
  const localPlayer = gameState.localPlayer;
  const hp = localPlayer?.hp ?? 0;
  const playersOnline = gameState.remotePlayers.size + (localPlayer ? 1 : 0);
  const cooldownLeft = Math.max(0, Math.ceil(gameState.lastShotAt + FIRE_COOLDOWN_MS - now));
  const hpRatio = Math.max(0, Math.min(1, hp / PLAYER_MAX_HP));

  elements.hudNick.textContent = localPlayer?.nick ?? gameState.nickname ?? "Offline";
  elements.hudHp.textContent = `${hp} / ${PLAYER_MAX_HP}`;
  elements.hudHpFill.style.width = `${hpRatio * 100}%`;
  elements.hudPlayers.textContent = String(playersOnline);
  elements.hudSocket.textContent = gameState.connected ? "ONLINE" : "OFFLINE";
  elements.hudWeapon.textContent = cooldownLeft > 0 ? `${cooldownLeft} ms` : "READY";
  elements.hudWeaponFill.style.width = `${(1 - cooldownLeft / FIRE_COOLDOWN_MS) * 100}%`;
  elements.hudInlineNick.textContent = localPlayer?.nick ?? "Observer";
  elements.hudInlineHp.textContent = `${hp}`;
  elements.hudInlineMax.textContent = `${PLAYER_MAX_HP}`;
  elements.hudCoords.textContent = localPlayer
    ? `X ${Math.round(localPlayer.x)}  Y ${Math.round(localPlayer.y)}`
    : "X 0  Y 0";
  elements.hudRespawn.textContent = localPlayer && !localPlayer.alive
    ? `Respawn in ${Math.max(0, Math.ceil((localPlayer.respawnAt - Date.now()) / 1000))}s`
    : "Alive";

  elements.debugFps.textContent = `${Math.round(gameState.fps)}`;
  elements.debugPing.textContent = `${gameState.pingMs}`;
  elements.debugPlayers.textContent = `${playersOnline}`;
  elements.debugBullets.textContent = `${gameState.bullets.size}`;
  elements.debugPos.textContent = localPlayer
    ? `${Math.round(localPlayer.x)}, ${Math.round(localPlayer.y)}`
    : "0, 0";
  elements.debugPending.textContent = `${localPlayer?.pendingInputs.length ?? 0}`;
  elements.debugState.textContent = gameState.connected ? "connected" : "offline";
}

function getElements() {
  const storedNickname = localStorage.getItem("block-defense:nickname") || "";

  return {
    gameCanvas: document.getElementById("game"),
    minimapCanvas: document.getElementById("minimap"),
    menuOverlay: document.getElementById("menu-overlay"),
    joinForm: document.getElementById("join-form"),
    nicknameInput: Object.assign(document.getElementById("nickname"), {
      value: storedNickname
    }),
    joinButton: document.getElementById("join-button"),
    menuStatus: document.getElementById("menu-status"),
    hudNick: document.getElementById("hud-nick"),
    hudHp: document.getElementById("hud-hp"),
    hudHpFill: document.getElementById("hud-hp-fill"),
    hudPlayers: document.getElementById("hud-players"),
    hudSocket: document.getElementById("hud-socket"),
    hudWeapon: document.getElementById("hud-weapon"),
    hudWeaponFill: document.getElementById("hud-weapon-fill"),
    hudRespawn: document.getElementById("hud-respawn"),
    hudCoords: document.getElementById("hud-coords"),
    hudInlineNick: document.getElementById("hud-inline-nick"),
    hudInlineHp: document.getElementById("hud-inline-hp"),
    hudInlineMax: document.getElementById("hud-inline-max"),
    devPanel: document.getElementById("dev-panel"),
    debugFps: document.getElementById("debug-fps"),
    debugPing: document.getElementById("debug-ping"),
    debugPlayers: document.getElementById("debug-players"),
    debugBullets: document.getElementById("debug-bullets"),
    debugPos: document.getElementById("debug-pos"),
    debugPending: document.getElementById("debug-pending"),
    debugState: document.getElementById("debug-state")
  };
}
