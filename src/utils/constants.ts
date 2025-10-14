import { Difficulty } from '../types';

/**
 * Configuración de dificultad
 */
export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: { minFactor: 1, maxFactor: 5 },
  [Difficulty.MEDIUM]: { minFactor: 1, maxFactor: 10 },
  [Difficulty.HARD]: { minFactor: 1, maxFactor: 12 }
};

/**
 * Puntuación
 */
export const SCORE = {
  CORRECT_HIT: 10,
  WRONG_HIT: -5
};

/**
 * Configuración de tarjetas
 */
export const CARD_CONFIG = {
  TOTAL_CARDS: 6,           // Número total de tarjetas en pantalla
  WRONG_ANSWERS_COUNT: 5    // Cantidad de respuestas incorrectas
};

/**
 * Configuración de UI
 */
export const UI_CONFIG = {
  QUESTION_DISPLAY_Y: 50,
  QUESTION_FONT_SIZE: '42px',
  QUESTION_COLOR: '#ffffff'
};
