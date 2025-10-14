import type { Question } from '../types';
import { Difficulty } from '../types';
import { DIFFICULTY_CONFIG } from '../utils/constants';
import { randomInt } from '../utils/mathHelpers';

/**
 * Sistema encargado de generar preguntas de multiplicación
 */
export class QuestionGenerator {
  private difficulty: Difficulty;
  private specificTable: number | null = null;

  constructor(difficulty: Difficulty = Difficulty.MEDIUM) {
    this.difficulty = difficulty;
  }

  /**
   * Genera una nueva pregunta de multiplicación
   */
  public generateQuestion(): Question {
    let factor1: number;
    let factor2: number;

    // Si hay una tabla específica configurada, uno de los factores será ese número
    if (this.specificTable !== null) {
      factor1 = this.specificTable;
      factor2 = randomInt(1, 10);  // El otro factor siempre entre 1 y 10
    } else {
      // Modo tradicional basado en dificultad
      const config = DIFFICULTY_CONFIG[this.difficulty];
      factor1 = randomInt(config.minFactor, config.maxFactor);
      factor2 = randomInt(config.minFactor, config.maxFactor);
    }

    const correctAnswer = factor1 * factor2;

    return {
      factor1,
      factor2,
      correctAnswer
    };
  }

  /**
   * Configura una tabla específica de multiplicar
   * @param table Número de la tabla (ej: 7 para la tabla del 7), o null para modo normal
   */
  public setSpecificTable(table: number | null): void {
    this.specificTable = table;
  }

  /**
   * Obtiene la tabla específica configurada
   */
  public getSpecificTable(): number | null {
    return this.specificTable;
  }

  /**
   * Cambia el nivel de dificultad
   */
  public setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  /**
   * Obtiene la dificultad actual
   */
  public getDifficulty(): Difficulty {
    return this.difficulty;
  }
}
