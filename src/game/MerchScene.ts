import Phaser from 'phaser';
import { CONFIG } from './config';

interface MerchItem {
  icon: string;
  name: string;
  stars: number;
  category: string;
}

const MERCH: MerchItem[] = [
  { icon: '🎽', name: 'Футболка Бавовна Road',  stars: 150, category: 'Одяг' },
  { icon: '🎽', name: 'Футболка "Слава ЗСУ"',  stars: 130, category: 'Одяг' },
  { icon: '🧢', name: 'Кепка Бавовна Road',     stars: 90,  category: 'Одяг' },
  { icon: '☕', name: 'Чашка "Слава ЗСУ"',      stars: 65,  category: 'Аксесуари' },
  { icon: '🔑', name: 'Брелок Тризуб',          stars: 35,  category: 'Аксесуари' },
  { icon: '🎖', name: 'Шеврон Бавовна Road',    stars: 50,  category: 'Аксесуари' },
  { icon: '📦', name: 'Стікер-пак (12 шт)',      stars: 25,  category: 'Аксесуари' },
  { icon: '📦', name: 'Набір "Підтримай ЗСУ"',  stars: 250, category: 'Набори' },
];

export default class MerchScene extends Phaser.Scene {
  constructor() { super({ key: 'MerchScene' }); }

  create() {
    const cardH = 130;
    const gap = 10;
    const contentH = 120 + MERCH.length * (cardH + gap) + 80;
    const scrollH = Math.max(contentH, CONFIG.HEIGHT - 80);

    this.cameras.main.setBounds(0, 0, CONFIG.WIDTH, scrollH);
    this.add.rectangle(CONFIG.WIDTH / 2, scrollH / 2, CONFIG.WIDTH, scrollH, 0x080c14);

    // Fixed header
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb).setScrollFactor(0);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700).setScrollFactor(0);
    this.add.text(CONFIG.WIDTH / 2, 42, '🛍 МЕРЧ', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(CONFIG.WIDTH / 2, 78, 'Прибуток від продажу йде на підтримку ЗСУ', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.rectangle(CONFIG.WIDTH / 2, 100, CONFIG.WIDTH - 30, 1, 0x223344).setScrollFactor(0);

    const cx = CONFIG.WIDTH / 2;
    let y = 114;

    MERCH.forEach(item => {
      const card = this.add.rectangle(cx, y + cardH / 2, CONFIG.WIDTH - 24, cardH, 0x0d1520)
        .setStrokeStyle(2, 0x1a2c40).setInteractive({ useHandCursor: true });

      this.add.text(cx - 130, y + cardH / 2, item.icon, { fontSize: '40px', fontFamily: 'monospace' }).setOrigin(0.5);

      this.add.text(cx - 60, y + 28, item.name, {
        fontSize: '15px', color: '#aaccdd', fontFamily: 'monospace',
        wordWrap: { width: CONFIG.WIDTH - 160 },
      }).setOrigin(0, 0.5);

      this.add.text(cx - 60, y + 62, item.category, {
        fontSize: '11px', color: '#334455', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);

      const starsBg = this.add.rectangle(CONFIG.WIDTH - 72, y + cardH / 2, 110, 40, 0x1a1200)
        .setStrokeStyle(2, 0x886600).setInteractive({ useHandCursor: true });
      this.add.text(CONFIG.WIDTH - 72, y + cardH / 2, `${item.stars} ⭐`, {
        fontSize: '16px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(0.5);

      card.on('pointerover', () => card.setStrokeStyle(2, 0x3377cc));
      card.on('pointerout',  () => card.setStrokeStyle(2, 0x1a2c40));
      card.on('pointerdown', () => this.onBuyClick(item));
      starsBg.on('pointerdown', () => this.onBuyClick(item));
      starsBg.on('pointerover', () => starsBg.setFillStyle(0x2a1e00));
      starsBg.on('pointerout',  () => starsBg.setFillStyle(0x1a1200));

      y += cardH + gap;
    });

    // Info banner
    this.add.rectangle(cx, y + 36, CONFIG.WIDTH - 30, 52, 0x0a1520).setStrokeStyle(1, 0x223344);
    this.add.text(cx, y + 36,
      '📦 Замовлення — через бот @bavovnaroad\nДоставка по Україні', {
        fontSize: '12px', color: '#445566', fontFamily: 'monospace', align: 'center',
      }
    ).setOrigin(0.5);

    // Touch scroll
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        this.cameras.main.scrollY -= ptr.velocity.y * 0.016;
      }
    });

    // Fixed back button
    const btnBg = this.add.rectangle(cx, CONFIG.HEIGHT - 44, 200, 48, 0x111111)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    this.add.text(cx, CONFIG.HEIGHT - 44, '< До меню', {
      fontSize: '16px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    btnBg.on('pointerdown', () => this.scene.start('GameScene'));
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x222222));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x111111));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }

  private onBuyClick(item: MerchItem) {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      window.open(`https://t.me/bavovnaroad?start=merch_${encodeURIComponent(item.name)}`, '_blank');
    } else {
      alert(`Замов "${item.name}" у боті @bavovnaroad (${item.stars} ⭐)`);
    }
  }
}
