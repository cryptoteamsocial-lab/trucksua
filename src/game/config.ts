import type { UpgradeId, VehicleId, MissionGoalType } from './types';

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
    BG: 0x1a1a2e, ROAD: 0x2d2d2d, ROAD_LINE: 0x4a4a4a,
    ROAD_BORDER: 0x3a3a3a, DIRT: 0x3d3520,
    PLAYER: 0x4a7c59, PLAYER_ACCENT: 0x2d5a3d,
    ALLY: 0x3d6b4f, ALLY_ACCENT: 0x2a4d37,
    FLAG_BLUE: 0x005bbb, FLAG_YELLOW: 0xffd700,
    BULLET_PLAYER: 0xffee00, BULLET_ALLY: 0x88ff88,
    ENEMY_WALKER: 0x8b2020, ENEMY_HEAVY: 0x6b1515,
    OBSTACLE: 0x5a5a5a, BONUS_ALLY: 0x00aaff,
    HUD_BG: 0x000000, HUD_HP: 0x44cc44, HUD_HP_LOW: 0xcc3333,
    PROGRESS: 0xffd700, EXPLOSION: 0xff6600,
  },
};

// ─── Upgrades ─────────────────────────────────────────────────────────────────
export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  icon: string;
  description: string;
  bonuses: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'engine', label: 'Engine',  icon: '[E]', description: 'Speed +20/lvl',    bonuses: [20,40,60,90,130] },
  { id: 'armor',  label: 'Armor',   icon: '[A]', description: 'Max HP +20/lvl',   bonuses: [20,40,60,80,100] },
  { id: 'weapon', label: 'Weapon',  icon: '[W]', description: 'Fire rate faster', bonuses: [30,60,90,120,160] },
  { id: 'damage', label: 'Damage',  icon: '[D]', description: '+1 dmg/lvl',       bonuses: [1,2,3,4,5] },
];

export function getStatFromUpgrade(id: UpgradeId, level: number): number {
  if (level === 0) return 0;
  return UPGRADES.find(u => u.id === id)!.bonuses[level - 1];
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export interface VehicleDef {
  id: VehicleId;
  label: string;
  description: string;
  price: number;           // 0 = free/default
  textureKey: string;
  baseHp: number;
  baseSpeed: number;
  baseFireRate: number;
  spreadShots: number;     // 1=single, 3=triple
  color: number;           // accent color for selection UI
}

export const VEHICLES: VehicleDef[] = [
  {
    id: 'humvee',
    label: 'Humvee',
    description: 'Balanced. Good all-round\nmilitary pickup.',
    price: 0,
    textureKey: 'player',
    baseHp: 100,
    baseSpeed: 240,
    baseFireRate: 350,
    spreadShots: 1,
    color: 0x4a7c59,
  },
  {
    id: 'scout',
    label: 'Scout',
    description: 'Fast & agile. Fires rapid\nburst. Low HP.',
    price: 350,
    textureKey: 'vehicle_scout',
    baseHp: 70,
    baseSpeed: 330,
    baseFireRate: 240,
    spreadShots: 1,
    color: 0x6ba3c4,
  },
  {
    id: 'apc',
    label: 'APC',
    description: 'Heavy armor. Triple\nspread shot. Slow.',
    price: 800,
    textureKey: 'vehicle_apc',
    baseHp: 180,
    baseSpeed: 170,
    baseFireRate: 500,
    spreadShots: 3,
    color: 0x8b7340,
  },
];

// ─── Missions pool ─────────────────────────────────────────────────────────────
export interface MissionDef {
  id: string;
  label: string;
  goalType: MissionGoalType;
  goal: number;
  reward: number;
}

export const MISSIONS_POOL: MissionDef[] = [
  { id: 'kill_10',      label: 'Destroy 10 enemies',       goalType: 'kill',         goal: 10, reward: 60  },
  { id: 'kill_25',      label: 'Destroy 25 enemies',       goalType: 'kill',         goal: 25, reward: 140 },
  { id: 'kill_50',      label: 'Destroy 50 enemies',       goalType: 'kill',         goal: 50, reward: 280 },
  { id: 'kill_heavy_3', label: 'Destroy 3 Heavy units',    goalType: 'kill_heavy',   goal: 3,  reward: 110 },
  { id: 'kill_heavy_8', label: 'Destroy 8 Heavy units',    goalType: 'kill_heavy',   goal: 8,  reward: 220 },
  { id: 'kill_bomb_2',  label: 'Destroy 2 Bombers',        goalType: 'kill_bomber',  goal: 2,  reward: 120 },
  { id: 'coins_200',    label: 'Collect 200 coins in run', goalType: 'coins',        goal: 200,reward: 80  },
  { id: 'coins_400',    label: 'Collect 400 coins in run', goalType: 'coins',        goal: 400,reward: 160 },
  { id: 'convoy_4',     label: 'Build convoy of 4',        goalType: 'convoy',       goal: 4,  reward: 130 },
  { id: 'convoy_6',     label: 'Build convoy of 6',        goalType: 'convoy',       goal: 6,  reward: 200 },
  { id: 'run_1',        label: 'Complete 1 full run',      goalType: 'run',          goal: 1,  reward: 100 },
  { id: 'run_3',        label: 'Complete 3 full runs',     goalType: 'run',          goal: 3,  reward: 250 },
  { id: 'survive_60',   label: 'Survive 60 seconds',       goalType: 'survive',      goal: 60, reward: 90  },
];
