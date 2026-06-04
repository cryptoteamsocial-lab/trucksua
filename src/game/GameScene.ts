import Phaser from 'phaser';
import { CONFIG, VEHICLES, CHARITY, getStatFromUpgrade } from './config';
import { loadData, addCoins, recordRun, claimDailyReward, updateMissionProgress } from './storage';
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
  vx?: number; // for bomber/runner lateral movement
  dying?: boolean;
}
interface Bullet  { sprite: Phaser.GameObjects.Image; speed: number; dmg: number; }
interface Obstacle { sprite: Phaser.GameObjects.Image; hw: number; hh: number; }
interface AllyBonus { container: Phaser.GameObjects.Container; type: 'ally' | 'repair'; }
interface AllyVehicle { container: Phaser.GameObjects.Container; shootTimer: number; targetX: number; targetY: number; }
interface Particle { sprite: Phaser.GameObjects.Image; vx: number; vy: number; life: number; maxLife: number; }

export default class GameScene extends Phaser.Scene {
  private state: GameState = 'MENU';

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

  // Road
  private roadLines: Phaser.GameObjects.Rectangle[] = [];
  private roadLineY: number[] = [];

  // Player stats (loaded from upgrades + selected vehicle)
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
  private playerY = CONFIG.HEIGHT - 160;

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

  private menuObjects: Phaser.GameObjects.GameObject[] = [];
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() { super({ key: 'GameScene' }); }

  // ═══════════════════════════════════════════════════════════════════════════
  create() {
    createPixelTextures(this);
    this.createBackground();
    this.createRoad();
    this.createHUD();
    this.createPlayer();
    this.setupInput();
    this.showMenu();
  }

