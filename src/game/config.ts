import type { UpgradeId, VehicleId, MissionGoalType, EnemyType } from './types';

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
  MAX_ALLIES: 3,
  COLLISION_DAMAGE: 10,

  COINS_WALKER: 10,
  COINS_HEAVY: 30,
  COINS_RUNNER: 15,
  COINS_BOMBER: 25,
  COINS_GENERAL: 100,
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

// ─── Enemy display names ───────────────────────────────────────────────────────
export const ENEMY_NAMES: Record<EnemyType, string> = {
  WALKER:   'Орк',
  HEAVY:    'Бронеорк',
  RUNNER:   'Z-Орк',
  BOMBER:   'Чмобік',
  GENERAL:  'Генерал Дивану',
};

// ─── Weapon level names (10 levels) ───────────────────────────────────────────
export const WEAPON_LEVELS: { name: string; icon: string }[] = [
  { name: 'Рогатка ТрО',      icon: '🪃' },
  { name: 'Бандеромет',       icon: '📦' },
  { name: 'Вогнемет Гніву',   icon: '🔥' },
  { name: 'Паляниця Mk.2',    icon: '🫓' },
  { name: 'Джавелінчик',      icon: '🚀' },
  { name: 'Святий HIMARS',    icon: '⚡' },
  { name: 'Тризуб Гніву',     icon: '🔱' },
  { name: 'Бавовна Cannon',   icon: '💥' },
  { name: 'Фантом Неба',      icon: '👻' },
  { name: 'Кара Божа',        icon: '☄️' },
];

// Max levels per upgrade (weapon = 10, others = 5)
export const UPGRADE_MAX_LEVELS: Record<UpgradeId, number> = {
  engine: 5,
  armor:  5,
  weapon: 10,
  damage: 5,
};

// ─── Charity mock data (replace with API later) ────────────────────────────────
export const CHARITY = {
  title: 'Козак для підрозділу',
  unit: '3-тя окремий штурмовий батальйон',
  raised: 39250,
  goal: 50000,
  vehicle: 'Mitsubishi L200',
  description: 'Позашляховик для евакуації\nпоранених бійців під Авдіївкою',
  donateUrl: 'https://t.me/bавовнаroad', // placeholder
  history: [
    { name: 'Toyota Hilux',     date: '12.04.2025', unit: '1-ша ОШБр',   desc: 'Пікап для розвідки та логістики' },
    { name: 'Mitsubishi L200',  date: '28.03.2025', unit: '3-тя ОШБ',    desc: 'Автомобіль евакуації поранених' },
    { name: 'Ford Ranger',      date: '10.03.2025', unit: '80-та ОДШБр', desc: 'Транспорт для вогневої підтримки' },
  ],
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
  {
    id: 'engine', label: 'Двигун', icon: '[E]',
    description: 'Швидкість +20/рів',
    bonuses: [20, 40, 60, 90, 130],
  },
  {
    id: 'armor', label: 'Броня', icon: '[A]',
    description: 'Макс HP +20/рів',
    bonuses: [20, 40, 60, 80, 100],
  },
  {
    id: 'weapon', label: 'Зброя', icon: '[W]',
    description: 'Швидкість пострілу',
    bonuses: [30, 55, 80, 110, 145, 180, 220, 265, 315, 380],
  },
  {
    id: 'damage', label: 'Урон', icon: '[D]',
    description: '+1 урон/рів',
    bonuses: [1, 2, 3, 4, 5],
  },
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
  starsPrice: number;    // 0 = free/default. >0 = Telegram Stars required
  coinPrice: number;     // always 0 for Stars-only vehicles
  textureKey: string;
  baseHp: number;
  baseSpeed: number;
  baseFireRate: number;
  spreadShots: number;
  color: number;
  collectionGoal: number; // Stars needed for real vehicle collection
  collectionRaised: number; // mock: Stars raised so far
}

