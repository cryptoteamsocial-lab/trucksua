import Phaser from 'phaser';
import { CONFIG } from './config';
import { loadData, addCoins, updateBestScore } from './storage';
import type { GameState, EnemyType } from './types';

// ─── Ally formation offsets ───────────────────────────────────────────────────
const ALLY_FORMATION: { ox: number; oy: number }[] = [
  { ox: -70, oy: 40 },
  { ox: 70, oy: 40 },
  { ox: -70, oy: 110 },
  { ox: 70, oy: 110 },
  { ox: -140, oy: 40 },
  { ox: 140, oy: 40 },
  { ox: -140, oy: 110 },
  { ox: 140, oy: 110 },
];

interface Enemy {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  type: EnemyType;
  speed: number;
  coins: number;
  hpBar?: Phaser.GameObjects.Rectangle;
  hpBarBg?: Phaser.GameObjects.Rectangle;
}

interface Bullet {
  rect: Phaser.GameObjects.Rectangle;
  speed: number;
}

interface Obstacle {
  rect: Phaser.GameObjects.Rectangle;
}

interface AllyBonus {
  container: Phaser.GameObjects.Container;
}

interface AllyVehicle {
  container: Phaser.GameObjects.Container;
  shootTimer: number;
  targetX: number;
  targetY: number;
}

interface Particle {
  rect: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export default class GameScene extends Phaser.Scene {
  private state: GameState = 'MENU';

  // ─── HUD ───────────────────────────────────────────────────────────────────
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

  // ─── Road ──────────────────────────────────────────────────────────────────
  private roadLines: Phaser.GameObjects.Rectangle[] = [];
  private roadLineSpeed = 300;
  private roadLineY: number[] = [];

  // ─── Player ────────────────────────────────────────────────────────────────
  private playerContainer!: Phaser.GameObjects.Container;
  private playerHp = CONFIG.PLAYER_HP;
  private playerCoins = 0;
  private playerShootTimer = 0;
  private playerX = CONFIG.WIDTH / 2;
  private playerY = CONFIG.HEIGHT - 160;

  // ─── Input ─────────────────────────────────────────────────────────────────
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private pointerX: number | null = null;
  private isPointerDown = false;

  // ─── Collections ───────────────────────────────────────────────────────────
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private allyBonuses: AllyBonus[] = [];
  private allies: AllyVehicle[] = [];
  private particles: Particle[] = [];

  // ─── Timers ────────────────────────────────────────────────────────────────
  private enemySpawnTimer = 0;
  private obstacleSpawnTimer = 0;
  private allyBonusTimer = 0;
  private allyBonusInterval = 10000;
  private levelTimer = 0;

  // ─── Game data ─────────────────────────────────────────────────────────────
  private enemiesKilled = 0;
  private difficultyScale = 1;

  // ─── Menu / Overlay objects ────────────────────────────────────────────────
  private menuObjects: Phaser.GameObjects.GameObject[] = [];
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════
  create() {
    this.createBackground();
    this.createRoad();
    this.createHUD();
    this.createPlayer();
    this.setupInput();
    this.showMenu();
  }

  // ─── Background ────────────────────────────────────────────────────────────
  private createBackground() {
    // Sky gradient via two rects
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.3, CONFIG.WIDTH, CONFIG.HEIGHT * 0.6, 0x1a2a4a);
    // Ground sides
    this.add.rectangle(CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X, CONFIG.HEIGHT, CONFIG.COLORS.DIRT);
    this.add.rectangle(CONFIG.WIDTH - CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X, CONFIG.HEIGHT, CONFIG.COLORS.DIRT);
  }

  // ─── Road ──────────────────────────────────────────────────────────────────
  private createRoad() {
    // Road base
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_WIDTH, CONFIG.HEIGHT, CONFIG.COLORS.ROAD);
    // Road borders
    this.add.rectangle(CONFIG.ROAD_X - 2, CONFIG.HEIGHT / 2, 4, CONFIG.HEIGHT, CONFIG.COLORS.ROAD_BORDER);
    this.add.rectangle(CONFIG.ROAD_X + CONFIG.ROAD_WIDTH + 2, CONFIG.HEIGHT / 2, 4, CONFIG.HEIGHT, CONFIG.COLORS.ROAD_BORDER);

