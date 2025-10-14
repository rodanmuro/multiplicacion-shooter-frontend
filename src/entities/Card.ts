import Phaser from 'phaser';
import { CARD_CONFIG } from '../utils/constants';

/**
 * Tarjeta con un número que se mueve por la pantalla
 */
export class Card extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private numberText: Phaser.GameObjects.Text;
  private value: number;
  private isCorrectAnswer: boolean;
  private velocityX: number;
  private velocityY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: number,
    isCorrect: boolean,
    velocityX: number,
    velocityY: number
  ) {
    super(scene, x, y);

    this.value = value;
    this.isCorrectAnswer = isCorrect;
    this.velocityX = velocityX;
    this.velocityY = velocityY;

    // Fondo de la tarjeta
    this.background = scene.add.graphics();
    this.drawCardBackground();

    // Texto del número
    this.numberText = scene.add.text(0, 0, value.toString(), {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    });
    this.numberText.setOrigin(0.5);

    // Añadir elementos al contenedor
    this.add([this.background, this.numberText]);

    // Añadir a la escena
    scene.add.existing(this);

    // Profundidad para que esté debajo de la mira
    this.setDepth(50);

    // Hacer la tarjeta interactiva para detectar clicks
    this.setSize(CARD_CONFIG.CARD_WIDTH, CARD_CONFIG.CARD_HEIGHT);
    this.setInteractive();
  }

  /**
   * Dibuja el fondo de la tarjeta
   */
  private drawCardBackground(): void {
    const halfWidth = CARD_CONFIG.CARD_WIDTH / 2;
    const halfHeight = CARD_CONFIG.CARD_HEIGHT / 2;

    // Fondo con borde
    this.background.fillStyle(0x2c3e50, 1);
    this.background.fillRoundedRect(
      -halfWidth,
      -halfHeight,
      CARD_CONFIG.CARD_WIDTH,
      CARD_CONFIG.CARD_HEIGHT,
      10
    );

    // Borde
    this.background.lineStyle(3, 0x3498db, 1);
    this.background.strokeRoundedRect(
      -halfWidth,
      -halfHeight,
      CARD_CONFIG.CARD_WIDTH,
      CARD_CONFIG.CARD_HEIGHT,
      10
    );
  }

  /**
   * Actualiza la posición de la tarjeta según su velocidad
   */
  public updateMovement(delta: number): void {
    // delta está en milisegundos, convertir a segundos
    const deltaSeconds = delta / 1000;

    this.x += this.velocityX * deltaSeconds;
    this.y += this.velocityY * deltaSeconds;
  }

  /**
   * Verifica si la tarjeta está fuera de los límites de la pantalla
   */
  public isOutOfBounds(worldWidth: number, worldHeight: number): boolean {
    const margin = 100; // Margen extra para destruir la tarjeta
    return (
      this.x < -margin ||
      this.x > worldWidth + margin ||
      this.y < -margin ||
      this.y > worldHeight + margin
    );
  }

  /**
   * Obtiene el valor de la tarjeta
   */
  public getValue(): number {
    return this.value;
  }

  /**
   * Verifica si la tarjeta es la respuesta correcta
   */
  public isCorrect(): boolean {
    return this.isCorrectAnswer;
  }

  /**
   * Efecto visual cuando la tarjeta es golpeada correctamente
   */
  public showHitCorrectEffect(): void {
    // Flash verde y desaparecer
    this.scene.tweens.add({
      targets: this.background,
      alpha: 0,
      duration: 200,
      ease: 'Power2'
    });

    this.scene.tweens.add({
      targets: this.numberText,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  /**
   * Efecto visual cuando la tarjeta es golpeada incorrectamente
   */
  public showHitWrongEffect(): void {
    // Flash rojo y shake
    const originalColor = 0x2c3e50;

    this.background.clear();
    this.background.fillStyle(0xff0000, 1);
    this.background.fillRoundedRect(
      -CARD_CONFIG.CARD_WIDTH / 2,
      -CARD_CONFIG.CARD_HEIGHT / 2,
      CARD_CONFIG.CARD_WIDTH,
      CARD_CONFIG.CARD_HEIGHT,
      10
    );

    this.scene.time.delayedCall(100, () => {
      if (this.background && this.background.active) {
        this.background.clear();
        this.background.fillStyle(originalColor, 1);
        this.background.fillRoundedRect(
          -CARD_CONFIG.CARD_WIDTH / 2,
          -CARD_CONFIG.CARD_HEIGHT / 2,
          CARD_CONFIG.CARD_WIDTH,
          CARD_CONFIG.CARD_HEIGHT,
          10
        );
      }
    });
  }
}
