import { SERVER_TICK_MS } from "../shared/constants.js";
import { trySpawnBullet, updateBullets, serializeBullet } from "./combat.js";
import {
  addPlayer,
  processPlayerInputs,
  queuePlayerInput,
  removePlayer,
  respawnPlayers,
  serializeOwnPlayer,
  serializePlayer
} from "./players.js";
import { createWorldObstacles, serializeObstacle } from "./world.js";

export function createGameState() {
  return {
    players: new Map(),
    obstacles: createWorldObstacles(),
    bullets: new Map(),
    nextBulletId: 1
  };
}

export function addPlayerToGame(state, id, nickname) {
  return addPlayer(state.players, id, nickname, state.obstacles);
}

export function removePlayerFromGame(state, id) {
  removePlayer(state.players, id);

  for (const bullet of state.bullets.values()) {
    if (bullet.ownerId === id) {
      state.bullets.delete(bullet.id);
    }
  }
}

export function handlePlayerInput(state, id, payload) {
  const player = state.players.get(id);
  queuePlayerInput(player, payload);
}

export function handlePlayerShoot(state, id, payload, now = Date.now()) {
  const player = state.players.get(id);
  if (!player) {
    return null;
  }

  // Pull the latest queued movement before the shot so bullets start from the
  // freshest authoritative position instead of an older tick position.
  processPlayerInputs(player, state.obstacles);
  return trySpawnBullet(state, player, payload, now);
}

export function createSnapshotForPlayer(state, playerId, serverTime = Date.now()) {
  const player = state.players.get(playerId);
  if (!player) {
    return null;
  }

  return {
    serverTime,
    world: {
      obstacles: state.obstacles.map(serializeObstacle)
    },
    players: [...state.players.values()].map(serializePlayer),
    bullets: [...state.bullets.values()].map(serializeBullet),
    you: serializeOwnPlayer(player)
  };
}

export function startGameLoop(io, state) {
  let lastTickAt = Date.now();

  return setInterval(() => {
    const now = Date.now();
    const deltaSeconds = Math.min((now - lastTickAt) / 1000, 0.1);
    lastTickAt = now;

    for (const player of state.players.values()) {
      processPlayerInputs(player, state.obstacles);
    }

    updateBullets(state, now, deltaSeconds);
    respawnPlayers(state.players, now, state.obstacles);

    const playersPayload = [...state.players.values()].map(serializePlayer);
    const bulletsPayload = [...state.bullets.values()].map(serializeBullet);

    for (const player of state.players.values()) {
      const socket = io.sockets.sockets.get(player.id);
      if (!socket) {
        continue;
      }

      socket.volatile.emit("snapshot", {
        serverTime: now,
        players: playersPayload,
        bullets: bulletsPayload,
        you: serializeOwnPlayer(player)
      });
    }
  }, SERVER_TICK_MS);
}
