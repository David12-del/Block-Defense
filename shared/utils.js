import {
  MAX_INPUT_DT_MS,
  PLAYER_COLLISION_RADIUS,
  PLAYER_SPEED,
  SPAWN_RADIUS
} from "./constants.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

export function round2(value) {
  return Math.round(value * 100) / 100;
}

export function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function normalizeVector(x, y) {
  const length = Math.hypot(x, y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length
  };
}

export function sanitizeNickname(value) {
  const trimmed = String(value ?? "").replace(/\s+/g, " ").trim();
  const safe = trimmed.slice(0, 16);
  return safe || `Player-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function getRandomSpawnPoint() {
  return {
    x: randomInRange(-SPAWN_RADIUS, SPAWN_RADIUS),
    y: randomInRange(-SPAWN_RADIUS, SPAWN_RADIUS)
  };
}

export function applyInputMovement(entity, input, deltaSeconds, obstacles = []) {
  const horizontal = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const vertical = Number(Boolean(input.down)) - Number(Boolean(input.up));

  if (horizontal === 0 && vertical === 0) {
    return entity;
  }

  const direction = normalizeVector(horizontal, vertical);
  const moveX = direction.x * PLAYER_SPEED * deltaSeconds;
  const moveY = direction.y * PLAYER_SPEED * deltaSeconds;

  moveCircleEntity(entity, moveX, moveY, obstacles, PLAYER_COLLISION_RADIUS);

  return entity;
}

export function clampInputDelta(deltaMs) {
  return clamp(Number.isFinite(deltaMs) ? deltaMs : 0, 0, MAX_INPUT_DT_MS);
}

export function segmentIntersectsBox(x1, y1, x2, y2, minX, minY, maxX, maxY) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  let tMin = 0;
  let tMax = 1;

  const axes = [
    { p: -dx, q: x1 - minX },
    { p: dx, q: maxX - x1 },
    { p: -dy, q: y1 - minY },
    { p: dy, q: maxY - y1 }
  ];

  for (const axis of axes) {
    if (axis.p === 0) {
      if (axis.q < 0) {
        return false;
      }
      continue;
    }

    const ratio = axis.q / axis.p;

    if (axis.p < 0) {
      tMin = Math.max(tMin, ratio);
    } else {
      tMax = Math.min(tMax, ratio);
    }

    if (tMin > tMax) {
      return false;
    }
  }

  return true;
}

export function isFiniteVector(x, y) {
  return Number.isFinite(x) && Number.isFinite(y);
}

export function moveCircleEntity(entity, deltaX, deltaY, obstacles = [], entityRadius = PLAYER_COLLISION_RADIUS) {
  if (deltaX !== 0) {
    entity.x += deltaX;
    resolveCircleCollisions(entity, obstacles, entityRadius);
  }

  if (deltaY !== 0) {
    entity.y += deltaY;
    resolveCircleCollisions(entity, obstacles, entityRadius);
  }

  return entity;
}

export function resolveCircleCollisions(entity, obstacles = [], entityRadius = PLAYER_COLLISION_RADIUS) {
  for (const obstacle of obstacles) {
    if (!obstacle?.blocksMovement) {
      continue;
    }

    const dx = entity.x - obstacle.x;
    const dy = entity.y - obstacle.y;
    const minDistance = entityRadius + obstacle.radius;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared >= minDistance * minDistance) {
      continue;
    }

    if (distanceSquared === 0) {
      entity.x += minDistance;
      continue;
    }

    const distance = Math.sqrt(distanceSquared);
    const overlap = minDistance - distance;
    entity.x += (dx / distance) * overlap;
    entity.y += (dy / distance) * overlap;
  }

  return entity;
}

export function isCirclePositionFree(x, y, radius, obstacles = [], padding = 0) {
  for (const obstacle of obstacles) {
    const minDistance = radius + obstacle.radius + padding;
    const dx = x - obstacle.x;
    const dy = y - obstacle.y;

    if (dx * dx + dy * dy < minDistance * minDistance) {
      return false;
    }
  }

  return true;
}

export function getFreeSpawnPoint(obstacles = [], radius = PLAYER_COLLISION_RADIUS, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const point = getRandomSpawnPoint();

    if (isCirclePositionFree(point.x, point.y, radius, obstacles, 30)) {
      return point;
    }
  }

  return { x: 0, y: 0 };
}

export function segmentIntersectsCircle(x1, y1, x2, y2, centerX, centerY, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    const pointDx = x1 - centerX;
    const pointDy = y1 - centerY;
    return pointDx * pointDx + pointDy * pointDy <= radius * radius;
  }

  const projection = clamp(
    ((centerX - x1) * dx + (centerY - y1) * dy) / lengthSquared,
    0,
    1
  );
  const closestX = x1 + dx * projection;
  const closestY = y1 + dy * projection;
  const distanceX = closestX - centerX;
  const distanceY = closestY - centerY;

  return distanceX * distanceX + distanceY * distanceY <= radius * radius;
}
