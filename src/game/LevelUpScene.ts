import Phaser from 'phaser';
import { CONFIG, RUN_UPGRADES, LEVEL_CONFIGS, type RunUpgradeDef } from './config';
import { addCoins } from './storage';

interface LevelUpData {
  level: number;
  levelCoins: number;
  levelKilled: number;
  convoy: number;
  tempUpgrades: RunUpgradeDef[];
  runTotalCoins: number;
  runTotalKilled: number;
}

export default class LevelUpScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelUpScene' }); }

  create(data: LevelUpData) {
    const {
      level, levelCoins, levelKilled, convoy,
      tempUpgrades, runTotalCoins, runTotalKilled,
    } = data;

    const cx = CONFIG.WIDTH / 2;
    const isLast = level >= 15;

    this.add.rectangle(cx, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x040a10);
    this.add.rectangle(cx, 0, CONFIG.WIDTH, 5, 0x005bbb);
    this.add.rectangle(cx, 5, CONFIG.WIDTH, 5, 0xffd700);

    // ── Level complete header ─────────────────────────────────────────────────
    this.add.text(cx, 44, isLast ? '🏆 ЗАБІГ ЗАВЕРШЕНО!' : '✅ РІВЕНЬ ПРОЙДЕНО!', {
      fontSize: '26px', color: isLast ? '#ffd700' : '#88ff44',
      fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    const lvlCfg = LEVEL_CONFIGS[level - 1] ?? LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    this.add.text(cx, 82, lvlCfg.label, {
      fontSize: '18px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Stats box
    this.add.rectangle(cx, 158, CONFIG.WIDTH - 24, 100, 0x0a1520).setStrokeStyle(2, 0x1a3344);
    this.add.text(cx, 120, `💰 ${levelCoins}  ×  👹 ${levelKilled}  |  🚗 ${convoy}`, {
      fontSize: '16px', color: '#ccffcc', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add.text(cx, 152, `Загалом за забіг:  💰 ${runTotalCoins}  |  👹 ${runTotalKilled}`, {
      fontSize: '13px', color: '#667788', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add.text(cx, 184, `Рівень: ${level} / 15`, {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (isLast) {
      // ── Final victory screen ──────────────────────────────────────────────
      this.buildFinalVictory(cx, runTotalCoins, runTotalKilled, level);
    } else {
      // ── Upgrade choices ───────────────────────────────────────────────────
      this.add.text(cx, 228, 'ВИБЕРІТЬ ПОКРАЩЕННЯ', {
        fontSize: '15px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.add.rectangle(cx, 244, CONFIG.WIDTH - 30, 1, 0x223344);

      const pickedIds = tempUpgrades.map(u => u.id);
      const pool = RUN_UPGRADES.filter(u => !pickedIds.includes(u.id));
      // Pick 3 random choices
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);

      shuffled.forEach((upg, i) => {
        const y = 280 + i * 130;
        this.buildUpgradeCard(cx, y, upg, () => {
          const nextUpgrades = [...tempUpgrades, upg];
          // Apply coins immediately if that's the effect
          if (upg.effect === 'coins') addCoins(upg.value);
          const nextLevel = level + 1;
          this.scene.start('GameScene', {
            resumeLevel: nextLevel,
            tempUpgrades: nextUpgrades,
            runTotalCoins,
            runTotalKilled,
          });
        });
      });

      // Skip button
      const skipBg = this.add.rectangle(cx, CONFIG.HEIGHT - 42, 180, 44, 0x0a0a0a)
        .setStrokeStyle(2, 0x334455).setInteractive({ useHandCursor: true });
      this.add.text(cx, CONFIG.HEIGHT - 42, 'Пропустити →', {
        fontSize: '14px', color: '#445566', fontFamily: 'monospace',
      }).setOrigin(0.5);
      skipBg.on('pointerdown', () => {
        this.scene.start('GameScene', {
          resumeLevel: level + 1,
          tempUpgrades,
          runTotalCoins,
          runTotalKilled,
        });
      });
      skipBg.on('pointerover', () => skipBg.setFillStyle(0x111111));
      skipBg.on('pointerout',  () => skipBg.setFillStyle(0x0a0a0a));
    }
  }

  private buildUpgradeCard(
    cx: number, y: number,
    upg: RunUpgradeDef,
    onPick: () => void,
  ) {
    const card = this.add.rectangle(cx, y + 50, CONFIG.WIDTH - 30, 110, 0x0d1a2e)
      .setStrokeStyle(2, 0x1a3355).setInteractive({ useHandCursor: true });
    this.add.text(cx - 120, y + 28, upg.icon, { fontSize: '36px', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(cx - 50, y + 20, upg.label, {
      fontSize: '17px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.add.text(cx - 50, y + 50, upg.desc, {
      fontSize: '12px', color: '#5577aa', fontFamily: 'monospace',
      wordWrap: { width: CONFIG.WIDTH - 120 },
    }).setOrigin(0, 0.5);
    const btnBg = this.add.rectangle(cx + 90, y + 82, 130, 36, 0x1a3a00)
      .setStrokeStyle(2, 0x44aa00).setInteractive({ useHandCursor: true });
    this.add.text(cx + 90, y + 82, 'ВИБРАТИ', { fontSize: '14px', color: '#88ff44', fontFamily: 'monospace' }).setOrigin(0.5);

    card.on('pointerover', () => { card.setStrokeStyle(2, 0x3377cc); btnBg.setFillStyle(0x2a5500); });
    card.on('pointerout',  () => { card.setStrokeStyle(2, 0x1a3355); btnBg.setFillStyle(0x1a3a00); });
    card.on('pointerdown', onPick);
    btnBg.on('pointerdown', onPick);
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x2a5500));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x1a3a00));
  }

  private buildFinalVictory(cx: number, totalCoins: number, totalKilled: number, level: number) {
    this.add.text(cx, 260, '🏆 ПЕРЕМОЖЕЦЬ БАВОВНА ROAD', {
      fontSize: '20px', color: '#ffd700', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5);

    this.add.rectangle(cx, 340, CONFIG.WIDTH - 30, 100, 0x1a2200).setStrokeStyle(2, 0x44aa00);
    this.add.text(cx, 310, 'Легендарна нагорода:', {
      fontSize: '13px', color: '#888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.add.text(cx, 342, '🎖 Кепка  •  👕 Футболка\n🔑 Брелок  •  📛 Шеврон', {
      fontSize: '15px', color: '#ffd700', fontFamily: 'monospace', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 390, 'Для отримання — @bavovnaroad', {
      fontSize: '12px', color: '#556677', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, 450, `💰 Зібрано: ${totalCoins} монет\n👹 Знищено: ${totalKilled} ворогів\n🏁 Рівнів: ${level}/15`, {
      fontSize: '15px', color: '#88aacc', fontFamily: 'monospace', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    const shareBg = this.add.rectangle(cx, 558, CONFIG.WIDTH - 60, 48, 0x005bbb)
      .setStrokeStyle(2, 0xffd700).setInteractive({ useHandCursor: true });
    this.add.text(cx, 558, '📤 Поділитись перемогою', {
      fontSize: '15px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);
    shareBg.on('pointerdown', () => {
      const tg = window.Telegram?.WebApp as any;
      if (tg?.switchInlineQuery) {
        tg.switchInlineQuery(`Я пройшов усі 15 рівнів Бавовна Road! 💰 ${totalCoins} монет | @bavovnaroad`);
      }
    });

    const newRunBg = this.add.rectangle(cx, 622, CONFIG.WIDTH - 60, 52, 0x1a3300)
      .setStrokeStyle(2, 0x44aa00).setInteractive({ useHandCursor: true });
    this.add.text(cx, 622, '▶ НОВИЙ ЗАБІГ', { fontSize: '18px', color: '#88ff44', fontFamily: 'monospace' }).setOrigin(0.5);
    newRunBg.on('pointerdown', () => this.scene.start('GameScene'));
    newRunBg.on('pointerover', () => newRunBg.setFillStyle(0x2a5500));
    newRunBg.on('pointerout',  () => newRunBg.setFillStyle(0x1a3300));

    const menuBg = this.add.rectangle(cx, 686, 180, 46, 0x111111)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(cx, 686, '< Меню', { fontSize: '16px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);
    menuBg.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
