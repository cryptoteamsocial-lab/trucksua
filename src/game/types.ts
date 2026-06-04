export type GameState = 'MENU' | 'PLAYING' | 'VICTORY' | 'GAME_OVER';

export type EnemyType = 'WALKER' | 'HEAVY' | 'RUNNER' | 'BOMBER';

export type BonusType = 'ALLY' | 'REPAIR';

export type UpgradeId = 'engine' | 'armor' | 'weapon' | 'damage';

export interface UpgradeData {
  engine: number;  // 0-5: player speed bonus
  armor: number;   // 0-5: max HP bonus
  weapon: number;  // 0-5: fire rate bonus
  damage: number;  // 0-5: bullet damage
}

export interface LeaderboardEntry {
  coins: number;
  killed: number;
  convoy: number;
  date: string;
}

export interface SavedData {
  totalCoins: number;
  bestScore: number;
  maxConvoy: number;
  upgrades: UpgradeData;
  leaderboard: LeaderboardEntry[];
  lastDailyReward: string; // ISO date string
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            username?: string;
          };
        };
      };
    };
  }
}