    // Dashed center lines
    for (let i = 0; i < 6; i++) {
      const y = (CONFIG.HEIGHT / 6) * i + 60;
      const line = this.add.rectangle(CONFIG.WIDTH / 2, y, 6, 40, CONFIG.COLORS.ROAD_LINE);
      this.roadLines.push(line);
      this.roadLineY.push(y);
    }
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────
  private createHUD() {
    const hudH = 70;
    this.hudBg = this.add.rectangle(CONFIG.WIDTH / 2, hudH / 2, CONFIG.WIDTH, hudH, 0x0d0d0d, 0.9);
    this.hudBg.setDepth(10);

    // HP bar bg
    this.hudHpBarBg = this.add.rectangle(80, 18, 120, 12, 0x333333);
    this.hudHpBarBg.setDepth(11);
    // HP bar fill
    this.hudHpBar = this.add.rectangle(80, 18, 120, 12, CONFIG.COLORS.HUD_HP);
    this.hudHpBar.setDepth(12).setOrigin(0.5, 0.5);

    this.hudHpText = this.add.text(20, 10, 'HP', {
      fontSize: '13px', color: '#aaffaa', fontFamily: 'monospace'
    }).setDepth(12);

    this.hudCoinsText = this.add.text(160, 10, '💰 0', {
      fontSize: '14px', color: '#FFD700', fontFamily: 'monospace'
    }).setDepth(12);

    this.hudConvoyText = this.add.text(20, 38, '🚗 Convoy: 1', {
      fontSize: '13px', color: '#88ccff', fontFamily: 'monospace'
    }).setDepth(12);

    this.hudProgressBg = this.add.rectangle(CONFIG.WIDTH / 2, 58, 300, 10, 0x333333);
    this.hudProgressBg.setDepth(11);
    this.hudProgressBar = this.add.rectangle(CONFIG.WIDTH / 2 - 150, 58, 0, 10, CONFIG.COLORS.PROGRESS);
    this.hudProgressBar.setDepth(12).setOrigin(0, 0.5);

    this.hudProgressText = this.add.text(CONFIG.WIDTH - 10, 50, '0%', {
      fontSize: '13px', color: '#FFD700', fontFamily: 'monospace'
    }).setDepth(12).setOrigin(1, 0);

    this.hudTimerText = this.add.text(CONFIG.WIDTH / 2, 50, '1:30', {
      fontSize: '13px', color: '#aaaaaa', fontFamily: 'monospace'
    }).setDepth(12).setOrigin(0.5, 0);

    this.setHudVisible(false);
  }

  private setHudVisible(v: boolean) {
    [this.hudBg, this.hudHpBar, this.hudHpBarBg, this.hudHpText, this.hudCoinsText,
      this.hudConvoyText, this.hudProgressBg, this.hudProgressBar,
      this.hudProgressText, this.hudTimerText].forEach(o => o.setVisible(v));
  }

  // ─── Player ────────────────────────────────────────────────────────────────
  private createPlayer() {
    this.playerContainer = this.add.container(this.playerX, this.playerY);
    this.drawVehicle(this.playerContainer, true);
    this.playerContainer.setDepth(5);
  }

