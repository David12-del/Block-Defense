export const SPAWN_RADIUS = 1200;
export const MINIMAP_RANGE = 2200;
export const OBSTACLE_FIELD_RADIUS = 3200;
export const PLAYER_COLLISION_RADIUS = 18;

export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 320;
export const PLAYER_MAX_HP = 100;
export const PLAYER_RESPAWN_DELAY_MS = 2000;

export const BULLET_RADIUS = 5;
export const BULLET_SPEED = 920;
export const BULLET_DAMAGE = 25;
export const BULLET_LIFETIME_MS = 1400;
export const FIRE_COOLDOWN_MS = 220;
export const MAX_ACTIVE_BULLETS = 120;

export const SERVER_TICK_MS = 33;
export const MAX_INPUT_DT_MS = 50;
export const CLIENT_INTERPOLATION_BACK_TIME_MS = 70;
export const CLIENT_PING_INTERVAL_MS = 1000;
export const CLIENT_PREDICTED_BULLET_TTL_MS = 220;

export const COLORS = {
  battlefield: "#4f9b43",
  battlefieldShade: "#3b7d33",
  battlefieldGrid: "rgba(10, 33, 10, 0.16)",
  localPlayer: "#f8fafc",
  remotePlayer: "#0f172a",
  deadPlayer: "#6b7280",
  bullet: "#f8fafc",
  playerName: "#f8fafc",
  hpBar: "#f8fafc",
  hpBarMissing: "rgba(15, 23, 42, 0.55)",
  viewportFrame: "#f3f4f6",
  minimapBg: "#111827",
  minimapGrid: "rgba(255, 255, 255, 0.08)",
  minimapFrame: "rgba(255, 255, 255, 0.22)",
  minimapLocal: "#f8fafc",
  minimapRemote: "#111111",
  minimapView: "rgba(255, 255, 255, 0.18)",
  treeTrunk: "#5b4633",
  treeLeaf: "#234d21",
  treeLeafLight: "#2f672b",
  rock: "#7f858d",
  rockShade: "#5c6168",
  bush: "#2d6228",
  bushLight: "#3b7d33",
  obstacleMinimap: "rgba(255, 255, 255, 0.28)"
};
