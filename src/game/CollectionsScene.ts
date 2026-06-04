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
    this.add.text(cx, 74, 'Активні збори на техніку для ЗСУ', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace',
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
      this.add.rectangle(cx, y + 22, CONFIG.WIDTH - 24, 44, rowBg).setStrokeStyle(1, 0x1a2233);
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

    // Fixed back button
    const backBg = this.add.rectangle(cx, CONFIG.HEIGHT - 40, 200, 46, 0x111111)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    this.add.text(cx, CONFIG.HEIGHT - 40, '< До меню', {
      fontSize: '16px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
    backBg.on('pointerdown', () => this.scene.start('GameScene'));
    backBg.on('pointerover', () => backBg.setFillStyle(0x222222));
    backBg.on('pointerout',  () => backBg.setFillStyle(0x111111));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }
}