export const VEHICLES: VehicleDef[] = [
  {
    id: 'humvee',
    label: 'Козак',
    description: 'Збалансований стартовий\nавтомобіль для прориву.',
    starsPrice: 0,
    coinPrice: 0,
    textureKey: 'player',
    baseHp: 100,
    baseSpeed: 240,
    baseFireRate: 350,
    spreadShots: 1,
    color: 0x4a7c59,
    collectionGoal: 50000,
    collectionRaised: 39250,
  },
  {
    id: 'scout',
    label: 'Пікап',
    description: 'Швидкий та маневрений.\nШвидка черга. Мало HP.',
    starsPrice: 500,
    coinPrice: 0,
    textureKey: 'vehicle_scout',
    baseHp: 70,
    baseSpeed: 330,
    baseFireRate: 240,
    spreadShots: 1,
    color: 0x6ba3c4,
    collectionGoal: 50000,
    collectionRaised: 12500,
  },
  {
    id: 'apc',
    label: 'БТР',
    description: 'Важка броня. Потрійний\nрозсіяний постріл. Повільний.',
    starsPrice: 1000,
    coinPrice: 0,
    textureKey: 'vehicle_apc',
    baseHp: 180,
    baseSpeed: 170,
    baseFireRate: 500,
    spreadShots: 3,
    color: 0x8b7340,
    collectionGoal: 80000,
    collectionRaised: 23000,
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

// ─── 100 Meme player names ────────────────────────────────────────────────────
export const MEME_NAMES: string[] = [
  'Бавовняр_001','Бавовняр_002','Бавовняр_003',
  'Паляниця_004','Паляниця_005','Паляниця_006',
  'Козак_007','Козак_008','Козак_009',
  'ТрО_010','ТрО_011','ТрО_012',
  'Джавелін_013','Джавелін_014','Джавелін_015',
  'Бандеромобіль_016','Бандеромобіль_017','Бандеромобіль_018',
  'Бавовномет_019','Бавовномет_020','Бавовномет_021',
  'СвятийHIMARS_022','СвятийHIMARS_023','СвятийHIMARS_024',
  'Тризубець_025','Тризубець_026','Тризубець_027',
  'ПривидКиєва_028','ПривидКиєва_029','ПривидКиєва_030',
  'Чорнобаївка_031','Чорнобаївка_032','Чорнобаївка_033',
  'КіберКозак_034','КіберКозак_035','КіберКозак_036',
  'ДонатнийДрон_037','ДонатнийДрон_038','ДонатнийДрон_039',
  'ЗалізнийПікап_040','ЗалізнийПікап_041','ЗалізнийПікап_042',
  'Волонтер_043','Волонтер_044','Волонтер_045',
  'Патрончик_046','Патрончик_047','Патрончик_048',
  'ЛютийКозак_049','ЛютийКозак_050','ЛютийКозак_051',
  'БронеПаляниця_052','БронеПаляниця_053','БронеПаляниця_054',
  'ТурбоКозак_055','ТурбоКозак_056','ТурбоКозак_057',
  'СлаваМобіль_058','СлаваМобіль_059','СлаваМобіль_060',
  'ХерсонськийКіт_061','ХерсонськийКіт_062','ХерсонськийКіт_063',
  'КримськийМіст_064','КримськийМіст_065','КримськийМіст_066',
  'МорськийДрон_067','МорськийДрон_068','МорськийДрон_069',
  'АзовськийВітер_070','АзовськийВітер_071','АзовськийВітер_072',
  'ДикийСтеп_073','ДикийСтеп_074','ДикийСтеп_075',
  'СтеповийВовк_076','СтеповийВовк_077','СтеповийВовк_078',
  'ВогневийБус_079','ВогневийБус_080','ВогневийБус_081',
  'СинійЖовтий_082','СинійЖовтий_083','СинійЖовтий_084',
  'ХлопчикЗПікапа_085','ХлопчикЗПікапа_086','ХлопчикЗПікапа_087',
  'ЗалужнийФан_088','ЗалужнийФан_089','ЗалужнийФан_090',
  'СирськийMode_091','СирськийMode_092','СирськийMode_093',
  'МавікЗБагажника_094','МавікЗБагажника_095','МавікЗБагажника_096',
  'НічнийЕкіпаж_097','НічнийЕкіпаж_098','НічнийЕкіпаж_099',
  'ГеройБавовни_100',
];

// ─── Level progression (15 levels) ────────────────────────────────────────────
export interface LevelConfig {
  label: string;
  baseScale: number;
  phaseScale: number;
  enemyTypes: EnemyType[];
  spawnInterval: number;
  obstacleInterval: number;
  bossLevel: boolean;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { label: 'РІВЕНЬ 1',  baseScale: 0.7, phaseScale: 0.10, enemyTypes: ['WALKER'],                       spawnInterval: 2200, obstacleInterval: 3800, bossLevel: false },
  { label: 'РІВЕНЬ 2',  baseScale: 0.8, phaseScale: 0.12, enemyTypes: ['WALKER','RUNNER'],               spawnInterval: 2000, obstacleInterval: 3500, bossLevel: false },
  { label: 'РІВЕНЬ 3',  baseScale: 0.9, phaseScale: 0.14, enemyTypes: ['WALKER','RUNNER','HEAVY'],       spawnInterval: 1900, obstacleInterval: 3200, bossLevel: false },
  { label: 'РІВЕНЬ 4',  baseScale: 1.0, phaseScale: 0.16, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1800, obstacleInterval: 3000, bossLevel: false },
  { label: 'РІВЕНЬ 5',  baseScale: 1.1, phaseScale: 0.18, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1700, obstacleInterval: 2800, bossLevel: true  },
  { label: 'РІВЕНЬ 6',  baseScale: 1.2, phaseScale: 0.20, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1600, obstacleInterval: 2600, bossLevel: false },
  { label: 'РІВЕНЬ 7',  baseScale: 1.3, phaseScale: 0.22, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1500, obstacleInterval: 2400, bossLevel: false },
  { label: 'РІВЕНЬ 8',  baseScale: 1.4, phaseScale: 0.25, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1400, obstacleInterval: 2200, bossLevel: false },
  { label: 'РІВЕНЬ 9',  baseScale: 1.5, phaseScale: 0.28, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1300, obstacleInterval: 2000, bossLevel: false },
  { label: 'РІВЕНЬ 10', baseScale: 1.7, phaseScale: 0.30, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1200, obstacleInterval: 1800, bossLevel: true  },
  { label: 'РІВЕНЬ 11', baseScale: 1.9, phaseScale: 0.33, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1100, obstacleInterval: 1700, bossLevel: false },
  { label: 'РІВЕНЬ 12', baseScale: 2.1, phaseScale: 0.35, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval: 1000, obstacleInterval: 1600, bossLevel: false },
  { label: 'РІВЕНЬ 13', baseScale: 2.4, phaseScale: 0.38, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval:  900, obstacleInterval: 1500, bossLevel: false },
  { label: 'РІВЕНЬ 14', baseScale: 2.7, phaseScale: 0.40, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval:  800, obstacleInterval: 1400, bossLevel: false },
  { label: 'РІВЕНЬ 15', baseScale: 3.0, phaseScale: 0.45, enemyTypes: ['WALKER','RUNNER','HEAVY','BOMBER'], spawnInterval:  700, obstacleInterval: 1200, bossLevel: true  },
];

// ─── Run upgrades (Vampire Survivors style, temporary per run) ─────────────────
export interface RunUpgradeDef {
  id: string;
  icon: string;
  label: string;
  desc: string;
  effect: 'maxhp' | 'speed' | 'damage' | 'firerate' | 'heal' | 'spread' | 'coins' | 'aoe' | 'himars' | 'pierce' | 'chain' | 'homing' | 'ulti';
  value: number;
}

export const RUN_UPGRADES: RunUpgradeDef[] = [
  { id: 'hp30',    icon: '🛡', label: '+30 Макс HP',         desc: 'Підвищує максимальне HP на 30',         effect: 'maxhp',    value: 30  },
  { id: 'hp50',    icon: '🏰', label: '+50 Макс HP',         desc: 'Підвищує максимальне HP на 50',         effect: 'maxhp',    value: 50  },
  { id: 'spd40',   icon: '⚡', label: 'Турбіна +40',         desc: 'Збільшує швидкість руху на 40',         effect: 'speed',    value: 40  },
  { id: 'spd80',   icon: '🏎', label: 'Суперприводи +80',    desc: 'Збільшує швидкість руху на 80',         effect: 'speed',    value: 80  },
  { id: 'dmg1',    icon: '💥', label: '+1 Урон',             desc: 'Збільшує урон куль на 1',               effect: 'damage',   value: 1   },
  { id: 'dmg2',    icon: '🚀', label: '+2 Урон',             desc: 'Збільшує урон куль на 2',               effect: 'damage',   value: 2   },
  { id: 'dmg3',    icon: '☄️', label: '+3 Урон (рідко)',     desc: 'Збільшує урон куль на 3',               effect: 'damage',   value: 3   },
  { id: 'fire60',  icon: '🔫', label: 'Швидший вогонь -60мс', desc: 'Зменшує інтервал пострілу на 60мс',   effect: 'firerate', value: -60  },
  { id: 'fire120', icon: '⚡', label: 'Дуже швидкий вогонь', desc: 'Зменшує інтервал пострілу на 120мс',   effect: 'firerate', value: -120 },
  { id: 'heal25',  icon: '❤️', label: 'Ремонт +25 HP',       desc: 'Миттєво відновлює 25 HP',               effect: 'heal',     value: 25  },
  { id: 'heal50',  icon: '❤️', label: 'Великий ремонт +50 HP', desc: 'Миттєво відновлює 50 HP',            effect: 'heal',     value: 50  },
  { id: 'spread',  icon: '🔱', label: 'Потрійний постріл',   desc: 'Всі постріли стають потрійними',        effect: 'spread',   value: 3   },
  { id: 'coins50', icon: '💰', label: '+50 монет зараз',     desc: 'Миттєво отримуєш 50 монет на рахунок',  effect: 'coins',    value: 50  },
  { id: 'wpn_bandera',  icon: '📦', label: 'Бандеромет',       desc: '+20% урону (прямий постріл)',          effect: 'damage',   value: 2   },
  { id: 'wpn_bavovna',  icon: '💥', label: 'Бавовномет',        desc: 'Вибуховий постріл AoE',                effect: 'aoe',      value: 1   },
  { id: 'wpn_palanytsia', icon: '🫓', label: 'Паляниця Mk.2',  desc: '3 пулі веєром',                        effect: 'spread',   value: 3   },
  { id: 'wpn_javelin',  icon: '🚀', label: 'Джавелінчик',       desc: 'Повільна ракета, великий урон',         effect: 'damage',   value: 5   },
  { id: 'wpn_himars',   icon: '⚡', label: 'Святий HIMARS',     desc: 'Залп по кількох ворогах',               effect: 'himars',   value: 1   },
  { id: 'wpn_tryzub',   icon: '🔱', label: 'Тризуб Гніву',      desc: 'Пуля пробиває 3 ворогів',               effect: 'pierce',   value: 3   },
  { id: 'wpn_chornobaivka', icon: '🔁', label: 'Чорнобаївка',  desc: 'Шанс вибуху після знищення ворога',     effect: 'chain',    value: 1   },
  { id: 'wpn_ghost',    icon: '👻', label: 'Привид Києва',       desc: 'Частина куль летить до найближчого ворога', effect: 'homing', value: 1 },
  { id: 'wpn_kara',     icon: '☄️', label: 'Кара Божа',          desc: 'Потужний рідкісний удар по площині',    effect: 'ulti',    value: 1   },
];

export const MISSIONS_POOL: MissionDef[] = [
  { id: 'kill_10',      label: 'Знищити 10 ворогів',        goalType: 'kill',         goal: 10,  reward: 60  },
  { id: 'kill_25',      label: 'Знищити 25 ворогів',        goalType: 'kill',         goal: 25,  reward: 140 },
  { id: 'kill_50',      label: 'Знищити 50 ворогів',        goalType: 'kill',         goal: 50,  reward: 280 },
  { id: 'kill_heavy_3', label: 'Знищити 3 Бронеорки',       goalType: 'kill_heavy',   goal: 3,   reward: 110 },
  { id: 'kill_heavy_8', label: 'Знищити 8 Бронеорок',       goalType: 'kill_heavy',   goal: 8,   reward: 220 },
  { id: 'kill_bomb_2',  label: 'Знищити 2 Чмобіки',         goalType: 'kill_bomber',  goal: 2,   reward: 120 },
  { id: 'coins_200',    label: 'Зібрати 200 монет за рейд', goalType: 'coins',        goal: 200, reward: 80  },
  { id: 'coins_400',    label: 'Зібрати 400 монет за рейд', goalType: 'coins',        goal: 400, reward: 160 },
  { id: 'convoy_4',     label: 'Зібрати конвой з 4 машин',  goalType: 'convoy',       goal: 4,   reward: 130 },
  { id: 'convoy_6',     label: 'Зібрати конвой з 6 машин',  goalType: 'convoy',       goal: 6,   reward: 200 },
  { id: 'run_1',        label: 'Завершити 1 рейд',          goalType: 'run',          goal: 1,   reward: 100 },
  { id: 'run_3',        label: 'Завершити 3 рейди',         goalType: 'run',          goal: 3,   reward: 250 },
  { id: 'survive_60',   label: 'Вижити 60 секунд',          goalType: 'survive',      goal: 60,  reward: 90  },
];
