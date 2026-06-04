import Phaser from 'phaser';
import { CONFIG } from './config';
import { markOnboardingDone } from './storage';
import { createPixelTextures } from './PixelArt';

interface Slide {
  title: string;
  body: string;
  icon: string;
  btnLabel: string;
}

const SLIDES: Slide[] = [
  {
    icon: '🔥',
    title: 'БАВОВНА ROAD',
    body: 'Грай. Допомагай. Перемагай.\n\nАркадний раннер де кожна гра\nдопомагає зібрати реальний\nавтомобіль для ЗСУ.',
    btnLabel: 'Далі →',
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
    title: 'СКРИНІ',
    body: 'Після кожного рейду\nвідкривай скрині:\n\n📦 Польова — монети й апгрейди\n🎁 Волонтерська — мерч\n\nМонети використовуй\nдля покращення машини.',
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

  constructor() { super({ key: 'OnboardingScene' }); }

  create() {
    if (!this.textures.exists('player')) createPixelTextures(this);

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

    // Divider
    this.slideObjects.push(this.add.rectangle(cx, 316, 240, 2, 0x223344));

    // Body
    const body = this.add.text(cx, 450, slide.body, {
      fontSize: '16px', color: '#aaccdd', fontFamily: 'monospace',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);
    this.slideObjects.push(body);

    // Button
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

    // Skip link (only non-last slides)
    if (!isLast) {
      const skip = this.add.text(cx, CONFIG.HEIGHT - 50, 'Пропустити', {
        fontSize: '13px', color: '#334455', fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      skip.on('pointerdown', () => this.finish());
      skip.on('pointerover', () => skip.setColor('#556677'));
      skip.on('pointerout',  () => skip.setColor('#334455'));
      this.slideObjects.push(skip);
    }

    // Slide-in animation
    const allObjs = [icon, title, body, btnBg, btnT];
    allObjs.forEach(o => {
      if ('setAlpha' in o) (o as Phaser.GameObjects.GameObject & { setAlpha: (v: number) => void }).setAlpha(0);
    });
    this.tweens.add({ targets: allObjs, alpha: 1, duration: 300, ease: 'Power2' });
  }

  private nextSlide() {
    if (this.currentSlide < SLIDES.length - 1) {
      this.currentSlide++;
      this.renderSlide(this.currentSlide);
    } else {
      this.finish();
    }
  }

  private finish() {
    markOnboardingDone();
    this.scene.start('GameScene');
  }
}
