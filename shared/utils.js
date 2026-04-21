import {
  MAX_INPUT_DT_MS,
  PLAYER_SIZE,
  PLAYER_SPEED,
  WORLD_HEIGHT,
  WORLD_WIDTH
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
  const margin = PLAYER_SIZE;
  return {
    x: randomInRange(margin, WORLD_WIDTH - margin),
    y: randomInRange(margin, WORLD_HEIGHT - margin)
  };
}

export function applyInputMovement(entity, input, deltaSeconds) {
  const horizontal = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const vertical = Number(Boolean(input.down)) - Number(Boolean(input.up));

  if (horizontal === 0 && vertical === 0) {
    return entity;
  }

  const direction = normalizeVector(horizontal, vertical);
  const half = PLAYER_SIZE / 2;

  entity.x = clamp(entity.x + direction.x * PLAYER_SPEED * deltaSeconds, half, WORLD_WIDTH - half);
  entity.y = clamp(entity.y + direction.y * PLAYER_SPEED * deltaSeconds, half, WORLD_HEIGHT - half);

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
