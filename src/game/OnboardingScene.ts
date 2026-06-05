import Phaser from 'phaser';
import { CONFIG } from './config';
import { markOnboardingDone, getOrCreatePlayerName, generateRandomName, setPlayerName } from './storage';
import { createPixelTextures } from './PixelArt';

interface Slide {
  title: string;
  body: string;
  icon: string;
  btnLabel: string;
  isNameSlide?: boolean;
}

const SLIDES: Slide[] = [
  {
    icon: '🔥',
    title: 'БАВОВНА ROAD',
    body: 'Грай. Допомагай. Перемагай.\n\nАркадний раннер де кожна гра\nдопомагає зібрати реальний\nавтомобіль для ЗСУ.',
    btnLabel: 'Далі →',
  },
  {
    icon: '🪖',
    title: 'ОБЕРИ ІМʼЯ',
    body: '',
    btnLabel: 'Далі →',
    isNameSlide: true,
  },
  {
    icon: '🚗',
    title: 'ЗБІР НА АВТО',
    body: 'У Бавовна Road твоя гра\nдопомагає збирати кошти\nна реальні автомобілі.\n\nКожна покупка машини в грі\nза ⭐ Telegram Stars —\nреальний внесок у збір.',
    btnLabel: 'Далі →',
  },
  {
    icon: '🪖',
    title: 'ВОРОГИ',
    body: 'На дорозі на тебе чекають:\n\n🟢 Орк — базовий ворог\n🟢 Z-Орк — швидкий\n🟢 Чмобік — вибуховий\n🟢 Бронеорк — тяжкий\n\nУникай або знищуй!',
    btnLabel: 'Далі →',
  },
  {
    icon: '📦',
    title: 'РІВНІ ТА СКРИНІ',
    body: 'Гра складається з 15 рівнів.\n\nПісля кожного рівня:\n📦 Відкривай скриню\n⚡ Вибирай покращення\n🏆 Доходь до рівня 15!\n\nЧим далі — тим важче.',
    btnLabel: 'Далі →',
  },
  {
    icon: '⭐',
    title: 'АВТОМОБІЛІ',
    body: 'Нові машини відкриваються\nтільки за ⭐ Telegram Stars.\n\nКожна покупка участь у\nреальному зборі на авто.\n\nПокращуй машину за монети,\nкупуй нові за ⭐ Stars!',
    btnLabel: 'Почати гру!',
  },
];

export default class OnboardingScene extends Phaser.Scene {
  private currentSlide = 0;
  private slideObjects: Phaser.GameObjects.GameObject[] = [];
  private pendingName = '';

  constructor() { super({ key: 'OnboardingScene' }); }

  create() {
    if (!this.textures.exists('player')) createPixelTextures(this);
    this.pendingName = getOrCreatePlayerName();

    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x060a12);
    this.add.rectangle(CONFIG.WIDTH / 2, 0, CONFIG.WIDTH, 4, 0x005bbb);
    this.add.rectangle(CONFIG.WIDTH / 2, 4, CONFIG.WIDTH, 4, 0xffd700);

