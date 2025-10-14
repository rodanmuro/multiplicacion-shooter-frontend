import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Aquí se cargarán los assets del juego
    console.log('PreloadScene: Loading assets...');
  }

  create(): void {
    console.log('PreloadScene: Assets loaded, starting game...');
    // Transición automática a la escena del juego
    this.scene.start('GameScene');
  }
}
