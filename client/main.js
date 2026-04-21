import {
  FIRE_COOLDOWN_MS,
  MAX_INPUT_DT_MS
} from "../shared/constants.js";
import { applyInputMovement, normalizeVector } from "../shared/utils.js";
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

const canvas = document.getElementById("game");
const nickname = getInitialNickname();

const renderer = createRenderer(canvas);
const gameState = {
  connected: false,
  localPlayer: null,
  localPlayerId: null,
  remotePlayers: new Map(),
  bullets: new Map(),
  nextInputSeq: 1,
  lastInputSignature: "0000",
  lastShotAt: -FIRE_COOLDOWN_MS
};

const network = createNetwork({
  nickname,
  onInit: handleInit,
  onSnapshot: handleSnapshot,
  onConnectionChange: (connected) => {
    gameState.connected = connected;
  }
});

const input = createInputController(canvas, handleShoot);

renderer.resize();
window.addEventListener("resize", () => renderer.resize());

let lastFrameAt = performance.now();
requestAnimationFrame(frame);

function frame(now) {
  const deltaMs = Math.min(now - lastFrameAt, MAX_INPUT_DT_MS);
  lastFrameAt = now;

  sendMovementInput(deltaMs);
  renderer.render(gameState, now);

  requestAnimationFrame(frame);
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

  applyLocalPrediction(packet);
}

function applyLocalPrediction(packet) {
  if (!gameState.localPlayer) {
    return;
  }

  recordPendingInput(gameState.localPlayer, packet);
  applyInputMovement(gameState.localPlayer, packet, packet.dt / 1000);
}

function handleInit(payload) {
  if (!payload?.snapshot?.you) {
    return;
  }

  gameState.localPlayerId = payload.id;
  gameState.localPlayer = createLocalPlayer(payload.snapshot.you);
  gameState.remotePlayers.clear();
  gameState.bullets.clear();
  gameState.nextInputSeq = payload.snapshot.you.lastProcessedInputSeq + 1;
  gameState.lastInputSignature = "0000";
  gameState.lastShotAt = -FIRE_COOLDOWN_MS;

  applySnapshot(payload.snapshot);
}

function handleSnapshot(snapshot) {
  if (!snapshot || !gameState.localPlayer) {
    return;
  }

  applySnapshot(snapshot);
}

function applySnapshot(snapshot) {
  const receivedAt = performance.now();

  reconcileLocalPlayer(gameState.localPlayer, snapshot.you);

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

  for (const remoteId of gameState.remotePlayers.keys()) {
    if (!seenRemoteIds.has(remoteId)) {
      gameState.remotePlayers.delete(remoteId);
    }
  }

  const serverBullets = new Map();
  for (const bullet of snapshot.bullets) {
    serverBullets.set(bullet.id, {
      ...bullet,
      receivedAt
    });
  }

  gameState.bullets = serverBullets;
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

  network.sendShoot({
    targetX: target.x,
    targetY: target.y
  });
}

function getInitialNickname() {
  const fallback = `Player-${Math.floor(Math.random() * 9000 + 1000)}`;
  const promptValue = window.prompt("Nickname", fallback);
  const nickname = (promptValue ?? fallback).trim();
  return nickname || fallback;
}
