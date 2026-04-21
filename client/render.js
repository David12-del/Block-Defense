import {
  CLIENT_INTERPOLATION_BACK_TIME_MS,
  COLORS,
  MINIMAP_RANGE,
  PLAYER_MAX_HP,
  PLAYER_SIZE
} from "../shared/constants.js";
import { clamp } from "../shared/utils.js";
import { getRemoteRenderState } from "./player.js";

export function createRenderer(gameCanvas, minimapCanvas) {
  const context = gameCanvas.getContext("2d");
  const minimapContext = minimapCanvas.getContext("2d");
  const camera = { x: 0, y: 0 };

  function resize() {
    resizeCanvasToElement(gameCanvas);
    resizeCanvasToElement(minimapCanvas);
  }

  function updateCamera(localPlayer) {
    if (!localPlayer) {
      return;
    }

    camera.x = localPlayer.x - gameCanvas.width / 2;
    camera.y = localPlayer.y - gameCanvas.height / 2;
  }

  function worldToScreen(x, y) {
    return {
      x: x - camera.x,
      y: y - camera.y
    };
  }

  function screenToWorld(screenX, screenY) {
    return {
      x: screenX + camera.x,
      y: screenY + camera.y
    };
  }

  function render(gameState, now) {
    resize();
    updateCamera(gameState.localPlayer);

    drawMainScene(gameState, now);
    drawMiniMap(gameState);
  }

  function drawMainScene(gameState, now) {
    context.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    context.fillStyle = COLORS.battlefield;
    context.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    drawTerrain();
    drawObstacles(gameState.obstacles);
    drawBullets(gameState, now);
    drawPlayers(gameState, now);
    drawViewportFrame();
  }

  function drawTerrain() {
    const largeGrid = 160;
    const smallGrid = 40;

    context.fillStyle = COLORS.battlefieldShade;
    context.globalAlpha = 0.2;

    const shadeOffsetX = normalizeOffset(camera.x, largeGrid * 3);
    const shadeOffsetY = normalizeOffset(camera.y, largeGrid * 3);

    for (let x = -shadeOffsetX; x < gameCanvas.width + largeGrid * 3; x += largeGrid * 3) {
      for (let y = -shadeOffsetY; y < gameCanvas.height + largeGrid * 3; y += largeGrid * 3) {
        context.fillRect(x, y, largeGrid * 1.5, largeGrid * 1.5);
      }
    }

    context.globalAlpha = 1;
    context.strokeStyle = COLORS.battlefieldGrid;
    context.lineWidth = 1;

    const smallOffsetX = normalizeOffset(camera.x, smallGrid);
    const smallOffsetY = normalizeOffset(camera.y, smallGrid);

    for (let x = -smallOffsetX; x <= gameCanvas.width + smallGrid; x += smallGrid) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, gameCanvas.height);
      context.stroke();
    }

    for (let y = -smallOffsetY; y <= gameCanvas.height + smallGrid; y += smallGrid) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(gameCanvas.width, y);
      context.stroke();
    }

    context.strokeStyle = "rgba(255, 255, 255, 0.08)";
    context.lineWidth = 2;

    const largeOffsetX = normalizeOffset(camera.x, largeGrid);
    const largeOffsetY = normalizeOffset(camera.y, largeGrid);

    for (let x = -largeOffsetX; x <= gameCanvas.width + largeGrid; x += largeGrid) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, gameCanvas.height);
      context.stroke();
    }

    for (let y = -largeOffsetY; y <= gameCanvas.height + largeGrid; y += largeGrid) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(gameCanvas.width, y);
      context.stroke();
    }
  }

  function drawBullets(gameState, now) {
    context.fillStyle = COLORS.bullet;

    for (const bullet of gameState.predictedBullets.values()) {
      const point = worldToScreen(bullet.x, bullet.y);
      const snappedX = Math.round(point.x);
      const snappedY = Math.round(point.y);

      context.beginPath();
      context.arc(snappedX, snappedY, 4, 0, Math.PI * 2);
      context.fill();
    }

    for (const bullet of gameState.bullets.values()) {
      const point = worldToScreen(bullet.x, bullet.y);
      const snappedX = Math.round(point.x);
      const snappedY = Math.round(point.y);

      context.beginPath();
      context.arc(snappedX, snappedY, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPlayers(gameState, now) {
    const renderTime = now - CLIENT_INTERPOLATION_BACK_TIME_MS;

    for (const remotePlayer of gameState.remotePlayers.values()) {
      const renderState = getRemoteRenderState(remotePlayer, renderTime);
      if (renderState) {
        drawPlayer(renderState, false);
      }
    }

    if (gameState.localPlayer) {
      drawPlayer(gameState.localPlayer, true);
    }
  }

  function drawPlayer(player, isLocal) {
    const point = worldToScreen(player.x, player.y);
    const half = PLAYER_SIZE / 2;

    context.fillStyle = player.alive
      ? (isLocal ? COLORS.localPlayer : COLORS.remotePlayer)
      : COLORS.deadPlayer;
    context.fillRect(point.x - half, point.y - half, PLAYER_SIZE, PLAYER_SIZE);

    drawHealthBar(point.x, point.y - half - 18, player.hp);

    context.fillStyle = COLORS.playerName;
    context.font = "bold 13px Tahoma, Verdana, sans-serif";
    context.textAlign = "center";
    context.fillText(player.nick, point.x, point.y - half - 26);
  }

  function drawHealthBar(x, y, hp) {
    const width = 48;
    const height = 6;
    const ratio = clamp(hp / PLAYER_MAX_HP, 0, 1);

    context.fillStyle = COLORS.hpBarMissing;
    context.fillRect(x - width / 2, y, width, height);

    context.fillStyle = COLORS.hpBar;
    context.fillRect(x - width / 2, y, width * ratio, height);
  }

  function drawViewportFrame() {
    context.strokeStyle = COLORS.viewportFrame;
    context.lineWidth = 2;
    context.strokeRect(1, 1, gameCanvas.width - 2, gameCanvas.height - 2);
    context.strokeStyle = "rgba(15, 23, 42, 0.5)";
    context.lineWidth = 4;
    context.strokeRect(6, 6, gameCanvas.width - 12, gameCanvas.height - 12);
  }

  function drawMiniMap(gameState) {
    resizeCanvasToElement(minimapCanvas);
    minimapContext.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    minimapContext.fillStyle = COLORS.minimapBg;
    minimapContext.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    drawMiniMapGrid();
    minimapContext.strokeStyle = COLORS.minimapFrame;
    minimapContext.lineWidth = 2;
    minimapContext.strokeRect(1, 1, minimapCanvas.width - 2, minimapCanvas.height - 2);

    if (!gameState.localPlayer) {
      return;
    }

    const centerX = minimapCanvas.width / 2;
    const centerY = minimapCanvas.height / 2;
    const radiusX = minimapCanvas.width / 2 - 12;
    const radiusY = minimapCanvas.height / 2 - 12;
    const worldScaleX = radiusX / MINIMAP_RANGE;
    const worldScaleY = radiusY / MINIMAP_RANGE;

    minimapContext.fillStyle = COLORS.obstacleMinimap;
    for (const obstacle of gameState.obstacles) {
      const dx = obstacle.x - gameState.localPlayer.x;
      const dy = obstacle.y - gameState.localPlayer.y;
      if (Math.abs(dx) > MINIMAP_RANGE || Math.abs(dy) > MINIMAP_RANGE) {
        continue;
      }

      const x = centerX + dx * worldScaleX;
      const y = centerY + dy * worldScaleY;
      const size = Math.max(2, obstacle.radius * 0.12);
      minimapContext.fillRect(x - size / 2, y - size / 2, size, size);
    }

    minimapContext.strokeStyle = COLORS.minimapView;
    minimapContext.strokeRect(centerX - 24, centerY - 14, 48, 28);

    for (const remotePlayer of gameState.remotePlayers.values()) {
      const sample = remotePlayer.samples[remotePlayer.samples.length - 1];
      if (!sample) {
        continue;
      }

      const dx = sample.x - gameState.localPlayer.x;
      const dy = sample.y - gameState.localPlayer.y;
      if (Math.abs(dx) > MINIMAP_RANGE || Math.abs(dy) > MINIMAP_RANGE) {
        continue;
      }

      const x = centerX + dx * worldScaleX;
      const y = centerY + dy * worldScaleY;

      minimapContext.fillStyle = sample.alive ? COLORS.minimapRemote : COLORS.deadPlayer;
      minimapContext.fillRect(x - 3, y - 3, 6, 6);
    }

    minimapContext.fillStyle = COLORS.minimapLocal;
    minimapContext.fillRect(centerX - 4, centerY - 4, 8, 8);
  }

  function drawMiniMapGrid() {
    const grid = 28;

    minimapContext.strokeStyle = COLORS.minimapGrid;
    minimapContext.lineWidth = 1;

    for (let x = 0; x <= minimapCanvas.width; x += grid) {
      minimapContext.beginPath();
      minimapContext.moveTo(x, 0);
      minimapContext.lineTo(x, minimapCanvas.height);
      minimapContext.stroke();
    }

    for (let y = 0; y <= minimapCanvas.height; y += grid) {
      minimapContext.beginPath();
      minimapContext.moveTo(0, y);
      minimapContext.lineTo(minimapCanvas.width, y);
      minimapContext.stroke();
    }
  }

  function drawObstacles(obstacles) {
    for (const obstacle of obstacles) {
      const point = worldToScreen(obstacle.x, obstacle.y);

      if (
        point.x < -80 ||
        point.x > gameCanvas.width + 80 ||
        point.y < -80 ||
        point.y > gameCanvas.height + 80
      ) {
        continue;
      }

      if (obstacle.type === "tree") {
        drawTree(point.x, point.y, obstacle.radius);
        continue;
      }

      if (obstacle.type === "rock") {
        drawRock(point.x, point.y, obstacle.radius);
        continue;
      }

      drawBush(point.x, point.y, obstacle.radius);
    }
  }

  function drawTree(x, y, radius) {
    context.fillStyle = COLORS.treeTrunk;
    context.fillRect(x - radius * 0.2, y - radius * 0.15, radius * 0.4, radius * 0.95);

    context.fillStyle = COLORS.treeLeaf;
    context.beginPath();
    context.arc(x, y - radius * 0.35, radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = COLORS.treeLeafLight;
    context.beginPath();
    context.arc(x - radius * 0.22, y - radius * 0.55, radius * 0.5, 0, Math.PI * 2);
    context.arc(x + radius * 0.32, y - radius * 0.46, radius * 0.42, 0, Math.PI * 2);
    context.fill();
  }

  function drawRock(x, y, radius) {
    context.fillStyle = COLORS.rockShade;
    context.beginPath();
    context.ellipse(x + radius * 0.08, y + radius * 0.16, radius * 0.96, radius * 0.72, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = COLORS.rock;
    context.beginPath();
    context.ellipse(x, y, radius, radius * 0.7, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawBush(x, y, radius) {
    context.fillStyle = COLORS.bush;
    context.beginPath();
    context.arc(x, y, radius * 0.82, 0, Math.PI * 2);
    context.arc(x - radius * 0.48, y + radius * 0.08, radius * 0.46, 0, Math.PI * 2);
    context.arc(x + radius * 0.42, y + radius * 0.12, radius * 0.42, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = COLORS.bushLight;
    context.beginPath();
    context.arc(x - radius * 0.18, y - radius * 0.2, radius * 0.34, 0, Math.PI * 2);
    context.arc(x + radius * 0.3, y - radius * 0.12, radius * 0.24, 0, Math.PI * 2);
    context.fill();
  }

  return {
    camera,
    render,
    resize,
    screenToWorld
  };
}

function resizeCanvasToElement(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function normalizeOffset(value, gridSize) {
  return ((value % gridSize) + gridSize) % gridSize;
}
