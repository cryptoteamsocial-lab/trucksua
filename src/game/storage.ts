import type { SavedData, UpgradeData, LeaderboardEntry } from './types';

const KEY = 'steel_road_data';

const defaultUpgrades: UpgradeData = { engine: 0, armor: 0, weapon: 0, damage: 0 };

const defaults: SavedData = {
  totalCoins: 0,
  bestScore: 0,
  maxConvoy: 0,
  upgrades: { ...defaultUpgrades },
  leaderboard: [],
  lastDailyReward: '',
};

export function loadData(): SavedData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      upgrades: { ...defaultUpgrades, ...(parsed.upgrades ?? {}) },
      leaderboard: parsed.leaderboard ?? [],
    };
  } catch {
    return structuredClone(defaults);
  }
}

export function saveData(data: SavedData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function addCoins(amount: number): SavedData {
  const data = loadData();
  data.totalCoins += amount;
  saveData(data);
  return data;
}

export function spendCoins(amount: number): boolean {
  const data = loadData();
  if (data.totalCoins < amount) return false;
  data.totalCoins -= amount;
  saveData(data);
  return true;
}

export function upgradeLevel(id: keyof UpgradeData): boolean {
  const data = loadData();
  const current = data.upgrades[id];
  if (current >= 5) return false;
  const cost = getUpgradeCost(id, current);
  if (data.totalCoins < cost) return false;
  data.totalCoins -= cost;
  data.upgrades[id] = current + 1;
  saveData(data);
  return true;
}

export function getUpgradeCost(id: keyof UpgradeData, level: number): number {
  const base: Record<keyof UpgradeData, number> = {
    engine: 80, armor: 100, weapon: 120, damage: 150,
  };
  return base[id] * (level + 1);
}

export function recordRun(coins: number, killed: number, convoy: number): SavedData {
  const data = loadData();
  if (coins > data.bestScore) data.bestScore = coins;
  if (convoy > data.maxConvoy) data.maxConvoy = convoy;

  const entry: LeaderboardEntry = {
    coins, killed, convoy,
    date: new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
  };
  data.leaderboard.unshift(entry);
  data.leaderboard = data.leaderboard
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);
  saveData(data);
  return data;
}

export function claimDailyReward(): number | null {
  const data = loadData();
  const today = new Date().toDateString();
  if (data.lastDailyReward === today) return null;
  const reward = Math.floor(Math.random() * 201) + 100; // 100–300
  data.totalCoins += reward;
  data.lastDailyReward = today;
  saveData(data);
  return reward;
}
