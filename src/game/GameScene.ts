import Phaser from 'phaser';
import { CONFIG } from './config';
import { loadData, addCoins, updateBestScore } from './storage';
import { createPixelTextures } from './PixelArt';
import type { GameState, EnemyType } from './types';

// ─── Ally formation offsets ───────────────────────────────────────────────────
const ALLY_FORMATION: { ox: number; oy: number }[] = [
  { ox: -70, oy: 50 },
  { ox:  70, oy: 50 },
  { ox: -70, oy: 120 },
  { ox:  70, oy: 120 },
  { ox: -140, oy: 50 },
  { ox:  140, oy: 50 },
  { ox: -140, oy: 120 },
  { ox:  140, oy: 120 },
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
}

interface Bullet {
  sprite: Phaser.GameObjects.Image;
  speed: number;
}

interface Obstacle {
  sprite: Phaser.GameObjects.Image;
  hw: number; // half-width for collision
  hh: number;
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
  sprite: Phaser.GameObjects.Image;
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

  // ─── Background decorations ────────────────────────────────────────────────
  private bgDecorations: { obj: Phaser.GameObjects.Rectangle; speed: number }[] = [];

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

  // ─── Overlay objects ───────────────────────────────────────────────────────
  private menuObjects: Phaser.GameObjects.GameObject[] = [];
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════
  create() {
    // Build all pixel-art textures before anything else
    createPixelTextures(this);

    this.createBackground();
    this.createRoad();
    this.createHUD();
    this.createPlayer();
    this.setupInput();
    this.showMenu();
  }

  // ─── Background ────────────────────────────────────────────────────────────
  private createBackground() {
    // Dark sky
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT * 0.4, CONFIG.WIDTH, CONFIG.HEIGHT * 0.8, 0x1a2a3a);
    // Dirt shoulders
    this.add.rectangle(CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X + 4, CONFIG.HEIGHT, 0x2a2010);
    this.add.rectangle(CONFIG.WIDTH - CONFIG.ROAD_X / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_X + 4, CONFIG.HEIGHT, 0x2a2010);

