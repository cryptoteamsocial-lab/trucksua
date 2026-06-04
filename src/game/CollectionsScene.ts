import Phaser from 'phaser';
import { CONFIG, VEHICLES } from './config';

export default class CollectionsScene extends Phaser.Scene {
  constructor() { super({ key: 'CollectionsScene' }); }

  create() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x080c14);
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);

    this.add.text(CONFIG.WIDTH / 2, 38, '🚗 ЗБОРИ', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(CONFIG.WIDTH / 2, 74, 'Активні збори на техніку для ЗСУ', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.rectangle(CONFIG.WIDTH / 2, 98, CONFIG.WIDTH - 24, 1, 0x1a2a3a);

    const cx = CONFIG.WIDTH / 2;
    let y = 114;

    VEHICLES.forEach(veh => {
      const pct = veh.collectionRaised / veh.collectionGoal;
      const cardH = 164;

      // Card
      this.add.rectangle(cx, y + cardH / 2, CONFIG.WIDTH - 20, cardH, 0x0d1520)
        .setStrokeStyle(2, 0x1a2a3a);

      // Vehicle label + unit
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

      // Description
      this.add.text(24, y + 44, veh.description, {
        fontSize: '11px', color: '#445566', fontFamily: 'monospace', lineSpacing: 2,
      }).setOrigin(0, 0.5);

      // Progress bar
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

      // Support button
      const btnColor = 0x0a1a2e;
      const btnBg = this.add.rectangle(cx, y + 122, CONFIG.WIDTH - 56, 36, btnColor)
        .setStrokeStyle(2, 0x3377cc).setInteractive({ useHandCursor: true });
      this.add.text(cx, y + 122, '💙 ПІДТРИМАТИ ЗБІР', {
        fontSize: '14px', color: '#88ccff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      btnBg.on('pointerdown', () => {
        const url = 'https://t.me/bavovnaroad';
        window.open(url, '_blank');
      });
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x143050));
      btnBg.on('pointerout',  () => btnBg.setFillStyle(btnColor));

      y += cardH + 10;
    });

    // Info note
    this.add.text(cx, y + 20,
      '⭐ Stars від покупки машин в грі\nйдуть на відповідний збір',
      { fontSize: '12px', color: '#334455', fontFamily: 'monospace', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5);

    // Back button
    const btnBg = this.add.rectangle(cx, CONFIG.HEIGHT - 40, 200, 46, 0x111111)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(cx, CONFIG.HEIGHT - 40, '< До меню', {
      fontSize: '16px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    btnBg.on('pointerdown', () => this.scene.start('GameScene'));
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x222222));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x111111));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }
}
