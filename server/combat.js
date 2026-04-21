import {
  BULLET_DAMAGE,
  BULLET_LIFETIME_MS,
  BULLET_RADIUS,
  BULLET_SPEED,
  FIRE_COOLDOWN_MS,
  MAX_ACTIVE_BULLETS,
  PLAYER_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
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

  const direction = normalizeVector(targetX - player.x, targetY - player.y);
  if (direction.x === 0 && direction.y === 0) {
    return null;
  }

  player.lastShotAt = now;

  const bullet = {
    id: state.nextBulletId++,
    ownerId: player.id,
    x: player.x,
    y: player.y,
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

    if (bullet.x < 0 || bullet.x > WORLD_WIDTH || bullet.y < 0 || bullet.y > WORLD_HEIGHT) {
      state.bullets.delete(bullet.id);
      continue;
    }

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
