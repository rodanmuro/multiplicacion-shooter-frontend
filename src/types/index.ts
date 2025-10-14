/**
 * Representa una pregunta de multiplicación
 */
export interface Question {
  factor1: number;
  factor2: number;
  correctAnswer: number;
}

/**
 * Dificultad del juego
 */
export enum Difficulty {
  EASY = 'easy',      // Tablas 1-5
  MEDIUM = 'medium',  // Tablas 1-10
  HARD = 'hard'       // Tablas 1-12
}
