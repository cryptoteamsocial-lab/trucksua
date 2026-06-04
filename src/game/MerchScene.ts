import Phaser from 'phaser';
import { CONFIG } from './config';

interface MerchItem {
  icon: string;
  name: string;
  price: string;
  category: string;
}

const MERCH: MerchItem[] = [
  { icon: '🎽', name: 'Футболка Бавовна Road', price: '699 ₴', category: 'Одяг' },
  { icon: '🎽', name: 'Футболка "Слава ЗСУ"', price: '649 ₴', category: 'Одяг' },
  { icon: '🧢', name: 'Кепка Бавовна Road', price: '450 ₴', category: 'Одяг' },
  { icon: '☕', name: 'Чашка "Слава ЗСУ"', price: '320 ₴', category: 'Аксесуари' },
  { icon: '🔑', name: 'Брелок Тризуб', price: '180 ₴', category: 'Аксесуари' },
  { icon: '🎖', name: 'Шеврон Бавовна Road', price: '250 ₴', category: 'Аксесуари' },
  { icon: '📦', name: 'Стікер-пак (12 шт)', price: '120 ₴', category: 'Аксесуари' },
  { icon: '📦', name: 'Набір "Підтримай ЗСУ"', price: '1 200 ₴', category: 'Набори' },
];

export default class MerchScene extends Phaser.Scene {
  constructor() { super({ key: 'MerchScene' }); }

  create() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x080c14);
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);

    this.add.text(CONFIG.WIDTH / 2, 42, '🛍 МЕРЧ', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(CONFIG.WIDTH / 2, 78, 'Частина коштів — на підтримку ЗСУ', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.rectangle(CONFIG.WIDTH / 2, 104, CONFIG.WIDTH - 30, 1, 0x223344);

    MERCH.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cardW = 172, cardH = 110;
      const gap = 8;
      const startX = CONFIG.WIDTH / 2 - cardW / 2 - gap / 2;
      const x = startX + col * (cardW + gap) + cardW / 2;
      const y = 126 + row * (cardH + gap) + cardH / 2;

      const card = this.add.rectangle(x, y, cardW, cardH, 0x0d1520)
        .setStrokeStyle(2, 0x1a2c40).setInteractive({ useHandCursor: true });

      this.add.text(x, y - 28, item.icon, { fontSize: '26px', fontFamily: 'monospace' }).setOrigin(0.5);
      this.add.text(x, y + 4, item.name, {
        fontSize: '12px', color: '#aaccdd', fontFamily: 'monospace', align: 'center',
        wordWrap: { width: cardW - 16 },
      }).setOrigin(0.5);
      this.add.text(x, y + 34, item.price, {
        fontSize: '14px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(0.5);

      card.on('pointerover', () => card.setStrokeStyle(2, 0x3377cc));
      card.on('pointerout',  () => card.setStrokeStyle(2, 0x1a2c40));
      card.on('pointerdown', () => this.onBuyClick(item));
    });

    // Info banner
    const bannerY = 126 + Math.ceil(MERCH.length / 2) * 118 + 10;
    this.add.rectangle(CONFIG.WIDTH / 2, bannerY + 26, CONFIG.WIDTH - 30, 52, 0x0a1520)
      .setStrokeStyle(1, 0x223344);
    this.add.text(CONFIG.WIDTH / 2, bannerY + 26,
      '📦 Замовлення — через бот @bavovnaroad\nДоставка по Україні', {
        fontSize: '12px', color: '#445566', fontFamily: 'monospace', align: 'center',
      }
    ).setOrigin(0.5);

    // Back button
    const btnBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 44, 200, 48, 0x111111)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 44, '< До меню', {
      fontSize: '16px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    btnBg.on('pointerdown', () => this.scene.start('GameScene'));
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x222222));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x111111));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }

  private onBuyClick(item: MerchItem) {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      const url = `https://t.me/bavovnaroad?start=merch_${item.name}`;
      window.open(url, '_blank');
    } else {
      alert(`Замов "${item.name}" у боті @bavovnaroad`);
    }
  }
}
