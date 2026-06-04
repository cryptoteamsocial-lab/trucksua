import type { UpgradeId } from './types';

export const CONFIG = {
  WIDTH: 390,
  HEIGHT: 844,

  ROAD_WIDTH: 260,
  ROAD_X: 65,

  PLAYER_SPEED_X: 240,
  PLAYER_HP: 100,
  PLAYER_W: 52,
  PLAYER_H: 82,
  PLAYER_FIRE_RATE: 350,

  BULLET_SPEED: 520,
  ALLY_BULLET_SPEED: 480,
  ALLY_FIRE_RATE: 500,

  ENEMY_SPAWN_INTERVAL: 1800,
  OBSTACLE_SPAWN_INTERVAL: 3000,
  ALLY_BONUS_INTERVAL_MIN: 8000,
  ALLY_BONUS_INTERVAL_MAX: 15000,

  LEVEL_DURATION: 90000,

  MAX_ALLIES: 8,

  COLLISION_DAMAGE: 10,

  COINS_WALKER: 10,
  COINS_HEAVY: 30,
  COINS_RUNNER: 15,
  COINS_BOMBER: 25,
  COINS_VICTORY_BASE: 100,
  COINS_PER_ALLY: 10,

  COLORS: {
    BG: 0x1a1a2e,
    ROAD: 0x2d2d2d,
    ROAD_LINE: 0x4a4a4a,
    ROAD_BORDER: 0x3a3a3a,
    DIRT: 0x3d3520,
    PLAYER: 0x4a7c59,
    PLAYER_ACCENT: 0x2d5a3d,
    ALLY: 0x3d6b4f,
    ALLY_ACCENT: 0x2a4d37,
    FLAG_BLUE: 0x005bbb,
    FLAG_YELLOW: 0xffd700,
    BULLET_PLAYER: 0xffee00,
    BULLET_ALLY: 0x88ff88,
    ENEMY_WALKER: 0x8b2020,
    ENEMY_HEAVY: 0x6b1515,
    OBSTACLE: 0x5a5a5a,
    BONUS_ALLY: 0x00aaff,
    HUD_BG: 0x000000,
    HUD_HP: 0x44cc44,
    HUD_HP_LOW: 0xcc3333,
    PROGRESS: 0xffd700,
    EXPLOSION: 0xff6600,
  },
};

// ─── Upgrade definitions ──────────────────────────────────────────────────────
export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  icon: string;
  description: string;
  // value per level (index = level 1..5 bonus over base)
  bonuses: number[];
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'engine',
    label: 'Engine',
    icon: '[E]',
    description: 'Move speed +20 per level',
    bonuses: [20, 40, 60, 90, 130],
  },
  {
    id: 'armor',
    label: 'Armor',
    icon: '[A]',
    description: 'Max HP +20 per level',
    bonuses: [20, 40, 60, 80, 100],
  },
  {
    id: 'weapon',
    label: 'Weapon',
    icon: '[W]',
    description: 'Fire rate faster',
    bonuses: [30, 60, 90, 120, 160],
  },
  {
    id: 'damage',
    label: 'Damage',
    icon: '[D]',
    description: '+1 damage per level',
    bonuses: [1, 2, 3, 4, 5],
  },
];

export function getStatFromUpgrade(id: UpgradeId, level: number): number {
  if (level === 0) return 0;
  const def = UPGRADES.find(u => u.id === id)!;
  return def.bonuses[level - 1];
}
