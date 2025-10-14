import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    console.log('GameScene: Game started!');

    // Texto temporal para verificar que la escena funciona
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Multiplication Shooter\nGame Scene Active',
      {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
  }

  update(): void {
    // Game loop principal
  }
}
