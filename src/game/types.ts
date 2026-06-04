export type GameState = 'MENU' | 'PLAYING' | 'VICTORY' | 'GAME_OVER';

export type EnemyType = 'WALKER' | 'HEAVY';

export type BonusType = 'ALLY' | 'REPAIR';

export interface SavedData {
  totalCoins: number;
  bestScore: number;
  maxConvoy: number;
}

export interface AllyData {
  offsetX: number;
  offsetY: number;
  shootTimer: number;
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
