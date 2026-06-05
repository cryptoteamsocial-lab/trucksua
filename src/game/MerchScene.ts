import Phaser from 'phaser';
import { CONFIG } from './config';

interface MerchItem {
  icon: string;
  name: string;
  stars: number;
}

const MERCH: MerchItem[] = [
  { icon: '🎽', name: 'Футболка Бавовна Road',  stars: 150 },
  { icon: '🧢', name: 'Кепка Бавовна Road',     stars: 90  },
  { icon: '🎖', name: 'Шеврон Бавовна Road',    stars: 50  },
  { icon: '🔑', name: 'Брелок Тризуб',          stars: 35  },
];

export default class MerchScene extends Phaser.Scene {
  constructor() { super({ key: 'MerchScene' }); }

  create() {
    const cx = CONFIG.WIDTH / 2;

    this.add.rectangle(cx, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x080c14);

    // Fixed header
    this.add.rectangle(cx, 0, CONFIG.WIDTH, 4, 0x005bbb).setScrollFactor(0);
    this.add.rectangle(cx, 4, CONFIG.WIDTH, 4, 0xffd700).setScrollFactor(0);
    this.add.text(cx, 42, '🛍 МЕРЧ', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(cx, 78, 'Прибуток від продажу йде на підтримку ЗСУ', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.rectangle(cx, 100, CONFIG.WIDTH - 30, 1, 0x223344).setScrollFactor(0);

    const cardH = 130;
    const gap = 10;
    let y = 114;

    MERCH.forEach(item => {
      const card = this.add.rectangle(cx, y + cardH / 2, CONFIG.WIDTH - 24, cardH, 0x0d1520)
        .setStrokeStyle(2, 0x1a2c40).setInteractive({ useHandCursor: true });

      this.add.text(cx - 130, y + cardH / 2, item.icon, { fontSize: '40px', fontFamily: 'monospace' }).setOrigin(0.5);

      this.add.text(cx - 60, y + 38, item.name, {
        fontSize: '15px', color: '#aaccdd', fontFamily: 'monospace',
        wordWrap: { width: CONFIG.WIDTH - 160 },
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

    // Back arrow top-left
    const arrow = this.add.text(28, 38, '←', {
      fontSize: '22px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    arrow.on('pointerdown', () => this.scene.start('GameScene'));
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
