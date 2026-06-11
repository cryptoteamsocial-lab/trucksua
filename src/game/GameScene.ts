import Phaser from 'phaser';
import { CONFIG, VEHICLES, LEVEL_CONFIGS, getStatFromUpgrade, type RunUpgradeDef } from './config';
import { loadData, addCoins, recordRun, claimDailyReward, updateMissionProgress, getOrCreatePlayerName } from './storage';
import { createPixelTextures } from './PixelArt';
import type { GameState, EnemyType } from './types';

const ALLY_FORMATION: { ox: number; oy: number }[] = [
  { ox: -70, oy: 50 },  { ox:  70, oy: 50 },
  { ox: -70, oy: 120 }, { ox:  70, oy: 120 },
  { ox: -140, oy: 50 }, { ox:  140, oy: 50 },
  { ox: -140, oy: 120 },{ ox:  140, oy: 120 },
];

interface Enemy {
  container: Phaser.GameObjects.Container;
  hp: number;
  maxHp: number;
  type: EnemyType;
  speed: number;
  coins: number;
  hpBar?: Phaser.GameObjects.Rectangle;
  hpBarBg?: Phaser.GameObjects.Rectangle;
  vx?: number;
  dying?: boolean;
}
interface Bullet   { sprite: Phaser.GameObjects.Image; speed: number; dmg: number; }
interface Obstacle { sprite: Phaser.GameObjects.Image; hw: number; hh: number; key: string; }
interface AllyBonus { container: Phaser.GameObjects.Container; type: 'ally' | 'repair'; }
interface AllyVehicle { container: Phaser.GameObjects.Container; shootTimer: number; targetX: number; targetY: number; }
interface Particle { sprite: Phaser.GameObjects.Image; vx: number; vy: number; life: number; maxLife: number; }

// Obstacle damage values
const OBST_DMG: Record<string, number> = {
  obs_block: 15, obs_hedgehog: 20, obs_dragon: 25, obs_bomb: 50,
};

export default class GameScene extends Phaser.Scene {
  private state: GameState = 'MENU';

  // Run-level state (persists across levels via scene data)
  private currentRunLevel = 1;
  private tempUpgrades: RunUpgradeDef[] = [];
  private runTotalCoins = 0;
  private runTotalKilled = 0;

  // HUD
  private hudBg!: Phaser.GameObjects.Rectangle;
  private hudHpBar!: Phaser.GameObjects.Rectangle;
  private hudHpBarBg!: Phaser.GameObjects.Rectangle;
  private hudHpText!: Phaser.GameObjects.Text;
  private hudCoinsText!: Phaser.GameObjects.Text;
  private hudConvoyText!: Phaser.GameObjects.Text;
  private hudProgressBg!: Phaser.GameObjects.Rectangle;
  private hudProgressBar!: Phaser.GameObjects.Rectangle;
  private hudProgressText!: Phaser.GameObjects.Text;
  private hudTimerText!: Phaser.GameObjects.Text;
  private hudLevelText!: Phaser.GameObjects.Text;

  // Road
  private roadLines: Phaser.GameObjects.Rectangle[] = [];
  private roadLineY: number[] = [];

  // Player stats
  private playerMaxHp = CONFIG.PLAYER_HP;
  private playerSpeedX = CONFIG.PLAYER_SPEED_X;
  private playerFireRate = CONFIG.PLAYER_FIRE_RATE;
  private playerDmg = 1;
  private playerSpreadShots = 1;
  private playerVehicleKey = 'player';

  // Mission session counters
  private missionKillCount = 0;
  private missionHeavyCount = 0;
  private missionBomberCount = 0;
  private missionRunCoins = 0;
  private missionSurviveSeconds = 0;

  // Player state
  private playerContainer!: Phaser.GameObjects.Container;
  private playerHp = 0;
  private playerCoins = 0;
  private playerShootTimer = 0;
  private playerX = CONFIG.WIDTH / 2;
  private playerY = CONFIG.HEIGHT - 130;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private pointerX: number | null = null;
  private isPointerDown = false;

  // Collections
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private allyBonuses: AllyBonus[] = [];
  private allies: AllyVehicle[] = [];
  private particles: Particle[] = [];

  // Timers
  private enemySpawnTimer = 0;
  private obstacleSpawnTimer = 0;
  private allyBonusTimer = 0;
  private allyBonusInterval = 10000;
  private repairBonusTimer = 0;
  private levelTimer = 0;
  private enemiesKilled = 0;
  private difficultyScale = 1;
  private bossSpawned = false;

