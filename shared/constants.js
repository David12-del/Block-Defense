// ==================== GAME CONSTANTS ====================

export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1200;

export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 320;
export const PLAYER_MAX_HP = 100;
export const PLAYER_RESPAWN_DELAY_MS = 2000;

export const BULLET_RADIUS = 5;
export const BULLET_SPEED = 920;
export const BULLET_DAMAGE = 25;
export const BULLET_LIFETIME_MS = 1400;
export const FIRE_COOLDOWN_MS = 180;

export const SERVER_TICK_MS = 50;
export const SNAPSHOT_RATE = 1000 / SERVER_TICK_MS;
export const MAX_INPUT_DT_MS = 50;

export const CLIENT_INTERPOLATION_BACK_TIME_MS = 100;
export const CLIENT_PREDICTED_BULLET_TTL_MS = 250;

export const COLORS = {
    backgroundTop: "#0f172a",
    backgroundBottom: "#1f2937",
    grid: "rgba(148, 163, 184, 0.14)",
    localPlayer: "#f97316",
    remotePlayer: "#22d3ee",
    deadPlayer: "#64748b",
    bullet: "#f8fafc",
    predictedBullet: "rgba(251, 191, 36, 0.9)",
    hudBg: "rgba(15, 23, 42, 0.8)",
    hudBorder: "rgba(148, 163, 184, 0.28)",
    hpBar: "#22c55e",
    hpBarMissing: "#ef4444",
    arenaBorder: "rgba(248, 250, 252, 0.2)"
};

export const EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    INPUT: 'input',
    SHOOT: 'shoot',
    GAME_STATE: 'gameState',
    PLAYER_HIT: 'playerHit',
    PLAYER_DEATH: 'playerDeath',
    PLAYER_SPAWN: 'playerSpawn',
    BULLET_FIRED: 'bulletFired',
    BULLET_HIT: 'bulletHit'
};