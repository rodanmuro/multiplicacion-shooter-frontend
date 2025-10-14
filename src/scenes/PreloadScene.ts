import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Cargar sonidos del juego
    console.log('PreloadScene: Loading assets...');

    // Cargar sonido de disparo
    this.load.audio('shoot', [
      'sounds/shoot.ogg',
      'sounds/shoot.mp3'
    ]);

    // Cargar sonido de explosión
    this.load.audio('explosion', [
      'sounds/explosion.ogg',
      'sounds/explosion.mp3'
    ]);

    // Cargar sonido de acierto correcto
    this.load.audio('correct', [
      'sounds/correct.ogg',
      'sounds/correct.mp3'
    ]);

    // Cargar sonido de acierto incorrecto
    this.load.audio('wrong', [
      'sounds/wrong.ogg',
      'sounds/wrong.mp3'
    ]);
  }

  create(): void {
    console.log('PreloadScene: Assets loaded, starting game...');
    // Transición automática a la escena del juego
    this.scene.start('GameScene');
  }
}
