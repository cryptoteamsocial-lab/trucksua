import Phaser from 'phaser';
import { CONFIG, VEHICLES, CHARITY } from './config';

export default class CollectionsScene extends Phaser.Scene {
  constructor() { super({ key: 'CollectionsScene' }); }

  create() {
    const cx = CONFIG.WIDTH / 2;
    const cardH = 164;
    const gap = 10;
    const historyH = CHARITY.history.length * 52 + 60;
    const contentH = 110 + VEHICLES.length * (cardH + gap) + 40 + historyH + 40;
    const scrollH = Math.max(contentH, CONFIG.HEIGHT - 80);

    this.cameras.main.setBounds(0, 0, CONFIG.WIDTH, scrollH);
    this.add.rectangle(cx, scrollH / 2, CONFIG.WIDTH, scrollH, 0x080c14);

    // Fixed header
    this.add.rectangle(cx, 0, CONFIG.WIDTH, 4, 0x005bbb).setScrollFactor(0);
    this.add.rectangle(cx, 4, CONFIG.WIDTH, 4, 0xffd700).setScrollFactor(0);
    this.add.text(cx, 38, '🚗 ЗБОРИ', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(cx, 68, 'Завдяки підтримці спільноти', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.text(cx, 86, 'вже передано 170+ авто 🚗', {
      fontSize: '14px', color: '#88ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add.rectangle(cx, 98, CONFIG.WIDTH - 24, 1, 0x1a2a3a).setScrollFactor(0);

    let y = 114;

    VEHICLES.forEach(veh => {
      const pct = veh.collectionRaised / veh.collectionGoal;

      this.add.rectangle(cx, y + cardH / 2, CONFIG.WIDTH - 20, cardH, 0x0d1520)
        .setStrokeStyle(2, 0x1a2a3a);

      this.add.text(24, y + 18, veh.label.toUpperCase(), {
        fontSize: '16px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);

      if (veh.starsPrice === 0) {
        this.add.text(CONFIG.WIDTH - 18, y + 18, 'АКТИВНИЙ', {
          fontSize: '12px', color: '#44aa44', fontFamily: 'monospace',
        }).setOrigin(1, 0.5);
      } else {
        this.add.text(CONFIG.WIDTH - 18, y + 18, `${veh.starsPrice} ⭐`, {
          fontSize: '13px', color: '#ffd700', fontFamily: 'monospace',
        }).setOrigin(1, 0.5);
      }

      this.add.text(24, y + 44, veh.description, {
        fontSize: '11px', color: '#445566', fontFamily: 'monospace', lineSpacing: 2,
      }).setOrigin(0, 0.5);

      const barW = CONFIG.WIDTH - 56;
      const barX = 28;
      this.add.rectangle(cx, y + 82, barW, 14, 0x0a1220);
      if (pct > 0) {
        this.add.rectangle(barX + (barW * pct) / 2, y + 82, barW * pct, 14, 0x005bbb).setOrigin(0.5);
      }
      this.add.text(cx, y + 82,
        `${Math.round(pct * 100)}%  —  ${veh.collectionRaised.toLocaleString()} / ${veh.collectionGoal.toLocaleString()} ⭐`,
        { fontSize: '11px', color: '#88aacc', fontFamily: 'monospace' }
      ).setOrigin(0.5);

      const btnColor = 0x0a1a2e;
      const btnBg = this.add.rectangle(cx, y + 122, CONFIG.WIDTH - 56, 36, btnColor)
        .setStrokeStyle(2, 0x3377cc).setInteractive({ useHandCursor: true });
      this.add.text(cx, y + 122, '💙 ПІДТРИМАТИ ЗБІР', {
        fontSize: '14px', color: '#88ccff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      btnBg.on('pointerdown', () => window.open('https://t.me/bavovnaroad', '_blank'));
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x143050));
      btnBg.on('pointerout',  () => btnBg.setFillStyle(btnColor));

      y += cardH + gap;
    });

    this.add.text(cx, y + 14,
      '⭐ Stars від покупки машин в грі\nйдуть на відповідний збір',
      { fontSize: '12px', color: '#334455', fontFamily: 'monospace', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5);
    y += 44;

    // ─── History block ─────────────────────────────────────────────────────────
    this.add.rectangle(cx, y + 1, CONFIG.WIDTH - 24, 1, 0x1a2a3a);
    this.add.text(cx, y + 20, 'ПЕРЕДАНІ АВТО', {
      fontSize: '13px', color: '#556677', fontFamily: 'monospace',
    }).setOrigin(0.5);
    y += 40;

    CHARITY.history.forEach((entry, i) => {
      const rowBg = i % 2 === 0 ? 0x090e18 : 0x080c14;
      const rowBgRect = this.add.rectangle(cx, y + 22, CONFIG.WIDTH - 24, 44, rowBg)
        .setStrokeStyle(1, 0x1a2233).setInteractive({ useHandCursor: true });
      rowBgRect.on('pointerdown', () => this.showCarDetail(entry));
      this.add.text(24, y + 12, entry.name, { fontSize: '14px', color: '#aaccdd', fontFamily: 'monospace' }).setOrigin(0, 0.5);
      this.add.text(24, y + 34, entry.unit, { fontSize: '11px', color: '#445566', fontFamily: 'monospace' }).setOrigin(0, 0.5);
      this.add.text(CONFIG.WIDTH - 18, y + 22, entry.date, { fontSize: '12px', color: '#334455', fontFamily: 'monospace' }).setOrigin(1, 0.5);
      y += 52;
    });

    // Touch scroll
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        this.cameras.main.scrollY -= ptr.velocity.y * 0.016;
      }
    });

    // Fixed back arrow top-left
    const arrow = this.add.text(28, 38, '←', {
      fontSize: '22px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    arrow.on('pointerdown', () => this.scene.start('GameScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }

  private showCarDetail(entry: { name: string; date: string; unit: string; desc: string }) {
    const D = 30;
    const cx = CONFIG.WIDTH / 2;
    const scrollY = this.cameras.main.scrollY;
    const modalY = scrollY + CONFIG.HEIGHT / 2;

    const overlay = this.add.rectangle(cx, scrollY + CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.75).setDepth(D);
    const box = this.add.rectangle(cx, modalY, CONFIG.WIDTH - 40, 320, 0x0a1520).setDepth(D).setStrokeStyle(2, 0x3377cc);

    const title = this.add.text(cx, modalY - 120, entry.name, {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 1);

    this.add.text(cx, modalY - 84, `📅 ${entry.date}`, {
      fontSize: '13px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 1);

    this.add.text(cx, modalY - 56, `🪖 ${entry.unit}`, {
      fontSize: '13px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 1);

    this.add.text(cx, modalY - 20, entry.desc, {
      fontSize: '13px', color: '#aaccdd', fontFamily: 'monospace', align: 'center',
      wordWrap: { width: CONFIG.WIDTH - 80 },
    }).setOrigin(0.5).setDepth(D + 1);

    this.add.text(cx, modalY + 30, '✅ Передано', {
      fontSize: '16px', color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 1);

    const closeBg = this.add.rectangle(cx, modalY + 90, 160, 44, 0x1a1a1a)
      .setDepth(D + 1).setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    const closeT = this.add.text(cx, modalY + 90, 'Закрити', {
      fontSize: '16px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(D + 2);

    const objs = [overlay, box, title, closeBg, closeT];
    const close = () => objs.forEach(o => o.destroy());
    closeBg.on('pointerdown', close);
    overlay.setInteractive().on('pointerdown', close);

    this.tweens.add({ targets: box, scaleX: { from: 0.7, to: 1 }, scaleY: { from: 0.7, to: 1 }, duration: 250, ease: 'Back.Out' });
  }
}
