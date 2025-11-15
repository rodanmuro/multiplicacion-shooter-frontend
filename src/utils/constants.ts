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
  MIN_SPEED: 50,                 // Velocidad mínima de movimiento (px/s) - Reducida a la mitad
  MAX_SPEED: 150,                // Velocidad máxima de movimiento (px/s) - Reducida a la mitad
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
  SESSION_DURATION: 300000   // Duración total de la sesión en ms (5 minutos)
};

/**
 * Sistema de progresión de dificultad
 * Orden recomendado para aprendizaje de tablas de multiplicar
 */
export const PROGRESSION_CONFIG = {
  // Orden de tablas: fáciles (1, 10, 2, 5) → intermedias (3, 4) → difíciles (6, 7, 8, 9)
  TABLE_ORDER: [1, 10, 2, 5, 3, 4, 6, 7, 8, 9],

  // Tablas difíciles para rotar después del nivel 10
  HARD_TABLES: [6, 7, 8, 9],

  // Puntos necesarios para cada nivel (cada nivel = siguiente tabla)
  POINTS_PER_LEVEL: 40,      // Con +10 por correcta, necesitas 4 aciertos por nivel

  // Escala de velocidad según nivel
  SPEED_SCALE: {
    MIN_MULTIPLIER: 1.0,     // Velocidad inicial (nivel 1)
    MAX_MULTIPLIER: 2.0,     // Velocidad máxima (nivel 10)
    INCREMENT: 0.11,         // Incremento por nivel (~10% más rápido cada nivel)
    MAX_LEVEL_FOR_INCREMENT: 10  // Después del nivel 10, la velocidad se mantiene
  }
};
