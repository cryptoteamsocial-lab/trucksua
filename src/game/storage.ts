import type { SavedData } from './types';

const KEY = 'steel_road_data';

const defaults: SavedData = {
  totalCoins: 0,
  bestScore: 0,
  maxConvoy: 0,
};

export function loadData(): SavedData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveData(data: SavedData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function addCoins(amount: number): SavedData {
  const data = loadData();
  data.totalCoins += amount;
  saveData(data);
  return data;
}

export function updateBestScore(score: number, convoy: number): SavedData {
  const data = loadData();
  if (score > data.bestScore) data.bestScore = score;
  if (convoy > data.maxConvoy) data.maxConvoy = convoy;
  saveData(data);
  return data;
}