    // Static background ruins / rubble details (decorative rects at low depth)
    const ruinPositions = [
      { x: 18, y: 200 }, { x: 30, y: 500 }, { x: 22, y: 720 },
      { x: CONFIG.WIDTH - 22, y: 150 }, { x: CONFIG.WIDTH - 30, y: 450 },
    ];
    for (const p of ruinPositions) {
      this.add.rectangle(p.x, p.y, Phaser.Math.Between(12, 28), Phaser.Math.Between(20, 50), 0x332211).setDepth(0);
      this.add.rectangle(p.x + 6, p.y - 15, Phaser.Math.Between(8, 16), Phaser.Math.Between(10, 25), 0x221a0e).setDepth(0);
    }
  }

  // ─── Road ──────────────────────────────────────────────────────────────────
  private createRoad() {
    // Road surface
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.ROAD_WIDTH, CONFIG.HEIGHT, 0x252525);
    // Subtle road texture stripes
    for (let i = 0; i < 3; i++) {
      const lx = CONFIG.ROAD_X + 30 + i * 90;
      this.add.rectangle(lx, CONFIG.HEIGHT / 2, 2, CONFIG.HEIGHT, 0x1e1e1e);
    }
    // Road border lines (solid)
    this.add.rectangle(CONFIG.ROAD_X, CONFIG.HEIGHT / 2, 3, CONFIG.HEIGHT, 0x445544);
    this.add.rectangle(CONFIG.ROAD_X + CONFIG.ROAD_WIDTH, CONFIG.HEIGHT / 2, 3, CONFIG.HEIGHT, 0x445544);

    // Animated center dashes
    for (let i = 0; i < 7; i++) {
      const y = (CONFIG.HEIGHT / 7) * i + 40;
      const line = this.add.rectangle(CONFIG.WIDTH / 2, y, 5, 36, 0x3a3a3a);
      this.roadLines.push(line);
      this.roadLineY.push(y);
    }
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────
  private createHUD() {
    const hudH = 68;
    this.hudBg = this.add.rectangle(CONFIG.WIDTH / 2, hudH / 2, CONFIG.WIDTH, hudH, 0x080808, 0.92);
    this.hudBg.setDepth(10);

    // HP
    this.hudHpBarBg = this.add.rectangle(85, 17, 124, 13, 0x2a2a2a).setDepth(11);
    this.hudHpBar = this.add.rectangle(23, 17, 124, 13, CONFIG.COLORS.HUD_HP).setDepth(12).setOrigin(0, 0.5);
    this.hudHpText = this.add.text(20, 8, 'HP', {
      fontSize: '13px', color: '#88ff88', fontFamily: 'monospace',
    }).setDepth(12);

    // Coins
    this.hudCoinsText = this.add.text(160, 8, '$ 0', {
      fontSize: '15px', color: '#FFD700', fontFamily: 'monospace',
    }).setDepth(12);

    // Convoy
    this.hudConvoyText = this.add.text(20, 36, '[=] 1', {
      fontSize: '13px', color: '#88ccff', fontFamily: 'monospace',
    }).setDepth(12);

    // Progress bar
    this.hudProgressBg = this.add.rectangle(CONFIG.WIDTH / 2, 57, 310, 9, 0x1a1a1a).setDepth(11);
    this.hudProgressBar = this.add.rectangle(CONFIG.WIDTH / 2 - 155, 57, 0, 9, CONFIG.COLORS.PROGRESS)
      .setDepth(12).setOrigin(0, 0.5);

    this.hudProgressText = this.add.text(CONFIG.WIDTH - 8, 48, '0%', {
      fontSize: '13px', color: '#FFD700', fontFamily: 'monospace',
    }).setDepth(12).setOrigin(1, 0);

    this.hudTimerText = this.add.text(CONFIG.WIDTH / 2, 48, '1:30', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setDepth(12).setOrigin(0.5, 0);

    this.setHudVisible(false);
  }

  private setHudVisible(v: boolean) {
    [this.hudBg, this.hudHpBar, this.hudHpBarBg, this.hudHpText,
      this.hudCoinsText, this.hudConvoyText, this.hudProgressBg,
      this.hudProgressBar, this.hudProgressText, this.hudTimerText,
    ].forEach(o => o.setVisible(v));
  }

  // ─── Player ────────────────────────────────────────────────────────────────
  private createPlayer() {
    this.playerContainer = this.add.container(this.playerX, this.playerY);
    const sprite = this.add.image(0, 0, 'player');
    this.playerContainer.add(sprite);
    this.playerContainer.setDepth(5);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────
  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isPointerDown) this.pointerX = ptr.x;
    });
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.isPointerDown = true;
      this.pointerX = ptr.x;
      if (this.state === 'MENU') return; // menu handles its own clicks
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

    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x050510, 0.82).setDepth(20);

    // Title
    const title = this.add.text(CONFIG.WIDTH / 2, 120, 'STEEL ROAD', {
      fontSize: '44px', color: '#FFD700', fontFamily: 'monospace',
      stroke: '#0a0a0a', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(21);

    const sub = this.add.text(CONFIG.WIDTH / 2, 175, 'C O N V O Y', {
      fontSize: '22px', color: '#88ccff', fontFamily: 'monospace',
      stroke: '#0a0a0a', strokeThickness: 4, letterSpacing: 8,
    }).setOrigin(0.5).setDepth(21);

    // Blue / yellow flag strip
    const flagBlue = this.add.rectangle(CONFIG.WIDTH / 2, 215, 280, 14, 0x005bbb).setDepth(21);
    const flagYellow = this.add.rectangle(CONFIG.WIDTH / 2, 229, 280, 14, 0xffd700).setDepth(21);

    // Demo vehicle pixel sprite
    const demoSprite = this.add.image(CONFIG.WIDTH / 2, 320, 'player').setScale(1.6).setDepth(21);
    this.tweens.add({ targets: demoSprite, y: 328, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Stats box
    const statsBg = this.add.rectangle(CONFIG.WIDTH / 2, 430, 280, 80, 0x0f1a0f, 0.9).setDepth(21).setStrokeStyle(1, 0x335533);
    const statsText = this.add.text(CONFIG.WIDTH / 2, 430,
      `$ Total: ${data.totalCoins}   Best: ${data.bestScore}\nMax convoy: ${data.maxConvoy + 1}`,
      { fontSize: '15px', color: '#aaffaa', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5).setDepth(22);

    // Play button
    const playBg = this.add.rectangle(CONFIG.WIDTH / 2, 530, 220, 62, 0x005bbb).setDepth(21)
      .setStrokeStyle(3, 0xffd700).setInteractive({ useHandCursor: true });
    const playTxt = this.add.text(CONFIG.WIDTH / 2, 530, '▶  PLAY', {
      fontSize: '26px', color: '#FFD700', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    playBg.on('pointerdown', () => this.startGame());
    playBg.on('pointerover', () => { playBg.setFillStyle(0x1177dd); });
    playBg.on('pointerout', () => { playBg.setFillStyle(0x005bbb); });

    // Pulse tween on play button
    this.tweens.add({ targets: [playBg, playTxt], scaleX: 1.04, scaleY: 1.04, duration: 700, yoyo: true, repeat: -1 });

    // Disabled buttons
    const garageBg = this.add.rectangle(CONFIG.WIDTH / 2, 614, 160, 42, 0x111111).setDepth(21).setStrokeStyle(1, 0x333333);
    const garageT = this.add.text(CONFIG.WIDTH / 2, 614, '[G] Garage', { fontSize: '15px', color: '#444444', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);

    const lbBg = this.add.rectangle(CONFIG.WIDTH / 2, 668, 160, 42, 0x111111).setDepth(21).setStrokeStyle(1, 0x333333);
    const lbT = this.add.text(CONFIG.WIDTH / 2, 668, '[L] Leaders', { fontSize: '15px', color: '#444444', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(22);

    const ver = this.add.text(CONFIG.WIDTH / 2, 790, 'MVP v1.0  •  Steel Road: Convoy', {
      fontSize: '11px', color: '#222233', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(22);

    this.menuObjects = [bg, title, sub, flagBlue, flagYellow, demoSprite, statsBg, statsText,
      playBg, playTxt, garageBg, garageT, lbBg, lbT, ver];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // START
  // ═══════════════════════════════════════════════════════════════════════════
  private startGame() {
    this.clearMenu();
    this.clearOverlay();
    this.tweens.killAll();

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
    this.allyBonusInterval = Phaser.Math.Between(CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX);

    // Destroy old game objects
    this.bullets.forEach(b => b.sprite.destroy());
    this.enemies.forEach(e => { e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy(); });
    this.obstacles.forEach(o => o.sprite.destroy());
    this.allyBonuses.forEach(a => a.container.destroy());
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

  // ─── Road ──────────────────────────────────────────────────────────────────
  private updateRoad(delta: number) {
    const speed = this.roadLineSpeed * this.difficultyScale;
    for (let i = 0; i < this.roadLines.length; i++) {
      this.roadLineY[i] += speed * (delta / 1000);
      if (this.roadLineY[i] > CONFIG.HEIGHT + 30) this.roadLineY[i] -= CONFIG.HEIGHT + 60;
      this.roadLines[i].setY(this.roadLineY[i]);
    }
  }

  // ─── Player ────────────────────────────────────────────────────────────────
  private updatePlayer(delta: number) {
    const dt = delta / 1000;
    const roadLeft = CONFIG.ROAD_X + CONFIG.PLAYER_W / 2 + 5;
    const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - CONFIG.PLAYER_W / 2 - 5;

    if (this.cursors.left.isDown) this.playerX -= CONFIG.PLAYER_SPEED_X * dt;
    else if (this.cursors.right.isDown) this.playerX += CONFIG.PLAYER_SPEED_X * dt;

    if (this.isPointerDown && this.pointerX !== null) {
      const diff = this.pointerX - this.playerX;
      this.playerX += Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.PLAYER_SPEED_X * dt * 2.5);
    }

    this.playerX = Phaser.Math.Clamp(this.playerX, roadLeft, roadRight);
    this.playerContainer.setX(this.playerX);

    // Auto shoot
    this.playerShootTimer += delta;
    if (this.playerShootTimer >= CONFIG.PLAYER_FIRE_RATE) {
      this.playerShootTimer = 0;
      this.spawnBullet(this.playerX, this.playerY - 33, CONFIG.BULLET_SPEED, 'bullet_p');
    }
  }

  // ─── Allies ────────────────────────────────────────────────────────────────
  private updateAllies(delta: number) {
    const roadLeft = CONFIG.ROAD_X + CONFIG.PLAYER_W / 2 + 5;
    const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - CONFIG.PLAYER_W / 2 - 5;

    for (let i = 0; i < this.allies.length; i++) {
      const ally = this.allies[i];
      const f = ALLY_FORMATION[i];
      ally.targetX = Phaser.Math.Clamp(this.playerX + f.ox, roadLeft, roadRight);
      ally.targetY = Phaser.Math.Clamp(this.playerY + f.oy, CONFIG.HEIGHT - 300, CONFIG.HEIGHT - 60);

      ally.container.x += (ally.targetX - ally.container.x) * 0.12;
      ally.container.y += (ally.targetY - ally.container.y) * 0.12;

      ally.shootTimer += delta;
      if (ally.shootTimer >= CONFIG.ALLY_FIRE_RATE) {
        ally.shootTimer = 0;
        this.spawnBullet(ally.container.x, ally.container.y - 33, CONFIG.ALLY_BULLET_SPEED, 'bullet_a');
      }
    }
  }

  // ─── Bullets ───────────────────────────────────────────────────────────────
  private spawnBullet(x: number, y: number, speed: number, textureKey: string) {
    const sprite = this.add.image(x, y, textureKey).setDepth(4);
    this.bullets.push({ sprite, speed });
  }

  private updateBullets(delta: number) {
    const dt = delta / 1000;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.sprite.y -= b.speed * dt;

      if (b.sprite.y < -20) {
        b.sprite.destroy();
        this.bullets.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (this.overlap2(b.sprite.x, b.sprite.y, 6, 15, e.container.x, e.container.y, 36, 48)) {
          e.hp--;
          this.spawnParticles(b.sprite.x, b.sprite.y, 'particle_exp', 4);
          b.sprite.destroy();
          this.bullets.splice(i, 1);
          hit = true;

          if (e.hp <= 0) {
            this.killEnemy(j);
          } else {
            this.refreshEnemyHpBar(e);
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
    let textureKey = 'walker';

    if (type === 'HEAVY') {
      hp = 3; speed = 58 * this.difficultyScale;
      coins = CONFIG.COINS_HEAVY; textureKey = 'heavy';
    }

    const sprite = this.add.image(0, 0, textureKey);
    // Wobble walk animation
    this.tweens.add({ targets: sprite, angle: { from: -4, to: 4 }, duration: 220, yoyo: true, repeat: -1 });

    const container = this.add.container(x, -80, [sprite]).setDepth(3);

    let hpBar: Phaser.GameObjects.Rectangle | undefined;
    let hpBarBg: Phaser.GameObjects.Rectangle | undefined;
    if (type === 'HEAVY') {
      hpBarBg = this.add.rectangle(x, -80 - 36, 44, 6, 0x222222).setDepth(3);
      hpBar = this.add.rectangle(x - 22, -80 - 36, 44, 6, 0xff3333).setDepth(4).setOrigin(0, 0.5);
    }

    this.enemies.push({ container, hp, maxHp: hp, type, speed, coins, hpBar, hpBarBg });
  }

  private refreshEnemyHpBar(e: Enemy) {
    if (e.hpBar && e.hpBarBg) {
      const pct = e.hp / e.maxHp;
      e.hpBar.setSize(44 * pct, 6);
      e.hpBar.setPosition(e.container.x - 22, e.container.y - 40);
      e.hpBarBg.setPosition(e.container.x, e.container.y - 40);
    }
  }

  private killEnemy(index: number) {
    const e = this.enemies[index];
    this.spawnParticles(e.container.x, e.container.y, 'particle_exp', 10);
    e.container.destroy();
    e.hpBar?.destroy();
    e.hpBarBg?.destroy();
    this.enemies.splice(index, 1);
    this.playerCoins += e.coins;
    this.enemiesKilled++;

    // Floating coin text
    const txt = this.add.text(e.container.x, e.container.y, `+${e.coins}`, {
      fontSize: '16px', color: '#FFD700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: txt, y: e.container.y - 60, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
  }

  private updateEnemies(delta: number) {
    const dt = delta / 1000;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.container.y += e.speed * dt;
      if (e.hpBar) this.refreshEnemyHpBar(e);

      if (e.container.y > CONFIG.HEIGHT + 80) {
        e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
        this.enemies.splice(i, 1);
        continue;
      }

      // Collision with player
      if (this.overlap2(e.container.x, e.container.y, 34, 44, this.playerX, this.playerY, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
        this.damagePlayer(CONFIG.COLLISION_DAMAGE);
        this.spawnParticles(e.container.x, e.container.y, 'particle_exp', 8);
        e.container.destroy(); e.hpBar?.destroy(); e.hpBarBg?.destroy();
        this.enemies.splice(i, 1);
        continue;
      }

      // Collision with allies (ally absorbs hit)
      for (let j = 0; j < this.allies.length; j++) {
        const al = this.allies[j];
        if (this.overlap2(e.container.x, e.container.y, 34, 44, al.container.x, al.container.y, CONFIG.PLAYER_W, CONFIG.PLAYER_H)) {
          e.hp--;
          if (e.hp <= 0) this.killEnemy(i);
          else this.refreshEnemyHpBar(e);
          break;
        }
      }
    }
  }

  // ─── Obstacles ─────────────────────────────────────────────────────────────
  private spawnObstacle() {
    const roadLeft = CONFIG.ROAD_X + 22;
    const roadRight = CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 22;
    const x = Phaser.Math.Between(roadLeft, roadRight);

    const types = ['obs_block', 'obs_crate', 'obs_barr'];
    const key = types[Phaser.Math.Between(0, 2)];

    const sprite = this.add.image(x, -40, key).setDepth(3);
    const hw = sprite.width / 2 - 2;
    const hh = sprite.height / 2 - 2;
    this.obstacles.push({ sprite, hw, hh });
  }

  private updateObstacles(delta: number) {
    const dt = delta / 1000;
    const speed = 155 * this.difficultyScale;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.sprite.y += speed * dt;

      if (o.sprite.y > CONFIG.HEIGHT + 50) {
        o.sprite.destroy(); this.obstacles.splice(i, 1); continue;
      }

      if (this.overlap2(o.sprite.x, o.sprite.y, o.hw * 2, o.hh * 2, this.playerX, this.playerY, CONFIG.PLAYER_W - 4, CONFIG.PLAYER_H - 8)) {
        this.damagePlayer(CONFIG.COLLISION_DAMAGE);
        this.spawnParticles(o.sprite.x, o.sprite.y, 'particle_exp', 6);
        o.sprite.destroy(); this.obstacles.splice(i, 1);
      }
    }
  }

  // ─── Ally bonus ────────────────────────────────────────────────────────────
  private spawnAllyBonus() {
    if (this.allies.length >= CONFIG.MAX_ALLIES) return;
    const x = Phaser.Math.Between(CONFIG.ROAD_X + 30, CONFIG.ROAD_X + CONFIG.ROAD_WIDTH - 30);

    const sprite = this.add.image(0, 0, 'bonus_ally');
    const container = this.add.container(x, -60, [sprite]).setDepth(3);

    this.tweens.add({ targets: sprite, angle: 360, duration: 2000, repeat: -1 });
    this.tweens.add({ targets: sprite, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1 });

    this.allyBonuses.push({ container });
  }

  private updateAllyBonuses(delta: number) {
    const dt = delta / 1000;
    for (let i = this.allyBonuses.length - 1; i >= 0; i--) {
      const a = this.allyBonuses[i];
      a.container.y += 130 * dt;

      if (a.container.y > CONFIG.HEIGHT + 50) {
        a.container.destroy(); this.allyBonuses.splice(i, 1); continue;
      }

      if (this.overlap2(a.container.x, a.container.y, 36, 42, this.playerX, this.playerY, CONFIG.PLAYER_W + 24, CONFIG.PLAYER_H + 24)) {
        this.pickupAlly(a.container.x, a.container.y);
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

    const txt = this.add.text(x, y - 40, '+ ALLY', {
      fontSize: '18px', color: '#00ccff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({ targets: txt, y: y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
  }

  // ─── Particles ─────────────────────────────────────────────────────────────
  private spawnParticles(x: number, y: number, textureKey: string, count: number) {
    for (let i = 0; i < count; i++) {
      const sprite = this.add.image(x, y, textureKey).setDepth(6);
      this.particles.push({
        sprite,
        vx: Phaser.Math.FloatBetween(-130, 130),
        vy: Phaser.Math.FloatBetween(-190, 50),
        life: 420,
        maxLife: 420,
      });
    }
  }

  private updateParticles(delta: number) {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= delta;
      p.sprite.setAlpha(p.life / p.maxLife);
      if (p.life <= 0) { p.sprite.destroy(); this.particles.splice(i, 1); }
    }
  }

  // ─── Spawners ──────────────────────────────────────────────────────────────
  private updateSpawners(delta: number) {
    this.enemySpawnTimer += delta;
    const enemyInterval = CONFIG.ENEMY_SPAWN_INTERVAL / this.difficultyScale;
    if (this.enemySpawnTimer >= enemyInterval) {
      this.enemySpawnTimer = 0;
      const type: EnemyType = Math.random() < 0.25 ? 'HEAVY' : 'WALKER';
      this.spawnEnemy(type);
      if (Math.random() < 0.3) {
        this.time.delayedCall(280, () => { if (this.state === 'PLAYING') this.spawnEnemy('WALKER'); });
      }
    }

    this.obstacleSpawnTimer += delta;
    if (this.obstacleSpawnTimer >= CONFIG.OBSTACLE_SPAWN_INTERVAL / this.difficultyScale) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstacle();
    }

    this.allyBonusTimer += delta;
    if (this.allyBonusTimer >= this.allyBonusInterval) {
      this.allyBonusTimer = 0;
      this.allyBonusInterval = Phaser.Math.Between(CONFIG.ALLY_BONUS_INTERVAL_MIN, CONFIG.ALLY_BONUS_INTERVAL_MAX);
      this.spawnAllyBonus();
    }
  }

  // ─── Level ─────────────────────────────────────────────────────────────────
  private updateLevel(delta: number) {
    this.levelTimer += delta;
    this.difficultyScale = 1 + (this.levelTimer / CONFIG.LEVEL_DURATION) * 0.85;
    if (this.levelTimer >= CONFIG.LEVEL_DURATION) this.triggerVictory();
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────
  private updateHUD() {
    const hpPct = this.playerHp / CONFIG.PLAYER_HP;
    const hpW = 124 * hpPct;
    this.hudHpBar.setSize(hpW, 13);
    this.hudHpBar.setX(23);
    this.hudHpBar.setFillStyle(hpPct > 0.35 ? CONFIG.COLORS.HUD_HP : CONFIG.COLORS.HUD_HP_LOW);
    this.hudHpText.setText(`HP ${this.playerHp}`);
    this.hudCoinsText.setText(`$ ${this.playerCoins}`);
    this.hudConvoyText.setText(`[=] ${this.allies.length + 1}`);

    const prog = Math.min(this.levelTimer / CONFIG.LEVEL_DURATION, 1);
    this.hudProgressBar.setSize(310 * prog, 9);
    this.hudProgressText.setText(`${Math.floor(prog * 100)}%`);

    const rem = Math.max(0, (CONFIG.LEVEL_DURATION - this.levelTimer) / 1000);
    const m = Math.floor(rem / 60);
    const s = Math.floor(rem % 60);
    this.hudTimerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
  }

  // ─── Damage ────────────────────────────────────────────────────────────────
  private damagePlayer(amount: number) {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.cameras.main.flash(180, 180, 0, 0, true);
    if (this.playerHp <= 0) this.triggerGameOver();
  }

  // ─── Collision ─────────────────────────────────────────────────────────────
  private overlap2(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return Math.abs(ax - bx) < (aw / 2 + bw / 2) && Math.abs(ay - by) < (ah / 2 + bh / 2);
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
    const saved = addCoins(this.playerCoins);
    updateBestScore(this.playerCoins, this.allies.length);

    this.clearOverlay();
    const D = 25;

    const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x001100, 0.88).setDepth(D);
    const flagB = this.add.rectangle(CONFIG.WIDTH / 2, 140, 280, 58, 0x005bbb).setDepth(D + 1);
    const flagY = this.add.rectangle(CONFIG.WIDTH / 2, 198, 280, 58, 0xffd700).setDepth(D + 1);

    this.tweens.add({ targets: [flagB, flagY], scaleX: { from: 0, to: 1 }, duration: 500, ease: 'Back.Out' });

    const title = this.add.text(CONFIG.WIDTH / 2, 162, 'VICTORY!', {
      fontSize: '42px', color: '#ffffff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(D + 2);
    this.tweens.add({ targets: title, scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 }, duration: 400, ease: 'Back.Out' });

    const statsText = this.add.text(CONFIG.WIDTH / 2, 320,
      `$ Coins: ${this.playerCoins}  (+${bonus} bonus)\n` +
      `> Killed: ${this.enemiesKilled}\n` +
      `[=] Convoy: ${this.allies.length + 1}\n\n` +
      `$ Total coins: ${saved.totalCoins}`,
      { fontSize: '17px', color: '#ccffcc', fontFamily: 'monospace', align: 'center', lineSpacing: 8 }
    ).setOrigin(0.5).setDepth(D + 2);

    const playBg = this.add.rectangle(CONFIG.WIDTH / 2, 530, 220, 60, 0x005bbb).setDepth(D + 2)
      .setStrokeStyle(3, 0xffd700).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 530, '▶  Play Again', { fontSize: '22px', color: '#FFD700', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 3);
    playBg.on('pointerdown', () => this.startGame());
    playBg.on('pointerover', () => playBg.setFillStyle(0x1177dd));
    playBg.on('pointerout', () => playBg.setFillStyle(0x005bbb));

    const menuBg = this.add.rectangle(CONFIG.WIDTH / 2, 608, 200, 48, 0x111111).setDepth(D + 2)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, 608, '< Menu', { fontSize: '18px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 3);
    menuBg.on('pointerdown', () => { this.clearOverlay(); this.showMenu(); });

    this.overlayObjects = [bg, flagB, flagY, title, statsText, playBg, menuBg];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════════════════════
  private triggerGameOver() {
    this.state = 'GAME_OVER';
    this.setHudVisible(false);
    this.tweens.killAll();

    addCoins(this.playerCoins);
    updateBestScore(this.playerCoins, this.allies.length);
    this.cameras.main.shake(420, 0.022);

    this.time.delayedCall(420, () => {
      this.clearOverlay();
      const D = 25;

      const bg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x1a0000, 0.88).setDepth(D);

      const title = this.add.text(CONFIG.WIDTH / 2, 240, 'GAME OVER', {
        fontSize: '40px', color: '#ff3333', fontFamily: 'monospace', stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(D + 1);
      this.tweens.add({ targets: title, scaleX: { from: 1.5, to: 1 }, scaleY: { from: 1.5, to: 1 }, duration: 300, ease: 'Back.Out' });

      const statsText = this.add.text(CONFIG.WIDTH / 2, 370,
        `$ Coins: ${this.playerCoins}\n> Killed: ${this.enemiesKilled}\n[=] Convoy: ${this.allies.length + 1}`,
        { fontSize: '20px', color: '#cccccc', fontFamily: 'monospace', align: 'center', lineSpacing: 8 }
      ).setOrigin(0.5).setDepth(D + 1);

      const restartBg = this.add.rectangle(CONFIG.WIDTH / 2, 510, 200, 56, 0xaa0000).setDepth(D + 1)
        .setStrokeStyle(3, 0xff6666).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH / 2, 510, 'RESTART', { fontSize: '22px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      restartBg.on('pointerdown', () => this.startGame());
      restartBg.on('pointerover', () => restartBg.setFillStyle(0xdd2222));
      restartBg.on('pointerout', () => restartBg.setFillStyle(0xaa0000));

      const menuBg = this.add.rectangle(CONFIG.WIDTH / 2, 584, 200, 48, 0x111111).setDepth(D + 1)
        .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH / 2, 584, '< Menu', { fontSize: '18px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(D + 2);
      menuBg.on('pointerdown', () => { this.clearOverlay(); this.showMenu(); });

      this.overlayObjects = [bg, title, statsText, restartBg, menuBg];
    });
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  private clearMenu() {
    this.menuObjects.forEach(o => o.destroy());
    this.menuObjects = [];
  }

  private clearOverlay() {
    this.overlayObjects.forEach(o => o.destroy());
    this.overlayObjects = [];
  }
}
