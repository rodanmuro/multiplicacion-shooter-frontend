import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Cargar sonidos del juego
    console.log('PreloadScene: Loading assets...');

    // Cargar sonido de disparo en múltiples formatos
    this.load.audio('shoot', [
      'sounds/shoot.ogg',
      'sounds/shoot.mp3'
    ]);
  }

  create(): void {
    console.log('PreloadScene: Assets loaded, starting game...');
    // Transición automática a la escena del juego
    this.scene.start('GameScene');
  }
}
