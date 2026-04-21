import {
  PLAYER_COLLISION_RADIUS,
  PLAYER_MAX_HP,
  PLAYER_RESPAWN_DELAY_MS
} from "../shared/constants.js";
import {
  applyInputMovement,
  clampInputDelta,
  getFreeSpawnPoint,
  round2,
  sanitizeNickname
} from "../shared/utils.js";

export function createPlayer(id, nickname, obstacles) {
  const spawn = getFreeSpawnPoint(obstacles, PLAYER_COLLISION_RADIUS);

  return {
    id,
    nick: sanitizeNickname(nickname),
    x: spawn.x,
    y: spawn.y,
    hp: PLAYER_MAX_HP,
    alive: true,
    respawnAt: 0,
    lastProcessedInputSeq: 0,
    inputQueue: [],
    lastShotAt: 0
  };
}

export function addPlayer(players, id, nickname, obstacles) {
  const player = createPlayer(id, nickname, obstacles);
  players.set(id, player);
  return player;
}

export function removePlayer(players, id) {
  players.delete(id);
}

export function queuePlayerInput(player, payload) {
  if (!player || !payload || !Number.isInteger(payload.seq)) {
    return;
  }

  const lastQueued = player.inputQueue[player.inputQueue.length - 1];
  if (payload.seq <= player.lastProcessedInputSeq || (lastQueued && payload.seq <= lastQueued.seq)) {
    return;
  }

  player.inputQueue.push({
    seq: payload.seq,
    dt: clampInputDelta(payload.dt),
    up: Boolean(payload.up),
    down: Boolean(payload.down),
    left: Boolean(payload.left),
    right: Boolean(payload.right)
  });

  if (player.inputQueue.length > 120) {
    player.inputQueue.shift();
  }
}

export function processPlayerInputs(player, obstacles) {
  while (player.inputQueue.length > 0) {
    const input = player.inputQueue.shift();

    if (input.seq <= player.lastProcessedInputSeq) {
      continue;
    }

    player.lastProcessedInputSeq = input.seq;

    if (!player.alive) {
      continue;
    }

    applyInputMovement(player, input, input.dt / 1000, obstacles);
  }
}

export function killPlayer(player, now) {
  player.alive = false;
  player.hp = 0;
  player.respawnAt = now + PLAYER_RESPAWN_DELAY_MS;
  player.inputQueue.length = 0;
}

export function respawnPlayers(players, now, obstacles) {
  for (const player of players.values()) {
    if (player.alive || player.respawnAt === 0 || player.respawnAt > now) {
      continue;
    }

    const spawn = getFreeSpawnPoint(obstacles, PLAYER_COLLISION_RADIUS);
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = PLAYER_MAX_HP;
    player.alive = true;
    player.respawnAt = 0;
  }
}

export function serializePlayer(player) {
  return {
    id: player.id,
    nick: player.nick,
    x: round2(player.x),
    y: round2(player.y),
    hp: player.hp,
    alive: player.alive
  };
}

export function serializeOwnPlayer(player) {
  return {
    ...serializePlayer(player),
    lastProcessedInputSeq: player.lastProcessedInputSeq,
    respawnAt: player.respawnAt
  };
}
