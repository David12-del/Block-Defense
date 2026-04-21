import {
  CLIENT_INTERPOLATION_BACK_TIME_MS,
  COLORS,
  FIRE_COOLDOWN_MS,
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
    const panelX = 18;
    const panelY = 18;
    const panelWidth = 308;
    const panelHeight = 156;
    const shotCooldownLeft = Math.max(0, gameState.lastShotAt + FIRE_COOLDOWN_MS - now);
    const shotCooldownAlpha = 1 - (shotCooldownLeft / FIRE_COOLDOWN_MS);

    context.fillStyle = COLORS.hudBg;
    context.fillRect(panelX, panelY, panelWidth, panelHeight);

    context.fillStyle = COLORS.hudPanel;
    context.fillRect(panelX + 6, panelY + 6, panelWidth - 12, panelHeight - 12);

    context.strokeStyle = COLORS.hudBorder;
    context.lineWidth = 2;
    context.strokeRect(panelX + 1, panelY + 1, panelWidth - 2, panelHeight - 2);
    context.strokeRect(panelX + 8, panelY + 8, panelWidth - 16, panelHeight - 16);

    context.fillStyle = COLORS.hudAccent;
    context.font = "bold 12px Tahoma, Verdana, sans-serif";
    context.textAlign = "left";
    context.fillText("TACTICAL STATUS", 34, 42);

    const hp = gameState.localPlayer?.hp ?? 0;
    const playersOnline = gameState.remotePlayers.size + (gameState.localPlayer ? 1 : 0);

    context.fillStyle = COLORS.hudMuted;
    context.font = "11px Tahoma, Verdana, sans-serif";
    context.fillText(`HP`, 34, 68);
    context.fillText(`PLAYERS`, 34, 92);
    context.fillText(`SOCKET`, 34, 116);
    context.fillText(`WEAPON`, 34, 140);

    context.fillStyle = COLORS.hudAccent;
    context.font = "bold 15px Tahoma, Verdana, sans-serif";
    context.fillText(String(hp).padStart(3, "0"), 110, 68);
    context.fillText(String(playersOnline).padStart(2, "0"), 110, 92);
    context.fillText(gameState.connected ? "ONLINE" : "OFFLINE", 110, 116);
    context.fillText(shotCooldownLeft > 0 ? "COOLDOWN" : "READY", 110, 140);

    const barX = 214;
    const barY = 124;
    const barWidth = 84;
    const barHeight = 12;

    context.fillStyle = COLORS.hudTrack;
    context.fillRect(barX, barY, barWidth, barHeight);
    context.strokeStyle = COLORS.hudBorder;
    context.lineWidth = 1;
    context.strokeRect(barX + 0.5, barY + 0.5, barWidth - 1, barHeight - 1);
    context.fillStyle = COLORS.hudFill;
    context.fillRect(barX + 2, barY + 2, Math.max(0, (barWidth - 4) * shotCooldownAlpha), barHeight - 4);

    if (gameState.localPlayer && !gameState.localPlayer.alive) {
      const secondsLeft = Math.max(0, Math.ceil((gameState.localPlayer.respawnAt - Date.now()) / 1000));
      context.fillStyle = COLORS.hudAccent;
      context.font = "bold 12px Tahoma, Verdana, sans-serif";
      context.fillText(`RESPAWN IN ${secondsLeft}s`, 214, 72);
      return;
    }

    context.fillStyle = COLORS.hudMuted;
    context.font = "11px Tahoma, Verdana, sans-serif";
    context.fillText("WASD MOVE", 214, 72);
    context.fillText("LMB FIRE", 214, 92);
  }

  return {
    camera,
    render,
    resize,
    screenToWorld
  };
}
