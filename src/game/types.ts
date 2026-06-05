export type GameState = 'MENU' | 'PLAYING' | 'LEVEL_COMPLETE' | 'GAME_OVER';
export type EnemyType = 'WALKER' | 'HEAVY' | 'RUNNER' | 'BOMBER' | 'GENERAL';
export type LootboxTier = 'field' | 'volunteer' | 'gold';
export type BonusType = 'ALLY' | 'REPAIR';
export type UpgradeId = 'engine' | 'armor' | 'weapon' | 'damage';
export type VehicleId = 'humvee' | 'scout' | 'apc';
export type MissionGoalType = 'kill' | 'kill_heavy' | 'kill_bomber' | 'coins' | 'convoy' | 'run' | 'survive';

export interface UpgradeData {
  engine: number;
  armor: number;
  weapon: number;
  damage: number;
}

export interface LeaderboardEntry {
  coins: number;
  killed: number;
  convoy: number;
  name: string;
  date?: string; // legacy compat
  levelsReached?: number;
}

export interface Mission {
  id: string;
  label: string;
  goalType: MissionGoalType;
  goal: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface SavedData {
  totalCoins: number;
  bestScore: number;
  maxConvoy: number;
  upgrades: UpgradeData;
  leaderboard: LeaderboardEntry[];
  lastDailyReward: string;
  ownedVehicles: VehicleId[];
  selectedVehicle: VehicleId;
  missions: Mission[];
  missionsDate: string;
  onboardingDone: boolean;
  playerName: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: { user?: { id: number; first_name: string; username?: string } };
      };
    };
  }
}
