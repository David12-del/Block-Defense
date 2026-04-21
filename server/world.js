import {
  OBSTACLE_FIELD_RADIUS,
  PLAYER_COLLISION_RADIUS
} from "../shared/constants.js";
import {
  isCirclePositionFree,
  randomInRange,
  round2
} from "../shared/utils.js";

const OBSTACLE_CONFIGS = [
  { type: "tree", count: 56, minRadius: 26, maxRadius: 40, padding: 42 },
  { type: "rock", count: 34, minRadius: 20, maxRadius: 32, padding: 32 },
  { type: "bush", count: 44, minRadius: 18, maxRadius: 28, padding: 28 }
];

export function createWorldObstacles() {
  const obstacles = [];
  let nextId = 1;

  for (const config of OBSTACLE_CONFIGS) {
    for (let index = 0; index < config.count; index += 1) {
      const obstacle = placeObstacle(obstacles, config, nextId);
      if (!obstacle) {
        continue;
      }

      obstacles.push(obstacle);
      nextId += 1;
    }
  }

  return obstacles;
}

export function serializeObstacle(obstacle) {
  return {
    id: obstacle.id,
    type: obstacle.type,
    x: round2(obstacle.x),
    y: round2(obstacle.y),
    radius: round2(obstacle.radius)
  };
}

function placeObstacle(existingObstacles, config, id) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = randomInRange(260, OBSTACLE_FIELD_RADIUS);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const radius = randomInRange(config.minRadius, config.maxRadius);

    if (!isCirclePositionFree(x, y, radius, existingObstacles, config.padding)) {
      continue;
    }

    if (Math.hypot(x, y) < PLAYER_COLLISION_RADIUS + radius + 200) {
      continue;
    }

    return {
      id,
      type: config.type,
      x,
      y,
      radius,
      blocksMovement: true,
      blocksBullets: true
    };
  }

  return null;
}
