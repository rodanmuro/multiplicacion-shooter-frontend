/**
 * Genera un número aleatorio entre min y max (inclusivo)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera respuestas incorrectas plausibles basadas en la respuesta correcta
 * Las respuestas incorrectas están cerca de la correcta para hacerlo desafiante
 */
export function generateWrongAnswers(
  correctAnswer: number,
  count: number,
  factor1: number,
  factor2: number
): number[] {
  const wrongAnswers = new Set<number>();

  // Estrategias para generar respuestas incorrectas plausibles
  const strategies = [
    // Off-by-one en los factores
    () => (factor1 + 1) * factor2,
    () => (factor1 - 1) * factor2,
    () => factor1 * (factor2 + 1),
    () => factor1 * (factor2 - 1),

    // Sumar/restar valores cercanos
    () => correctAnswer + randomInt(1, 10),
    () => correctAnswer - randomInt(1, 10),
    () => correctAnswer + randomInt(10, 20),
    () => correctAnswer - randomInt(10, 20),

    // Múltiplos cercanos
    () => correctAnswer + factor1,
    () => correctAnswer - factor1,
    () => correctAnswer + factor2,
    () => correctAnswer - factor2,

    // Respuestas de tablas cercanas
    () => factor1 * randomInt(Math.max(1, factor2 - 2), factor2 + 2),
    () => randomInt(Math.max(1, factor1 - 2), factor1 + 2) * factor2
  ];

  while (wrongAnswers.size < count) {
    // Seleccionar estrategia aleatoria
    const strategy = strategies[randomInt(0, strategies.length - 1)];
    const wrongAnswer = strategy();

    // Validar que sea diferente de la correcta y sea positivo
    if (wrongAnswer !== correctAnswer && wrongAnswer > 0) {
      wrongAnswers.add(wrongAnswer);
    }
  }

  return Array.from(wrongAnswers);
}

/**
 * Mezcla un array usando el algoritmo de Fisher-Yates
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