  private menuObjects: Phaser.GameObjects.GameObject[] = [];
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];

  // Combo/streak
  private streakCount = 0;
  private streakMultiplier = 1;
  private hudStreakText!: Phaser.GameObjects.Text;

  // Wave warning
  private waveWarningShown = false;
  private lastWaveWarningSecond = -1;

  // Random events
  private randomEventTimer = 0;
  private randomEventInterval = 0;
  private airRaidActive = false;
  private airRaidTimer = 0;
  private enemySpeedMultiplier = 1;

  constructor() { super({ key: 'GameScene' }); }

  // Called before create() when scene is (re)started with data
  init(data?: Record<string, unknown>) {
    const d = data as { resumeLevel?: number; tempUpgrades?: RunUpgradeDef[]; runTotalCoins?: number; runTotalKilled?: number } | undefined;
    if (d?.resumeLevel && d.resumeLevel > 1) {
      this.currentRunLevel = d.resumeLevel;
      this.tempUpgrades = d.tempUpgrades ?? [];
      this.runTotalCoins = d.runTotalCoins ?? 0;
      this.runTotalKilled = d.runTotalKilled ?? 0;
    } else if (!d?.resumeLevel) {
      // Fresh game start (from menu or restart)
      this.currentRunLevel = 1;
      this.tempUpgrades = [];
      this.runTotalCoins = 0;
      this.runTotalKilled = 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  create() {
    createPixelTextures(this);
    this.createBackground();
    this.createRoad();
    this.createHUD();
    this.createPlayer();
    this.setupInput();

    // Referral bonus (one-time per session)
    if (!sessionStorage.getItem('refBonusClaimed')) {
      const tg = (window as any).Telegram?.WebApp;
      const startParam = tg?.initDataUnsafe?.start_param;
      if (startParam?.startsWith('ref_')) {
        sessionStorage.setItem('refBonusClaimed', '1');
        addCoins(100);
        this.time.delayedCall(1000, () => {
          const t = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, '🎁 +100 монет\nза реферал!', {
            fontSize: '22px', color: '#ffd700', fontFamily: 'monospace', align: 'center',
            stroke: '#000', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(50);
          this.tweens.add({ targets: t, y: t.y - 80, alpha: 0, duration: 2000, onComplete: () => t.destroy() });
        });
      }
    }

    if (this.currentRunLevel > 1) {
      // Resuming from LevelUpScene — skip menu, start immediately
      this.startGame();
    } else {
      const data = loadData();
      getOrCreatePlayerName(); // ensure player has a name
      if (!data.onboardingDone) {
        this.scene.start('OnboardingScene');
      } else {
        this.showMenu();
      }
    }
  }

  private createBackground() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x0d1520);
    this.add.rectangle(CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X + 4, CONFIG.HEIGHT, 0x1e1a0a);
    this.add.rectangle(CONFIG.WIDTH - CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X + 4, CONFIG.HEIGHT, 0x1e1a0a);
    for (const p of [18, 30, 22].map((x, i) => ({ x, y: 200 + i * 250 }))) {
      this.add.rectangle(p.x, p.y, 20, 40, 0x2a1f0c).setDepth(0);
    }
    for (const p of [CONFIG.WIDTH - 18, CONFIG.WIDTH - 30].map((x, i) => ({ x, y: 150 + i * 300 }))) {
      this.add.rectangle(p.x, p.y, 20, 40, 0x2a1f0c).setDepth(0);
    }
  }

  private createRoad() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_WIDTH, CONFIG.HEIGHT, 0x202020);
    this.add.rectangle(CONFIG.ROAD_X, CONFIG.HEIGHT / 2, 3, CONFIG.HEIGHT, 0x3a5a3a);
    this.add.rectangle(CONFIG.ROAD_X + CONFIG.ROAD_WIDTH, CONFIG.HEIGHT / 2, 3, CONFIG.HEIGHT, 0x3a5a3a);
    for (let i = 0; i < 7; i++) {
      const y = (CONFIG.HEIGHT / 7) * i + 40;
      this.roadLines.push(this.add.rectangle(CONFIG.WIDTH / 2, y, 5, 36, 0x333333));
      this.roadLineY.push(y);
    }
  }

  private createHUD() {
    this.hudBg = this.add.rectangle(CONFIG.WIDTH / 2, 34, CONFIG.WIDTH, 68, 0x080808, 0.92).setDepth(10);
    this.hudHpBarBg = this.add.rectangle(85, 17, 124, 13, 0x2a2a2a).setDepth(11);
    this.hudHpBar = this.add.rectangle(23, 17, 124, 13, CONFIG.COLORS.HUD_HP).setDepth(12).setOrigin(0, 0.5);
    this.hudHpText = this.add.text(20, 8, 'HP', { fontSize: '12px', color: '#88ff88', fontFamily: 'monospace' }).setDepth(12);
    this.hudCoinsText = this.add.text(160, 8, '$ 0', { fontSize: '14px', color: '#FFD700', fontFamily: 'monospace' }).setDepth(12);
    this.hudConvoyText = this.add.text(20, 36, '[=] 1', { fontSize: '12px', color: '#88ccff', fontFamily: 'monospace' }).setDepth(12);
    this.hudLevelText = this.add.text(CONFIG.WIDTH - 8, 8, 'РІВ 1', { fontSize: '12px', color: '#88ccff', fontFamily: 'monospace' }).setDepth(12).setOrigin(1, 0);
    this.hudProgressBg = this.add.rectangle(CONFIG.WIDTH / 2, 57, 310, 9, 0x1a1a1a).setDepth(11);
    this.hudProgressBar = this.add.rectangle(CONFIG.WIDTH / 2 - 155, 57, 0, 9, CONFIG.COLORS.PROGRESS).setDepth(12).setOrigin(0, 0.5);
    this.hudProgressText = this.add.text(CONFIG.WIDTH - 8, 48, '0%', { fontSize: '12px', color: '#FFD700', fontFamily: 'monospace' }).setDepth(12).setOrigin(1, 0);
    this.hudTimerText = this.add.text(CONFIG.WIDTH / 2, 48, '3:00', { fontSize: '13px', color: '#888888', fontFamily: 'monospace' }).setDepth(12).setOrigin(0.5, 0);
    this.hudStreakText = this.add.text(120, 36, '', { fontSize: '13px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3 }).setDepth(12).setOrigin(0, 0.5).setVisible(false);
    this.setHudVisible(false);
  }

  private setHudVisible(v: boolean) {
    [this.hudBg, this.hudHpBar, this.hudHpBarBg, this.hudHpText, this.hudCoinsText,
      this.hudConvoyText, this.hudProgressBg, this.hudProgressBar, this.hudProgressText,
      this.hudTimerText, this.hudLevelText,
    ].forEach(o => o.setVisible(v));
    if (!v) this.hudStreakText.setVisible(false);
  }

  private createPlayer() {
    this.playerContainer = this.add.container(this.playerX, this.playerY);
    this.playerContainer.add(this.add.image(0, 0, 'player'));
    this.playerContainer.setDepth(5);
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => { if (this.isPointerDown) this.pointerX = ptr.x; });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => { this.isPointerDown = true; this.pointerX = ptr.x; });
    this.input.on('pointerup', () => { this.isPointerDown = false; this.pointerX = null; });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MENU
  // ═══════════════════════════════════════════════════════════════════════════
  private showMenu() {
    this.state = 'MENU';
    this.clearOverlay();

    const data = loadData();
    const dailyReward = claimDailyReward();
    const veh = VEHICLES.find(v => v.id === data.selectedVehicle) ?? VEHICLES[0];
    const cx = CONFIG.WIDTH / 2;

    const bg = this.add.rectangle(cx, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x050510, 0.93).setDepth(20);

    // ── Title ─────────────────────────────────────────────────────────────────
    const title = this.add.text(cx, 42, 'БАВОВНА ROAD', {
      fontSize: '34px', color: '#FFD700', fontFamily: 'monospace', stroke: '#0a0a0a', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(21);

    const sub = this.add.text(cx, 80, 'Грай. Допомагай. Перемагай.', {
      fontSize: '13px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(21);

    const flagB = this.add.rectangle(cx, 98, CONFIG.WIDTH - 20, 5, 0x005bbb).setDepth(21);
    const flagY = this.add.rectangle(cx, 103, CONFIG.WIDTH - 20, 5, 0xffd700).setDepth(21);

    // ── Vehicle card (compact, no collection progress) ─────────────────────────
    const cardBg = this.add.rectangle(cx, 210, CONFIG.WIDTH - 20, 190, 0x0a1520)
      .setStrokeStyle(2, veh.color).setDepth(21);

    // Vehicle sprite left
    const demo = this.add.image(76, 200, veh.textureKey).setScale(1.8).setDepth(22);
    this.tweens.add({ targets: demo, y: 208, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Info right
    const vehLabelT = this.add.text(cx + 20, 132, veh.label.toUpperCase(), {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    const vehDescT = this.add.text(cx + 20, 168, veh.description, {
      fontSize: '11px', color: '#667788', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(22);

    const vehHpT   = this.add.text(cx + 20, 200, `HP:${veh.baseHp}`, { fontSize: '12px', color: '#44aa66', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);
    const vehSpdT  = this.add.text(cx + 20, 220, `Шв:${veh.baseSpeed}`, { fontSize: '12px', color: '#44aa66', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);
    const vehShotT = this.add.text(cx + 20, 240, `${veh.spreadShots > 1 ? `${veh.spreadShots}x постріл` : '1x постріл'}`, { fontSize: '12px', color: '#44aa66', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);

    // Donate button (compact)
    const donateBg = this.add.rectangle(cx, 282, CONFIG.WIDTH - 60, 36, 0x0a2200).setDepth(21)
      .setStrokeStyle(1, 0x44aa00).setInteractive({ useHandCursor: true });
    const donateBtnT = this.add.text(cx, 282, '⚡ ЗАРЯДИТИ ЗБІР — 10 ⭐', { fontSize: '13px', color: '#88ff44', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);
    donateBg.on('pointerdown', () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openInvoice) {
        tg.openInvoice('https://t.me/bavovnaroad?start=donate10', (status: string) => {
          if (status === 'paid') {
            const toast = this.add.text(cx, CONFIG.HEIGHT / 2, 'Дякуємо! ⭐ йдуть на ЗСУ', {
              fontSize: '16px', color: '#88ff44', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setDepth(30);
            this.tweens.add({ targets: toast, y: CONFIG.HEIGHT / 2 - 60, alpha: 0, duration: 2000, onComplete: () => toast.destroy() });
          }
        });
      } else {
        window.open('https://t.me/bavovnaroad', '_blank');
      }
    });
    donateBg.on('pointerover', () => donateBg.setFillStyle(0x143a00));
    donateBg.on('pointerout',  () => donateBg.setFillStyle(0x0a2200));

    // ── PLAY button ────────────────────────────────────────────────────────────
    const playBg = this.add.rectangle(cx, 352, CONFIG.WIDTH - 40, 66, 0x005bbb).setDepth(21)
      .setStrokeStyle(3, 0xffd700).setInteractive({ useHandCursor: true });
    const playT = this.add.text(cx, 352, '▶  ГРАТИ', {
      fontSize: '30px', color: '#FFD700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);
    playBg.on('pointerdown', () => this.startGame());
    playBg.on('pointerover', () => playBg.setFillStyle(0x1177dd));
    playBg.on('pointerout',  () => playBg.setFillStyle(0x005bbb));
    this.tweens.add({ targets: [playBg, playT], scaleX: 1.02, scaleY: 1.02, duration: 800, yoyo: true, repeat: -1 });

    // ── Stats bar ──────────────────────────────────────────────────────────────
    const statsBg = this.add.rectangle(cx, 430, CONFIG.WIDTH - 20, 36, 0x0a140a).setDepth(21).setStrokeStyle(1, 0x1a3a1a);
    const statsT  = this.add.text(cx, 430,
      `💰 ${data.totalCoins}  |  🏆 ${data.bestScore}  |  🚗 ${data.maxConvoy + 1}`,
      { fontSize: '13px', color: '#aaffaa', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5).setDepth(22);

    // ── Navigation 3×2 grid ────────────────────────────────────────────────────
    const navW = (CONFIG.WIDTH - 28) / 3, navH = 44, navGap = 6;
    const row1Y = 474, row2Y = 524;

    const navDefs = [
      { label: 'ГАРАЖ',      col: 0x0d2200, border: 0x44aa00, txt: '#88ff44', row: row1Y, i: 0, cb: () => { this.clearMenu(); this.scene.start('GarageScene'); } },
      { label: 'МІСІЇ',      col: 0x1a0a22, border: 0x773399, txt: '#cc88ff', row: row1Y, i: 1, cb: () => { this.clearMenu(); this.scene.start('MissionsScene'); } },
      { label: 'СЛАВА',      col: 0x0a0a22, border: 0x3333aa, txt: '#6666ff', row: row1Y, i: 2, cb: () => { this.clearMenu(); this.scene.start('HallOfFameScene'); } },
      { label: '🛍 МЕРЧ',    col: 0x1a1000, border: 0x775500, txt: '#ccaa44', row: row2Y, i: 0, cb: () => { this.clearMenu(); this.scene.start('MerchScene'); } },
      { label: '🚗 ЗБОРИ',   col: 0x0a1520, border: 0x3377cc, txt: '#88ccff', row: row2Y, i: 1, cb: () => { this.clearMenu(); this.scene.start('CollectionsScene'); } },
      { label: '❓ ДОВІДКА', col: 0x111111, border: 0x444444, txt: '#888888', row: row2Y, i: 2, cb: () => { this.clearMenu(); this.scene.start('HelpScene'); } },
    ];

    const navObjs: Phaser.GameObjects.GameObject[] = [];
    navDefs.forEach(n => {
      const x = 10 + n.i * (navW + navGap) + navW / 2;
      const b = this.add.rectangle(x, n.row, navW, navH, n.col).setDepth(21)
        .setStrokeStyle(2, n.border).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, n.row, n.label, { fontSize: '12px', color: n.txt, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);
      b.on('pointerdown', n.cb);
      b.on('pointerover', () => b.setAlpha(0.8));
      b.on('pointerout',  () => b.setAlpha(1));
      navObjs.push(b, t);
    });

    const ver = this.add.text(cx, CONFIG.HEIGHT - 22, 'Бавовна Road  v3.0', {
      fontSize: '10px', color: '#1a2233', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    this.menuObjects = [
      bg, title, sub, flagB, flagY, cardBg, donateBg, donateBtnT, playBg, playT,
      demo, vehLabelT, vehDescT, vehHpT, vehSpdT, vehShotT,
      statsBg, statsT, ...navObjs, ver,
    ];

    if (dailyReward !== null) {
      this.time.delayedCall(400, () => this.showDailyReward(dailyReward));
    }
  }

  private showDailyReward(amount: number) {
    const D = 30;
    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.6).setDepth(D);
    const box = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 300, 240, 0x0a1a0a).setDepth(D).setStrokeStyle(3, 0xffd700);
    const title = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 70, '🌟 ЩОДЕННА НАГОРОДА', {
      fontSize: '18px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 1);
    const amt = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 10, `+ ${amount} монет`, {
      fontSize: '28px', color: '#88ff44', fontFamily: 'monospace', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D + 1);
    const sub2 = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 40, 'Повертайся завтра\nза новою нагородою!', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(D + 1);
    const btnBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 90, 160, 44, 0x005bbb)
      .setDepth(D + 1).setStrokeStyle(2, 0xffd700).setInteractive({ useHandCursor: true });
    const btnT = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 90, 'Забрати!', {
      fontSize: '18px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 2);
    const objs = [bg, box, title, amt, sub2, btnBg, btnT];
    const close = () => objs.forEach(o => o.destroy());
    btnBg.on('pointerdown', close);
    bg.setInteractive().on('pointerdown', close);
    this.tweens.add({ targets: box, scaleX: { from: 0.6, to: 1 }, scaleY: { from: 0.6, to: 1 }, duration: 300, ease: 'Back.Out' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START GAME / LEVEL
  // ═══════════════════════════════════════════════════════════════════════════
  private startGame() {
    this.clearMenu();
    this.clearOverlay();
    this.tweens.killAll();
    this.time.removeAllEvents();

    // Load base vehicle stats
    const data = loadData();
    const upg = data.upgrades;
    const veh = VEHICLES.find(v => v.id === data.selectedVehicle) ?? VEHICLES[0];
    this.playerVehicleKey  = veh.textureKey;
    this.playerSpreadShots = veh.spreadShots;
    this.playerMaxHp    = veh.baseHp       + getStatFromUpgrade('armor',  upg.armor);
    this.playerSpeedX   = veh.baseSpeed    + getStatFromUpgrade('engine', upg.engine);
    this.playerFireRate = veh.baseFireRate  - getStatFromUpgrade('weapon', upg.weapon);
    this.playerDmg      = 1 + getStatFromUpgrade('damage', upg.damage);

    // Apply temporary run upgrades from previous levels
    for (const u of this.tempUpgrades) {
      switch (u.effect) {
        case 'maxhp':    this.playerMaxHp    += u.value; break;
        case 'speed':    this.playerSpeedX   += u.value; break;
        case 'damage':   this.playerDmg      += u.value; break;
        case 'firerate': this.playerFireRate  = Math.max(80, this.playerFireRate + u.value); break;
        case 'spread':   this.playerSpreadShots = Math.max(this.playerSpreadShots, u.value); break;
        case 'heal':     /* applied after HP init below */ break;
        case 'coins':    /* applied once at LevelUpScene */ break;
        default: break;
      }
    }

    const playerSprite = this.playerContainer.getAt(0) as Phaser.GameObjects.Image;
    playerSprite.setTexture(this.playerVehicleKey);

    // Reset session counters
    this.missionKillCount = 0; this.missionHeavyCount = 0;
    this.missionBomberCount = 0; this.missionRunCoins = 0;
    this.missionSurviveSeconds = 0;

    this.playerHp = this.playerMaxHp;

    // Apply heal upgrades after setting HP
    for (const u of this.tempUpgrades) {
      if (u.effect === 'heal') {
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + u.value);
      }
    }

    this.playerCoins = 0;
    this.playerX = CONFIG.WIDTH / 2;
    this.playerY = CONFIG.HEIGHT - 130;
    this.playerShootTimer = 0;
    this.enemySpawnTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.allyBonusTimer = 0;
    this.repairBonusTimer = 0;
    this.levelTimer = 0;
    this.enemiesKilled = 0;
    this.difficultyScale = 1;
    this.bossSpawned = false;
    this.allyBonusInterval = Phaser.Math.Between(CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX);
    this.streakCount = 0;
    this.streakMultiplier = 1;
    this.waveWarningShown = false;
    this.lastWaveWarningSecond = -1;
    this.randomEventTimer = 0;
    this.randomEventInterval = Phaser.Math.Between(25000, 32000);
    this.airRaidActive = false;
    this.airRaidTimer = 0;
    this.enemySpeedMultiplier = 1;

    // Destroy all live objects
    this.bullets.forEach(b => b.sprite.destroy());
    this.enemies.forEach(e => {
      this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
      e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
    });
    this.obstacles.forEach(o => { this.tweens.killTweensOf(o.sprite); o.sprite.destroy(); });
    this.allyBonuses.forEach(a => {
      this.tweens.killTweensOf(a.container.list[0] as Phaser.GameObjects.Image);
      a.container.destroy();
    });
    this.allies.forEach(a => a.container.destroy());
    this.particles.forEach(p => p.sprite.destroy());
    this.bullets = []; this.enemies = []; this.obstacles = [];
    this.allyBonuses = []; this.allies = []; this.particles = [];

    this.playerContainer.setPosition(this.playerX, this.playerY);
    this.setHudVisible(true);
    this.updateHUD();
    this.state = 'PLAYING';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════
  update(_time: number, delta: number) {
    if (this.state !== 'PLAYING') return;
    this.updateRoad(delta);
    this.updatePlayer(delta);
    this.updateAllies(delta);
    this.updateBullets(delta);
    this.updateEnemies(delta);
    this.updateObstacles(delta);
    this.updateAllyBonuses(delta);
    this.updateParticles(delta);
    this.updateSpawners(delta);
    this.updateLevel(delta);
    this.updateRandomEvents(delta);
    this.updateHUD();
  }

  private updateRoad(delta: number) {
    const speed = 300 * this.difficultyScale;
    for (let i = 0; i < this.roadLines.length; i++) {
      this.roadLineY[i] += speed * (delta / 1000);
      if (this.roadLineY[i] > CONFIG.HEIGHT + 30) this.roadLineY[i] -= CONFIG.HEIGHT + 60;
      this.roadLines[i].setY(this.roadLineY[i]);
    }
  }

  private updatePlayer(delta: number) {
    const dt = delta / 1000;
    const left  = CONFIG.ROAD_X + CONFIG.PLAYER_W / 2 + 5;
    const right = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - CONFIG.PLAYER_W / 2 - 5;

    if (this.cursors.left.isDown) this.playerX -= this.playerSpeedX * dt;
    else if (this.cursors.right.isDown) this.playerX += this.playerSpeedX * dt;

    if (this.isPointerDown && this.pointerX !== null) {
      const diff = this.pointerX - this.playerX;
      this.playerX += Math.sign(diff) * Math.min(Math.abs(diff), this.playerSpeedX * dt * 2.5);
    }

    this.playerX = Phaser.Math.Clamp(this.playerX, left, right);
    this.playerContainer.setX(this.playerX);

    this.playerShootTimer += delta;
    if (this.playerShootTimer >= this.playerFireRate) {
      this.playerShootTimer = 0;
      if (this.playerSpreadShots <= 1) {
        this.spawnBullet(this.playerX, this.playerY - 33, CONFIG.BULLET_SPEED, 'bullet_p', this.playerDmg);
      } else {
        const offsets = this.playerSpreadShots >= 3 ? [-22, 0, 22] : [-14, 14];
        for (const ox of offsets) {
          this.spawnBullet(this.playerX + ox, this.playerY - 33, CONFIG.BULLET_SPEED, 'bullet_p', this.playerDmg);
        }
      }
    }
  }

  private updateAllies(delta: number) {
    const left  = CONFIG.ROAD_X + CONFIG.PLAYER_W / 2 + 5;
    const right = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - CONFIG.PLAYER_W / 2 - 5;
    for (let i = 0; i < this.allies.length; i++) {
      const al = this.allies[i];
      const f = ALLY_FORMATION[i];
      al.targetX = Phaser.Math.Clamp(this.playerX + f.ox, left, right);
      al.targetY = Phaser.Math.Clamp(this.playerY + f.oy, CONFIG.HEIGHT - 300, CONFIG.HEIGHT - 60);
      al.container.x += (al.targetX - al.container.x) * 0.12;
      al.container.y += (al.targetY - al.container.y) * 0.12;
      al.shootTimer += delta;
      if (al.shootTimer >= CONFIG.ALLY_FIRE_RATE) {
        al.shootTimer = 0;
        this.spawnBullet(al.container.x, al.container.y - 33, CONFIG.ALLY_BULLET_SPEED, 'bullet_a', 1);
      }
    }
  }

  private spawnBullet(x: number, y: number, speed: number, key: string, dmg: number) {
    this.bullets.push({ sprite: this.add.image(x, y, key).setDepth(4), speed, dmg });
  }

  private updateBullets(delta: number) {
    const dt = delta / 1000;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.sprite.y -= b.speed * dt;
      if (b.sprite.y < -20) { b.sprite.destroy(); this.bullets.splice(i, 1); continue; }
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const ew = e.type === 'HEAVY' ? 40 : e.type === 'GENERAL' ? 44 : 30;
        const eh = e.type === 'HEAVY' ? 52 : e.type === 'GENERAL' ? 54 : 42;
        if (this.ov2(b.sprite.x, b.sprite.y, 6, 15, e.container.x, e.container.y, ew, eh)) {
          e.hp -= b.dmg;
          this.spawnParticles(b.sprite.x, b.sprite.y, 'particle_exp', 4);
          b.sprite.destroy(); this.bullets.splice(i, 1); hit = true;
          if (e.hp <= 0) this.killEnemy(j);
          else this.refreshHpBar(e);
          break;
        }
      }
      if (hit) continue;
    }
  }

  private getLevelConfig() {
    const idx = Math.min(this.currentRunLevel - 1, LEVEL_CONFIGS.length - 1);
    return LEVEL_CONFIGS[idx];
  }

  private spawnEnemy(type?: EnemyType) {
    const lvlCfg = this.getLevelConfig();
    const left = CONFIG.ROAD_X + 26;
    const right = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 26;
    const x = Phaser.Math.Between(left, right);

    if (!type) {
      // Pick random type from what this level allows
      const pool = lvlCfg.enemyTypes;
      const roll = Math.random();
      if (pool.includes('BOMBER') && roll < 0.12) type = 'BOMBER';
      else if (pool.includes('HEAVY') && roll < 0.25) type = 'HEAVY';
      else if (pool.includes('RUNNER') && roll < 0.42) type = 'RUNNER';
      else type = 'WALKER';
    }

    let hp = 4, speed = 180 * this.difficultyScale * this.enemySpeedMultiplier, coins = CONFIG.COINS_WALKER;
    let key = 'walker';
    let vx = 0;

    switch (type) {
      case 'HEAVY':
        hp = 10; speed = 85 * this.difficultyScale * this.enemySpeedMultiplier; coins = CONFIG.COINS_HEAVY; key = 'heavy'; break;
      case 'RUNNER':
        hp = 2; speed = 360 * this.difficultyScale * this.enemySpeedMultiplier; coins = CONFIG.COINS_RUNNER; key = 'runner';
        vx = Phaser.Math.FloatBetween(-80, 80); break;
      case 'BOMBER':
        hp = 6; speed = 110 * this.difficultyScale * this.enemySpeedMultiplier; coins = CONFIG.COINS_BOMBER; key = 'bomber'; break;
      case 'GENERAL':
        hp = 20; speed = 65 * this.difficultyScale * this.enemySpeedMultiplier; coins = CONFIG.COINS_GENERAL; key = 'general'; break;
    }

    const sprite = this.add.image(0, 0, key);
    if (type === 'BOMBER') {
      this.tweens.add({ targets: sprite, scaleX: 1.12, scaleY: 1.12, duration: 300, yoyo: true, repeat: -1 });
    } else {
      this.tweens.add({ targets: sprite, angle: { from: -4, to: 4 }, duration: 180, yoyo: true, repeat: -1 });
    }

    const container = this.add.container(x, -80, [sprite]).setDepth(3);

    let hpBar: Phaser.GameObjects.Rectangle | undefined;
    let hpBarBg: Phaser.GameObjects.Rectangle | undefined;
    if (type === 'HEAVY' || type === 'GENERAL') {
      const barW = type === 'GENERAL' ? 54 : 44;
      hpBarBg = this.add.rectangle(x, -120, barW, 6, 0x222222).setDepth(3);
      hpBar   = this.add.rectangle(x - barW / 2, -120, barW, 6, type === 'GENERAL' ? 0xffaa00 : 0xff3333).setDepth(4).setOrigin(0, 0.5);
    }

    this.enemies.push({ container, hp, maxHp: hp, type, speed, coins, hpBar, hpBarBg, vx });
  }

  private refreshHpBar(e: Enemy) {
    if (e.hpBar && e.hpBarBg) {
      const barW = e.type === 'GENERAL' ? 54 : 44;
      const pct = e.hp / e.maxHp;
      e.hpBar.setSize(barW * pct, 6);
      e.hpBar.setPosition(e.container.x - barW / 2, e.container.y - 44);
      e.hpBarBg.setPosition(e.container.x, e.container.y - 44);
    }
  }

  private killEnemy(index: number) {
    if (index < 0 || index >= this.enemies.length) return;
    const e = this.enemies[index];
    if (e.dying) return;
    e.dying = true;

    const nx = e.container.x, ny = e.container.y;
    const type = e.type, coins = e.coins;

    this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
    this.enemies.splice(index, 1);

    this.spawnParticles(nx, ny, 'particle_exp', type === 'BOMBER' ? 18 : type === 'GENERAL' ? 24 : 10);
    if (type === 'BOMBER') this.bomberExplode(nx, ny);
    if (type === 'GENERAL') this.cameras.main.flash(300, 255, 180, 0, true);

    e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();

    this.streakCount++;
    if (this.streakCount >= 5 && this.streakMultiplier < 2) {
      this.streakMultiplier = 2;
      const comboTxt = this.add.text(CONFIG.WIDTH / 2, 90, '+x2 КОМБО!', {
        fontSize: '22px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: comboTxt, y: 70, alpha: 0, duration: 1800, onComplete: () => comboTxt.destroy() });
    }

    const earnedCoins = coins * this.streakMultiplier;
    this.playerCoins += earnedCoins;
    this.enemiesKilled++;
    this.missionKillCount++;
    if (type === 'HEAVY' || type === 'GENERAL') this.missionHeavyCount++;
    if (type === 'BOMBER') this.missionBomberCount++;

    const coinLabel = this.streakMultiplier > 1 ? `+${earnedCoins}(x${this.streakMultiplier})` : `+${earnedCoins}`;
    const txt = this.add.text(nx, ny, coinLabel, {
      fontSize: '15px', color: '#FFD700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: txt, y: ny - 55, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }

  private bomberExplode(x: number, y: number) {
    if (this.ov2(x, y, 80, 80, this.playerX, this.playerY, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
      this.damagePlayer(20);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (this.ov2(x, y, 80, 80, e.container.x, e.container.y, 34, 44)) {
        e.hp -= 2;
        if (e.hp <= 0) this.killEnemy(i);
      }
    }
    this.cameras.main.flash(250, 255, 120, 0, true);
  }

  private updateEnemies(delta: number) {
    const dt = delta / 1000;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.container.y += e.speed * dt;

      if (e.vx && e.type === 'RUNNER') {
        e.container.x += e.vx * dt;
        const left = CONFIG.ROAD_X + 20, right = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 20;
        if (e.container.x < left || e.container.x > right) e.vx *= -1;
      }

      if (e.hpBar) this.refreshHpBar(e);

      // Enemy reached bottom of screen — damage player, remove enemy
      if (e.container.y > CONFIG.HEIGHT + 40) {
        this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
        e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
        this.enemies.splice(i, 1);
        this.damagePlayer(5); // -5 HP for enemy that slipped through
        continue;
      }

      const ew = e.type === 'HEAVY' ? 40 : e.type === 'GENERAL' ? 44 : 30;
      const eh = e.type === 'HEAVY' ? 52 : e.type === 'GENERAL' ? 54 : 42;

      // Collision with player
      if (this.ov2(e.container.x, e.container.y, ew, eh, this.playerX, this.playerY, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
        const dmg = e.type === 'BOMBER' ? 30 : e.type === 'GENERAL' ? 25 : CONFIG.COLLISION_DAMAGE;
        if (e.type === 'BOMBER') this.bomberExplode(e.container.x, e.container.y);
        else this.damagePlayer(dmg);
        this.spawnParticles(e.container.x, e.container.y, 'particle_exp', 8);
        this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
        e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
        this.enemies.splice(i, 1); continue;
      }

      // Collision with allies — ally gets destroyed
      for (let j = this.allies.length - 1; j >= 0; j--) {
        const al = this.allies[j];
        if (this.ov2(e.container.x, e.container.y, ew, eh, al.container.x, al.container.y, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
          // Destroy the ally
          this.spawnParticles(al.container.x, al.container.y, 'particle_exp', 12);
          const txt = this.add.text(al.container.x, al.container.y - 20, '-АВТО', {
            fontSize: '16px', color: '#ff4444', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(15);
          this.tweens.add({ targets: txt, y: al.container.y - 80, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
          al.container.destroy();
          this.allies.splice(j, 1);
          // Also remove the enemy
          this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
          e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
          this.enemies.splice(i, 1);
          break;
        }
      }
    }
  }

  private spawnObstacle() {
    const x = Phaser.Math.Between(CONFIG.ROAD_X + 22, CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 22);
    const lvl = this.currentRunLevel;

    // Obstacle pool changes with level
    let pool: string[];
    if (lvl <= 3)       pool = ['obs_block', 'obs_block', 'obs_block', 'obs_hedgehog'];
    else if (lvl <= 6)  pool = ['obs_block', 'obs_hedgehog', 'obs_hedgehog', 'obs_dragon'];
    else if (lvl <= 10) pool = ['obs_block', 'obs_hedgehog', 'obs_dragon', 'obs_dragon', 'obs_bomb'];
    else                pool = ['obs_hedgehog', 'obs_dragon', 'obs_dragon', 'obs_bomb', 'obs_bomb'];

    const key = pool[Math.floor(Math.random() * pool.length)];
    const sprite = this.add.image(x, -40, key).setDepth(3);

    // Pulsing for bombs only
    if (key === 'obs_bomb') {
      this.tweens.add({ targets: sprite, scaleX: 1.2, scaleY: 1.2, duration: 400, yoyo: true, repeat: -1 });
    }

    const hw = sprite.width / 2 - 2, hh = sprite.height / 2 - 2;
    this.obstacles.push({ sprite, hw, hh, key });
  }

  private updateObstacles(delta: number) {
    const dt = delta / 1000;
    const speed = 155 * this.difficultyScale;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.sprite.y += speed * dt;

      if (o.sprite.y > CONFIG.HEIGHT + 50) {
        this.tweens.killTweensOf(o.sprite);
        o.sprite.destroy(); this.obstacles.splice(i, 1); continue;
      }

      // Player collision
      if (this.ov2(o.sprite.x, o.sprite.y, o.hw * 2, o.hh * 2, this.playerX, this.playerY, CONFIG.PLAYER_W - 4, CONFIG.PLAYER_H - 8)) {
        const dmg = OBST_DMG[o.key] ?? CONFIG.COLLISION_DAMAGE;
        this.damagePlayer(dmg);
        this.spawnParticles(o.sprite.x, o.sprite.y, 'particle_exp', o.key === 'obs_bomb' ? 18 : 6);
        if (o.key === 'obs_bomb') this.cameras.main.shake(300, 0.015);
        this.tweens.killTweensOf(o.sprite);
        o.sprite.destroy(); this.obstacles.splice(i, 1); continue;
      }

      // Ally collision — destroy ally and obstacle
      for (let j = this.allies.length - 1; j >= 0; j--) {
        const al = this.allies[j];
        if (this.ov2(o.sprite.x, o.sprite.y, o.hw * 2, o.hh * 2, al.container.x, al.container.y, CONFIG.PLAYER_W - 4, CONFIG.PLAYER_H - 8)) {
          this.spawnParticles(al.container.x, al.container.y, 'particle_exp', 10);
          const txt = this.add.text(al.container.x, al.container.y - 20, '-АВТО', {
            fontSize: '16px', color: '#ff4444', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(15);
          this.tweens.add({ targets: txt, y: al.container.y - 80, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
          al.container.destroy();
          this.allies.splice(j, 1);
          this.tweens.killTweensOf(o.sprite);
          o.sprite.destroy(); this.obstacles.splice(i, 1);
          break;
        }
      }
    }
  }

  private spawnAllyBonus(type: 'ally' | 'repair' = 'ally') {
    if (type === 'ally' && this.allies.length >= CONFIG.MAX_ALLIES) return;
    const x = Phaser.Math.Between(CONFIG.ROAD_X + 30, CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 30);
    const key = type === 'ally' ? 'bonus_ally' : 'bonus_repair';
    const sprite = this.add.image(0, 0, key);
    const container = this.add.container(x, -60, [sprite]).setDepth(3);
    // Ally bonus: pulsing glow, no rotation (so the car shape is clear)
    if (type === 'ally') {
      this.tweens.add({ targets: sprite, scaleX: 1.18, scaleY: 1.18, duration: 500, yoyo: true, repeat: -1 });
    } else {
      this.tweens.add({ targets: sprite, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1 });
    }
    this.allyBonuses.push({ container, type });
  }

  private updateAllyBonuses(delta: number) {
    const dt = delta / 1000;
    for (let i = this.allyBonuses.length - 1; i >= 0; i--) {
      const a = this.allyBonuses[i];
      a.container.y += 130 * dt;
      if (a.container.y > CONFIG.HEIGHT + 50) {
        this.tweens.killTweensOf(a.container.list[0] as Phaser.GameObjects.Image);
        a.container.destroy(); this.allyBonuses.splice(i, 1); continue;
      }
      if (this.ov2(a.container.x, a.container.y, 36, 42, this.playerX, this.playerY, CONFIG.PLAYER_W + 24, CONFIG.PLAYER_H + 24)) {
        this.tweens.killTweensOf(a.container.list[0] as Phaser.GameObjects.Image);
        if (a.type === 'ally') this.pickupAlly(a.container.x, a.container.y);
        else this.pickupRepair(a.container.x, a.container.y);
        a.container.destroy(); this.allyBonuses.splice(i, 1);
      }
    }
  }

  private pickupAlly(x: number, y: number) {
    if (this.allies.length >= CONFIG.MAX_ALLIES) return;
    const sprite = this.add.image(0, 0, 'ally');
    const container = this.add.container(x, y, [sprite]).setDepth(4);
    this.allies.push({ container, shootTimer: Phaser.Math.Between(0, CONFIG.ALLY_FIRE_RATE), targetX: x, targetY: y });
    this.spawnParticles(x, y, 'particle_bonus', 10);
    const txt = this.add.text(x, y - 40, '+1 АВТО', {
      fontSize: '18px', color: '#00ccff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  private pickupRepair(x: number, y: number) {
    const heal = 25;
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);
    this.spawnParticles(x, y, 'particle_bonus', 8);
    const txt = this.add.text(x, y - 40, `+${heal} HP`, {
      fontSize: '18px', color: '#44ff44', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  private spawnParticles(x: number, y: number, key: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        sprite: this.add.image(x, y, key).setDepth(6),
        vx: Phaser.Math.FloatBetween(-130, 130),
        vy: Phaser.Math.FloatBetween(-190, 50),
        life: 420, maxLife: 420,
      });
    }
  }

  private updateParticles(delta: number) {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.sprite.x += p.vx * dt; p.sprite.y += p.vy * dt; p.vy += 220 * dt;
      p.life -= delta; p.sprite.setAlpha(p.life / p.maxLife);
      if (p.life <= 0) { p.sprite.destroy(); this.particles.splice(i, 1); }
    }
  }

  private updateRandomEvents(delta: number) {
    this.randomEventTimer += delta;

    // Air raid: enemies already active get speed multiplier update handled via enemySpeedMultiplier
    if (this.airRaidActive) {
      this.airRaidTimer -= delta;
      if (this.airRaidTimer <= 0) {
        this.airRaidActive = false;
        this.enemySpeedMultiplier = 1;
      }
    }

    if (this.randomEventTimer >= this.randomEventInterval) {
      this.randomEventTimer = 0;
      this.randomEventInterval = Phaser.Math.Between(25000, 32000);
      const event = Math.random() < 0.5 ? 'airRaid' : 'reinforcement';

      if (event === 'airRaid') {
        // Speed up all existing enemies by 1.5x
        this.airRaidActive = true;
        this.airRaidTimer = 8000;
        this.enemySpeedMultiplier = 1.5;
        for (const e of this.enemies) {
          e.speed *= 1.5;
        }
        const alertTxt = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 60, '🚨 ПОВІТРЯНА ТРИВОГА', {
          fontSize: '20px', color: '#ff4444', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: alertTxt, alpha: { from: 1, to: 0 }, duration: 2000, onComplete: () => alertTxt.destroy() });
      } else {
        // Reinforcement: spawn 3 ally bonuses
        const reinforceTxt = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 60, '🚁 ПІДКРІПЛЕННЯ!', {
          fontSize: '20px', color: '#44ff44', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: reinforceTxt, alpha: { from: 1, to: 0 }, duration: 2000, onComplete: () => reinforceTxt.destroy() });
        this.spawnAllyBonus('ally');
        this.time.delayedCall(400, () => { if (this.state === 'PLAYING') this.spawnAllyBonus('ally'); });
        this.time.delayedCall(800, () => { if (this.state === 'PLAYING') this.spawnAllyBonus('ally'); });
      }
    }
  }

  private updateSpawners(delta: number) {
    // Wave warning: every 20 seconds show a warning
    const warnSecond = Math.floor(this.levelTimer / 20000);
    if (warnSecond !== this.lastWaveWarningSecond && this.levelTimer > 0) {
      this.lastWaveWarningSecond = warnSecond;
      const warnTxt = this.add.text(CONFIG.WIDTH / 2, 85, '⚠️ ХВИЛЯ!', {
        fontSize: '20px', color: '#ff8800', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: warnTxt, alpha: { from: 1, to: 0 }, y: 75, duration: 2000, onComplete: () => warnTxt.destroy() });
    }

    const lvlCfg = this.getLevelConfig();

    // Enemies
    this.enemySpawnTimer += delta;
    if (this.enemySpawnTimer >= lvlCfg.spawnInterval / this.difficultyScale) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
      if (Math.random() < 0.35 + this.difficultyScale * 0.08) {
        const t2: EnemyType = Math.random() < 0.3 ? 'RUNNER' : 'WALKER';
        this.time.delayedCall(280, () => { if (this.state === 'PLAYING') this.spawnEnemy(t2); });
      }
      if (this.difficultyScale >= 2 && Math.random() < 0.2) {
        this.time.delayedCall(560, () => { if (this.state === 'PLAYING') this.spawnEnemy('WALKER'); });
      }
    }

    // Obstacles
    this.obstacleSpawnTimer += delta;
    if (this.obstacleSpawnTimer >= lvlCfg.obstacleInterval / this.difficultyScale) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstacle();
    }

    // Ally bonus — only if convoy not maxed
    this.allyBonusTimer += delta;
    if (this.allyBonusTimer >= this.allyBonusInterval) {
      this.allyBonusTimer = 0;
      this.allyBonusInterval = Phaser.Math.Between(CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX);
      if (this.allies.length < CONFIG.MAX_ALLIES && Math.random() < 0.15) {
        this.spawnAllyBonus('ally');
      }
    }

    // Repair bonus — every 30s
    this.repairBonusTimer += delta;
    if (this.repairBonusTimer >= 30000) {
      this.repairBonusTimer = 0;
      this.spawnAllyBonus('repair');
    }
  }

  private updateLevel(delta: number) {
    this.levelTimer += delta;
    this.missionSurviveSeconds = this.levelTimer / 1000;

    // Phase-based difficulty: every 30s within this level
    const stage = Math.floor(this.levelTimer / 30000);
    const lvlCfg = this.getLevelConfig();
    this.difficultyScale = lvlCfg.baseScale + stage * lvlCfg.phaseScale;

    // Boss spawn: on boss levels, spawn GENERAL at 150s (2:30 into level)
    if (lvlCfg.bossLevel && !this.bossSpawned && this.levelTimer >= 45000) {
      this.bossSpawned = true;
      this.spawnEnemy('GENERAL');
      const bossAlert = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 80, '⚠️ ГЕНЕРАЛ ДИВАНУ!', {
        fontSize: '22px', color: '#ffaa00', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: bossAlert, alpha: 0, y: CONFIG.HEIGHT / 2 - 120, duration: 2500, onComplete: () => bossAlert.destroy() });
    }

    if (this.levelTimer >= CONFIG.LEVEL_DURATION) this.triggerLevelComplete();
  }

  private updateHUD() {
    const hpPct = this.playerHp / this.playerMaxHp;
    this.hudHpBar.setSize(124 * hpPct, 13).setX(23);
    this.hudHpBar.setFillStyle(hpPct > 0.35 ? CONFIG.COLORS.HUD_HP : CONFIG.COLORS.HUD_HP_LOW);
    this.hudHpText.setText(`HP ${this.playerHp}/${this.playerMaxHp}`);
    this.hudCoinsText.setText(`$ ${this.playerCoins}`);
    this.hudConvoyText.setText(`[=] ${this.allies.length + 1}`);
    this.hudLevelText.setText(`РІВ ${this.currentRunLevel}`);
    if (this.streakMultiplier > 1) {
      this.hudStreakText.setText(`x${this.streakMultiplier}`).setVisible(true);
    } else {
      this.hudStreakText.setVisible(false);
    }
    const prog = Math.min(this.levelTimer / CONFIG.LEVEL_DURATION, 1);
    this.hudProgressBar.setSize(310 * prog, 9);
    this.hudProgressText.setText(`${Math.floor(prog * 100)}%`);
    const rem = Math.max(0, (CONFIG.LEVEL_DURATION - this.levelTimer) / 1000);
    const min = Math.floor(rem / 60), sec = Math.floor(rem % 60);
    this.hudTimerText.setText(`${min}:${sec.toString().padStart(2, '0')}`);
  }

  private damagePlayer(amount: number) {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.cameras.main.flash(180, 180, 0, 0, true);
    this.streakCount = 0;
    this.streakMultiplier = 1;
    if (this.playerHp <= 0) this.triggerGameOver();
  }

  private ov2(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  private flushMissions(isVictory: boolean) {
    updateMissionProgress('kill',        this.missionKillCount);
    updateMissionProgress('kill_heavy',  this.missionHeavyCount);
    updateMissionProgress('kill_bomber', this.missionBomberCount);
    updateMissionProgress('coins',       this.playerCoins);
    updateMissionProgress('convoy',      this.allies.length + 1);
    updateMissionProgress('survive',     Math.floor(this.missionSurviveSeconds));
    if (isVictory) updateMissionProgress('run', 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL COMPLETE (levels 1–14)
  // ═══════════════════════════════════════════════════════════════════════════
  private triggerLevelComplete() {
    if (this.state !== 'PLAYING') return;
    this.state = 'LEVEL_COMPLETE';
    this.setHudVisible(false);
    this.tweens.killAll();

    const bonus = CONFIG.COINS_VICTORY_BASE + this.allies.length * CONFIG.COINS_PER_ALLY;
    const levelCoins = this.playerCoins + bonus;
    addCoins(levelCoins);
    this.flushMissions(true);

    const newRunCoins   = this.runTotalCoins + levelCoins;
    const newRunKilled  = this.runTotalKilled + this.enemiesKilled;

    if (this.currentRunLevel >= 15) {
      // Final level — record run and go to LevelUpScene for final screen
      recordRun(newRunCoins, newRunKilled, this.allies.length, this.currentRunLevel);
      this.scene.start('LevelUpScene', {
        level: 15,
        levelCoins,
        levelKilled: this.enemiesKilled,
        convoy: this.allies.length + 1,
        tempUpgrades: this.tempUpgrades,
        runTotalCoins: newRunCoins,
        runTotalKilled: newRunKilled,
      });
      return;
    }

    // Non-final level — go to LevelUpScene for upgrade selection
    this.scene.start('LevelUpScene', {
      level: this.currentRunLevel,
      levelCoins,
      levelKilled: this.enemiesKilled,
      convoy: this.allies.length + 1,
      tempUpgrades: this.tempUpgrades,
      runTotalCoins: newRunCoins,
      runTotalKilled: newRunKilled,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════════════════════
  private triggerGameOver() {
    if (this.state !== 'PLAYING') return;
    this.state = 'GAME_OVER';
    this.setHudVisible(false);
    this.tweens.killAll();

    addCoins(this.playerCoins);
    const totalCoins  = this.runTotalCoins + this.playerCoins;
    const totalKilled = this.runTotalKilled + this.enemiesKilled;
    recordRun(totalCoins, totalKilled, this.allies.length, this.currentRunLevel);
    this.flushMissions(false);
    this.cameras.main.shake(420, 0.022);

    this.time.delayedCall(420, () => {
      this.clearOverlay();
      const D = 25;
      const cx = CONFIG.WIDTH / 2;

      const bg = this.add.rectangle(cx, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x1a0000, 0.88).setDepth(D);
      const title = this.add.text(cx, 56, 'ЗАБІГ ПРОВАЛЕНО', {
        fontSize: '28px', color: '#ff3333', fontFamily: 'monospace', stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(D + 1);
      this.tweens.add({ targets: title, scaleX: { from: 1.5, to: 1 }, scaleY: { from: 1.5, to: 1 }, duration: 300, ease: 'Back.Out' });

      // Emotional message
      let emotionalMsg: string;
      if (totalKilled > 30) {
        emotionalMsg = `Твій конвой знищено. Але ти обнулив ${totalKilled} орків.`;
      } else if (this.currentRunLevel >= 10) {
        emotionalMsg = `Дійшов до рівня ${this.currentRunLevel}/15. Реванш?`;
      } else {
        emotionalMsg = `Конвой з ${this.allies.length + 1} машин — знищено ворогом.`;
      }
      this.add.text(cx, 108, emotionalMsg, {
        fontSize: '13px', color: '#ffaa88', fontFamily: 'monospace', align: 'center',
        wordWrap: { width: 340 },
      }).setOrigin(0.5).setDepth(D + 1);

      // Stats row
      this.add.text(cx, 148,
        `💰 ${totalCoins}   ×${totalKilled}   🚗 ${this.allies.length + 1}`,
        { fontSize: '15px', color: '#cccccc', fontFamily: 'monospace', align: 'center' }
      ).setOrigin(0.5).setDepth(D + 1);

      // Button 1: Continue for 5 Stars
      const continueBg = this.add.rectangle(cx, 360, 300, 56, 0x003399).setDepth(D + 1)
        .setStrokeStyle(3, 0xffd700).setInteractive({ useHandCursor: true });
      this.add.text(cx, 360, 'Продовжити за 5 ⭐', { fontSize: '17px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      continueBg.on('pointerdown', () => {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.openInvoice) {
          tg.openInvoice('stars://pay/5', (status: string) => {
            if (status === 'paid') {
              this.clearOverlay();
              this.scene.start('GameScene', { resumeLevel: this.currentRunLevel, tempUpgrades: this.tempUpgrades, runTotalCoins: totalCoins, runTotalKilled: totalKilled });
            }
          });
        } else {
          // stub: just resume
          this.clearOverlay();
          this.scene.start('GameScene', { resumeLevel: this.currentRunLevel, tempUpgrades: this.tempUpgrades, runTotalCoins: totalCoins, runTotalKilled: totalKilled });
        }
      });
      continueBg.on('pointerover', () => continueBg.setFillStyle(0x0055cc));
      continueBg.on('pointerout',  () => continueBg.setFillStyle(0x003399));

      // Button 2: Share to Stories
      const storiesBg = this.add.rectangle(cx, 420, 260, 44, 0x001a33).setDepth(D + 1)
        .setStrokeStyle(2, 0x3377cc).setInteractive({ useHandCursor: true });
      this.add.text(cx, 420, '📤 Поділитись у Stories', { fontSize: '14px', color: '#88aaff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      storiesBg.on('pointerdown', () => {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.shareToStory) {
          tg.shareToStory('https://t.me/bavovnaroad/game', {
            text: `Я дійшов до рівня ${this.currentRunLevel}/15! 💰${totalCoins} | Грай за ЗСУ @bavovnaroad`
          });
        } else {
          window.open(`https://t.me/share/url?url=https://t.me/bavovnaroad&text=Граю за ЗСУ в Бавовна Road! Рівень ${this.currentRunLevel}/15 🔥`, '_blank');
        }
      });

      // Button 3: Challenge friend
      const challengeBg = this.add.rectangle(cx, 470, 260, 44, 0x1a0033).setDepth(D + 1)
        .setStrokeStyle(2, 0x7733cc).setInteractive({ useHandCursor: true });
      this.add.text(cx, 470, '🔫 Кинути виклик другу', { fontSize: '14px', color: '#cc88ff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      challengeBg.on('pointerdown', () => {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.switchInlineQuery) {
          tg.switchInlineQuery(`Бавовна Road: я дійшов до рівня ${this.currentRunLevel}/15! 💰${totalCoins} монет. Переб'єш? @bavovnaroad`);
        }
      });

      // Button 4: Loot box
      const lootBg = this.add.rectangle(cx, 520, 220, 44, 0x1a1a00).setDepth(D + 1)
        .setStrokeStyle(2, 0xaaaa00).setInteractive({ useHandCursor: true });
      this.add.text(cx, 520, '📦 ВІДКРИТИ СКРИНЮ', { fontSize: '13px', color: '#dddd44', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      lootBg.on('pointerdown', () => {
        this.clearOverlay();
        this.scene.start('LootboxScene', { coins: totalCoins, killed: totalKilled, convoy: this.allies.length + 1, victory: false });
      });
      lootBg.on('pointerover', () => lootBg.setFillStyle(0x2a2a00));
      lootBg.on('pointerout',  () => lootBg.setFillStyle(0x1a1a00));

      // Button 5: Play again
      const restartBg = this.add.rectangle(cx, 572, 220, 44, 0xaa0000).setDepth(D + 1)
        .setStrokeStyle(3, 0xff6666).setInteractive({ useHandCursor: true });
      this.add.text(cx, 572, '▶ ЗІГРАТИ ЩЕ РАЗ', { fontSize: '17px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      restartBg.on('pointerdown', () => {
        this.currentRunLevel = 1;
        this.tempUpgrades = [];
        this.runTotalCoins = 0;
        this.runTotalKilled = 0;
        this.startGame();
      });
      restartBg.on('pointerover', () => restartBg.setFillStyle(0xdd2222));
      restartBg.on('pointerout',  () => restartBg.setFillStyle(0xaa0000));

      // Button 6: Garage
      const garageBg = this.add.rectangle(cx, 620, 180, 38, 0x0a1a2e).setDepth(D + 1)
        .setStrokeStyle(2, 0x3377cc).setInteractive({ useHandCursor: true });
      this.add.text(cx, 620, 'ГАРАЖ', { fontSize: '16px', color: '#88ccff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      garageBg.on('pointerdown', () => { this.clearOverlay(); this.scene.start('GarageScene'); });

      // Button 7: Menu
      const menuBg = this.add.rectangle(cx, 664, 150, 36, 0x111111).setDepth(D + 1)
        .setStrokeStyle(1, 0x444444).setInteractive({ useHandCursor: true });
      this.add.text(cx, 664, '← Меню', { fontSize: '14px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      menuBg.on('pointerdown', () => {
        this.clearOverlay();
        this.currentRunLevel = 1;
        this.tempUpgrades = [];
        this.runTotalCoins = 0;
        this.runTotalKilled = 0;
        this.showMenu();
      });

      this.overlayObjects = [bg, title, continueBg, storiesBg, challengeBg, lootBg, restartBg, garageBg, menuBg];
    });
  }

  private clearMenu() { this.menuObjects.forEach(o => o.destroy()); this.menuObjects = []; }
  private clearOverlay() { this.overlayObjects.forEach(o => o.destroy()); this.overlayObjects = []; }
}
