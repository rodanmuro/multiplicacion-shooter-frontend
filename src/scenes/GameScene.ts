import Phaser from 'phaser';
import { Crosshair } from '../entities/Crosshair';
import { ShotMarker } from '../entities/ShotMarker';
import { QuestionGenerator } from '../systems/QuestionGenerator';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { CardSpawner } from '../systems/CardSpawner';
import { ScoreManager } from '../systems/ScoreManager';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { QuestionTimer } from '../components/QuestionTimer';
import { AudioManager } from '../managers/AudioManager';
import { Difficulty } from '../types';
import { GAME_CONFIG } from '../utils/constants';

export class GameScene extends Phaser.Scene {
  private crosshair!: Crosshair;
  private questionGenerator!: QuestionGenerator;
  private questionDisplay!: QuestionDisplay;
  private cardSpawner!: CardSpawner;
  private scoreManager!: ScoreManager;
  private scoreDisplay!: ScoreDisplay;
  private questionTimer!: QuestionTimer;
  private audioManager!: AudioManager;
  private questionTimeoutEvent!: Phaser.Time.TimerEvent;

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

    // Inicializar sistema de tarjetas
    this.cardSpawner = new CardSpawner(this);

    // Inicializar sistema de puntuación
    this.scoreManager = new ScoreManager();
    this.scoreDisplay = new ScoreDisplay(this);

    // Inicializar temporizador de pregunta
    this.questionTimer = new QuestionTimer(this);

    // Inicializar gestor de audio
    this.audioManager = new AudioManager(this);
    this.audioManager.registerSound('shoot');

    // Conectar cambios de puntuación con la UI
    this.scoreManager.setOnScoreChange((score, delta) => {
      this.scoreDisplay.updateScore(score, delta);
    });

    // Generar primera pregunta
    this.generateNewQuestion();

    // Configurar evento de click para disparar
    this.input.on('pointerdown', this.onShoot, this);
  }

  update(_time: number, delta: number): void {
    // Actualizar posición de la mira siguiendo el mouse
    const pointer = this.input.activePointer;
    this.crosshair.updatePosition(pointer.x, pointer.y);

    // Actualizar movimiento de tarjetas
    this.cardSpawner.update(delta);

    // Actualizar temporizador de pregunta
    this.questionTimer.update(delta);
  }

  private onShoot(pointer: Phaser.Input.Pointer): void {
    // Reproducir sonido de disparo
    this.audioManager.play('shoot', { volume: 0.5 });

    // Crear marcador de disparo en la posición actual del mouse
    new ShotMarker(this, pointer.x, pointer.y);

    // Animación de feedback en la mira
    this.crosshair.pulse();

    // Verificar colisión con tarjetas
    const hitCard = this.cardSpawner.checkHit(pointer.x, pointer.y);

    if (hitCard) {
      if (hitCard.isCorrect()) {
        // Acierto correcto
        this.scoreManager.addCorrectHit();
        hitCard.showHitCorrectEffect();
        this.questionDisplay.showCorrectFeedback();
      } else {
        // Acierto incorrecto
        this.scoreManager.addWrongHit();
        hitCard.showHitWrongEffect();
        this.questionDisplay.showWrongFeedback();
      }

      // Remover la tarjeta del spawner (correcta o incorrecta)
      this.cardSpawner.removeCard(hitCard);
    }
  }

  private generateNewQuestion(): void {
    const question = this.questionGenerator.generateQuestion();
    this.questionDisplay.setQuestion(question);

    // Iniciar spawn de tarjetas con la nueva pregunta
    this.cardSpawner.startSpawning(question);

    // Iniciar temporizador visual
    this.questionTimer.start();

    console.log(`Nueva pregunta: ${question.factor1} × ${question.factor2} = ${question.correctAnswer}`);

    // Cancelar timer anterior si existe
    if (this.questionTimeoutEvent) {
      this.questionTimeoutEvent.remove();
    }

    // Configurar timer para cambiar pregunta automáticamente
    this.questionTimeoutEvent = this.time.delayedCall(
      GAME_CONFIG.QUESTION_DURATION,
      this.onQuestionTimeout,
      [],
      this
    );
  }

  private onQuestionTimeout(): void {
    // Detener temporizador visual
    this.questionTimer.stop();

    // Mostrar notificación de cambio de pregunta
    this.showQuestionChangeNotification();

    // Generar nueva pregunta después de un breve delay
    this.time.delayedCall(1000, () => {
      this.generateNewQuestion();
    });
  }

  private showQuestionChangeNotification(): void {
    // Crear texto de notificación
    const notification = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      '¡Nueva Pregunta!',
      {
        fontSize: '48px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    );
    notification.setOrigin(0.5);
    notification.setDepth(1500);
    notification.setAlpha(0);

    // Animación de entrada y salida
    this.tweens.add({
      targets: notification,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 400,
      onComplete: () => {
        notification.destroy();
      }
    });
  }
}
