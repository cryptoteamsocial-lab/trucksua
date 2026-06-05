import Phaser from 'phaser';
import { CONFIG } from './config';
import { loadData, getDailyMissions, claimMission } from './storage';

export default class MissionsScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private missionCards: Phaser.GameObjects.GameObject[] = [];

  constructor() { super({ key: 'MissionsScene' }); }

  create() {
    this.createBackground();
    this.createHeader();
    this.buildMissionCards();
    this.createBackButton();
  }

  private createBackground() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x080c14);
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);
  }

  private createHeader() {
    this.add.text(CONFIG.WIDTH / 2, 38, 'МІСІЇ', {
      fontSize: '32px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(CONFIG.WIDTH / 2, 74, 'Щоденні місії — оновлення опівночі', {
      fontSize: '12px', color: '#555566', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const data = loadData();
    this.coinsText = this.add.text(CONFIG.WIDTH / 2, 100, `$ ${data.totalCoins}`, {
      fontSize: '18px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private buildMissionCards() {
    this.missionCards.forEach(o => o.destroy());
    this.missionCards = [];

    const missions = getDailyMissions();

    missions.forEach((m, i) => {
      const y = 160 + i * 190;
      const done = m.progress >= m.goal;
      const claimed = m.claimed;

      const cardBg = this.add.rectangle(CONFIG.WIDTH / 2, y + 78, CONFIG.WIDTH - 30, 170, 0x0d1520)
        .setStrokeStyle(2, claimed ? 0x333333 : done ? 0xffd700 : 0x223344);
      this.missionCards.push(cardBg);

      // Title
      this.missionCards.push(this.add.text(CONFIG.WIDTH / 2, y + 20, m.label, {
        fontSize: '16px', color: claimed ? '#444' : done ? '#ffd700' : '#ffffff',
        fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5));

      // Progress bar bg
      const barW = CONFIG.WIDTH - 80;
      const barX = CONFIG.WIDTH / 2 - barW / 2;
      this.missionCards.push(this.add.rectangle(CONFIG.WIDTH / 2, y + 58, barW, 14, 0x1a1a2a).setOrigin(0.5));

      // Progress bar fill
      const pct = Math.min(m.progress / m.goal, 1);
      if (pct > 0) {
        const fillColor = claimed ? 0x333333 : done ? 0xffd700 : 0x3377cc;
        this.missionCards.push(
          this.add.rectangle(barX, y + 58, barW * pct, 14, fillColor).setOrigin(0, 0.5)
        );
      }

      // Progress label
      this.missionCards.push(this.add.text(CONFIG.WIDTH / 2, y + 58,
        `${Math.min(m.progress, m.goal)} / ${m.goal}`,
        { fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace' }
      ).setOrigin(0.5));

      // Reward label
      this.missionCards.push(this.add.text(CONFIG.WIDTH / 2, y + 88,
        `Reward: $ ${m.reward}`,
        { fontSize: '15px', color: claimed ? '#444' : '#88ccff', fontFamily: 'monospace' }
      ).setOrigin(0.5));

      // Status / claim button
      if (claimed) {
        this.missionCards.push(this.add.text(CONFIG.WIDTH / 2, y + 130,
          '✓ ОТРИМАНО', { fontSize: '16px', color: '#445544', fontFamily: 'monospace' }
        ).setOrigin(0.5));
      } else if (done) {
        const claimBg = this.add.rectangle(CONFIG.WIDTH / 2, y + 130, 180, 42, 0x1a3300)
          .setStrokeStyle(2, 0x88ff44).setInteractive({ useHandCursor: true });
        const claimT = this.add.text(CONFIG.WIDTH / 2, y + 130, 'ЗАБРАТИ НАГОРОДУ',
          { fontSize: '15px', color: '#88ff44', fontFamily: 'monospace' }
        ).setOrigin(0.5);
        claimBg.on('pointerdown', () => {
          claimMission(m.id);
          this.buildMissionCards();
          const data = loadData();
          this.coinsText.setText(`$ ${data.totalCoins}`);
          this.cameras.main.flash(200, 40, 200, 40, true);
        });
        claimBg.on('pointerover', () => claimBg.setFillStyle(0x2a5500));
        claimBg.on('pointerout', () => claimBg.setFillStyle(0x1a3300));
        this.missionCards.push(claimBg, claimT);
      } else {
        this.missionCards.push(this.add.text(CONFIG.WIDTH / 2, y + 130,
          'В процесі...', { fontSize: '14px', color: '#334455', fontFamily: 'monospace' }
        ).setOrigin(0.5));
      }
    });

    // Footer hint
    this.missionCards.push(this.add.text(CONFIG.WIDTH / 2, 760,
      'Прогрес оновлюється після кожного рейду', { fontSize: '12px', color: '#334', fontFamily: 'monospace' }
    ).setOrigin(0.5));
  }

  private createBackButton() {
    const arrow = this.add.text(28, 38, '←', {
      fontSize: '22px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    arrow.on('pointerdown', () => this.scene.start('GameScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }
}
