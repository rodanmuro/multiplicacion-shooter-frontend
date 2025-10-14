import Phaser from 'phaser';
import { Card } from '../entities/Card';
import type { Question } from '../types';
import { CARD_CONFIG } from '../utils/constants';
import { generateWrongAnswers, shuffleArray, randomInt } from '../utils/mathHelpers';

/**
 * Bordes desde donde pueden aparecer las tarjetas
 */
type SpawnEdge = 'top' | 'bottom' | 'left' | 'right';

/**
 * Sistema encargado de generar y gestionar tarjetas
 */
export class CardSpawner {
  private scene: Phaser.Scene;
  private cards: Card[] = [];
  private currentQuestion: Question | null = null;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private availableAnswers: number[] = [];
  private worldWidth: number;
  private worldHeight: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.worldWidth = scene.cameras.main.width;
    this.worldHeight = scene.cameras.main.height;
  }

  /**
   * Inicia el spawn de tarjetas para una nueva pregunta
   */
  public startSpawning(question: Question): void {
    this.currentQuestion = question;

    // Limpiar tarjetas anteriores
    this.clearAllCards();

    // Generar pool de respuestas (correcta + incorrectas)
    const wrongAnswers = generateWrongAnswers(
      question.correctAnswer,
      CARD_CONFIG.WRONG_ANSWERS_COUNT,
      question.factor1,
      question.factor2
    );

    this.availableAnswers = shuffleArray([
      question.correctAnswer,
      ...wrongAnswers
    ]);

    // Iniciar timer de spawn
    this.spawnTimer = this.scene.time.addEvent({
      delay: CARD_CONFIG.SPAWN_INTERVAL,
      callback: this.spawnCard,
      callbackScope: this,
      loop: true
    });

    // Spawn inmediato de la primera tarjeta
    this.spawnCard();
  }

  /**
   * Detiene el spawn de tarjetas
   */
  public stopSpawning(): void {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = null;
    }
  }

  /**
   * Genera una nueva tarjeta desde un borde aleatorio
   */
  private spawnCard(): void {
    if (!this.currentQuestion) return;

    // Limitar número de tarjetas en pantalla
    if (this.cards.length >= CARD_CONFIG.MAX_CARDS_ON_SCREEN) {
      return;
    }

    // Decidir si la tarjeta será correcta o incorrecta según probabilidad
    const shouldBeCorrect = Math.random() < CARD_CONFIG.CORRECT_CARD_PROBABILITY;

    let value: number;
    let isCorrect: boolean;

    if (shouldBeCorrect) {
      // Spawn tarjeta correcta
      value = this.currentQuestion.correctAnswer;
      isCorrect = true;
    } else {
      // Spawn tarjeta incorrecta - elegir del pool de respuestas incorrectas
      const wrongAnswers = this.availableAnswers.filter(
        answer => answer !== this.currentQuestion!.correctAnswer
      );

      if (wrongAnswers.length > 0) {
        value = wrongAnswers[randomInt(0, wrongAnswers.length - 1)];
        isCorrect = false;
      } else {
        // Fallback: si no hay incorrectas, usar correcta
        value = this.currentQuestion.correctAnswer;
        isCorrect = true;
      }
    }

    // Seleccionar borde aleatorio
    const edge = this.getRandomEdge();
    const spawnData = this.getSpawnPosition(edge);

    // Crear la tarjeta
    const card = new Card(
      this.scene,
      spawnData.x,
      spawnData.y,
      value,
      isCorrect,
      spawnData.velocityX,
      spawnData.velocityY
    );

    this.cards.push(card);
  }

  /**
   * Obtiene un borde aleatorio
   */
  private getRandomEdge(): SpawnEdge {
    const edges: SpawnEdge[] = ['top', 'bottom', 'left', 'right'];
    return edges[randomInt(0, edges.length - 1)];
  }

  /**
   * Calcula la posición y velocidad de spawn según el borde
   */
  private getSpawnPosition(edge: SpawnEdge): {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  } {
    const speed = randomInt(CARD_CONFIG.MIN_SPEED, CARD_CONFIG.MAX_SPEED);
    const margin = 50;

    switch (edge) {
      case 'top':
        return {
          x: randomInt(margin, this.worldWidth - margin),
          y: -margin,
          velocityX: randomInt(-50, 50), // Ligero movimiento lateral
          velocityY: speed
        };

      case 'bottom':
        return {
          x: randomInt(margin, this.worldWidth - margin),
          y: this.worldHeight + margin,
          velocityX: randomInt(-50, 50),
          velocityY: -speed
        };

      case 'left':
        return {
          x: -margin,
          y: randomInt(margin, this.worldHeight - margin),
          velocityX: speed,
          velocityY: randomInt(-50, 50)
        };

      case 'right':
        return {
          x: this.worldWidth + margin,
          y: randomInt(margin, this.worldHeight - margin),
          velocityX: -speed,
          velocityY: randomInt(-50, 50)
        };
    }
  }

  /**
   * Actualiza todas las tarjetas (llamar en update loop)
   */
  public update(delta: number): void {
    // Actualizar movimiento de todas las tarjetas
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const card = this.cards[i];

      card.updateMovement(delta);

      // Eliminar tarjetas fuera de pantalla
      if (card.isOutOfBounds(this.worldWidth, this.worldHeight)) {
        card.destroy();
        this.cards.splice(i, 1);
      }
    }
  }

  /**
   * Verifica si un punto colisiona con alguna tarjeta
   */
  public checkHit(x: number, y: number): Card | null {
    for (const card of this.cards) {
      // Calcular área de colisión manual basada en el tamaño de la tarjeta
      const halfWidth = CARD_CONFIG.CARD_WIDTH / 2;
      const halfHeight = CARD_CONFIG.CARD_HEIGHT / 2;

      const left = card.x - halfWidth;
      const right = card.x + halfWidth;
      const top = card.y - halfHeight;
      const bottom = card.y + halfHeight;

      // Verificar si el punto está dentro del área rectangular
      if (x >= left && x <= right && y >= top && y <= bottom) {
        return card;
      }
    }
    return null;
  }

  /**
   * Remueve una tarjeta específica
   */
  public removeCard(card: Card): void {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
    }
  }

  /**
   * Limpia todas las tarjetas
   */
  public clearAllCards(): void {
    for (const card of this.cards) {
      card.destroy();
    }
    this.cards = [];
  }

  /**
   * Obtiene todas las tarjetas activas
   */
  public getCards(): Card[] {
    return this.cards;
  }

  /**
   * Destruye el spawner
   */
  public destroy(): void {
    this.stopSpawning();
    this.clearAllCards();
  }
}
