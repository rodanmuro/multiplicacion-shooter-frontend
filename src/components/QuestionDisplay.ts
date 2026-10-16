import Phaser from 'phaser';
import type { Question } from '../types';
import { UI_CONFIG } from '../utils/constants';
import { COLOR } from '../ui/theme';
import { getLayout } from '../ui/layout';

/**
 * Componente UI para mostrar la pregunta de multiplicación
 */
export class QuestionDisplay extends Phaser.GameObjects.Container {
  private questionText: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Graphics;
  private currentQuestion: Question | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, scene.cameras.main.centerX, UI_CONFIG.QUESTION_DISPLAY_Y);

    // Fondo semi-transparente para la pregunta
    this.background = scene.add.graphics();
    this.background.fillStyle(0x000000, 0.7);
    this.background.fillRoundedRect(-150, -30, 300, 60, 10);

    // Texto de la pregunta
    this.questionText = scene.add.text(0, 0, '', {
      fontSize: UI_CONFIG.QUESTION_FONT_SIZE,
      color: UI_CONFIG.QUESTION_COLOR,
      fontStyle: 'bold',
      align: 'center'
    });
    this.questionText.setOrigin(0.5);

    // Se agranda en pantallas pequeñas (1 en escritorio). Se escalan los hijos y no el contenedor,
    // porque la animación de entrada anima la escala del contenedor de 0 a 1.
    const hudScale = getLayout(scene).hudScale;
    this.background.setScale(hudScale);
    this.questionText.setScale(hudScale);
    this.questionText.setResolution(hudScale);

    // Añadir elementos al contenedor
    this.add([this.background, this.questionText]);

    // Añadir a la escena
    scene.add.existing(this);

    // Profundidad alta para que esté visible
    this.setDepth(100);
  }

  /**
   * Actualiza la pregunta mostrada
   */
  public setQuestion(question: Question): void {
    this.currentQuestion = question;
    this.questionText.setText(`${question.factor1} × ${question.factor2} = ?`);

    // Animación de entrada
    this.animateIn();
  }

  /**
   * Obtiene la pregunta actual
   */
  public getCurrentQuestion(): Question | null {
    return this.currentQuestion;
  }

  /**
   * Animación de entrada de la pregunta
   */
  private animateIn(): void {
    this.setScale(0);
    this.setAlpha(0);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Efecto visual de respuesta correcta
   */
  public showCorrectFeedback(): void {
    // Flash verde
    this.scene.tweens.add({
      targets: this.questionText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onStart: () => {
        this.questionText.setColor(COLOR.green);
      },
      onComplete: () => {
        this.questionText.setColor(UI_CONFIG.QUESTION_COLOR);
      }
    });
  }

  /**
   * Efecto visual de respuesta incorrecta
   */
  public showWrongFeedback(): void {
    // Shake rojo
    const originalX = this.x;

    this.scene.tweens.add({
      targets: this,
      x: originalX - 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onStart: () => {
        this.questionText.setColor(COLOR.red);
      },
      onComplete: () => {
        this.x = originalX;
        this.questionText.setColor(UI_CONFIG.QUESTION_COLOR);
      }
    });
  }
}
