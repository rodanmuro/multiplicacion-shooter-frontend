import Phaser from 'phaser';
import { Crosshair } from '../entities/Crosshair';
import { ShotMarker } from '../entities/ShotMarker';
import { QuestionGenerator } from '../systems/QuestionGenerator';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { CardSpawner } from '../systems/CardSpawner';
import { ScoreManager } from '../systems/ScoreManager';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { AudioManager } from '../managers/AudioManager';
import { ProgressionManager } from '../managers/ProgressionManager';
import { AuthManager } from '../managers/AuthManager';
import { SessionTimer } from '../components/SessionTimer';
import { UserMenu } from '../ui/UserMenu';
import { Difficulty } from '../types';
import { GAME_CONFIG } from '../utils/constants';
import { sessionApiService } from '../services/sessionApiService';
import { shotApiService } from '../services/shotApiService';
import type { RecordShotPayload, FinishedSessionData } from '../types/api';
import { FONT_SIZE, COLOR } from '../ui/theme';
import { formatClock } from '../utils/format';
import { SessionSummaryOverlay } from '../ui/SessionSummaryOverlay';

export class GameScene extends Phaser.Scene {
  private crosshair!: Crosshair;
  private questionGenerator!: QuestionGenerator;
  private questionDisplay!: QuestionDisplay;
  private cardSpawner!: CardSpawner;
  private scoreManager!: ScoreManager;
  private scoreDisplay!: ScoreDisplay;
  private audioManager!: AudioManager;
  private progressionManager!: ProgressionManager;
  private sessionTimer!: Phaser.Time.TimerEvent;
  private sessionTimerDisplay!: SessionTimer;
  private userMenu!: UserMenu;
  private sessionEnded: boolean = false;
  private sessionId: number | null = null; // ID de la sesión en el backend
  private lastFinishedSessionData: FinishedSessionData | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    console.log('GameScene: Game started!');

    // scene.restart() y scene.start() reutilizan esta misma instancia: los campos de una partida
    // anterior no se reinician solos. Sin esto, sessionEnded seguía en true y onShoot() descartaba
    // todos los disparos, y sessionId / lastFinishedSessionData arrastraban datos de la partida previa.
    this.sessionEnded = false;
    this.sessionId = null;
    this.lastFinishedSessionData = null;

    // Crear sesión en el backend (sin bloquear la inicialización)
    this.createGameSession();

