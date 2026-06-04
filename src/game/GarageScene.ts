import Phaser from 'phaser';
import { CONFIG, UPGRADES, getStatFromUpgrade } from './config';
import { loadData, upgradeLevel, getUpgradeCost } from './storage';
import type { UpgradeId } from './types';

const CARD_W = 168;
const CARD_H = 170;
const CARD_GAP = 10;
const GRID_X = CONFIG.WIDTH / 2 - CARD_W - CARD_GAP / 2;
const GRID_Y = 200;

export default class GarageScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'GarageScene' });
  }

  create() {
    this.createBackground();
    this.createHeader();
    this.createUpgradeCards();
    this.createStatsPanel();
    this.createBackButton();
  }

  private createBackground() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x080c14);
    // top stripe
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);
  }

  private createHeader() {
    this.add.text(CONFIG.WIDTH / 2, 44, 'GARAGE', {
      fontSize: '34px', color: '#FFD700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(CONFIG.WIDTH / 2, 84, 'Upgrade your convoy', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const data = loadData();
    this.coinsText = this.add.text(CONFIG.WIDTH / 2, 114, `$ ${data.totalCoins}`, {
      fontSize: '20px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  private createUpgradeCards() {
    this.cards = [];
    UPGRADES.forEach((upg, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = GRID_X + col * (CARD_W + CARD_GAP);
      const y = GRID_Y + row * (CARD_H + CARD_GAP);
      const card = this.buildCard(upg.id, x, y);
      this.cards.push(card);
    });
  }

  private buildCard(id: UpgradeId, x: number, y: number): Phaser.GameObjects.Container {
    const data = loadData();
    const level = data.upgrades[id];
    const upg = UPGRADES.find(u => u.id === id)!;
    const maxed = level >= 5;
    const cost = maxed ? 0 : getUpgradeCost(id, level);
    const canAfford = !maxed && data.totalCoins >= cost;

    const container = this.add.container(x + CARD_W / 2, y + CARD_H / 2);

    // Card background
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x101820)
      .setStrokeStyle(2, maxed ? 0xffd700 : canAfford ? 0x335533 : 0x222222);
    container.add(bg);

    // Icon
    const icon = this.add.text(0, -56, upg.icon, {
      fontSize: '22px', color: maxed ? '#ffd700' : '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(icon);

    // Label
    const label = this.add.text(0, -30, upg.label.toUpperCase(), {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(label);

    // Stars (level indicator)
    const starsY = -8;
    for (let s = 0; s < 5; s++) {
      const starX = -40 + s * 20;
      const filled = s < level;
      const star = this.add.text(starX, starsY, filled ? '★' : '☆', {
        fontSize: '14px', color: filled ? '#ffd700' : '#333333', fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(star);
    }

    // Description
    const desc = this.add.text(0, 18, upg.description, {
      fontSize: '11px', color: '#666666', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5);
    container.add(desc);

    // Bonus value
    const bonus = level > 0 ? `+${getStatFromUpgrade(id, level)}` : 'base';
    const bonusTxt = this.add.text(0, 36, bonus, {
      fontSize: '13px', color: '#44cc44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(bonusTxt);

    // Button
    if (maxed) {
      const maxBg = this.add.rectangle(0, 62, CARD_W - 20, 34, 0x1a2200)
        .setStrokeStyle(2, 0xffd700);
      const maxT = this.add.text(0, 62, 'MAX', {
        fontSize: '16px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add([maxBg, maxT]);
    } else {
      const btnColor = canAfford ? 0x1a4400 : 0x1a1a1a;
      const btnBorder = canAfford ? 0x44aa00 : 0x333333;
      const btnTxtColor = canAfford ? '#88ff44' : '#444444';

      const btnBg = this.add.rectangle(0, 62, CARD_W - 20, 34, btnColor)
        .setStrokeStyle(2, btnBorder);
      const btnT = this.add.text(0, 62, `$ ${cost}`, {
        fontSize: '15px', color: btnTxtColor, fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add([btnBg, btnT]);

      if (canAfford) {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => this.doUpgrade(id));
        btnBg.on('pointerover', () => btnBg.setFillStyle(0x2a6600));
        btnBg.on('pointerout', () => btnBg.setFillStyle(btnColor));
      }
    }

    return container;
  }

  private doUpgrade(id: UpgradeId) {
    const ok = upgradeLevel(id);
    if (!ok) return;

    // Rebuild all cards and stats
    this.cards.forEach(c => c.destroy());
    this.createUpgradeCards();
    this.refreshStats();

    const data = loadData();
    this.coinsText.setText(`$ ${data.totalCoins}`);

    // Flash
    this.cameras.main.flash(180, 50, 200, 50, true);
  }

  // ─── Stats panel ───────────────────────────────────────────────────────────
  private statsPanel?: Phaser.GameObjects.Container;

  private createStatsPanel() {
    const data = loadData();
    const upg = data.upgrades;

    const speed = CONFIG.PLAYER_SPEED_X + getStatFromUpgrade('engine', upg.engine);
    const hp = CONFIG.PLAYER_HP + getStatFromUpgrade('armor', upg.armor);
    const fire = CONFIG.PLAYER_FIRE_RATE - getStatFromUpgrade('weapon', upg.weapon);
    const dmg = 1 + getStatFromUpgrade('damage', upg.damage);

    const y = GRID_Y + 2 * (CARD_H + CARD_GAP) + 20;
    const container = this.add.container(CONFIG.WIDTH / 2, y);

    const bg = this.add.rectangle(0, 44, CONFIG.WIDTH - 30, 100, 0x0a1218)
      .setStrokeStyle(1, 0x223322);
    const title = this.add.text(0, 4, 'CURRENT STATS', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const stats = this.add.text(0, 54,
      `Speed: ${speed}   HP: ${hp}   Fire: ${fire}ms   Dmg: ${dmg}`,
      { fontSize: '13px', color: '#aaffaa', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5);

    container.add([bg, title, stats]);
    this.statsPanel = container;
  }

  private refreshStats() {
    this.statsPanel?.destroy();
    this.createStatsPanel();
  }

  // ─── Back button ───────────────────────────────────────────────────────────
  private createBackButton() {
    const btnBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 60, 200, 52, 0x111111)
      .setStrokeStyle(2, 0x444444)
      .setInteractive({ useHandCursor: true });
    const btnT = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 60, '< Back to Menu', {
      fontSize: '17px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    btnBg.on('pointerdown', () => this.scene.start('GameScene'));
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x222222));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x111111));

    // Keyboard shortcut
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }
}
