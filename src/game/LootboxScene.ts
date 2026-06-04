import Phaser from 'phaser';
import { CONFIG } from './config';
import { addCoins, upgradeLevel, loadData } from './storage';
import type { UpgradeId } from './types';

interface LootboxResult {
  coins: number;
  killed: number;
  convoy: number;
  victory: boolean;
}

type Prize =
  | { type: 'coins'; amount: number }
  | { type: 'upgrade'; id: UpgradeId; name: string }
  | { type: 'merch'; name: string };

const FIELD_PRIZES: Prize[] = [
  { type: 'coins', amount: 50 },
  { type: 'coins', amount: 100 },
  { type: 'coins', amount: 150 },
  { type: 'coins', amount: 200 },
  { type: 'upgrade', id: 'engine', name: 'Двигун +1' },
  { type: 'upgrade', id: 'armor',  name: 'Броня +1' },
  { type: 'upgrade', id: 'weapon', name: 'Зброя +1' },
  { type: 'upgrade', id: 'damage', name: 'Урон +1' },
];

const VOLUNTEER_PRIZES: Prize[] = [
  { type: 'merch', name: '🎽 Футболка Бавовна Road' },
  { type: 'merch', name: '☕ Чашка "Слава ЗСУ"' },
  { type: 'merch', name: '🧢 Кепка Бавовна Road' },
  { type: 'merch', name: '🔑 Брелок Тризуб' },
  { type: 'merch', name: '📦 Стікер-пак' },
  { type: 'merch', name: '🎖 Шеврон Бавовна Road' },
];

export default class LootboxScene extends Phaser.Scene {
  private result!: LootboxResult;

  constructor() { super({ key: 'LootboxScene' }); }

  init(data: LootboxResult) {
    this.result = data;
  }

