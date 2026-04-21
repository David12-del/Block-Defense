import { PLAYER_MAX_HP, PLAYER_RESPAWN_DELAY_MS } from "../shared/constants.js";
import {
  applyInputMovement,
  clampInputDelta,
  getRandomSpawnPoint,
  round2,
  sanitizeNickname
} from "../shared/utils.js";

export function createPlayer(id, nickname) {
  const spawn = getRandomSpawnPoint();

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

export function addPlayer(players, id, nickname) {
  const player = createPlayer(id, nickname);
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

export function processPlayerInputs(player) {
  while (player.inputQueue.length > 0) {
    const input = player.inputQueue.shift();

    if (input.seq <= player.lastProcessedInputSeq) {
      continue;
    }

    player.lastProcessedInputSeq = input.seq;

    if (!player.alive) {
      continue;
    }

    applyInputMovement(player, input, input.dt / 1000);
  }
}

export function killPlayer(player, now) {
  player.alive = false;
  player.hp = 0;
  player.respawnAt = now + PLAYER_RESPAWN_DELAY_MS;
  player.inputQueue.length = 0;
}

export function respawnPlayers(players, now) {
  for (const player of players.values()) {
    if (player.alive || player.respawnAt === 0 || player.respawnAt > now) {
      continue;
    }

    const spawn = getRandomSpawnPoint();
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
