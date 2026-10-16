import { describe, expect, it, vi } from 'vitest';
import { generateWrongAnswers, randomInt, shuffleArray } from '../../src/utils/mathHelpers';

describe('randomInt', () => {
  it('devuelve el mínimo cuando Math.random vale 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(randomInt(3, 9)).toBe(3);
  });

  it('devuelve el máximo (inclusivo) cuando Math.random se acerca a 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(randomInt(3, 9)).toBe(9);
  });

  it('siempre devuelve enteros dentro del rango', () => {
    for (let i = 0; i < 500; i++) {
      const n = randomInt(1, 12);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(12);
    }
  });

  it('con min = max devuelve ese valor', () => {
    expect(randomInt(7, 7)).toBe(7);
  });
});

describe('shuffleArray', () => {
  it('conserva los mismos elementos', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    expect([...shuffleArray(original)].sort((a, b) => a - b)).toEqual(original);
  });

  it('no modifica el arreglo original', () => {
    const original = [1, 2, 3, 4];
    shuffleArray(original);
    expect(original).toEqual([1, 2, 3, 4]);
  });

  it('devuelve un arreglo nuevo', () => {
    const original = [1, 2, 3];
    expect(shuffleArray(original)).not.toBe(original);
  });

  it('funciona con arreglos vacíos y de un elemento', () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray([42])).toEqual([42]);
  });
});

describe('generateWrongAnswers', () => {
  it('genera exactamente la cantidad pedida, sin repetidos', () => {
    const answers = generateWrongAnswers(42, 5, 6, 7);
    expect(answers).toHaveLength(5);
    expect(new Set(answers).size).toBe(5);
  });

  it('nunca incluye la respuesta correcta y todo es entero positivo', () => {
    // Recorre todas las combinaciones de factores que puede producir el juego.
    for (let f1 = 1; f1 <= 12; f1++) {
      for (let f2 = 1; f2 <= 12; f2++) {
        for (let rep = 0; rep < 10; rep++) {
          const correct = f1 * f2;
          const answers = generateWrongAnswers(correct, 5, f1, f2);
          expect(answers).toHaveLength(5);
          for (const a of answers) {
            expect(a).not.toBe(correct);
            expect(a).toBeGreaterThan(0);
            expect(Number.isInteger(a)).toBe(true);
          }
        }
      }
    }
  });

  it('respeta cantidades distintas de 5', () => {
    expect(generateWrongAnswers(12, 3, 3, 4)).toHaveLength(3);
    expect(generateWrongAnswers(12, 8, 3, 4)).toHaveLength(8);
  });
});