  create() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x060a12);
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);

    this.showRunSummary();
  }

  private showRunSummary() {
    const r = this.result;
    const victoryColor = r.victory ? '#FFD700' : '#ff6666';
    const victoryText  = r.victory ? '🏆 ПЕРЕМОГА!' : '💀 ПРОВАЛ РЕЙДУ';

    this.add.text(CONFIG.WIDTH / 2, 55, victoryText, {
      fontSize: '28px', color: victoryColor, fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.rectangle(CONFIG.WIDTH / 2, 110, CONFIG.WIDTH - 40, 1, 0x223344);

    // Stats row
    const stats = [
      { label: 'Монети', value: `$ ${r.coins}` },
      { label: 'Знищено', value: `×${r.killed}` },
      { label: 'Конвой', value: `[${r.convoy}]` },
    ];
    stats.forEach((s, i) => {
      const x = 70 + i * 125;
      this.add.text(x, 140, s.label, { fontSize: '11px', color: '#556677', fontFamily: 'monospace' }).setOrigin(0.5);
      this.add.text(x, 162, s.value, { fontSize: '17px', color: '#aaffcc', fontFamily: 'monospace' }).setOrigin(0.5);
    });

    this.add.rectangle(CONFIG.WIDTH / 2, 194, CONFIG.WIDTH - 40, 1, 0x223344);

    // Lootbox choice
    this.add.text(CONFIG.WIDTH / 2, 222, 'ВІДКРИЙ СКРИНЮ', {
      fontSize: '16px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.buildBoxCards();

    // Skip button
    const skipBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 54, 200, 46, 0x111111)
      .setStrokeStyle(2, 0x333333).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 54, '< До меню', {
      fontSize: '16px', color: '#666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    skipBg.on('pointerdown', () => this.scene.start('GameScene'));
    skipBg.on('pointerover', () => skipBg.setFillStyle(0x1a1a1a));
    skipBg.on('pointerout',  () => skipBg.setFillStyle(0x111111));
  }

  private buildBoxCards() {
    const boxes = [
      {
        tier: 'field',
        icon: '📦',
        name: 'Польова\nСкриня',
        color: 0x1a3300,
        border: 0x44aa00,
        textColor: '#88ff44',
        desc: 'Монети & апгрейди',
      },
      {
        tier: 'volunteer',
        icon: '🎁',
        name: 'Волонтерська\nСкриня',
        color: 0x0a1a2e,
        border: 0x3377cc,
        textColor: '#88ccff',
        desc: 'Мерч & промокоди',
      },
    ];

    const cx = CONFIG.WIDTH / 2;
    boxes.forEach((box, i) => {
      const x = cx - 90 + i * 180;
      const y = 390;
      const cardBg = this.add.rectangle(x, y, 158, 200, box.color)
        .setStrokeStyle(2, box.border).setInteractive({ useHandCursor: true });
      this.add.text(x, y - 64, box.icon, { fontSize: '36px', fontFamily: 'monospace' }).setOrigin(0.5);
      this.add.text(x, y - 10, box.name, {
        fontSize: '14px', color: box.textColor, fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5);
      this.add.text(x, y + 42, box.desc, {
        fontSize: '11px', color: '#556677', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5);
      this.add.text(x, y + 68, 'ВІДКРИТИ', {
        fontSize: '13px', color: box.textColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      cardBg.on('pointerover', () => cardBg.setFillStyle(box.tier === 'field' ? 0x2a5500 : 0x143050));
      cardBg.on('pointerout',  () => cardBg.setFillStyle(box.color));
      cardBg.on('pointerdown', () => this.openLootbox(box.tier as 'field' | 'volunteer'));
    });
  }

  private openLootbox(tier: 'field' | 'volunteer') {
    const prizes = tier === 'field' ? FIELD_PRIZES : VOLUNTEER_PRIZES;
    const prize = prizes[Math.floor(Math.random() * prizes.length)];

    // Apply prize
    let applied = false;
    if (prize.type === 'coins') {
      addCoins(prize.amount);
      applied = true;
    } else if (prize.type === 'upgrade') {
      applied = upgradeLevel(prize.id);
      if (!applied) {
        // Fallback: coins if maxed
        addCoins(100);
      }
    }

    this.showPrizePopup(prize, tier);
  }

  private showPrizePopup(prize: Prize, tier: 'field' | 'volunteer') {
    const D = 30;
    const overlay = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.75).setDepth(D).setInteractive();

    const box = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, 320, 380, 0x080c18).setDepth(D + 1)
      .setStrokeStyle(3, tier === 'field' ? 0x44aa00 : 0x3377cc);

    this.tweens.add({ targets: box, scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 }, duration: 350, ease: 'Back.Out' });

    const headerColor = tier === 'field' ? '#88ff44' : '#88ccff';
    const headerName = tier === 'field' ? '📦 ПОЛЬОВА СКРИНЯ' : '🎁 ВОЛОНТЕРСЬКА СКРИНЯ';

    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 150, headerName, {
      fontSize: '15px', color: headerColor, fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 2);

    let prizeIcon = '🎉';
    let prizeTitle = '';
    let prizeColor = '#ffffff';

    if (prize.type === 'coins') {
      prizeIcon = '💰';
      prizeTitle = `+${prize.amount} монет`;
      prizeColor = '#ffd700';
    } else if (prize.type === 'upgrade') {
      prizeIcon = '⚙️';
      prizeTitle = prize.name;
      prizeColor = '#88ff44';
    } else {
      prizeIcon = prize.name.charAt(0);
      prizeTitle = prize.name;
      prizeColor = '#88ccff';
    }

    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 70, prizeIcon, {
      fontSize: '52px', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 2);

    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 20, prizeTitle, {
      fontSize: '22px', color: prizeColor, fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5).setDepth(D + 2);

    if (prize.type === 'merch') {
      this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 64, 'Отримай промокод у боті', {
        fontSize: '12px', color: '#445566', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(D + 2);
    }

    // Share button
    const shareBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 110, 200, 44, 0x0a1a2e)
      .setDepth(D + 2).setStrokeStyle(2, 0x3377cc).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 110, '📤 ПОДІЛИТИСЯ', {
      fontSize: '14px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 3);
    shareBg.on('pointerdown', () => this.shareResult(prize));

    // Close
    const closeBg = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 162, 200, 44, 0x111111)
      .setDepth(D + 2).setStrokeStyle(2, 0x333333).setInteractive({ useHandCursor: true });
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 162, 'До меню', {
      fontSize: '16px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 3);
    closeBg.on('pointerdown', () => this.scene.start('GameScene'));
  }

  private shareResult(prize: Prize) {
    const r = this.result;
    let text = `🔥 Я грав у Бавовна Road та допоміг зібрати кошти на авто для фронту!\n`;
    text += `💀 Знищено: ${r.killed} | 💰 Монети: ${r.coins} | 🚗 Конвой: ${r.convoy}\n`;
    if (prize.type === 'coins') text += `🎁 Виграв: ${prize.amount} монет!\n`;
    else if (prize.type === 'merch') text += `🎁 Виграв: ${prize.name}!\n`;
    text += `\nГрай → @bavovnaroad`;

    const tg = window.Telegram?.WebApp;
    if (tg) {
      const url = `https://t.me/share/url?url=https://t.me/bavovnaroad&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else {
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    }
  }
}
