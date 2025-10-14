import Phaser from 'phaser';
import { Crosshair } from '../entities/Crosshair';
import { ShotMarker } from '../entities/ShotMarker';
import { QuestionGenerator } from '../systems/QuestionGenerator';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { Difficulty } from '../types';

export class GameScene extends Phaser.Scene {
  private crosshair!: Crosshair;
  private questionGenerator!: QuestionGenerator;
  private questionDisplay!: QuestionDisplay;

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

    // Ocultar el cursor del sistema
    this.input.setDefaultCursor('none');

    // Crear la mira
    this.crosshair = new Crosshair(this);

    // Inicializar sistema de preguntas
    this.questionGenerator = new QuestionGenerator(Difficulty.MEDIUM);
    this.questionDisplay = new QuestionDisplay(this);

    // Generar primera pregunta
    this.generateNewQuestion();

    // Configurar evento de click para disparar
    this.input.on('pointerdown', this.onShoot, this);
  }

  update(): void {
    // Actualizar posición de la mira siguiendo el mouse
    const pointer = this.input.activePointer;
    this.crosshair.updatePosition(pointer.x, pointer.y);
  }

  private onShoot(pointer: Phaser.Input.Pointer): void {
    // Crear marcador de disparo en la posición actual del mouse
    new ShotMarker(this, pointer.x, pointer.y);

    // Animación de feedback en la mira
    this.crosshair.pulse();
  }

  private generateNewQuestion(): void {
    const question = this.questionGenerator.generateQuestion();
    this.questionDisplay.setQuestion(question);
    console.log(`Nueva pregunta: ${question.factor1} × ${question.factor2} = ${question.correctAnswer}`);
  }
}
