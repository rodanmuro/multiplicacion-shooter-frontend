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
  WRONG_ANSWERS_COUNT: 5,        // Cantidad de respuestas incorrectas
  MAX_CARDS_ON_SCREEN: 20,       // Número máximo de tarjetas visibles simultáneamente
  SPAWN_INTERVAL: 500,           // Intervalo de spawn en ms (configurable para dificultad)
  MIN_SPEED: 100,                // Velocidad mínima de movimiento (px/s)
  MAX_SPEED: 300,                // Velocidad máxima de movimiento (px/s)
  CARD_WIDTH: 120,               // Ancho de la tarjeta
  CARD_HEIGHT: 80,               // Alto de la tarjeta
  CARD_PADDING: 20,              // Espaciado interno de la tarjeta
  CORRECT_CARD_PROBABILITY: 0.4  // Probabilidad de spawn de tarjeta correcta (0.0 - 1.0)
                                 // 0.4 = 40% correctas, 60% incorrectas
                                 // Ajustar según dificultad deseada
};

/**
 * Configuración de UI
 */
export const UI_CONFIG = {
  QUESTION_DISPLAY_Y: 50,
  QUESTION_FONT_SIZE: '42px',
  QUESTION_COLOR: '#ffffff',
  SCORE_DISPLAY_X: 100,
  SCORE_DISPLAY_Y: 50,
  SCORE_FONT_SIZE: '28px',
  TIMER_DISPLAY_Y: 120,
  TIMER_FONT_SIZE: '32px'
};

/**
 * Configuración del juego
 */
export const GAME_CONFIG = {
  QUESTION_DURATION: 30000  // Duración de cada pregunta en ms (20 segundos)
};
