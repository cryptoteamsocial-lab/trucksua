import Phaser from 'phaser';
import { CONFIG, WEAPON_LEVELS, VEHICLES } from './config';

type HelpTab = 'gameplay' | 'enemies' | 'weapons' | 'vehicles' | 'lootbox';

export default class HelpScene extends Phaser.Scene {
  private currentTab: HelpTab = 'gameplay';
  private contentGroup: Phaser.GameObjects.GameObject[] = [];
  private tabButtons: { tab: HelpTab; bg: Phaser.GameObjects.Rectangle; txt: Phaser.GameObjects.Text }[] = [];

  constructor() { super({ key: 'HelpScene' }); }

  create() {
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x080c14);
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);

    this.add.text(CONFIG.WIDTH / 2, 38, '❓ ДОВІДКА', {
      fontSize: '26px', color: '#FFD700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.buildTabs();
    this.renderContent();
    this.buildBackButton();
  }

  private buildTabs() {
    const tabs: { tab: HelpTab; label: string }[] = [
      { tab: 'gameplay', label: 'Гра' },
      { tab: 'enemies',  label: 'Вороги' },
      { tab: 'weapons',  label: 'Зброя' },
      { tab: 'vehicles', label: 'Авто' },
      { tab: 'lootbox',  label: 'Скрині' },
    ];
    const tabW = (CONFIG.WIDTH - 20) / tabs.length;
    const tabY = 90;

    tabs.forEach(({ tab, label }, i) => {
      const x = 10 + i * tabW + tabW / 2;
      const isActive = tab === this.currentTab;
      const bg = this.add.rectangle(x, tabY, tabW - 4, 36,
        isActive ? 0x0a1a2e : 0x080c12)
        .setStrokeStyle(1, isActive ? 0x3377cc : 0x1a2233)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, tabY, label, {
        fontSize: '12px', color: isActive ? '#88ccff' : '#334455', fontFamily: 'monospace',
      }).setOrigin(0.5);
      bg.on('pointerdown', () => this.switchTab(tab));
      this.tabButtons.push({ tab, bg, txt });
    });
  }

  private switchTab(tab: HelpTab) {
    this.currentTab = tab;
    this.tabButtons.forEach(b => {
      const active = b.tab === tab;
      b.bg.setFillStyle(active ? 0x0a1a2e : 0x080c12).setStrokeStyle(1, active ? 0x3377cc : 0x1a2233);
      b.txt.setColor(active ? '#88ccff' : '#334455');
    });
    this.renderContent();
  }

  private renderContent() {
    this.contentGroup.forEach(o => o.destroy());
    this.contentGroup = [];

    const startY = 128;
    switch (this.currentTab) {
      case 'gameplay':  this.buildGameplay(startY); break;
      case 'enemies':   this.buildEnemies(startY); break;
      case 'weapons':   this.buildWeapons(startY); break;
      case 'vehicles':  this.buildVehicles(startY); break;
      case 'lootbox':   this.buildLootbox(startY); break;
    }
  }

  private addRow(y: number, icon: string, title: string, desc: string): number {
    const cx = CONFIG.WIDTH / 2;
    this.contentGroup.push(
      this.add.rectangle(cx, y + 28, CONFIG.WIDTH - 24, 56, 0x0a1018).setStrokeStyle(1, 0x1a2233)
    );
    this.contentGroup.push(
      this.add.text(24, y + 14, icon + ' ' + title, { fontSize: '14px', color: '#aaccdd', fontFamily: 'monospace' }).setOrigin(0, 0.5)
    );
    this.contentGroup.push(
      this.add.text(24, y + 40, desc, { fontSize: '11px', color: '#445566', fontFamily: 'monospace' }).setOrigin(0, 0.5)
    );
    return y + 64;
  }

  private buildGameplay(y: number) {
    y = this.addRow(y, '🚗', 'Рух', 'Тягни по екрану або стрілки ← →');
    y = this.addRow(y, '💥', 'Стрільба', 'Автоматична, залежить від зброї');
    y = this.addRow(y, '🛡', 'HP', 'Уникай ворогів та перешкод');
    y = this.addRow(y, '🤝', 'Союзники', 'Підбирай бонуси — макс. 3 союзники');
    y = this.addRow(y, '🔧', 'Ремонт', 'Зелений хрест відновлює 25 HP');
    y = this.addRow(y, '⏱', 'Час', '90 секунд — потім перемога');
    y = this.addRow(y, '💰', 'Монети', 'За знищення ворогів, витрачай у Гаражі');
    y = this.addRow(y, '⭐', 'Stars', 'Для купівлі нових машин');
  }

  private buildEnemies(y: number) {
    const enemies = [
      { key: 'walker', name: 'Орк', threat: '⚠', desc: 'Базовий ворог. Мало HP, середня швидкість.', behavior: 'Йде прямо. При торканні — наносить шкоду.' },
      { key: 'runner', name: 'Z-Орк', threat: '⚠⚠', desc: 'Швидкий та маневрений. Важко попасти.', behavior: 'Рухається зигзагом та швидко.' },
      { key: 'bomber', name: 'Чмобік', threat: '⚠⚠⚠', desc: 'Вибуховий. AoE шкода при знищенні.', behavior: 'Стаціонарний, небезпечний вибух.' },
      { key: 'heavy',  name: 'Бронеорк', threat: '⚠⚠⚠', desc: 'Тяжкий. Багато HP, повільний, 30 монет.', behavior: 'Повільний, але витривалий.' },
    ];

    const cardH = 90;
    const cx = CONFIG.WIDTH / 2;

    enemies.forEach(e => {
      this.contentGroup.push(
        this.add.rectangle(cx, y + cardH / 2, CONFIG.WIDTH - 24, cardH, 0x0a1018).setStrokeStyle(1, 0x1a2233)
      );
      // Enemy sprite
      if (this.textures.exists(e.key)) {
        this.contentGroup.push(
          this.add.image(36, y + cardH / 2, e.key).setScale(0.9).setOrigin(0.5)
        );
      }
      // Name
      this.contentGroup.push(
        this.add.text(68, y + 14, e.name, { fontSize: '15px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0, 0.5)
      );
      // Threat
      this.contentGroup.push(
        this.add.text(CONFIG.WIDTH - 18, y + 14, e.threat, { fontSize: '13px', color: '#ffaa00', fontFamily: 'monospace' }).setOrigin(1, 0.5)
      );
      // Desc
      this.contentGroup.push(
        this.add.text(68, y + 38, e.desc, { fontSize: '11px', color: '#445566', fontFamily: 'monospace', wordWrap: { width: CONFIG.WIDTH - 100 } }).setOrigin(0, 0.5)
      );
      // Behavior
      this.contentGroup.push(
        this.add.text(68, y + 60, e.behavior, { fontSize: '10px', color: '#334455', fontFamily: 'monospace', wordWrap: { width: CONFIG.WIDTH - 100 } }).setOrigin(0, 0.5)
      );
      y += cardH + 6;
    });

    // General rules block
    const rulesLines = [
      '⚠️ Загальні правила:',
      '• Ворог на нижній лінії → гравець отримує -5 HP',
      '• Ворог торкається союзника → союзник знищується',
      '• Якщо всі союзники знищені — грай самостійно',
    ];
    y += 8;
    this.contentGroup.push(
      this.add.rectangle(cx, y + 52, CONFIG.WIDTH - 24, 100, 0x0a1018).setStrokeStyle(1, 0x332200)
    );
    rulesLines.forEach((line, i) => {
      this.contentGroup.push(
        this.add.text(24, y + 16 + i * 22, line, {
          fontSize: '11px', color: i === 0 ? '#ffaa44' : '#556677', fontFamily: 'monospace',
          wordWrap: { width: CONFIG.WIDTH - 40 },
        }).setOrigin(0, 0.5)
      );
    });
  }

  private buildWeapons(y: number) {
    // Upgrade description
    this.contentGroup.push(
      this.add.rectangle(CONFIG.WIDTH / 2, y + 28, CONFIG.WIDTH - 24, 52, 0x0a1420).setStrokeStyle(1, 0x1a3355)
    );
    this.contentGroup.push(
      this.add.text(CONFIG.WIDTH / 2, y + 28,
        '💡 Зброя покращується в Гаражі за монети.\nКожен рівень підвищує швидкість та силу атаки.',
        { fontSize: '11px', color: '#6688aa', fontFamily: 'monospace', align: 'center', lineSpacing: 3 }
      ).setOrigin(0.5)
    );
    y += 62;

    WEAPON_LEVELS.forEach((w, i) => {
      this.contentGroup.push(
        this.add.rectangle(CONFIG.WIDTH / 2, y + 22, CONFIG.WIDTH - 24, 42, i % 2 === 0 ? 0x0a1018 : 0x080c12).setStrokeStyle(1, 0x1a2233)
      );
      this.contentGroup.push(
        this.add.text(24, y + 12, `Рів ${i + 1}`, { fontSize: '11px', color: '#445566', fontFamily: 'monospace' }).setOrigin(0, 0.5)
      );
      this.contentGroup.push(
        this.add.text(CONFIG.WIDTH / 2, y + 12, w.icon + ' ' + w.name, { fontSize: '13px', color: '#aaccdd', fontFamily: 'monospace' }).setOrigin(0.5)
      );
      y += 46;
    });
  }

  private buildVehicles(y: number) {
    VEHICLES.forEach(v => {
      const cx = CONFIG.WIDTH / 2;
      this.contentGroup.push(
        this.add.rectangle(cx, y + 38, CONFIG.WIDTH - 24, 72, 0x0a1018).setStrokeStyle(1, v.color)
      );
      this.contentGroup.push(
        this.add.text(24, y + 18, v.label.toUpperCase(), { fontSize: '15px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0, 0.5)
      );
      const price = v.starsPrice === 0 ? 'БЕЗКОШТОВНО' : `${v.starsPrice} ⭐ Stars`;
      this.contentGroup.push(
        this.add.text(CONFIG.WIDTH - 18, y + 18, price, { fontSize: '13px', color: v.starsPrice === 0 ? '#44aa44' : '#ffd700', fontFamily: 'monospace' }).setOrigin(1, 0.5)
      );
      this.contentGroup.push(
        this.add.text(24, y + 48, `HP:${v.baseHp}  Шв:${v.baseSpeed}  Стр:${v.baseFireRate}мс  Пост:${v.spreadShots}x`, {
          fontSize: '11px', color: '#445566', fontFamily: 'monospace',
        }).setOrigin(0, 0.5)
      );
      y += 80;
    });
  }

  private buildLootbox(y: number) {
    y = this.addRow(y, '📦', 'Польова Скриня', 'Монети та покращення зброї');
    y = this.addRow(y, '🎁', 'Волонтерська Скриня', 'Мерч, промокоди, стікери');
    y = this.addRow(y, '📤', 'Поділитися', 'Надсилай результат у Telegram');
    this.contentGroup.push(
      this.add.text(CONFIG.WIDTH / 2, y + 24,
        '💡 Скрині відкриваються після\nкожного рейду — незалежно\nвід перемоги або поразки.',
        { fontSize: '12px', color: '#445566', fontFamily: 'monospace', align: 'center', lineSpacing: 4 }
      ).setOrigin(0.5)
    );
  }

  private buildBackButton() {
    const arrow = this.add.text(28, 38, '←', {
      fontSize: '22px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    arrow.on('pointerdown', () => this.scene.start('GameScene'));
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('GameScene'));
  }
}
