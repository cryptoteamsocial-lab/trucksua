import type { SavedData, UpgradeData, VehicleId, Mission, MissionGoalType } from './types';
import { MISSIONS_POOL, UPGRADE_MAX_LEVELS } from './config';

const KEY = 'steel_road_data';

const defaultUpgrades: UpgradeData = { engine: 0, armor: 0, weapon: 0, damage: 0 };

const defaults: SavedData = {
  totalCoins: 0,
  bestScore: 0,
  maxConvoy: 0,
  upgrades: { ...defaultUpgrades },
  leaderboard: [],
  lastDailyReward: '',
  ownedVehicles: ['humvee'],
  selectedVehicle: 'humvee',
  missions: [],
  missionsDate: '',
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
      ownedVehicles: parsed.ownedVehicles ?? ['humvee'],
      selectedVehicle: parsed.selectedVehicle ?? 'humvee',
      missions: parsed.missions ?? [],
      missionsDate: parsed.missionsDate ?? '',
    };
  } catch {
    return structuredClone(defaults);
  }
}

export function saveData(data: SavedData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
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

// ─── Upgrades ─────────────────────────────────────────────────────────────────
export function getUpgradeCost(id: keyof UpgradeData, level: number): number {
  const base: Record<keyof UpgradeData, number> = { engine: 80, armor: 100, weapon: 120, damage: 150 };
  return base[id] * (level + 1);
}

export function upgradeLevel(id: keyof UpgradeData): boolean {
  const data = loadData();
  const current = data.upgrades[id];
  if (current >= UPGRADE_MAX_LEVELS[id]) return false;
  const cost = getUpgradeCost(id, current);
  if (data.totalCoins < cost) return false;
  data.totalCoins -= cost;
  data.upgrades[id] = current + 1;
  saveData(data);
  return true;
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────
export function buyVehicle(id: VehicleId, price: number): boolean {
  const data = loadData();
  if (data.ownedVehicles.includes(id)) return false;
  if (data.totalCoins < price) return false;
  data.totalCoins -= price;
  data.ownedVehicles.push(id);
  saveData(data);
  return true;
}

export function selectVehicle(id: VehicleId): void {
  const data = loadData();
  if (!data.ownedVehicles.includes(id)) return;
  data.selectedVehicle = id;
  saveData(data);
}

// ─── Leaderboard / run record ─────────────────────────────────────────────────
export function recordRun(coins: number, killed: number, convoy: number): SavedData {
  const data = loadData();
  if (coins > data.bestScore) data.bestScore = coins;
  if (convoy > data.maxConvoy) data.maxConvoy = convoy;
  data.leaderboard.unshift({
    coins, killed, convoy,
    date: new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
  });
  data.leaderboard = data.leaderboard.sort((a, b) => b.coins - a.coins).slice(0, 10);
  saveData(data);
  return data;
}

// ─── Daily reward ─────────────────────────────────────────────────────────────
export function claimDailyReward(): number | null {
  const data = loadData();
  const today = new Date().toDateString();
  if (data.lastDailyReward === today) return null;
  const reward = Math.floor(Math.random() * 201) + 100;
  data.totalCoins += reward;
  data.lastDailyReward = today;
  saveData(data);
  return reward;
}

// ─── Missions ─────────────────────────────────────────────────────────────────
function pickDailyMissions(): Mission[] {
  const shuffled = [...MISSIONS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(def => ({
    id: def.id,
    label: def.label,
    goalType: def.goalType,
    goal: def.goal,
    progress: 0,
    reward: def.reward,
    claimed: false,
  }));
}

export function getDailyMissions(): Mission[] {
  const data = loadData();
  const today = new Date().toDateString();
  if (data.missionsDate !== today || data.missions.length === 0) {
    data.missions = pickDailyMissions();
    data.missionsDate = today;
    saveData(data);
  }
  return data.missions;
}

export function updateMissionProgress(goalType: MissionGoalType, amount: number): void {
  const data = loadData();
  let changed = false;
  for (const m of data.missions) {
    if (m.claimed) continue;
    if (m.goalType === goalType) {
      m.progress = Math.min(m.goal, m.progress + amount);
      changed = true;
    }
  }
  if (changed) saveData(data);
}

export function claimMission(id: string): number {
  const data = loadData();
  const m = data.missions.find(x => x.id === id);
  if (!m || m.claimed || m.progress < m.goal) return 0;
  m.claimed = true;
  data.totalCoins += m.reward;
  saveData(data);
  return m.reward;
}