    this.renderSlide(0);
  }

  private renderSlide(index: number) {
    this.slideObjects.forEach(o => o.destroy());
    this.slideObjects = [];

    const slide = SLIDES[index];
    const cx = CONFIG.WIDTH / 2;

    // Dot indicators
    SLIDES.forEach((_, i) => {
      const dot = this.add.circle(cx - (SLIDES.length - 1) * 14 + i * 28, 100, i === index ? 7 : 5,
        i === index ? 0xffd700 : 0x334455);
      this.slideObjects.push(dot);
    });

    // Icon
    const icon = this.add.text(cx, 180, slide.icon, { fontSize: '64px', fontFamily: 'monospace' }).setOrigin(0.5);
    this.slideObjects.push(icon);
    this.tweens.add({ targets: icon, y: 190, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Title
    const title = this.add.text(cx, 280, slide.title, {
      fontSize: '26px', color: '#FFD700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5);
    this.slideObjects.push(title);

    this.slideObjects.push(this.add.rectangle(cx, 316, 240, 2, 0x223344));

    if (slide.isNameSlide) {
      this.buildNameSlide(cx);
    } else {
      const body = this.add.text(cx, 450, slide.body, {
        fontSize: '16px', color: '#aaccdd', fontFamily: 'monospace',
        align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);
      this.slideObjects.push(body);
    }

    // Main button
    const isLast = index === SLIDES.length - 1;
    const btnBg = this.add.rectangle(cx, CONFIG.HEIGHT - 110, 260, 60,
      isLast ? 0x005bbb : 0x0a1a2e)
      .setStrokeStyle(3, isLast ? 0xffd700 : 0x3377cc).setInteractive({ useHandCursor: true });
    const btnT = this.add.text(cx, CONFIG.HEIGHT - 110, slide.btnLabel, {
      fontSize: '20px', color: isLast ? '#FFD700' : '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.slideObjects.push(btnBg, btnT);

    if (isLast) {
      this.tweens.add({ targets: [btnBg, btnT], scaleX: 1.04, scaleY: 1.04, duration: 700, yoyo: true, repeat: -1 });
    }

    btnBg.on('pointerdown', () => this.nextSlide());
    btnBg.on('pointerover', () => btnBg.setFillStyle(isLast ? 0x1177dd : 0x143050));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(isLast ? 0x005bbb : 0x0a1a2e));

    if (!isLast) {
      const skip = this.add.text(cx, CONFIG.HEIGHT - 50, 'Пропустити', {
        fontSize: '13px', color: '#334455', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      skip.on('pointerdown', () => this.finish());
      skip.on('pointerover', () => skip.setColor('#556677'));
      skip.on('pointerout',  () => skip.setColor('#334455'));
      this.slideObjects.push(skip);
    }

    const allObjs = [icon, title, btnBg, btnT];
    allObjs.forEach(o => {
      if ('setAlpha' in o) (o as Phaser.GameObjects.GameObject & { setAlpha: (v: number) => void }).setAlpha(0);
    });
    this.tweens.add({ targets: allObjs, alpha: 1, duration: 300, ease: 'Power2' });
  }

  private buildNameSlide(cx: number) {
    this.slideObjects.push(
      this.add.text(cx, 348, 'Твоє ігрове імʼя:', {
        fontSize: '14px', color: '#667788', fontFamily: 'monospace',
      }).setOrigin(0.5)
    );

    // Current name display box
    const nameBox = this.add.rectangle(cx, 396, CONFIG.WIDTH - 60, 48, 0x0d1520)
      .setStrokeStyle(2, 0x3377cc);
    const nameTxt = this.add.text(cx, 396, this.pendingName, {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.slideObjects.push(nameBox, nameTxt);

    // Залишити button
    const keepBg = this.add.rectangle(cx - 100, 460, 160, 40, 0x0d2200)
      .setStrokeStyle(2, 0x44aa00).setInteractive({ useHandCursor: true });
    const keepT = this.add.text(cx - 100, 460, '✓ Залишити', {
      fontSize: '13px', color: '#88ff44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    keepBg.on('pointerdown', () => {
      setPlayerName(this.pendingName);
      this.nextSlide();
    });
    keepBg.on('pointerover', () => keepBg.setFillStyle(0x1a3a00));
    keepBg.on('pointerout',  () => keepBg.setFillStyle(0x0d2200));
    this.slideObjects.push(keepBg, keepT);

    // Згенерувати інше button
    const genBg = this.add.rectangle(cx + 80, 460, 150, 40, 0x0a1a2e)
      .setStrokeStyle(2, 0x3377cc).setInteractive({ useHandCursor: true });
    const genT = this.add.text(cx + 80, 460, '🎲 Інше', {
      fontSize: '13px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    genBg.on('pointerdown', () => {
      this.pendingName = generateRandomName();
      nameTxt.setText(this.pendingName);
    });
    genBg.on('pointerover', () => genBg.setFillStyle(0x143050));
    genBg.on('pointerout',  () => genBg.setFillStyle(0x0a1a2e));
    this.slideObjects.push(genBg, genT);

    // Змінити (custom name) button
    const editBg = this.add.rectangle(cx, 514, CONFIG.WIDTH - 80, 40, 0x111111)
      .setStrokeStyle(2, 0x444444).setInteractive({ useHandCursor: true });
    const editT = this.add.text(cx, 514, '✏️ Змінити вручну', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    editBg.on('pointerdown', () => {
      const input = window.prompt('Введи своє ігрове імʼя (до 24 символів):', this.pendingName);
      if (input && input.trim()) {
        this.pendingName = input.trim().slice(0, 24);
        nameTxt.setText(this.pendingName);
      }
    });
    editBg.on('pointerover', () => editBg.setFillStyle(0x222222));
    editBg.on('pointerout',  () => editBg.setFillStyle(0x111111));
    this.slideObjects.push(editBg, editT);
  }

  private nextSlide() {
    const slide = SLIDES[this.currentSlide];
    if (slide.isNameSlide) {
      setPlayerName(this.pendingName);
    }
    if (this.currentSlide < SLIDES.length - 1) {
      this.currentSlide++;
      this.renderSlide(this.currentSlide);
    } else {
      this.finish();
    }
  }

  private finish() {
    setPlayerName(this.pendingName);
    markOnboardingDone();
    this.scene.start('GameScene');
  }
}
