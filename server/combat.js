import {
  BULLET_DAMAGE,
  BULLET_LIFETIME_MS,
  BULLET_RADIUS,
  BULLET_SPEED,
  FIRE_COOLDOWN_MS,
  MAX_ACTIVE_BULLETS,
  PLAYER_SIZE
} from "../shared/constants.js";
import {
  isFiniteVector,
  normalizeVector,
  round2,
  segmentIntersectsBox
} from "../shared/utils.js";
import { killPlayer } from "./players.js";

export function trySpawnBullet(state, player, payload, now) {
  if (
    !player ||
    !player.alive ||
    now - player.lastShotAt < FIRE_COOLDOWN_MS ||
    state.bullets.size >= MAX_ACTIVE_BULLETS
  ) {
    return null;
  }

  const targetX = Number(payload?.targetX);
  const targetY = Number(payload?.targetY);
  if (!isFiniteVector(targetX, targetY)) {
    return null;
  }

  const clientOriginX = Number(payload?.originX);
  const clientOriginY = Number(payload?.originY);
  let originX = player.x;
  let originY = player.y;

  if (isFiniteVector(clientOriginX, clientOriginY)) {
    const dx = clientOriginX - player.x;
    const dy = clientOriginY - player.y;
    const distance = Math.hypot(dx, dy);
    const maxOriginDrift = PLAYER_SIZE + 140;

    if (distance <= maxOriginDrift) {
      originX = clientOriginX;
      originY = clientOriginY;
    } else if (distance > 0) {
      originX = player.x + (dx / distance) * maxOriginDrift;
      originY = player.y + (dy / distance) * maxOriginDrift;
    }
  }

  const direction = normalizeVector(targetX - originX, targetY - originY);
  if (direction.x === 0 && direction.y === 0) {
    return null;
  }

  player.lastShotAt = now;

  const bullet = {
    id: state.nextBulletId++,
    ownerId: player.id,
    x: originX + direction.x * (PLAYER_SIZE / 2 + BULLET_RADIUS + 2),
    y: originY + direction.y * (PLAYER_SIZE / 2 + BULLET_RADIUS + 2),
    vx: direction.x * BULLET_SPEED,
    vy: direction.y * BULLET_SPEED,
    bornAt: now
  };

  state.bullets.set(bullet.id, bullet);
  return bullet;
}

export function updateBullets(state, now, deltaSeconds) {
  for (const bullet of state.bullets.values()) {
    if (now - bullet.bornAt > BULLET_LIFETIME_MS) {
      state.bullets.delete(bullet.id);
      continue;
    }

    const previousX = bullet.x;
    const previousY = bullet.y;

    bullet.x += bullet.vx * deltaSeconds;
    bullet.y += bullet.vy * deltaSeconds;

    let hitPlayer = null;

    for (const player of state.players.values()) {
      if (!player.alive || player.id === bullet.ownerId) {
        continue;
      }

      const half = PLAYER_SIZE / 2;
      const hit = segmentIntersectsBox(
        previousX,
        previousY,
        bullet.x,
        bullet.y,
        player.x - half - BULLET_RADIUS,
        player.y - half - BULLET_RADIUS,
        player.x + half + BULLET_RADIUS,
        player.y + half + BULLET_RADIUS
      );

      if (!hit) {
        continue;
      }

      hitPlayer = player;
      break;
    }

    if (!hitPlayer) {
      continue;
    }

    hitPlayer.hp = Math.max(0, hitPlayer.hp - BULLET_DAMAGE);
    state.bullets.delete(bullet.id);

    if (hitPlayer.hp === 0) {
      killPlayer(hitPlayer, now);
    }
  }
}

export function serializeBullet(bullet) {
  return {
    id: bullet.id,
    x: round2(bullet.x),
    y: round2(bullet.y),
    vx: round2(bullet.vx),
    vy: round2(bullet.vy)
  };
}
