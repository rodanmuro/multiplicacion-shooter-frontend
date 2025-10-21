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

    // Crear sesión en el backend (sin bloquear la inicialización)
    this.createGameSession();

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
      this.userMenu = new UserMenu();
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
        fontSize: '56px',
        color: '#00ff00',
        fontStyle: 'bold',
        stroke: '#000000',
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
    if (this.lastFinishedSessionData) {
      this.showSessionSummaryBackend(this.lastFinishedSessionData);
    } else {
      this.showSessionSummaryLocal();
    }
  }

  private showSessionSummaryLocal(): void {
    const info = this.progressionManager.getProgressInfo();
    const finalScore = this.scoreManager.getScore();

    // Crear overlay oscuro
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setDepth(3000);

    // Crear texto de resumen
    const summaryText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      '¡SESIÓN COMPLETADA!',
      {
        fontSize: '64px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8
      }
    );
    summaryText.setOrigin(0.5);
    summaryText.setDepth(3001);

    const elapsedMinutes = Math.floor(info.elapsedTime / 60000);
    const elapsedSeconds = Math.floor((info.elapsedTime % 60000) / 1000);

    const statsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Puntuación Final: ${finalScore}\n` +
      `Nivel Alcanzado: ${info.level}\n` +
      `Última Tabla: Tabla del ${info.table}\n` +
      `Tiempo Jugado: ${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`,
      {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 10
      }
    );
    statsText.setOrigin(0.5);
    statsText.setDepth(3001);

    const restartText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 150,
      'Haz clic para nueva sesión',
      {
        fontSize: '28px',
        color: '#00ff00',
        fontStyle: 'italic'
      }
    );
    restartText.setOrigin(0.5);
    restartText.setDepth(3001);

    // Animación de parpadeo en texto de reinicio
    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    // Reiniciar al hacer clic (con confirmación)
    this.input.once('pointerdown', () => {
      this.showRestartConfirmation(overlay, summaryText, statsText, restartText);
    });
  }

  private showSessionSummaryBackend(session: FinishedSessionData): void {
    // Crear overlay oscuro
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setDepth(3000);

    const title = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      '¡SESIÓN COMPLETADA!',
      {
        fontSize: '64px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8
      }
    );
    title.setOrigin(0.5);
    title.setDepth(3001);

    const minutes = Math.floor(session.duration_seconds / 60);
    const seconds = session.duration_seconds % 60;

    const stats = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `Puntuación Final: ${session.final_score}\n` +
      `Nivel Alcanzado: ${session.max_level_reached}\n` +
      `Disparos Totales: ${session.total_shots}\n` +
      `Aciertos: ${session.correct_shots} | Errores: ${session.wrong_shots}\n` +
      `Precisión: ${session.accuracy}%\n` +
      `Tiempo Jugado: ${minutes}:${seconds.toString().padStart(2, '0')}`,
      {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 10
      }
    );
    stats.setOrigin(0.5);
    stats.setDepth(3001);

    const restartText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 150,
      'Haz clic para nueva sesión',
      {
        fontSize: '28px',
        color: '#00ff00',
        fontStyle: 'italic'
      }
    );
    restartText.setOrigin(0.5);
    restartText.setDepth(3001);

    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    this.input.once('pointerdown', () => {
      this.showRestartConfirmation(overlay, title, stats, restartText);
    });
  }

  private showRestartConfirmation(
    overlay: Phaser.GameObjects.Rectangle,
    summaryText: Phaser.GameObjects.Text,
    statsText: Phaser.GameObjects.Text,
    restartText: Phaser.GameObjects.Text
  ): void {
    // Ocultar elementos anteriores
    summaryText.destroy();
    statsText.destroy();
    restartText.destroy();

    // Crear texto de confirmación
    const confirmText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 60,
      '¿Seguro que deseas iniciar\nuna nueva sesión?',
      {
        fontSize: '48px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
      }
    );
    confirmText.setOrigin(0.5);
    confirmText.setDepth(3001);

    // Botón SÍ
    const yesButton = this.add.text(
      this.cameras.main.centerX - 100,
      this.cameras.main.centerY + 80,
      'SÍ',
      {
        fontSize: '42px',
        color: '#00ff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: '#004400',
        padding: { x: 30, y: 15 }
      }
    );
    yesButton.setOrigin(0.5);
    yesButton.setDepth(3001);
    yesButton.setInteractive({ useHandCursor: true });

    // Botón NO
    const noButton = this.add.text(
      this.cameras.main.centerX + 100,
      this.cameras.main.centerY + 80,
      'NO',
      {
        fontSize: '42px',
        color: '#ff0000',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: '#440000',
        padding: { x: 30, y: 15 }
      }
    );
    noButton.setOrigin(0.5);
    noButton.setDepth(3001);
    noButton.setInteractive({ useHandCursor: true });

    // Hover effect en botón SÍ
    yesButton.on('pointerover', () => {
      yesButton.setScale(1.1);
    });
    yesButton.on('pointerout', () => {
      yesButton.setScale(1);
    });

    // Hover effect en botón NO
    noButton.on('pointerover', () => {
      noButton.setScale(1.1);
    });
    noButton.on('pointerout', () => {
      noButton.setScale(1);
    });

    // Click en SÍ - reiniciar
    yesButton.on('pointerdown', () => {
      this.scene.restart();
    });

    // Click en NO - volver al resumen
    noButton.on('pointerdown', () => {
      confirmText.destroy();
      yesButton.destroy();
      noButton.destroy();

      // Recrear pantalla de resumen
      this.showSessionSummary();
    });
  }
}
