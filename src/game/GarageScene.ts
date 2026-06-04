import Phaser from 'phaser';
import { CONFIG, UPGRADES, VEHICLES, WEAPON_LEVELS, UPGRADE_MAX_LEVELS, getStatFromUpgrade } from './config';
import { loadData, upgradeLevel, getUpgradeCost, unlockVehicle, selectVehicle } from './storage';
import { createPixelTextures } from './PixelArt';
import type { UpgradeId, VehicleId } from './types';

type Tab = 'upgrades' | 'vehicles';

const CARD_W = 168, CARD_H = 170, CARD_GAP = 10;
const GRID_X = CONFIG.WIDTH / 2 - CARD_W - CARD_GAP / 2;
const GRID_Y = 190;

export default class GarageScene extends Phaser.Scene {
  private currentTab: Tab = 'upgrades';
  private coinsText!: Phaser.GameObjects.Text;
  private contentObjects: Phaser.GameObjects.GameObject[] = [];
  private tabBtnUpgrades!: Phaser.GameObjects.Rectangle;
  private tabBtnVehicles!: Phaser.GameObjects.Rectangle;
  private tabTxtUpgrades!: Phaser.GameObjects.Text;
  private tabTxtVehicles!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'GarageScene' }); }

  create() {
    if (!this.textures.exists('vehicle_scout')) createPixelTextures(this);

    this.createBackground();
    this.createHeader();
    this.createTabs();
    this.renderTab();
    this.createBackButton();
  }

  private createBackground() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x080c14);
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);
  }

  private createHeader() {
    this.add.text(CONFIG.WIDTH / 2, 38, 'ГАРАЖ', {
      fontSize: '32px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    const data = loadData();
    this.coinsText = this.add.text(CONFIG.WIDTH / 2, 76, `$ ${data.totalCoins}`, {
      fontSize: '19px', color: '#ffd700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  private createTabs() {
    const tabY = 118;
    this.tabBtnUpgrades = this.add.rectangle(CONFIG.WIDTH / 2 - 80, tabY, 144, 38, 0x1a3300)
      .setStrokeStyle(2, 0x44aa00).setInteractive({ useHandCursor: true });
    this.tabTxtUpgrades = this.add.text(CONFIG.WIDTH / 2 - 80, tabY, 'АПГРЕЙДИ', {
      fontSize: '14px', color: '#88ff44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tabBtnVehicles = this.add.rectangle(CONFIG.WIDTH / 2 + 80, tabY, 144, 38, 0x111111)
      .setStrokeStyle(2, 0x333333).setInteractive({ useHandCursor: true });
    this.tabTxtVehicles = this.add.text(CONFIG.WIDTH / 2 + 80, tabY, 'ТЕХНІКА', {
      fontSize: '14px', color: '#555555', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tabBtnUpgrades.on('pointerdown', () => this.switchTab('upgrades'));
    this.tabBtnVehicles.on('pointerdown', () => this.switchTab('vehicles'));
  }

  private switchTab(tab: Tab) {
    this.currentTab = tab;
    if (tab === 'upgrades') {
      this.tabBtnUpgrades.setFillStyle(0x1a3300).setStrokeStyle(2, 0x44aa00);
      this.tabTxtUpgrades.setColor('#88ff44');
      this.tabBtnVehicles.setFillStyle(0x111111).setStrokeStyle(2, 0x333333);
      this.tabTxtVehicles.setColor('#555555');
    } else {
      this.tabBtnVehicles.setFillStyle(0x0a1a2e).setStrokeStyle(2, 0x3377cc);
      this.tabTxtVehicles.setColor('#88ccff');
      this.tabBtnUpgrades.setFillStyle(0x111111).setStrokeStyle(2, 0x333333);
      this.tabTxtUpgrades.setColor('#555555');
    }
    this.renderTab();
  }

  private renderTab() {
    this.contentObjects.forEach(o => o.destroy());
    this.contentObjects = [];
    this.cameras.main.scrollY = 0;
    if (this.currentTab === 'upgrades') this.buildUpgradesTab();
    else this.buildVehiclesTab();
  }

  // ─── Upgrades tab ──────────────────────────────────────────────────────────
  private buildUpgradesTab() {
    this.cameras.main.setBounds(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    UPGRADES.forEach((upg, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = GRID_X + col * (CARD_W + CARD_GAP);
      const y = GRID_Y + row * (CARD_H + CARD_GAP);
      this.contentObjects.push(this.buildUpgradeCard(upg.id, x, y));
    });
    this.contentObjects.push(...this.buildStatsPanel());
    this.refreshCoins();
  }

  private buildUpgradeCard(id: UpgradeId, x: number, y: number): Phaser.GameObjects.Container {
    const data = loadData();
    const level = data.upgrades[id];
    const upg = UPGRADES.find(u => u.id === id)!;
    const maxLevel = UPGRADE_MAX_LEVELS[id];
    const maxed = level >= maxLevel;
    const cost = maxed ? 0 : getUpgradeCost(id, level);
    const canAfford = !maxed && data.totalCoins >= cost;

    const c = this.add.container(x + CARD_W / 2, y + CARD_H / 2);
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x101820)
      .setStrokeStyle(2, maxed ? 0xffd700 : canAfford ? 0x335533 : 0x222222);
    c.add(bg);
    c.add(this.add.text(0, -56, upg.icon, { fontSize: '22px', color: maxed ? '#ffd700' : '#88ccff', fontFamily: 'monospace' }).setOrigin(0.5));
    c.add(this.add.text(0, -32, upg.label.toUpperCase(), { fontSize: '14px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5));

    // Stars (show up to 5 for visual clarity even if max=10)
    const displayMax = Math.min(maxLevel, 5);
    const displayLevel = Math.min(level, 5);
    for (let s = 0; s < displayMax; s++) {
      c.add(this.add.text(-40 + s * (80 / displayMax), -8, s < displayLevel ? '★' : '☆', {
        fontSize: '14px', color: s < displayLevel ? '#ffd700' : '#333', fontFamily: 'monospace',
      }).setOrigin(0.5));
    }

    // Weapon: show current level name
    if (id === 'weapon' && level > 0) {
      const wname = WEAPON_LEVELS[level - 1];
      c.add(this.add.text(0, 14, wname.icon + ' ' + wname.name, {
        fontSize: '10px', color: '#88ccff', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5));
    } else {
      c.add(this.add.text(0, 16, upg.description, { fontSize: '11px', color: '#666', fontFamily: 'monospace', align: 'center' }).setOrigin(0.5));
    }

    c.add(this.add.text(0, 34, level > 0 ? `+${getStatFromUpgrade(id, level)}` : 'база', { fontSize: '13px', color: '#44cc44', fontFamily: 'monospace' }).setOrigin(0.5));

    if (maxed) {
      c.add(this.add.rectangle(0, 62, CARD_W - 20, 34, 0x1a2200).setStrokeStyle(2, 0xffd700));
      c.add(this.add.text(0, 62, 'МАКС', { fontSize: '16px', color: '#ffd700', fontFamily: 'monospace' }).setOrigin(0.5));
    } else {
      const btnBg = this.add.rectangle(0, 62, CARD_W - 20, 34, canAfford ? 0x1a4400 : 0x1a1a1a)
        .setStrokeStyle(2, canAfford ? 0x44aa00 : 0x333333);
      c.add(btnBg);
      c.add(this.add.text(0, 62, `$ ${cost}`, { fontSize: '15px', color: canAfford ? '#88ff44' : '#444', fontFamily: 'monospace' }).setOrigin(0.5));
      if (canAfford) {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => { upgradeLevel(id); this.renderTab(); this.cameras.main.flash(160, 40, 180, 40, true); });
        btnBg.on('pointerover', () => btnBg.setFillStyle(0x2a6600));
        btnBg.on('pointerout',  () => btnBg.setFillStyle(0x1a4400));
      }
    }
    return c;
  }

  private buildStatsPanel(): Phaser.GameObjects.GameObject[] {
    const data = loadData();
    const u = data.upgrades;
    const veh = VEHICLES.find(v => v.id === data.selectedVehicle) ?? VEHICLES[0];
    const speed = veh.baseSpeed + getStatFromUpgrade('engine', u.engine);
    const hp    = veh.baseHp   + getStatFromUpgrade('armor',  u.armor);
    const fire  = veh.baseFireRate - getStatFromUpgrade('weapon', u.weapon);
    const dmg   = 1 + getStatFromUpgrade('damage', u.damage);

    const y = GRID_Y + 2 * (CARD_H + CARD_GAP) + 20;
    const container = this.add.container(CONFIG.WIDTH / 2, y);
    const bg = this.add.rectangle(0, 44, CONFIG.WIDTH - 30, 92, 0x0a1218).setStrokeStyle(1, 0x223322);
    const title = this.add.text(0, 6, `СТАТС  [${veh.label.toUpperCase()}]`, { fontSize: '12px', color: '#666', fontFamily: 'monospace' }).setOrigin(0.5);
    const stats = this.add.text(0, 52,
      `Шв: ${speed}   HP: ${hp}   Черга: ${fire}мс   Урон: ${dmg}x`,
      { fontSize: '13px', color: '#aaffaa', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5);
    container.add([bg, title, stats]);
    return [container];
  }

  // ─── Vehicles tab ──────────────────────────────────────────────────────────
  private buildVehiclesTab() {
    const data = loadData();
    const totalH = GRID_Y + VEHICLES.length * 210 + 80;
    this.cameras.main.setBounds(0, 0, CONFIG.WIDTH, Math.max(totalH, CONFIG.HEIGHT));
    VEHICLES.forEach((veh, i) => {
      const y = GRID_Y + i * 210;
      this.contentObjects.push(...this.buildVehicleCard(veh, y, data.ownedVehicles, data.selectedVehicle));
    });
    this.refreshCoins();
  }

  private buildVehicleCard(
    veh: import('./config').VehicleDef,
    y: number,
    owned: VehicleId[],
    selected: VehicleId
  ): Phaser.GameObjects.GameObject[] {
    const isOwned    = owned.includes(veh.id);
    const isSelected = selected === veh.id;
    const objects: Phaser.GameObjects.GameObject[] = [];

    const cx = CONFIG.WIDTH / 2;
    const cardBg = this.add.rectangle(cx, y + 92, CONFIG.WIDTH - 30, 192, 0x0d1520)
      .setStrokeStyle(2, isSelected ? 0xffd700 : isOwned ? 0x335533 : 0x222222);
    objects.push(cardBg);

    const preview = this.add.image(cx - 120, y + 82, veh.textureKey).setScale(1.1);
    objects.push(preview);

    objects.push(this.add.text(cx - 40, y + 30, veh.label.toUpperCase(), {
      fontSize: '18px', color: isSelected ? '#ffd700' : '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));

    objects.push(this.add.text(cx - 40, y + 58, veh.description, {
      fontSize: '12px', color: '#888', fontFamily: 'monospace', lineSpacing: 2,
    }).setOrigin(0, 0.5));

    objects.push(this.add.text(cx - 40, y + 98,
      `Шв:${veh.baseSpeed}  HP:${veh.baseHp}  Черга:${veh.baseFireRate}мс`,
      { fontSize: '12px', color: '#66aa66', fontFamily: 'monospace' }
    ).setOrigin(0, 0.5));

    const shotsLabel = veh.spreadShots > 1 ? `${veh.spreadShots}x РОЗСІЯНИЙ` : '1x ОДИНОЧНИЙ';
    objects.push(this.add.text(cx - 40, y + 116, `Постріл: ${shotsLabel}`, {
      fontSize: '12px', color: '#aaddff', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));

    // Collection progress
    const pct = veh.collectionRaised / veh.collectionGoal;
    const barW = 140;
    objects.push(this.add.rectangle(cx + 60, y + 137, barW, 8, 0x0a1220));
    if (pct > 0) objects.push(this.add.rectangle(cx + 60 - barW / 2 + (barW * pct) / 2, y + 137, barW * pct, 8, 0x005bbb).setOrigin(0.5));
    objects.push(this.add.text(cx + 60, y + 137, `${Math.round(pct * 100)}% ⭐`, { fontSize: '10px', color: '#446688', fontFamily: 'monospace' }).setOrigin(0.5));

    const btnY = y + 158;
    if (isSelected) {
      const selBg = this.add.rectangle(cx + 80, btnY, 120, 36, 0x1a3300).setStrokeStyle(2, 0xffd700);
      objects.push(selBg);
      objects.push(this.add.text(cx + 80, btnY, '✓ АКТИВНА', { fontSize: '13px', color: '#ffd700', fontFamily: 'monospace' }).setOrigin(0.5));
    } else if (isOwned) {
      const selBg = this.add.rectangle(cx + 80, btnY, 120, 36, 0x113311).setStrokeStyle(2, 0x44aa00).setInteractive({ useHandCursor: true });
      objects.push(selBg);
      objects.push(this.add.text(cx + 80, btnY, 'ВИБРАТИ', { fontSize: '14px', color: '#88ff44', fontFamily: 'monospace' }).setOrigin(0.5));
      selBg.on('pointerdown', () => { selectVehicle(veh.id); this.renderTab(); });
      selBg.on('pointerover', () => selBg.setFillStyle(0x1e4d1e));
      selBg.on('pointerout',  () => selBg.setFillStyle(0x113311));
    } else {
      // Stars-only unlock
      const buyBg = this.add.rectangle(cx + 80, btnY, 140, 36, 0x1a1200).setStrokeStyle(2, 0x886600).setInteractive({ useHandCursor: true });
      objects.push(buyBg);
      objects.push(this.add.text(cx + 80, btnY, `${veh.starsPrice} ⭐`, {
        fontSize: '14px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(0.5));
      buyBg.on('pointerdown', () => this.onBuyStars(veh.id, veh.starsPrice));
      buyBg.on('pointerover', () => buyBg.setFillStyle(0x2a1e00));
      buyBg.on('pointerout',  () => buyBg.setFillStyle(0x1a1200));
    }

    return objects;
  }

  private onBuyStars(id: VehicleId, starsPrice: number) {
    const tg = window.Telegram?.WebApp as any;
    if (tg && tg.openInvoice) {
      // Telegram Stars invoice — requires backend to generate invoice link
      alert(`Купівля за ${starsPrice} ⭐ Stars буде доступна після підключення оплати.`);
    } else {
      // Dev mode: unlock directly for testing
      unlockVehicle(id);
      this.renderTab();
    }
  }

  private refreshCoins() {
    const data = loadData();
    this.coinsText.setText(`$ ${data.totalCoins}`);
  }

  private createBackButton() {
    const btnBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 44, 200, 48, 0x111111)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 44, '< До меню', {
      fontSize: '16px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    btnBg.on('pointerdown', () => this.scene.start('GameScene'));
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x222222));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x111111));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));

    // Touch scroll for vehicles tab
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        this.cameras.main.scrollY -= ptr.velocity.y * 0.016;
      }
    });
  }
}
