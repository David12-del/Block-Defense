import {
  CLIENT_INTERPOLATION_BACK_TIME_MS,
  COLORS,
  PLAYER_MAX_HP,
  PLAYER_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from "../shared/constants.js";
import { getRemoteRenderState } from "./player.js";
import { clamp } from "../shared/utils.js";

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");
  const camera = { x: 0, y: 0 };

  function resize() {
    const width = Math.floor(window.innerWidth);
    const height = Math.floor(window.innerHeight);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function updateCamera(localPlayer) {
    if (!localPlayer) {
      return;
    }

    camera.x = clamp(localPlayer.x - canvas.width / 2, 0, Math.max(0, WORLD_WIDTH - canvas.width));
    camera.y = clamp(localPlayer.y - canvas.height / 2, 0, Math.max(0, WORLD_HEIGHT - canvas.height));
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

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, COLORS.backgroundTop);
    gradient.addColorStop(1, COLORS.backgroundBottom);

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawArena();
    drawBullets(gameState, now);
    drawPlayers(gameState, now);
    drawHud(gameState, now);
  }

  function drawArena() {
    const gridSize = 100;

    context.save();
    context.translate(-camera.x, -camera.y);
    context.strokeStyle = COLORS.grid;
    context.lineWidth = 1;

    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, WORLD_HEIGHT);
      context.stroke();
    }

    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(WORLD_WIDTH, y);
      context.stroke();
    }

    context.strokeStyle = COLORS.arenaBorder;
    context.lineWidth = 3;
    context.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    context.restore();
  }

  function drawBullets(gameState, now) {
    for (const bullet of gameState.bullets.values()) {
      const elapsed = Math.min((now - bullet.receivedAt) / 1000, 0.1);
      const point = worldToScreen(bullet.x + bullet.vx * elapsed, bullet.y + bullet.vy * elapsed);

      context.fillStyle = COLORS.bullet;
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }

    for (const bullet of gameState.predictedBullets.values()) {
      const point = worldToScreen(bullet.x, bullet.y);

      context.fillStyle = COLORS.predictedBullet;
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPlayers(gameState, now) {
    const renderTime = now - CLIENT_INTERPOLATION_BACK_TIME_MS;

    for (const remotePlayer of gameState.remotePlayers.values()) {
      const renderState = getRemoteRenderState(remotePlayer, renderTime);
      if (!renderState) {
        continue;
      }

      drawPlayer(renderState, false);
    }

    if (gameState.localPlayer) {
      drawPlayer(gameState.localPlayer, true);
    }
  }

  function drawPlayer(player, isLocal) {
    const point = worldToScreen(player.x, player.y);
    const half = PLAYER_SIZE / 2;
    const size = PLAYER_SIZE;

    context.fillStyle = player.alive
      ? (isLocal ? COLORS.localPlayer : COLORS.remotePlayer)
      : COLORS.deadPlayer;
    context.fillRect(point.x - half, point.y - half, size, size);

    drawHealthBar(point.x, point.y - half - 16, player.hp);

    context.fillStyle = "#f8fafc";
    context.font = "14px Trebuchet MS, sans-serif";
    context.textAlign = "center";
    context.fillText(player.nick, point.x, point.y - half - 24);
  }

  function drawHealthBar(x, y, hp) {
    const width = 44;
    const height = 6;

    context.fillStyle = COLORS.hpBarMissing;
    context.fillRect(x - width / 2, y, width, height);

    context.fillStyle = COLORS.hpBar;
    context.fillRect(x - width / 2, y, width * (hp / PLAYER_MAX_HP), height);
  }

  function drawHud(gameState, now) {
    context.fillStyle = COLORS.hudBg;
    context.strokeStyle = COLORS.hudBorder;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(18, 18, 270, 106, 16);
    context.fill();
    context.stroke();

    context.fillStyle = "#f8fafc";
    context.font = "15px Trebuchet MS, sans-serif";
    context.textAlign = "left";

    const hp = gameState.localPlayer?.hp ?? 0;
    context.fillText(`HP: ${hp}`, 34, 46);
    context.fillText(`Players: ${gameState.remotePlayers.size + (gameState.localPlayer ? 1 : 0)}`, 34, 70);
    context.fillText(`Socket: ${gameState.connected ? "online" : "offline"}`, 34, 94);

    if (gameState.localPlayer && !gameState.localPlayer.alive) {
      const secondsLeft = Math.max(0, Math.ceil((gameState.localPlayer.respawnAt - Date.now()) / 1000));
      context.fillText(`Respawn in: ${secondsLeft}s`, 34, 118);
      return;
    }

    context.fillText("WASD to move, left click to shoot", 34, 118);
  }

  return {
    camera,
    render,
    resize,
    screenToWorld
  };
}
