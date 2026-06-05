import Phaser from 'phaser';
import { CONFIG } from './config';
import { loadData } from './storage';

export default class HallOfFameScene extends Phaser.Scene {
  constructor() { super({ key: 'HallOfFameScene' }); }

  create() {
    const data = loadData();
    const lb = data.leaderboard;

    const rowsH = lb.length > 0 ? lb.length * 56 + 60 : 200;
    const contentH = 170 + rowsH + 100;
    const scrollH = Math.max(contentH, CONFIG.HEIGHT - 80);

    this.cameras.main.setBounds(0, 0, CONFIG.WIDTH, scrollH);
    this.add.rectangle(CONFIG.WIDTH / 2, scrollH / 2, CONFIG.WIDTH, scrollH, 0x080c14);

    // Fixed header
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb).setScrollFactor(0);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700).setScrollFactor(0);
    this.add.text(CONFIG.WIDTH / 2, 42, '🏆 ЗАЛА СЛАВИ', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(CONFIG.WIDTH / 2, 82, 'Кращі рейди Бавовна Road', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.rectangle(CONFIG.WIDTH / 2, 108, CONFIG.WIDTH - 30, 1, 0x223344).setScrollFactor(0);

    let y = 120;

    if (lb.length === 0) {
      this.add.text(CONFIG.WIDTH / 2, y + 80, 'Поки немає рейдів.\nЗіграй та встанови рекорд!', {
        fontSize: '16px', color: '#334455', fontFamily: 'monospace', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);
    } else {
      // Column headers: # | Імʼя | Монети | Знищено | Конвой
      this.add.text(28, y + 10, '#',        { fontSize: '12px', color: '#445566', fontFamily: 'monospace' });
      this.add.text(52, y + 10, "Ім'я",    { fontSize: '12px', color: '#445566', fontFamily: 'monospace' });
      this.add.text(188, y + 10, 'Монети',  { fontSize: '12px', color: '#445566', fontFamily: 'monospace' });
      this.add.text(276, y + 10, 'Ворогів', { fontSize: '12px', color: '#445566', fontFamily: 'monospace' });
      this.add.text(346, y + 10, 'Конвой',  { fontSize: '12px', color: '#445566', fontFamily: 'monospace' });
      this.add.rectangle(CONFIG.WIDTH / 2, y + 32, CONFIG.WIDTH - 30, 1, 0x1a2233);
      y += 40;

      lb.forEach((entry, i) => {
        const isTop = i === 0;
        const rowColor = isTop ? 0x1a2200 : i % 2 === 0 ? 0x080c12 : 0x0a0f18;
        this.add.rectangle(CONFIG.WIDTH / 2, y + 16, CONFIG.WIDTH - 30, 48, rowColor)
          .setStrokeStyle(1, isTop ? 0x3a5500 : 0x111a22);

        const numColor = isTop ? '#ffd700' : i < 3 ? '#88aacc' : '#445566';
        const valColor = isTop ? '#ccff88' : '#88aacc';

        this.add.text(36, y + 8, `${i + 1}`,
          { fontSize: isTop ? '18px' : '14px', color: numColor, fontFamily: 'monospace' }).setOrigin(0.5);
        // Name — truncate if too long
        const nameStr = (entry.name ?? 'Невідомий').slice(0, 14);
        this.add.text(52, y + 8, nameStr,
          { fontSize: '12px', color: valColor, fontFamily: 'monospace' }).setOrigin(0, 0.5);
        this.add.text(202, y + 8, `${entry.coins}`,
          { fontSize: '13px', color: valColor, fontFamily: 'monospace' }).setOrigin(0.5);
        this.add.text(288, y + 8, `×${entry.killed}`,
          { fontSize: '13px', color: valColor, fontFamily: 'monospace' }).setOrigin(0.5);
        this.add.text(358, y + 8, `[${entry.convoy}]`,
          { fontSize: '13px', color: valColor, fontFamily: 'monospace' }).setOrigin(0.5);

        if (isTop) {
          this.add.text(36, y + 28, '👑', { fontSize: '14px', fontFamily: 'monospace' }).setOrigin(0.5);
        }
        y += 56;
      });
    }

    // Personal bests
    y += 16;
    this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 30, 1, 0x223344);
    this.add.text(CONFIG.WIDTH / 2, y + 20, 'МОЇ РЕКОРДИ', {
      fontSize: '13px', color: '#556677', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, y + 48,
      `Кращий рахунок: $ ${data.bestScore}   Макс. конвой: [${data.maxConvoy + 1}]`,
      { fontSize: '14px', color: '#88aacc', fontFamily: 'monospace', align: 'center' }
    ).setOrigin(0.5);

    // Touch scroll
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) this.cameras.main.scrollY -= ptr.velocity.y * 0.016;
    });

    // Fixed back arrow top-left
    const arrow = this.add.text(28, 38, '←', {
      fontSize: '22px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    arrow.on('pointerdown', () => this.scene.start('GameScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }
}
