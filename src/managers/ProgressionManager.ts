import { PROGRESSION_CONFIG, GAME_CONFIG } from '../utils/constants';

/**
 * Gestiona la progresión de dificultad durante la sesión de juego
 */
export class ProgressionManager {
  private currentLevel: number = 1;
  private currentScore: number = 0;
  private sessionStartTime: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Reinicia el estado de progresión
   */
  public reset(): void {
    this.currentLevel = 1;
    this.currentScore = 0;
    this.sessionStartTime = Date.now();
  }

  /**
   * Actualiza el progreso basado en el puntaje actual
   */
  public updateProgress(score: number): void {
    this.currentScore = score;

    // Calcular nivel basado en puntaje
    // Nivel 1 = 0-39 puntos, Nivel 2 = 40-79 puntos, etc.
    // Si el puntaje es negativo, mantener en nivel 1
    this.currentLevel = score < 0
      ? 1
      : Math.floor(score / PROGRESSION_CONFIG.POINTS_PER_LEVEL) + 1;

    // No hay límite de nivel - puede seguir subiendo indefinidamente
    // Los niveles 11+ rotarán entre las tablas difíciles
  }

  /**
   * Obtiene el nivel actual (1-10)
   */
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Obtiene la tabla de multiplicar actual según el nivel
   */
  public getCurrentTable(): number {
    const index = this.currentLevel - 1;

    // Si estamos dentro del rango de TABLE_ORDER, usar esa tabla
    if (index < PROGRESSION_CONFIG.TABLE_ORDER.length) {
      return PROGRESSION_CONFIG.TABLE_ORDER[index];
    }

    // Después del nivel 10, rotar entre las tablas difíciles
    const hardTableIndex = (this.currentLevel - PROGRESSION_CONFIG.TABLE_ORDER.length - 1) % PROGRESSION_CONFIG.HARD_TABLES.length;
    return PROGRESSION_CONFIG.HARD_TABLES[hardTableIndex];
  }

  /**
   * Obtiene el multiplicador de velocidad actual
   */
  public getSpeedMultiplier(): number {
    const { MIN_MULTIPLIER, INCREMENT, MAX_LEVEL_FOR_INCREMENT, MAX_MULTIPLIER } = PROGRESSION_CONFIG.SPEED_SCALE;

    // La velocidad aumenta hasta el nivel 10, luego se mantiene constante
    const effectiveLevel = Math.min(this.currentLevel, MAX_LEVEL_FOR_INCREMENT);
    const calculatedMultiplier = MIN_MULTIPLIER + (INCREMENT * (effectiveLevel - 1));

    return Math.min(calculatedMultiplier, MAX_MULTIPLIER);
  }

  /**
   * Verifica si la sesión ha terminado (5 minutos)
   */
  public isSessionComplete(): boolean {
    const elapsedTime = Date.now() - this.sessionStartTime;
    return elapsedTime >= GAME_CONFIG.SESSION_DURATION;
  }

  /**
   * Obtiene el tiempo transcurrido en la sesión (en ms)
   */
  public getElapsedTime(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Obtiene el tiempo restante en la sesión (en ms)
   */
  public getRemainingTime(): number {
    const remaining = GAME_CONFIG.SESSION_DURATION - this.getElapsedTime();
    return Math.max(0, remaining);
  }

  /**
   * Obtiene información detallada del progreso actual
   */
  public getProgressInfo(): {
    level: number;
    table: number;
    elapsedTime: number;
    remainingTime: number;
    speedMultiplier: number;
    isComplete: boolean;
  } {
    return {
      level: this.getCurrentLevel(),
      table: this.getCurrentTable(),
      elapsedTime: this.getElapsedTime(),
      remainingTime: this.getRemainingTime(),
      speedMultiplier: this.getSpeedMultiplier(),
      isComplete: this.isSessionComplete()
    };
  }
}
