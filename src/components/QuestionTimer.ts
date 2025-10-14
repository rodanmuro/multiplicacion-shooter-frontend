import Phaser from 'phaser';
import { UI_CONFIG, GAME_CONFIG } from '../utils/constants';

/**
 * Componente UI para mostrar el tiempo restante de la pregunta actual
 */
export class QuestionTimer extends Phaser.GameObjects.Container {
  private timerText: Phaser.GameObjects.Text;
  private progressBar: Phaser.GameObjects.Graphics;
  private timeRemaining: number = 0;
  private totalTime: number = GAME_CONFIG.QUESTION_DURATION;
  private isActive: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, scene.cameras.main.centerX, UI_CONFIG.TIMER_DISPLAY_Y);

    // Barra de progreso
    this.progressBar = scene.add.graphics();
    this.add(this.progressBar);

    // Texto del temporizador
    this.timerText = scene.add.text(0, 30, '00:00', {
      fontSize: UI_CONFIG.TIMER_FONT_SIZE,
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.timerText.setOrigin(0.5);
    this.add(this.timerText);

    // Añadir a la escena
    scene.add.existing(this);

    // Profundidad alta
    this.setDepth(100);
  }

  /**
   * Inicia el temporizador
   */
  public start(): void {
    this.timeRemaining = this.totalTime;
    this.isActive = true;
    this.updateDisplay();
  }

  /**
   * Detiene el temporizador
   */
  public stop(): void {
    this.isActive = false;
  }

  /**
   * Reinicia el temporizador
   */
  public reset(): void {
    this.timeRemaining = this.totalTime;
    this.isActive = false;
    this.updateDisplay();
  }

  /**
   * Actualiza el temporizador (llamar en update loop)
   */
  public update(delta: number): void {
    if (!this.isActive) return;

    this.timeRemaining -= delta;

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.isActive = false;
    }

    this.updateDisplay();
  }

  /**
   * Actualiza la visualización del temporizador
   */
  private updateDisplay(): void {
    // Convertir milisegundos a segundos
    const seconds = Math.ceil(this.timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    // Formatear tiempo como MM:SS
    const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    this.timerText.setText(timeString);

    // Cambiar color según tiempo restante
    if (seconds <= 5) {
      this.timerText.setColor('#ff0000');
      // Parpadeo cuando quedan 5 segundos
      if (seconds <= 5 && Math.floor(this.timeRemaining / 500) % 2 === 0) {
        this.timerText.setScale(1.2);
      } else {
        this.timerText.setScale(1.0);
      }
    } else if (seconds <= 10) {
      this.timerText.setColor('#ffaa00');
      this.timerText.setScale(1.0);
    } else {
      this.timerText.setColor('#ffffff');
      this.timerText.setScale(1.0);
    }

    // Dibujar barra de progreso
    this.drawProgressBar();
  }

  /**
   * Dibuja la barra de progreso
   */
  private drawProgressBar(): void {
    const barWidth = 200;
    const barHeight = 10;
    const progress = this.timeRemaining / this.totalTime;

    this.progressBar.clear();

    // Fondo de la barra
    this.progressBar.fillStyle(0x333333, 0.8);
    this.progressBar.fillRect(-barWidth / 2, 0, barWidth, barHeight);

    // Barra de progreso con color según tiempo
    let barColor = 0x00ff00; // Verde
    if (progress < 0.33) {
      barColor = 0xff0000; // Rojo
    } else if (progress < 0.66) {
      barColor = 0xffaa00; // Naranja
    }

    this.progressBar.fillStyle(barColor, 1);
    this.progressBar.fillRect(-barWidth / 2, 0, barWidth * progress, barHeight);

    // Borde
    this.progressBar.lineStyle(2, 0xffffff, 0.5);
    this.progressBar.strokeRect(-barWidth / 2, 0, barWidth, barHeight);
  }

  /**
   * Obtiene el tiempo restante en milisegundos
   */
  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Verifica si el temporizador está activo
   */
  public isRunning(): boolean {
    return this.isActive;
  }
}
