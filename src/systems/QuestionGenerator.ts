import type { Question } from '../types';
import { Difficulty } from '../types';
import { DIFFICULTY_CONFIG } from '../utils/constants';
import { randomInt } from '../utils/mathHelpers';

/**
 * Sistema encargado de generar preguntas de multiplicación
 */
export class QuestionGenerator {
  private difficulty: Difficulty;

  constructor(difficulty: Difficulty = Difficulty.MEDIUM) {
    this.difficulty = difficulty;
  }

  /**
   * Genera una nueva pregunta de multiplicación
   */
  public generateQuestion(): Question {
    const config = DIFFICULTY_CONFIG[this.difficulty];

    const factor1 = randomInt(config.minFactor, config.maxFactor);
    const factor2 = randomInt(config.minFactor, config.maxFactor);
    const correctAnswer = factor1 * factor2;

    return {
      factor1,
      factor2,
      correctAnswer
    };
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