  private createBackground() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x0d1520);
    this.add.rectangle(CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X + 4, CONFIG.HEIGHT, 0x1e1a0a);
    this.add.rectangle(CONFIG.WIDTH - CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X + 4, CONFIG.HEIGHT, 0x1e1a0a);
    // Rubble
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
    this.hudHpText = this.add.text(20, 8, 'HP', { fontSize: '13px', color: '#88ff88', fontFamily: 'monospace' }).setDepth(12);
    this.hudCoinsText = this.add.text(160, 8, '$ 0', { fontSize: '15px', color: '#FFD700', fontFamily: 'monospace' }).setDepth(12);
    this.hudConvoyText = this.add.text(20, 36, '[=] 1', { fontSize: '13px', color: '#88ccff', fontFamily: 'monospace' }).setDepth(12);
    this.hudProgressBg = this.add.rectangle(CONFIG.WIDTH / 2, 57, 310, 9, 0x1a1a1a).setDepth(11);
    this.hudProgressBar = this.add.rectangle(CONFIG.WIDTH / 2 - 155, 57, 0, 9, CONFIG.COLORS.PROGRESS).setDepth(12).setOrigin(0, 0.5);
    this.hudProgressText = this.add.text(CONFIG.WIDTH - 8, 48, '0%', { fontSize: '13px', color: '#FFD700', fontFamily: 'monospace' }).setDepth(12).setOrigin(1, 0);
    this.hudTimerText = this.add.text(CONFIG.WIDTH / 2, 48, '1:30', { fontSize: '13px', color: '#888888', fontFamily: 'monospace' }).setDepth(12).setOrigin(0.5, 0);
    this.setHudVisible(false);
  }

  private setHudVisible(v: boolean) {
    [this.hudBg, this.hudHpBar, this.hudHpBarBg, this.hudHpText, this.hudCoinsText,
      this.hudConvoyText, this.hudProgressBg, this.hudProgressBar, this.hudProgressText, this.hudTimerText,
    ].forEach(o => o.setVisible(v));
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

    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x050510, 0.90).setDepth(20);

    // ── Title ─────────────────────────────────────────────────────────────────
    const title = this.add.text(CONFIG.WIDTH / 2, 46, 'БАВОВНА ROAD', {
      fontSize: '36px', color: '#FFD700', fontFamily: 'monospace', stroke: '#0a0a0a', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(21);

    const sub = this.add.text(CONFIG.WIDTH / 2, 84, 'Грай. Допомагай. Перемагай.', {
      fontSize: '13px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(21);

    const flagB = this.add.rectangle(CONFIG.WIDTH / 2, 104, CONFIG.WIDTH - 40, 6, 0x005bbb).setDepth(21);
    const flagY = this.add.rectangle(CONFIG.WIDTH / 2, 110, CONFIG.WIDTH - 40, 6, 0xffd700).setDepth(21);

    // ── Charity block ─────────────────────────────────────────────────────────
    const charityBg = this.add.rectangle(CONFIG.WIDTH / 2, 230, CONFIG.WIDTH - 24, 230, 0x0a1520, 0.96)
      .setStrokeStyle(2, 0x1a3a5a).setDepth(21);

    this.add.text(CONFIG.WIDTH / 2, 130, 'АКТИВНИЙ ЗБІР', {
      fontSize: '13px', color: '#556677', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    this.add.text(CONFIG.WIDTH / 2, 154, CHARITY.title, {
      fontSize: '17px', color: '#ffffff', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(22);

    this.add.text(CONFIG.WIDTH / 2, 176, CHARITY.unit, {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(22);

    // Progress
    const pct = CHARITY.raised / CHARITY.goal;
    const barW = CONFIG.WIDTH - 70;
    const barX = 35;
    this.add.rectangle(CONFIG.WIDTH / 2, 202, barW, 14, 0x111a28).setDepth(22);
    this.add.rectangle(barX + (barW * pct) / 2, 202, barW * pct, 14, 0x005bbb).setDepth(22).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, 202,
      `${Math.round(pct * 100)}%  —  ${CHARITY.raised.toLocaleString()} / ${CHARITY.goal.toLocaleString()} ⭐`,
      { fontSize: '12px', color: '#88ccff', fontFamily: 'monospace' }
    ).setOrigin(0.5).setDepth(23);

    // Vehicle image placeholder
    const vehKey = data.selectedVehicle ? VEHICLES.find(v => v.id === data.selectedVehicle)?.textureKey ?? 'player' : 'player';
    const demo = this.add.image(120, 255, vehKey).setScale(1.8).setDepth(22);
    this.tweens.add({ targets: demo, y: 263, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.add.text(240, 242, CHARITY.vehicle, {
      fontSize: '14px', color: '#aaccdd', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    this.add.text(240, 266, CHARITY.description, {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(22);

    // ── Action buttons ─────────────────────────────────────────────────────────
    const donateBg = this.add.rectangle(CONFIG.WIDTH / 2, 332, CONFIG.WIDTH - 60, 48, 0x0a1a2e).setDepth(21)
      .setStrokeStyle(2, 0x3377cc).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 332, '💙 ДОПОМОГТИ ЗБОРУ', {
      fontSize: '15px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);
    donateBg.on('pointerdown', () => { const u = 'https://t.me/bavovnaroad'; window.open(u, '_blank'); });
    donateBg.on('pointerover', () => donateBg.setFillStyle(0x143050));
    donateBg.on('pointerout',  () => donateBg.setFillStyle(0x0a1a2e));

    const playBg = this.add.rectangle(CONFIG.WIDTH / 2, 396, CONFIG.WIDTH - 60, 62, 0x005bbb).setDepth(21)
      .setStrokeStyle(3, 0xffd700).setInteractive({ useHandCursor: true });
    const playT = this.add.text(CONFIG.WIDTH / 2, 396, '▶  ГРАТИ', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);
    playBg.on('pointerdown', () => this.startGame());
    playBg.on('pointerover', () => playBg.setFillStyle(0x1177dd));
    playBg.on('pointerout',  () => playBg.setFillStyle(0x005bbb));
    this.tweens.add({ targets: [playBg, playT], scaleX: 1.03, scaleY: 1.03, duration: 700, yoyo: true, repeat: -1 });

    // ── Coins stat ─────────────────────────────────────────────────────────────
    const statsBg = this.add.rectangle(CONFIG.WIDTH / 2, 462, CONFIG.WIDTH - 40, 44, 0x0a140a, 0.9).setDepth(21).setStrokeStyle(1, 0x1a3a1a);
    const statsT = this.add.text(CONFIG.WIDTH / 2, 462,
      `$ ${data.totalCoins}  |  Рекорд: ${data.bestScore}  |  Конвой: ${data.maxConvoy + 1}`,
      { fontSize: '13px', color: '#aaffaa', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5).setDepth(22);

    // ── Navigation buttons ─────────────────────────────────────────────────────
    const btnY = 516;
    const btnW = 106;
    const btnGap = 8;
    const btnStartX = CONFIG.WIDTH / 2 - btnW - btnGap;

    const navDefs = [
      { label: 'ГАРАЖ',   color: 0x0d2200, border: 0x44aa00, textCol: '#88ff44', x: btnStartX, cb: () => { this.clearMenu(); this.scene.start('GarageScene'); } },
      { label: 'МІСІЇ',   color: 0x1a0a22, border: 0x773399, textCol: '#cc88ff', x: CONFIG.WIDTH / 2, cb: () => { this.clearMenu(); this.scene.start('MissionsScene'); } },
      { label: 'СЛАВА',   color: 0x0a0a22, border: 0x3333aa, textCol: '#6666ff', x: btnStartX + (btnW + btnGap) * 2, cb: () => { this.clearMenu(); this.scene.start('HallOfFameScene'); } },
    ];

    const navObjs: Phaser.GameObjects.GameObject[] = [];
    navDefs.forEach(n => {
      const b = this.add.rectangle(n.x, btnY, btnW, 46, n.color).setDepth(21)
        .setStrokeStyle(2, n.border).setInteractive({ useHandCursor: true });
      const t = this.add.text(n.x, btnY, n.label, { fontSize: '13px', color: n.textCol, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);
      b.on('pointerdown', n.cb);
      b.on('pointerover', () => b.setAlpha(0.8));
      b.on('pointerout',  () => b.setAlpha(1));
      navObjs.push(b, t);
    });

    // Merch button
    const merchBg = this.add.rectangle(CONFIG.WIDTH / 2, 576, 180, 42, 0x1a1000).setDepth(21)
      .setStrokeStyle(2, 0x775500).setInteractive({ useHandCursor: true });
    const merchT = this.add.text(CONFIG.WIDTH / 2, 576, '🛍 МЕРЧ', { fontSize: '15px', color: '#ccaa44', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);
    merchBg.on('pointerdown', () => { this.clearMenu(); this.scene.start('MerchScene'); });
    merchBg.on('pointerover', () => merchBg.setFillStyle(0x2a1e00));
    merchBg.on('pointerout',  () => merchBg.setFillStyle(0x1a1000));

    // Last donated cars
    this.add.rectangle(CONFIG.WIDTH / 2, 624, CONFIG.WIDTH - 24, 1, 0x1a2a3a).setDepth(21);
    this.add.text(CONFIG.WIDTH / 2, 638, 'ОСТАННІ ПЕРЕДАНІ АВТО', { fontSize: '11px', color: '#334455', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);

    const histObjs: Phaser.GameObjects.GameObject[] = [];
    CHARITY.history.forEach((h, i) => {
      const hy = 662 + i * 44;
      const hbg = this.add.rectangle(CONFIG.WIDTH / 2, hy, CONFIG.WIDTH - 30, 38, 0x080e18).setDepth(21).setStrokeStyle(1, 0x1a2a3a);
      const ht = this.add.text(30, hy, `🚙 ${h.name}`, { fontSize: '12px', color: '#aaccdd', fontFamily: 'monospace' }).setOrigin(0, 0.5).setDepth(22);
      const hd = this.add.text(CONFIG.WIDTH - 18, hy, `${h.date}  ${h.unit}`, { fontSize: '11px', color: '#334455', fontFamily: 'monospace' }).setOrigin(1, 0.5).setDepth(22);
      histObjs.push(hbg, ht, hd);
    });

    const ver = this.add.text(CONFIG.WIDTH / 2, 810, 'Бавовна Road  v2.0', {
      fontSize: '11px', color: '#1a2233', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    this.menuObjects = [
      bg, title, sub, flagB, flagY, charityBg, donateBg, playBg, playT,
      statsBg, statsT, demo, merchBg, merchT,
      ...navObjs, ...histObjs, ver,
    ];

    if (dailyReward !== null) {
      this.time.delayedCall(400, () => this.showDailyReward(dailyReward));
    }
  }

  private showDailyReward(amount: number) {
    const D = 30;
    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.6).setDepth(D);
    const box = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 300, 240, 0x0a1a0a).setDepth(D)
      .setStrokeStyle(3, 0xffd700);
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

  private showLeaderboard() {
    const data = loadData();
    const D = 28;
    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.7).setDepth(D);
    const box = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 340, 560, 0x080c14).setDepth(D)
      .setStrokeStyle(2, 0xffd700);
    const title = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 250, '🏆 LEADERBOARD', {
      fontSize: '20px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 1);

    const rows = data.leaderboard.length > 0
      ? data.leaderboard.map((e, i) =>
          `${i + 1}.  $${e.coins}   x${e.killed}   [${e.convoy}]   ${e.date}`
        ).join('\n')
      : 'No runs yet.\nPlay and set a record!';

    const header = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 210, '#    Coins   Kills  Fleet  Date', {
      fontSize: '11px', color: '#446644', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 1);

    const rowsTxt = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 100, rows, {
      fontSize: '13px', color: '#ccffcc', fontFamily: 'monospace', align: 'left',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(D + 1);

    const closeBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 240, 160, 44, 0x111111)
      .setDepth(D + 1).setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    const closeT = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 240, '< Close', {
      fontSize: '16px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 2);

    const objs = [bg, box, title, header, rowsTxt, closeBg, closeT];
    const close = () => objs.forEach(o => o.destroy());
    closeBg.on('pointerdown', close);
    bg.setInteractive().on('pointerdown', close);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START
  // ═══════════════════════════════════════════════════════════════════════════
  private startGame() {
    this.clearMenu();
    this.clearOverlay();
    this.tweens.killAll();
    this.time.removeAllEvents(); // clear pending delayedCall accumulation

    // Load vehicle + upgrade stats
    const data = loadData();
    const upg = data.upgrades;
    const veh = VEHICLES.find(v => v.id === data.selectedVehicle) ?? VEHICLES[0];
    this.playerVehicleKey  = veh.textureKey;
    this.playerSpreadShots = veh.spreadShots;
    this.playerMaxHp    = veh.baseHp       + getStatFromUpgrade('armor',  upg.armor);
    this.playerSpeedX   = veh.baseSpeed    + getStatFromUpgrade('engine', upg.engine);
    this.playerFireRate = veh.baseFireRate  - getStatFromUpgrade('weapon', upg.weapon);
    this.playerDmg      = 1 + getStatFromUpgrade('damage', upg.damage);

    // Update player sprite texture if changed
    const playerSprite = this.playerContainer.getAt(0) as Phaser.GameObjects.Image;
    playerSprite.setTexture(this.playerVehicleKey);

    // Reset mission session counters
    this.missionKillCount = 0;
    this.missionHeavyCount = 0;
    this.missionBomberCount = 0;
    this.missionRunCoins = 0;
    this.missionSurviveSeconds = 0;

    this.playerHp = this.playerMaxHp;
    this.playerCoins = 0;
    this.playerX = CONFIG.WIDTH / 2;
    this.playerY = CONFIG.HEIGHT - 160;
    this.playerShootTimer = 0;
    this.enemySpawnTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.allyBonusTimer = 0;
    this.repairBonusTimer = 0;
    this.levelTimer = 0;
    this.enemiesKilled = 0;
    this.difficultyScale = 1;
    this.allyBonusInterval = Phaser.Math.Between(CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX);

    this.bullets.forEach(b => b.sprite.destroy());
    this.enemies.forEach(e => {
      this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
      e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
    });
    this.obstacles.forEach(o => o.sprite.destroy());
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
      if (this.playerSpreadShots === 1) {
        this.spawnBullet(this.playerX, this.playerY - 33, CONFIG.BULLET_SPEED, 'bullet_p', this.playerDmg);
      } else {
        // Triple spread (APC)
        const offsets = [-22, 0, 22];
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
        const ew = e.type === 'HEAVY' ? 40 : 30;
        const eh = e.type === 'HEAVY' ? 52 : 42;
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

  private spawnEnemy(type: EnemyType) {
    const left = CONFIG.ROAD_X + 26;
    const right = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 26;
    const x = Phaser.Math.Between(left, right);

    let hp = 1, speed = 100 * this.difficultyScale, coins = CONFIG.COINS_WALKER;
    let key = 'walker';
    let vx = 0;

    if (type === 'HEAVY') {
      hp = 3; speed = 58 * this.difficultyScale; coins = CONFIG.COINS_HEAVY; key = 'heavy';
    } else if (type === 'RUNNER') {
      hp = 1; speed = 220 * this.difficultyScale; coins = CONFIG.COINS_RUNNER; key = 'runner';
      vx = Phaser.Math.FloatBetween(-60, 60);
    } else if (type === 'BOMBER') {
      hp = 2; speed = 70 * this.difficultyScale; coins = CONFIG.COINS_BOMBER; key = 'bomber';
    }

    const sprite = this.add.image(0, 0, key);
    if (type !== 'BOMBER') {
      this.tweens.add({ targets: sprite, angle: { from: -4, to: 4 }, duration: 180, yoyo: true, repeat: -1 });
    } else {
      // Bomber pulse
      this.tweens.add({ targets: sprite, scaleX: 1.12, scaleY: 1.12, duration: 300, yoyo: true, repeat: -1 });
    }

    const container = this.add.container(x, -80, [sprite]).setDepth(3);

    let hpBar: Phaser.GameObjects.Rectangle | undefined;
    let hpBarBg: Phaser.GameObjects.Rectangle | undefined;
    if (type === 'HEAVY') {
      hpBarBg = this.add.rectangle(x, -116, 44, 6, 0x222222).setDepth(3);
      hpBar   = this.add.rectangle(x - 22, -116, 44, 6, 0xff3333).setDepth(4).setOrigin(0, 0.5);
    }

    this.enemies.push({ container, hp, maxHp: hp, type, speed, coins, hpBar, hpBarBg, vx });
  }

  private refreshHpBar(e: Enemy) {
    if (e.hpBar && e.hpBarBg) {
      const pct = e.hp / e.maxHp;
      e.hpBar.setSize(44 * pct, 6);
      e.hpBar.setPosition(e.container.x - 22, e.container.y - 44);
      e.hpBarBg.setPosition(e.container.x, e.container.y - 44);
    }
  }

  private killEnemy(index: number) {
    if (index < 0 || index >= this.enemies.length) return;
    const e = this.enemies[index];
    if (e.dying) return; // guard: prevent double-kill / infinite recursion
    e.dying = true;

    const nx = e.container.x, ny = e.container.y;
    const type = e.type;
    const coins = e.coins;

    // Remove from array FIRST so bomber explosion can't target itself
    this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
    this.enemies.splice(index, 1);

    this.spawnParticles(nx, ny, 'particle_exp', type === 'BOMBER' ? 18 : 10);
    if (type === 'BOMBER') this.bomberExplode(nx, ny);

    e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();

    this.playerCoins += coins;
    this.enemiesKilled++;
    this.missionKillCount++;
    if (type === 'HEAVY')  this.missionHeavyCount++;
    if (type === 'BOMBER') this.missionBomberCount++;

    // Simple text — no stroke to avoid per-frame canvas cost
    const txt = this.add.text(nx, ny, `+${coins}`, {
      fontSize: '15px', color: '#FFD700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: txt, y: ny - 55, alpha: 0, duration: 800,
      onComplete: () => txt.destroy() });
  }

  private bomberExplode(x: number, y: number) {
    // Damage player if close
    if (this.ov2(x, y, 80, 80, this.playerX, this.playerY, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
      this.damagePlayer(20);
    }
    // Damage enemies nearby (chain)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (this.ov2(x, y, 80, 80, e.container.x, e.container.y, 34, 44)) {
        e.hp -= 2;
        if (e.hp <= 0) this.killEnemy(i);
      }
    }
    // Big flash
    this.cameras.main.flash(250, 255, 120, 0, true);
  }

  private updateEnemies(delta: number) {
    const dt = delta / 1000;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.container.y += e.speed * dt;

      // Runner lateral
      if (e.vx && e.type === 'RUNNER') {
        e.container.x += e.vx * dt;
        const left = CONFIG.ROAD_X + 20;
        const right = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 20;
        if (e.container.x < left || e.container.x > right) e.vx *= -1;
      }

      if (e.hpBar) this.refreshHpBar(e);
      if (e.container.y > CONFIG.HEIGHT + 80) {
        this.tweens.killTweensOf(e.container.list[0] as Phaser.GameObjects.Image);
        e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
        this.enemies.splice(i, 1); continue;
      }

      const ew = e.type === 'HEAVY' ? 40 : 30;
      const eh = e.type === 'HEAVY' ? 52 : 42;

      if (this.ov2(e.container.x, e.container.y, ew, eh, this.playerX, this.playerY, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
        const dmg = e.type === 'BOMBER' ? 30 : CONFIG.COLLISION_DAMAGE;
        if (e.type === 'BOMBER') this.bomberExplode(e.container.x, e.container.y);
        else this.damagePlayer(dmg);
        this.spawnParticles(e.container.x, e.container.y, 'particle_exp', 8);
        e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
        this.enemies.splice(i, 1); continue;
      }

      for (let j = 0; j < this.allies.length; j++) {
        const al = this.allies[j];
        if (this.ov2(e.container.x, e.container.y, ew, eh, al.container.x, al.container.y, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
          e.hp--;
          if (e.hp <= 0) this.killEnemy(i);
          else this.refreshHpBar(e);
          break;
        }
      }
    }
  }

  private spawnObstacle() {
    const x = Phaser.Math.Between(CONFIG.ROAD_X + 22, CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 22);
    const keys = ['obs_block', 'obs_crate', 'obs_barr'];
    const key = keys[Phaser.Math.Between(0, 2)];
    const sprite = this.add.image(x, -40, key).setDepth(3);
    this.obstacles.push({ sprite, hw: sprite.width / 2 - 2, hh: sprite.height / 2 - 2 });
  }

  private updateObstacles(delta: number) {
    const dt = delta / 1000;
    const speed = 155 * this.difficultyScale;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.sprite.y += speed * dt;
      if (o.sprite.y > CONFIG.HEIGHT + 50) { o.sprite.destroy(); this.obstacles.splice(i, 1); continue; }
      if (this.ov2(o.sprite.x, o.sprite.y, o.hw * 2, o.hh * 2, this.playerX, this.playerY, CONFIG.PLAYER_W - 4, CONFIG.PLAYER_H - 8)) {
        this.damagePlayer(CONFIG.COLLISION_DAMAGE);
        this.spawnParticles(o.sprite.x, o.sprite.y, 'particle_exp', 6);
        o.sprite.destroy(); this.obstacles.splice(i, 1);
      }
    }
  }

  private spawnAllyBonus(type: 'ally' | 'repair' = 'ally') {
    if (type === 'ally' && this.allies.length >= CONFIG.MAX_ALLIES) return;
    const x = Phaser.Math.Between(CONFIG.ROAD_X + 30, CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 30);
    const key = type === 'ally' ? 'bonus_ally' : 'bonus_repair';
    const sprite = this.add.image(0, 0, key);
    const container = this.add.container(x, -60, [sprite]).setDepth(3);
    this.tweens.add({ targets: sprite, angle: 360, duration: 2000, repeat: -1 });
    this.tweens.add({ targets: sprite, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1 });
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
    const txt = this.add.text(x, y - 40, '+ СОЮЗНИК', {
      fontSize: '18px', color: '#00ccff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  private pickupRepair(x: number, y: number) {
    const heal = 25;
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);
    this.spawnParticles(x, y, 'particle_bonus', 8);
    const txt = this.add.text(x, y - 40, `+ ${heal} HP`, {
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

  private updateSpawners(delta: number) {
    // Enemies
    this.enemySpawnTimer += delta;
    if (this.enemySpawnTimer >= CONFIG.ENEMY_SPAWN_INTERVAL / this.difficultyScale) {
      this.enemySpawnTimer = 0;
      const roll = Math.random();
      let type: EnemyType = 'WALKER';
      if (roll < 0.15)       type = 'HEAVY';
      else if (roll < 0.32)  type = 'RUNNER';
      else if (roll < 0.44)  type = 'BOMBER';
      this.spawnEnemy(type);
      if (Math.random() < 0.28) {
        this.time.delayedCall(300, () => { if (this.state === 'PLAYING') this.spawnEnemy('WALKER'); });
      }
    }

    // Obstacles
    this.obstacleSpawnTimer += delta;
    if (this.obstacleSpawnTimer >= CONFIG.OBSTACLE_SPAWN_INTERVAL / this.difficultyScale) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstacle();
    }

    // ALLY bonus
    this.allyBonusTimer += delta;
    if (this.allyBonusTimer >= this.allyBonusInterval) {
      this.allyBonusTimer = 0;
      this.allyBonusInterval = Phaser.Math.Between(CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX);
      this.spawnAllyBonus('ally');
    }

    // Repair bonus — every 20s
    this.repairBonusTimer += delta;
    if (this.repairBonusTimer >= 20000) {
      this.repairBonusTimer = 0;
      this.spawnAllyBonus('repair');
    }
  }

  private updateLevel(delta: number) {
    this.levelTimer += delta;
    this.missionSurviveSeconds = this.levelTimer / 1000;
    this.difficultyScale = 1 + (this.levelTimer / CONFIG.LEVEL_DURATION) * 0.9;
    if (this.levelTimer >= CONFIG.LEVEL_DURATION) this.triggerVictory();
  }

  private updateHUD() {
    const hpPct = this.playerHp / this.playerMaxHp;
    this.hudHpBar.setSize(124 * hpPct, 13).setX(23);
    this.hudHpBar.setFillStyle(hpPct > 0.35 ? CONFIG.COLORS.HUD_HP : CONFIG.COLORS.HUD_HP_LOW);
    this.hudHpText.setText(`HP ${this.playerHp}/${this.playerMaxHp}`);
    this.hudCoinsText.setText(`$ ${this.playerCoins}`);
    this.hudConvoyText.setText(`[=] ${this.allies.length + 1}`);
    const prog = Math.min(this.levelTimer / CONFIG.LEVEL_DURATION, 1);
    this.hudProgressBar.setSize(310 * prog, 9);
    this.hudProgressText.setText(`${Math.floor(prog * 100)}%`);
    const rem = Math.max(0, (CONFIG.LEVEL_DURATION - this.levelTimer) / 1000);
    this.hudTimerText.setText(`${Math.floor(rem / 60)}:${Math.floor(rem % 60).toString().padStart(2, '0')}`);
  }

  private damagePlayer(amount: number) {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.cameras.main.flash(180, 180, 0, 0, true);
    if (this.playerHp <= 0) this.triggerGameOver();
  }

  private ov2(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  private flushMissions(isVictory: boolean) {
    updateMissionProgress('kill',         this.missionKillCount);
    updateMissionProgress('kill_heavy',   this.missionHeavyCount);
    updateMissionProgress('kill_bomber',  this.missionBomberCount);
    updateMissionProgress('coins',        this.playerCoins);
    updateMissionProgress('convoy',       this.allies.length + 1);
    updateMissionProgress('survive',      Math.floor(this.missionSurviveSeconds));
    if (isVictory) updateMissionProgress('run', 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VICTORY
  // ═══════════════════════════════════════════════════════════════════════════
  private triggerVictory() {
    this.state = 'VICTORY';
    this.setHudVisible(false);
    this.tweens.killAll();

    const bonus = CONFIG.COINS_VICTORY_BASE + this.allies.length * CONFIG.COINS_PER_ALLY;
    this.playerCoins += bonus;
    addCoins(this.playerCoins);
    const saved = recordRun(this.playerCoins, this.enemiesKilled, this.allies.length);
    this.flushMissions(true);

    this.clearOverlay();
    const D = 25;

    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x001100, 0.88).setDepth(D);
    const fB = this.add.rectangle(CONFIG.WIDTH / 2, 140, 280, 58, 0x005bbb).setDepth(D + 1);
    const fY = this.add.rectangle(CONFIG.WIDTH / 2, 198, 280, 58, 0xffd700).setDepth(D + 1);
    this.tweens.add({ targets: [fB, fY], scaleX: { from: 0, to: 1 }, duration: 500, ease: 'Back.Out' });

    const title = this.add.text(CONFIG.WIDTH / 2, 162, 'ПЕРЕМОГА!', {
      fontSize: '42px', color: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(D + 2);
    this.tweens.add({ targets: title, scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 }, duration: 400, ease: 'Back.Out' });

    const stats = this.add.text(CONFIG.WIDTH / 2, 320,
      `$ Зароблено: ${this.playerCoins}  (+${bonus} бонус)\n` +
      `> Знищено: ${this.enemiesKilled}\n` +
      `[=] Конвой: ${this.allies.length + 1}\n\n` +
      `$ Всього: ${saved.totalCoins}`,
      { fontSize: '17px', color: '#ccffcc', fontFamily: 'monospace', align: 'center', lineSpacing: 8 }
    ).setOrigin(0.5).setDepth(D + 2);

    const lootBg = this.add.rectangle(CONFIG.WIDTH / 2, 524, 220, 58, 0x1a3300).setDepth(D + 2)
      .setStrokeStyle(3, 0x88ff44).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 524, '📦 ВІДКРИТИ СКРИНЮ', { fontSize: '18px', color: '#88ff44', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 3);
    lootBg.on('pointerdown', () => {
      this.clearOverlay();
      this.scene.start('LootboxScene', { coins: this.playerCoins, killed: this.enemiesKilled, convoy: this.allies.length + 1, victory: true });
    });
    lootBg.on('pointerover', () => lootBg.setFillStyle(0x2a5500));
    lootBg.on('pointerout',  () => lootBg.setFillStyle(0x1a3300));

    const playBg = this.add.rectangle(CONFIG.WIDTH / 2, 598, 200, 46, 0x005bbb).setDepth(D + 2)
      .setStrokeStyle(2, 0xffd700).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 598, '▶  Грати знову', { fontSize: '17px', color: '#FFD700', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 3);
    playBg.on('pointerdown', () => this.startGame());
    playBg.on('pointerover', () => playBg.setFillStyle(0x1177dd));
    playBg.on('pointerout',  () => playBg.setFillStyle(0x005bbb));

    const menuBg = this.add.rectangle(CONFIG.WIDTH / 2, 656, 180, 46, 0x111111).setDepth(D + 2)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 656, '< Меню', { fontSize: '17px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 3);
    menuBg.on('pointerdown', () => { this.clearOverlay(); this.showMenu(); });

    this.overlayObjects = [bg, fB, fY, title, stats, lootBg, playBg, menuBg];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════════════════════
  private triggerGameOver() {
    this.state = 'GAME_OVER';
    this.setHudVisible(false);
    this.tweens.killAll();

    addCoins(this.playerCoins);
    recordRun(this.playerCoins, this.enemiesKilled, this.allies.length);
    this.flushMissions(false);
    this.cameras.main.shake(420, 0.022);

    this.time.delayedCall(420, () => {
      this.clearOverlay();
      const D = 25;

      const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x1a0000, 0.88).setDepth(D);
      const title = this.add.text(CONFIG.WIDTH / 2, 240, 'РЕЙД ПРОВАЛЕНО', {
        fontSize: '36px', color: '#ff3333', fontFamily: 'monospace', stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(D + 1);
      this.tweens.add({ targets: title, scaleX: { from: 1.5, to: 1 }, scaleY: { from: 1.5, to: 1 }, duration: 300, ease: 'Back.Out' });

      const stats = this.add.text(CONFIG.WIDTH / 2, 340,
        `$ ${this.playerCoins}   × ${this.enemiesKilled}   [=] ${this.allies.length + 1}`,
        { fontSize: '20px', color: '#cccccc', fontFamily: 'monospace', align: 'center' }
      ).setOrigin(0.5).setDepth(D + 1);

      const lootBg = this.add.rectangle(CONFIG.WIDTH / 2, 432, 220, 54, 0x1a1a00).setDepth(D + 1)
        .setStrokeStyle(3, 0xaaaa00).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH / 2, 432, '📦 ВІДКРИТИ СКРИНЮ', { fontSize: '16px', color: '#dddd44', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      lootBg.on('pointerdown', () => {
        this.clearOverlay();
        this.scene.start('LootboxScene', { coins: this.playerCoins, killed: this.enemiesKilled, convoy: this.allies.length + 1, victory: false });
      });
      lootBg.on('pointerover', () => lootBg.setFillStyle(0x2a2a00));
      lootBg.on('pointerout',  () => lootBg.setFillStyle(0x1a1a00));

      const restartBg = this.add.rectangle(CONFIG.WIDTH / 2, 500, 200, 52, 0xaa0000).setDepth(D + 1)
        .setStrokeStyle(3, 0xff6666).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH / 2, 500, 'ПОВТОРИТИ', { fontSize: '20px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      restartBg.on('pointerdown', () => this.startGame());
      restartBg.on('pointerover', () => restartBg.setFillStyle(0xdd2222));
      restartBg.on('pointerout',  () => restartBg.setFillStyle(0xaa0000));

      const menuBg = this.add.rectangle(CONFIG.WIDTH / 2, 566, 200, 46, 0x111111).setDepth(D + 1)
        .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH / 2, 566, '< Меню', { fontSize: '18px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      menuBg.on('pointerdown', () => { this.clearOverlay(); this.showMenu(); });

      this.overlayObjects = [bg, title, stats, lootBg, restartBg, menuBg];
    });
  }

  private clearMenu() { this.menuObjects.forEach(o => o.destroy()); this.menuObjects = []; }
  private clearOverlay() { this.overlayObjects.forEach(o => o.destroy()); this.overlayObjects = []; }
}
