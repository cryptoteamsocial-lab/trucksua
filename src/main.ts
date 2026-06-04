import Phaser from 'phaser';
import GameScene from './game/GameScene';
import GarageScene from './game/GarageScene';
import MissionsScene from './game/MissionsScene';
import { CONFIG } from './game/config';
import './style.css';

// Telegram Mini App init
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CONFIG.WIDTH,
  height: CONFIG.HEIGHT,
  backgroundColor: CONFIG.COLORS.BG,
  parent: 'app',
  scene: [GameScene, GarageScene, MissionsScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
    pixelArt: false,
  },
};

new Phaser.Game(config);
