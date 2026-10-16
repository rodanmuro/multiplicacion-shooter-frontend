import Phaser from 'phaser';
import { PreloadScene } from '../scenes/PreloadScene';
import { LoginScene } from '../scenes/LoginScene';
import { GameScene } from '../scenes/GameScene';
import { StatsScene } from '../scenes/StatsScene';
import AdminScene from '../scenes/admin/AdminScene';
import { COLOR } from '../ui/theme';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  // El mundo del juego es siempre 1200x800; el lienzo se ajusta (sin deformar) al espacio
  // disponible y nunca se agranda por encima de su tamaño base.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1200,
    height: 800,
    max: { width: 1200, height: 800 },
  },
  backgroundColor: COLOR.navy,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [PreloadScene, LoginScene, GameScene, StatsScene, AdminScene]
};