    // Texto temporal para verificar que la escena funciona
    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Multiplication Shooter\nGame Scene Active',
      {
        fontSize: FONT_SIZE.title,
        color: COLOR.white,
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

    // Inicializar gestor de audio
    this.audioManager = new AudioManager(this);
    this.audioManager.registerSound('shoot');

    // Inicializar gestor de progresión
    this.progressionManager = new ProgressionManager();

    // Inicializar display de timer de sesión
    this.sessionTimerDisplay = new SessionTimer(this, GAME_CONFIG.SESSION_DURATION);

    // Mostrar información del usuario autenticado en HTML (fuera del canvas)
    const authManager = AuthManager.getInstance();
    const user = authManager.getUser();
    if (user) {
      // El menú vive en el DOM y la escena se vuelve a crear en cada partida: se retiran los
      // manejadores del menú anterior para que no se acumulen sobre los mismos botones.
      this.userMenu?.destroy();
      this.userMenu = new UserMenu();
      this.userMenu.setGameInstance(this.game);
      this.userMenu.show(user);
    }

    // Configurar timer de sesión (5 minutos)
    this.sessionTimer = this.time.delayedCall(
      GAME_CONFIG.SESSION_DURATION,
      this.endSession,
      [],
      this
    );

    // Conectar cambios de puntuación con la UI y progresión
    this.scoreManager.setOnScoreChange((score, delta) => {
      this.scoreDisplay.updateScore(score, delta);

      // Actualizar progresión basada en puntaje
      const previousLevel = this.progressionManager.getCurrentLevel();
      this.progressionManager.updateProgress(score);
      const currentLevel = this.progressionManager.getCurrentLevel();

      // Si subió de nivel, actualizar velocidad y tabla
      if (currentLevel > previousLevel) {
        this.onLevelUp(currentLevel);
      }
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

    // Actualizar display de tiempo restante
    const remainingTime = this.progressionManager.getRemainingTime();
    this.sessionTimerDisplay.update(remainingTime);

    // Verificar si la sesión ha terminado (solo una vez)
    if (!this.sessionEnded && this.progressionManager.isSessionComplete()) {
      this.sessionEnded = true;
      this.endSession();
    }
  }

  private onShoot(pointer: Phaser.Input.Pointer): void {
    if (this.sessionEnded) {
      return;
    }
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

      // Registrar disparo en backend de forma asíncrona (sin bloquear el juego)
      this.recordShotToBackend(hitCard, pointer.x, pointer.y);
    }
  }

  /**
   * Envía el disparo al backend si hay sesión activa
   */
  private async recordShotToBackend(hitCard: any, x: number, y: number): Promise<void> {
    try {
      if (!this.sessionId) {
        console.warn('No hay sessionId; no se registrará el disparo en backend');
        return;
      }

      const question = this.questionGenerator.getCurrentQuestion();
      if (!question) {
        console.warn('No hay pregunta actual; no se registrará el disparo');
        return;
      }

      const payload: RecordShotPayload = {
        shot_at: new Date().toISOString(),
        coordinate_x: x,
        coordinate_y: y,
        factor_1: question.factor1,
        factor_2: question.factor2,
        correct_answer: question.correctAnswer,
        card_value: hitCard.getValue(),
        is_correct: hitCard.isCorrect()
      };

      const result = await shotApiService.recordShot(this.sessionId, payload);
      console.log('Disparo registrado en backend:', result);
    } catch (error) {
      console.error('Error registrando disparo en backend:', error);
      // No interrumpir juego por errores de red/backend
    }
  }

  private generateNewQuestion(): void {
    // Verificar si la sesión ha terminado
    if (this.progressionManager.isSessionComplete()) {
      this.endSession();
      return;
    }

    // Actualizar tabla de multiplicar según nivel actual
    const currentTable = this.progressionManager.getCurrentTable();
    this.questionGenerator.setSpecificTable(currentTable);

    const question = this.questionGenerator.generateQuestion();
    this.questionDisplay.setQuestion(question);

    // Actualizar velocidad de tarjetas según nivel
    const speedMultiplier = this.progressionManager.getSpeedMultiplier();
    this.cardSpawner.setSpeedMultiplier(speedMultiplier);

    // Iniciar spawn de tarjetas con la nueva pregunta
    this.cardSpawner.startSpawning(question);

    // Log de información de progreso
    const info = this.progressionManager.getProgressInfo();
    const remainingMinutes = Math.floor(info.remainingTime / 60000);
    const remainingSeconds = Math.floor((info.remainingTime % 60000) / 1000);
    console.log(`Nueva pregunta: ${question.factor1} × ${question.factor2} = ${question.correctAnswer}`);
    console.log(`Nivel: ${info.level} | Tabla del ${info.table} | Tiempo restante: ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} | Velocidad: ${info.speedMultiplier.toFixed(2)}x`);
  }

  private onLevelUp(newLevel: number): void {
    const currentTable = this.progressionManager.getCurrentTable();

    console.log(`¡SUBIDA DE NIVEL! Nivel ${newLevel} - Tabla del ${currentTable}`);

    // Crear notificación de subida de nivel
    const notification = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      `¡NIVEL ${newLevel}!\nTabla del ${currentTable}`,
      {
        fontSize: FONT_SIZE.splash,
        color: COLOR.green,
        fontStyle: 'bold',
        stroke: COLOR.black,
        strokeThickness: 8,
        align: 'center'
      }
    );
    notification.setOrigin(0.5);
    notification.setDepth(2000);
    notification.setAlpha(0);

    // Animación de entrada y salida
    this.tweens.add({
      targets: notification,
      alpha: 1,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 400,
      ease: 'Elastic.easeOut',
      yoyo: true,
      hold: 800,
      onComplete: () => {
        notification.destroy();
      }
    });

    // Generar nueva pregunta con la nueva tabla
    this.time.delayedCall(1200, () => {
      // Generar nueva pregunta con la tabla del nuevo nivel
      this.generateNewQuestion();
    });
  }