  private drawVehicle(container: Phaser.GameObjects.Container, isPlayer: boolean) {
    const bodyColor = isPlayer ? CONFIG.COLORS.PLAYER : CONFIG.COLORS.ALLY;
    const accentColor = isPlayer ? CONFIG.COLORS.PLAYER_ACCENT : CONFIG.COLORS.ALLY_ACCENT;
    const W = CONFIG.PLAYER_W;
    const H = CONFIG.PLAYER_H;

    // Body
    const body = this.add.rectangle(0, 0, W, H, bodyColor);
    // Cabin
    const cabin = this.add.rectangle(0, -10, W - 10, H * 0.45, accentColor);
    // Armor plates
    const plateL = this.add.rectangle(-W / 2 + 4, 10, 8, H * 0.4, accentColor);
    const plateR = this.add.rectangle(W / 2 - 4, 10, 8, H * 0.4, accentColor);
    // Wheels
    const wFL = this.add.rectangle(-W / 2 - 5, -H / 2 + 12, 10, 18, 0x111111);
    const wFR = this.add.rectangle(W / 2 + 5, -H / 2 + 12, 10, 18, 0x111111);
    const wRL = this.add.rectangle(-W / 2 - 5, H / 2 - 12, 10, 20, 0x111111);
    const wRR = this.add.rectangle(W / 2 + 5, H / 2 - 12, 10, 20, 0x111111);
    // Gun barrel
    const gunBase = this.add.rectangle(0, -H / 2 + 5, 14, 14, 0x222222);
    const gunBarrel = this.add.rectangle(0, -H / 2 - 12, 6, 22, 0x333333);
    // Ukrainian flag (blue + yellow)
    const flagBlue = this.add.rectangle(-W / 2 + 10, -H / 2 + 22, 16, 7, CONFIG.COLORS.FLAG_BLUE);
    const flagYellow = this.add.rectangle(-W / 2 + 10, -H / 2 + 29, 16, 7, CONFIG.COLORS.FLAG_YELLOW);

    container.add([body, cabin, plateL, plateR, wFL, wFR, wRL, wRR, gunBase, gunBarrel, flagBlue, flagYellow]);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────
  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isPointerDown) {
        this.pointerX = ptr.x;
      }
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.isPointerDown = true;
      this.pointerX = ptr.x;
    });
    this.input.on('pointerup', () => {
      this.isPointerDown = false;
      this.pointerX = null;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MENU
  // ═══════════════════════════════════════════════════════════════════════════
  private showMenu() {
    this.state = 'MENU';
    this.clearOverlay();

    const data = loadData();

    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x0a0a1a, 0.75);
    bg.setDepth(20);

    // Title
    const title = this.add.text(CONFIG.WIDTH / 2, 160, 'STEEL ROAD', {
      fontSize: '42px', color: '#FFD700', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(21);

    const sub = this.add.text(CONFIG.WIDTH / 2, 215, 'CONVOY', {
      fontSize: '28px', color: '#88ccff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(21);

    // Decorative vehicle
    const demoContainer = this.add.container(CONFIG.WIDTH / 2, 330);
    this.drawVehicle(demoContainer, true);
    demoContainer.setScale(1.3).setDepth(21);

    // Stats
    const statsText = this.add.text(CONFIG.WIDTH / 2, 430, `💰 Total Coins: ${data.totalCoins}\n🏆 Best Score: ${data.bestScore}\n🚗 Max Convoy: ${data.maxConvoy + 1}`, {
      fontSize: '16px', color: '#cccccc', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(21);

    // Play button
    const playBtnBg = this.add.rectangle(CONFIG.WIDTH / 2, 560, 200, 60, 0x005bbb);
    playBtnBg.setDepth(21).setStrokeStyle(3, 0xffd700).setInteractive({ useHandCursor: true });
    const playText = this.add.text(CONFIG.WIDTH / 2, 560, '▶  PLAY', {
      fontSize: '24px', color: '#FFD700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    playBtnBg.on('pointerdown', () => this.startGame());
    playBtnBg.on('pointerover', () => playBtnBg.setFillStyle(0x1177dd));
    playBtnBg.on('pointerout', () => playBtnBg.setFillStyle(0x005bbb));

    // Disabled buttons
    const garageBtnBg = this.add.rectangle(CONFIG.WIDTH / 2, 640, 160, 44, 0x222222);
    garageBtnBg.setDepth(21).setStrokeStyle(2, 0x555555);
    this.add.text(CONFIG.WIDTH / 2, 640, '🔧 Garage', {
      fontSize: '16px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    const lbBtnBg = this.add.rectangle(CONFIG.WIDTH / 2, 696, 160, 44, 0x222222);
    lbBtnBg.setDepth(21).setStrokeStyle(2, 0x555555);
    this.add.text(CONFIG.WIDTH / 2, 696, '🏆 Leaderboard', {
      fontSize: '14px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    // Version
    this.add.text(CONFIG.WIDTH / 2, 790, 'MVP v1.0', {
      fontSize: '12px', color: '#333344', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    this.menuObjects = [bg, title, sub, demoContainer, statsText, playBtnBg, playText, garageBtnBg, lbBtnBg];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START GAME
  // ═══════════════════════════════════════════════════════════════════════════
  private startGame() {
    this.clearMenu();
    this.clearOverlay();

    // Reset state
    this.playerHp = CONFIG.PLAYER_HP;
    this.playerCoins = 0;
    this.playerX = CONFIG.WIDTH / 2;
    this.playerY = CONFIG.HEIGHT - 160;
    this.playerShootTimer = 0;
    this.enemySpawnTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.allyBonusTimer = 0;
    this.levelTimer = 0;
    this.enemiesKilled = 0;
    this.difficultyScale = 1;
    this.allyBonusInterval = Phaser.Math.Between(
      CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX
    );

    // Clear collections
    this.destroyCollection(this.bullets.map(b => b.rect));
    this.destroyCollection(this.enemies.map(e => e.container));
    this.destroyCollection(this.obstacles.map(o => o.rect));
    this.destroyCollection(this.allyBonuses.map(a => a.container));
    this.destroyCollection(this.allies.map(a => a.container));
    this.destroyCollection(this.particles.map(p => p.rect));
    this.bullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.allyBonuses = [];
    this.allies = [];
    this.particles = [];

    // Place player
    this.playerContainer.setPosition(this.playerX, this.playerY);

    this.setHudVisible(true);
    this.updateHUD();
    this.state = 'PLAYING';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE LOOP
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

  // ─── Road animation ────────────────────────────────────────────────────────
  private updateRoad(delta: number) {
    const speed = this.roadLineSpeed * this.difficultyScale;
    for (let i = 0; i < this.roadLines.length; i++) {
      this.roadLineY[i] += speed * (delta / 1000);
      if (this.roadLineY[i] > CONFIG.HEIGHT + 30) {
        this.roadLineY[i] -= CONFIG.HEIGHT + 60;
      }
      this.roadLines[i].setY(this.roadLineY[i]);
    }
  }

  // ─── Player movement ───────────────────────────────────────────────────────
  private updatePlayer(delta: number) {
    const dt = delta / 1000;
    const roadLeft = CONFIG.ROAD_X + CONFIG.PLAYER_W / 2 + 5;
    const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - CONFIG.PLAYER_W / 2 - 5;

    // Keyboard
    if (this.cursors.left.isDown) {
      this.playerX -= CONFIG.PLAYER_SPEED_X * dt;
    } else if (this.cursors.right.isDown) {
      this.playerX += CONFIG.PLAYER_SPEED_X * dt;
    }

    // Pointer / touch
    if (this.isPointerDown && this.pointerX !== null) {
      const diff = this.pointerX - this.playerX;
      const move = Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.PLAYER_SPEED_X * dt * 2.5);
      this.playerX += move;
    }

    this.playerX = Phaser.Math.Clamp(this.playerX, roadLeft, roadRight);
    this.playerContainer.setX(this.playerX);

    // Auto shoot
    this.playerShootTimer += delta;
    if (this.playerShootTimer >= CONFIG.PLAYER_FIRE_RATE) {
      this.playerShootTimer = 0;
      this.spawnBullet(this.playerX, this.playerY - CONFIG.PLAYER_H / 2, CONFIG.BULLET_SPEED, CONFIG.COLORS.BULLET_PLAYER);
    }
  }

  // ─── Allies ────────────────────────────────────────────────────────────────
  private updateAllies(delta: number) {
    for (let i = 0; i < this.allies.length; i++) {
      const ally = this.allies[i];
      const formation = ALLY_FORMATION[i];
      ally.targetX = this.playerX + formation.ox;
      ally.targetY = this.playerY + formation.oy;

      // Clamp allies to road
      const roadLeft = CONFIG.ROAD_X + CONFIG.PLAYER_W / 2 + 5;
      const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - CONFIG.PLAYER_W / 2 - 5;
      ally.targetX = Phaser.Math.Clamp(ally.targetX, roadLeft, roadRight);
      ally.targetY = Phaser.Math.Clamp(ally.targetY, CONFIG.HEIGHT - 300, CONFIG.HEIGHT - 60);

      // Smooth follow
      const cx = ally.container.x;
      const cy = ally.container.y;
      ally.container.setX(cx + (ally.targetX - cx) * 0.12);
      ally.container.setY(cy + (ally.targetY - cy) * 0.12);

      // Ally shoot
      ally.shootTimer += delta;
      if (ally.shootTimer >= CONFIG.ALLY_FIRE_RATE) {
        ally.shootTimer = 0;
        this.spawnBullet(ally.container.x, ally.container.y - CONFIG.PLAYER_H / 2,
          CONFIG.ALLY_BULLET_SPEED, CONFIG.COLORS.BULLET_ALLY);
      }
    }
  }

  // ─── Bullets ───────────────────────────────────────────────────────────────
  private spawnBullet(x: number, y: number, speed: number, color: number) {
    const rect = this.add.rectangle(x, y, 6, 14, color);
    rect.setDepth(4);
    this.bullets.push({ rect, speed });
  }

  private updateBullets(delta: number) {
    const dt = delta / 1000;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.rect.y -= b.speed * dt;

      if (b.rect.y < -20) {
        b.rect.destroy();
        this.bullets.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.rectOverlap(b.rect, e.container.x, e.container.y, 44, 60)) {
          e.hp--;
          this.spawnParticles(b.rect.x, b.rect.y, CONFIG.COLORS.EXPLOSION, 4);
          b.rect.destroy();
          this.bullets.splice(i, 1);
          hit = true;

          if (e.hp <= 0) {
            this.spawnParticles(e.container.x, e.container.y, CONFIG.COLORS.EXPLOSION, 10);
            e.container.destroy();
            this.enemies.splice(j, 1);
            this.playerCoins += e.coins;
            this.enemiesKilled++;
          } else {
            this.updateEnemyHpBar(e);
          }
          break;
        }
      }
      if (hit) continue;
    }
  }

  // ─── Enemies ───────────────────────────────────────────────────────────────
  private spawnEnemy(type: EnemyType) {
    const roadLeft = CONFIG.ROAD_X + 26;
    const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 26;
    const x = Phaser.Math.Between(roadLeft, roadRight);

    let hp = 1, speed = 100 * this.difficultyScale, coins = CONFIG.COINS_WALKER;
    let color = CONFIG.COLORS.ENEMY_WALKER;
    let w = 40, h = 56;

    if (type === 'HEAVY') {
      hp = 3; speed = 60 * this.difficultyScale; coins = CONFIG.COINS_HEAVY;
      color = CONFIG.COLORS.ENEMY_HEAVY;
      w = 54; h = 72;
    }

    const container = this.add.container(x, -80);
    container.setDepth(3);

    // Body
    const body = this.add.rectangle(0, 0, w, h, color);
    // Eyes
    const eyeL = this.add.rectangle(-8, -h / 2 + 14, 8, 8, 0xff2222);
    const eyeR = this.add.rectangle(8, -h / 2 + 14, 8, 8, 0xff2222);
    // Raider marking
    const mark = this.add.rectangle(0, 0, w - 10, 8, 0x440000);

    container.add([body, eyeL, eyeR, mark]);

    // HP bar (for heavy)
    let hpBar: Phaser.GameObjects.Rectangle | undefined;
    let hpBarBg: Phaser.GameObjects.Rectangle | undefined;
    if (type === 'HEAVY') {
      hpBarBg = this.add.rectangle(x, -80 - h / 2 - 8, 44, 6, 0x333333).setDepth(3);
      hpBar = this.add.rectangle(x - 22, -80 - h / 2 - 8, 44, 6, 0xff4444).setDepth(4).setOrigin(0, 0.5);
    }

    this.enemies.push({ container, body, hp, maxHp: hp, type, speed, coins, hpBar, hpBarBg });
  }

  private updateEnemyHpBar(e: Enemy) {
    if (e.hpBar && e.hpBarBg) {
      const pct = e.hp / e.maxHp;
      e.hpBar.setSize(44 * pct, 6);
      e.hpBar.setPosition(e.container.x - 22, e.container.y - 44);
      e.hpBarBg.setPosition(e.container.x, e.container.y - 44);
    }
  }

  private updateEnemies(delta: number) {
    const dt = delta / 1000;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.container.y += e.speed * dt;

      if (e.hpBar && e.hpBarBg) {
        this.updateEnemyHpBar(e);
      }

      // Off screen
      if (e.container.y > CONFIG.HEIGHT + 80) {
        e.container.destroy();
        e.hpBar?.destroy();
        e.hpBarBg?.destroy();
        this.enemies.splice(i, 1);
        continue;
      }

      // Collision with player
      if (this.rectOverlap2(e.container.x, e.container.y, 40, 56, this.playerX, this.playerY, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
        this.damagePlayer(CONFIG.COLLISION_DAMAGE);
        this.spawnParticles(e.container.x, e.container.y, 0xff0000, 8);
        e.container.destroy();
        e.hpBar?.destroy();
        e.hpBarBg?.destroy();
        this.enemies.splice(i, 1);
        continue;
      }

      // Collision with allies
      for (let j = 0; j < this.allies.length; j++) {
        const ally = this.allies[j];
        if (this.rectOverlap2(e.container.x, e.container.y, 40, 56, ally.container.x, ally.container.y, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
          e.hp--;
          if (e.hp <= 0) {
            this.spawnParticles(e.container.x, e.container.y, CONFIG.COLORS.EXPLOSION, 8);
            e.container.destroy();
            e.hpBar?.destroy();
            e.hpBarBg?.destroy();
            this.enemies.splice(i, 1);
            this.playerCoins += e.coins;
            this.enemiesKilled++;
          }
          break;
        }
      }
    }
  }

  // ─── Obstacles ─────────────────────────────────────────────────────────────
  private spawnObstacle() {
    const roadLeft = CONFIG.ROAD_X + 20;
    const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 20;
    const x = Phaser.Math.Between(roadLeft, roadRight);
    const type = Phaser.Math.Between(0, 2);
    let color = CONFIG.COLORS.OBSTACLE;
    let w = 40, h = 30;

    if (type === 0) { w = 48; h = 36; color = 0x666666; } // concrete block
    else if (type === 1) { w = 60; h = 20; color = 0x554433; } // barricade
    else { w = 32; h = 32; color = 0x8b5e1a; } // crate

    const rect = this.add.rectangle(x, -40, w, h, color);
    rect.setDepth(3);
    this.obstacles.push({ rect });
  }

  private updateObstacles(delta: number) {
    const dt = delta / 1000;
    const speed = 160 * this.difficultyScale;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.rect.y += speed * dt;

      if (o.rect.y > CONFIG.HEIGHT + 40) {
        o.rect.destroy();
        this.obstacles.splice(i, 1);
        continue;
      }

      // Check player collision
      if (this.rectOverlap(o.rect, this.playerX, this.playerY, CONFIG.PLAYER_W - 6, CONFIG.PLAYER_H - 10)) {
        this.damagePlayer(CONFIG.COLLISION_DAMAGE);
        this.spawnParticles(o.rect.x, o.rect.y, 0x888888, 6);
        o.rect.destroy();
        this.obstacles.splice(i, 1);
        continue;
      }
    }
  }

  // ─── Ally bonus ────────────────────────────────────────────────────────────
  private spawnAllyBonus() {
    if (this.allies.length >= CONFIG.MAX_ALLIES) return;

    const roadLeft = CONFIG.ROAD_X + 30;
    const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 30;
    const x = Phaser.Math.Between(roadLeft, roadRight);

    const container = this.add.container(x, -60);
    container.setDepth(3);

    // Bonus vehicle icon
    const base = this.add.rectangle(0, 0, 36, 52, CONFIG.COLORS.BONUS_ALLY, 0.9);
    const glow = this.add.rectangle(0, 0, 44, 60, CONFIG.COLORS.BONUS_ALLY, 0.2);
    const plus = this.add.text(0, 0, '+', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    container.add([glow, base, plus]);

    // Pulse tween
    this.tweens.add({
      targets: glow,
      scaleX: 1.3, scaleY: 1.3,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.allyBonuses.push({ container });
  }

  private updateAllyBonuses(delta: number) {
    const dt = delta / 1000;
    const speed = 140;
    for (let i = this.allyBonuses.length - 1; i >= 0; i--) {
      const a = this.allyBonuses[i];
      a.container.y += speed * dt;

      if (a.container.y > CONFIG.HEIGHT + 40) {
        a.container.destroy();
        this.allyBonuses.splice(i, 1);
        continue;
      }

      // Check player pickup
      if (this.rectOverlap2(a.container.x, a.container.y, 36, 52, this.playerX, this.playerY, CONFIG.PLAYER_W + 20, CONFIG.PLAYER_H + 20)) {
        this.pickupAlly(a.container.x, a.container.y);
        a.container.destroy();
        this.allyBonuses.splice(i, 1);
      }
    }
  }

  private pickupAlly(x: number, y: number) {
    if (this.allies.length >= CONFIG.MAX_ALLIES) return;

    const container = this.add.container(x, y);
    this.drawVehicle(container, false);
    container.setDepth(4);

    this.allies.push({
      container,
      shootTimer: Phaser.Math.Between(0, CONFIG.ALLY_FIRE_RATE),
      targetX: x,
      targetY: y,
    });

    // Flash effect
    this.spawnParticles(x, y, CONFIG.COLORS.BONUS_ALLY, 8);

    // Brief text
    const txt = this.add.text(x, y - 40, '+ ALLY', {
      fontSize: '18px', color: '#00aaff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({
      targets: txt,
      y: y - 100, alpha: 0, duration: 1000,
      onComplete: () => txt.destroy(),
    });
  }

  // ─── Particles ─────────────────────────────────────────────────────────────
  private spawnParticles(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const s = Phaser.Math.Between(3, 8);
      const rect = this.add.rectangle(x, y, s, s, color);
      rect.setDepth(6);
      this.particles.push({
        rect,
        vx: Phaser.Math.FloatBetween(-120, 120),
        vy: Phaser.Math.FloatBetween(-180, 60),
        life: 400,
        maxLife: 400,
      });
    }
  }

  private updateParticles(delta: number) {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.rect.x += p.vx * dt;
      p.rect.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= delta;
      p.rect.setAlpha(p.life / p.maxLife);
      if (p.life <= 0) {
        p.rect.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  // ─── Spawners ──────────────────────────────────────────────────────────────
  private updateSpawners(delta: number) {
    // Enemies
    this.enemySpawnTimer += delta;
    const enemyInterval = CONFIG.ENEMY_SPAWN_INTERVAL / this.difficultyScale;
    if (this.enemySpawnTimer >= enemyInterval) {
      this.enemySpawnTimer = 0;
      const type: EnemyType = Math.random() < 0.25 ? 'HEAVY' : 'WALKER';
      this.spawnEnemy(type);
      // Occasionally spawn 2
      if (Math.random() < 0.3) {
        this.time.delayedCall(300, () => {
          if (this.state === 'PLAYING') this.spawnEnemy('WALKER');
        });
      }
    }

    // Obstacles
    this.obstacleSpawnTimer += delta;
    const obstacleInterval = CONFIG.OBSTACLE_SPAWN_INTERVAL / this.difficultyScale;
    if (this.obstacleSpawnTimer >= obstacleInterval) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstacle();
    }

    // Ally bonus
    this.allyBonusTimer += delta;
    if (this.allyBonusTimer >= this.allyBonusInterval) {
      this.allyBonusTimer = 0;
      this.allyBonusInterval = Phaser.Math.Between(CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX);
      this.spawnAllyBonus();
    }
  }

  // ─── Level timer ───────────────────────────────────────────────────────────
  private updateLevel(delta: number) {
    this.levelTimer += delta;

    // Increase difficulty over time
    this.difficultyScale = 1 + (this.levelTimer / CONFIG.LEVEL_DURATION) * 0.8;

    if (this.levelTimer >= CONFIG.LEVEL_DURATION) {
      this.triggerVictory();
    }
  }

  // ─── HUD refresh ───────────────────────────────────────────────────────────
  private updateHUD() {
    // HP bar
    const hpPct = this.playerHp / CONFIG.PLAYER_HP;
    this.hudHpBar.setSize(120 * hpPct, 12);
    this.hudHpBar.setX(80 - 60 + (60 * hpPct));
    this.hudHpBar.setFillStyle(hpPct > 0.35 ? CONFIG.COLORS.HUD_HP : CONFIG.COLORS.HUD_HP_LOW);
    this.hudHpText.setText(`HP ${this.playerHp}`);

    // Coins
    this.hudCoinsText.setText(`💰 ${this.playerCoins}`);

    // Convoy
    this.hudConvoyText.setText(`🚗 Convoy: ${this.allies.length + 1}`);

    // Progress bar
    const progress = Math.min(this.levelTimer / CONFIG.LEVEL_DURATION, 1);
    this.hudProgressBar.setSize(300 * progress, 10);
    this.hudProgressText.setText(`${Math.floor(progress * 100)}%`);

    // Timer
    const remaining = Math.max(0, (CONFIG.LEVEL_DURATION - this.levelTimer) / 1000);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    this.hudTimerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
  }

  // ─── Damage ────────────────────────────────────────────────────────────────
  private damagePlayer(amount: number) {
    this.playerHp = Math.max(0, this.playerHp - amount);

    // Flash red
    this.cameras.main.flash(200, 200, 0, 0, true);

    if (this.playerHp <= 0) {
      this.triggerGameOver();
    }
  }

  // ─── Collision helpers ─────────────────────────────────────────────────────
  private rectOverlap(rect: Phaser.GameObjects.Rectangle, cx: number, cy: number, w: number, h: number): boolean {
    return Math.abs(rect.x - cx) < (rect.width / 2 + w / 2) &&
      Math.abs(rect.y - cy) < (rect.height / 2 + h / 2);
  }

  private rectOverlap2(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return Math.abs(ax - bx) < (aw / 2 + bw / 2) && Math.abs(ay - by) < (ah / 2 + bh / 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VICTORY
  // ═══════════════════════════════════════════════════════════════════════════
  private triggerVictory() {
    this.state = 'VICTORY';
    this.setHudVisible(false);

    const bonusCoins = CONFIG.COINS_VICTORY_BASE + this.allies.length * CONFIG.COINS_PER_ALLY;
    this.playerCoins += bonusCoins;

    const saved = addCoins(this.playerCoins);
    updateBestScore(this.playerCoins, this.allies.length);

    this.clearOverlay();
    const depth = 25;

    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x003300, 0.88);
    bg.setDepth(depth);

    // Ukrainian flag animation (simple)
    const flagBlue = this.add.rectangle(CONFIG.WIDTH / 2, 140, 260, 60, 0x005bbb);
    flagBlue.setDepth(depth + 1);
    const flagYellow = this.add.rectangle(CONFIG.WIDTH / 2, 200, 260, 60, 0xffd700);
    flagYellow.setDepth(depth + 1);

    this.tweens.add({ targets: [flagBlue, flagYellow], scaleX: { from: 0, to: 1 }, duration: 500, ease: 'Back.Out' });

    const title = this.add.text(CONFIG.WIDTH / 2, 160, '🏆 VICTORY!', {
      fontSize: '40px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(depth + 2);

    this.tweens.add({ targets: title, scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 }, duration: 400, ease: 'Back.Out' });

    const statsText = this.add.text(CONFIG.WIDTH / 2, 310,
      `💰 Coins earned: ${this.playerCoins}\n` +
      `  (+${bonusCoins} bonus)\n` +
      `💀 Enemies killed: ${this.enemiesKilled}\n` +
      `🚗 Convoy size: ${this.allies.length + 1}\n\n` +
      `💰 Total coins: ${saved.totalCoins}`,
      {
        fontSize: '18px', color: '#ffffff', fontFamily: 'monospace', align: 'center',
        lineSpacing: 6,
      }).setOrigin(0.5).setDepth(depth + 2);

    const playAgainBg = this.add.rectangle(CONFIG.WIDTH / 2, 560, 220, 58, 0x005bbb);
    playAgainBg.setDepth(depth + 2).setStrokeStyle(3, 0xffd700).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 560, '▶  Play Again', {
      fontSize: '22px', color: '#FFD700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(depth + 3);
    playAgainBg.on('pointerdown', () => this.startGame());
    playAgainBg.on('pointerover', () => playAgainBg.setFillStyle(0x1177dd));
    playAgainBg.on('pointerout', () => playAgainBg.setFillStyle(0x005bbb));

    const menuBg = this.add.rectangle(CONFIG.WIDTH / 2, 636, 220, 50, 0x222222);
    menuBg.setDepth(depth + 2).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 636, '← Back to Menu', {
      fontSize: '18px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(depth + 3);
    menuBg.on('pointerdown', () => { this.clearOverlay(); this.showMenu(); });

    this.overlayObjects = [bg, flagBlue, flagYellow, title, statsText, playAgainBg, menuBg];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════════════════════
  private triggerGameOver() {
    this.state = 'GAME_OVER';
    this.setHudVisible(false);

    addCoins(this.playerCoins);
    updateBestScore(this.playerCoins, this.allies.length);

    this.cameras.main.shake(400, 0.02);

    this.time.delayedCall(400, () => {
      this.clearOverlay();
      const depth = 25;

      const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x220000, 0.88);
      bg.setDepth(depth);

      const title = this.add.text(CONFIG.WIDTH / 2, 250, '💀 GAME OVER', {
        fontSize: '38px', color: '#ff4444', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(depth + 1);

      this.tweens.add({ targets: title, scaleX: { from: 1.5, to: 1 }, scaleY: { from: 1.5, to: 1 }, duration: 300, ease: 'Back.Out' });

      const statsText = this.add.text(CONFIG.WIDTH / 2, 380,
        `💰 Coins: ${this.playerCoins}\n` +
        `💀 Killed: ${this.enemiesKilled}\n` +
        `🚗 Convoy: ${this.allies.length + 1}`,
        {
          fontSize: '20px', color: '#cccccc', fontFamily: 'monospace', align: 'center',
          lineSpacing: 8,
        }).setOrigin(0.5).setDepth(depth + 1);

      const restartBg = this.add.rectangle(CONFIG.WIDTH / 2, 530, 200, 56, 0xcc0000);
      restartBg.setDepth(depth + 1).setStrokeStyle(3, 0xff8888).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH / 2, 530, '🔄 Restart', {
        fontSize: '22px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(depth + 2);
      restartBg.on('pointerdown', () => this.startGame());
      restartBg.on('pointerover', () => restartBg.setFillStyle(0xff2222));
      restartBg.on('pointerout', () => restartBg.setFillStyle(0xcc0000));

      const menuBg = this.add.rectangle(CONFIG.WIDTH / 2, 604, 200, 48, 0x222222);
      menuBg.setDepth(depth + 1).setStrokeStyle(2, 0x666666).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH / 2, 604, '← Menu', {
        fontSize: '20px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(depth + 2);
      menuBg.on('pointerdown', () => { this.clearOverlay(); this.showMenu(); });

      this.overlayObjects = [bg, title, statsText, restartBg, menuBg];
    });
  }

  // ─── Cleanup helpers ───────────────────────────────────────────────────────
  private destroyCollection(objects: Phaser.GameObjects.GameObject[]) {
    objects.forEach(o => o.destroy());
  }

  private clearMenu() {
    this.menuObjects.forEach(o => o.destroy());
    this.menuObjects = [];
  }

  private clearOverlay() {
    this.overlayObjects.forEach(o => o.destroy());
    this.overlayObjects = [];
  }
}