  /**
   * Crear sesión de juego en el backend
   */
  private async createGameSession(): Promise<void> {
    try {
      const startedAt = new Date().toISOString();
      console.log('Creando sesión de juego en backend...');
      const canvasW = this.cameras.main.width;
      const canvasH = this.cameras.main.height;

      const session = await sessionApiService.createSession(startedAt, canvasW, canvasH);
      this.sessionId = session.id;

      console.log(`✅ Sesión de juego creada: ${this.sessionId}`);
      console.log('Datos de la sesión:', session);

    } catch (error) {
      console.error('❌ Error al crear sesión en backend:', error);
      console.warn('El juego continuará sin sincronización con backend');
      // El juego continúa aunque falle la creación de la sesión
    }
  }

  private async endSession(): Promise<void> {
    // Detener spawn de tarjetas
    this.cardSpawner.stopSpawning();

    // Cancelar timer de sesión
    if (this.sessionTimer) {
      this.sessionTimer.remove();
    }

    console.log('¡SESIÓN COMPLETADA!');
    this.sessionEnded = true;

    // Intentar finalizar sesión en backend si existe sessionId
    if (this.sessionId) {
      try {
        const info = this.progressionManager.getProgressInfo();
        const finalScore = this.scoreManager.getScore();
        const payload = {
          finished_at: new Date().toISOString(),
          final_score: finalScore,
          max_level_reached: this.progressionManager.getCurrentLevel(),
          duration_seconds: Math.floor(info.elapsedTime / 1000)
        };

        const finished = await sessionApiService.finishSession(this.sessionId, payload);
        console.log('Sesión finalizada en backend:', finished);
        this.lastFinishedSessionData = finished;
      } catch (error) {
        console.error('Error al finalizar sesión en backend:', error);
      }
    }

    // Mostrar pantalla de resumen (prefiere datos del backend si existen)
    this.showSessionSummary();
  }

  private showSessionSummary(): void {
    const statsText = this.lastFinishedSessionData
      ? this.backendSummaryText(this.lastFinishedSessionData)
      : this.localSummaryText();

    new SessionSummaryOverlay(this, statsText, () => this.scene.restart()).show();
  }

  /** Resumen con los datos que devolvió el backend */
  private backendSummaryText(session: FinishedSessionData): string {
    return (
      `Puntuación Final: ${session.final_score}\n` +
      `Nivel Alcanzado: ${session.max_level_reached}\n` +
      `Disparos Totales: ${session.total_shots}\n` +
      `Aciertos: ${session.correct_shots} | Errores: ${session.wrong_shots}\n` +
      `Precisión: ${session.accuracy}%\n` +
      `Tiempo Jugado: ${formatClock(session.duration_seconds)}`
    );
  }

  /** Resumen calculado en el cliente (cuando no hay datos del backend) */
  private localSummaryText(): string {
    const info = this.progressionManager.getProgressInfo();
    return (
      `Puntuación Final: ${this.scoreManager.getScore()}\n` +
      `Nivel Alcanzado: ${info.level}\n` +
      `Última Tabla: Tabla del ${info.table}\n` +
      `Tiempo Jugado: ${formatClock(Math.floor(info.elapsedTime / 1000))}`
    );
  }
}
