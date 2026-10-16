import { describe, expect, it } from 'vitest';
import { QuestionGenerator } from '../../src/systems/QuestionGenerator';
import { Difficulty } from '../../src/types';

const REPS = 300;

describe('QuestionGenerator', () => {
  it('no tiene pregunta actual hasta que se genera la primera', () => {
    expect(new QuestionGenerator().getCurrentQuestion()).toBeNull();
  });

  it('la respuesta correcta siempre es el producto de los factores', () => {
    const gen = new QuestionGenerator();
    for (let i = 0; i < REPS; i++) {
      const q = gen.generateQuestion();
      expect(q.correctAnswer).toBe(q.factor1 * q.factor2);
    }
  });

  it('getCurrentQuestion devuelve la última pregunta generada', () => {
    const gen = new QuestionGenerator();
    const q = gen.generateQuestion();
    expect(gen.getCurrentQuestion()).toBe(q);
    const q2 = gen.generateQuestion();
    expect(gen.getCurrentQuestion()).toBe(q2);
  });

  describe('modo por dificultad (sin tabla específica)', () => {
    it('usa MEDIUM (factores 1-10) por defecto', () => {
      const gen = new QuestionGenerator();
      expect(gen.getDifficulty()).toBe(Difficulty.MEDIUM);
      for (let i = 0; i < REPS; i++) {
        const q = gen.generateQuestion();
        expect(q.factor1).toBeGreaterThanOrEqual(1);
        expect(q.factor1).toBeLessThanOrEqual(10);
        expect(q.factor2).toBeGreaterThanOrEqual(1);
        expect(q.factor2).toBeLessThanOrEqual(10);
      }
    });

    it('EASY usa factores 1-5', () => {
      const gen = new QuestionGenerator(Difficulty.EASY);
      for (let i = 0; i < REPS; i++) {
        const q = gen.generateQuestion();
        expect(Math.max(q.factor1, q.factor2)).toBeLessThanOrEqual(5);
        expect(Math.min(q.factor1, q.factor2)).toBeGreaterThanOrEqual(1);
      }
    });

    it('HARD usa factores 1-12', () => {
      const gen = new QuestionGenerator(Difficulty.HARD);
      let sawAbove10 = false;
      for (let i = 0; i < REPS; i++) {
        const q = gen.generateQuestion();
        expect(Math.max(q.factor1, q.factor2)).toBeLessThanOrEqual(12);
        if (q.factor1 > 10 || q.factor2 > 10) sawAbove10 = true;
      }
      expect(sawAbove10).toBe(true);
    });

    it('setDifficulty cambia el rango en caliente', () => {
      const gen = new QuestionGenerator(Difficulty.HARD);
      gen.setDifficulty(Difficulty.EASY);
      expect(gen.getDifficulty()).toBe(Difficulty.EASY);
      for (let i = 0; i < REPS; i++) {
        expect(gen.generateQuestion().factor1).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('modo tabla específica', () => {
    it('factor1 es la tabla y factor2 va de 1 a 10', () => {
      const gen = new QuestionGenerator();
      gen.setSpecificTable(7);
      expect(gen.getSpecificTable()).toBe(7);
      for (let i = 0; i < REPS; i++) {
        const q = gen.generateQuestion();
        expect(q.factor1).toBe(7);
        expect(q.factor2).toBeGreaterThanOrEqual(1);
        expect(q.factor2).toBeLessThanOrEqual(10);
        expect(q.correctAnswer).toBe(7 * q.factor2);
      }
    });

    it('la tabla específica ignora la dificultad, aun siendo EASY', () => {
      const gen = new QuestionGenerator(Difficulty.EASY);
      gen.setSpecificTable(9);
      for (let i = 0; i < REPS; i++) {
        expect(gen.generateQuestion().factor1).toBe(9);
      }
    });

    it('setSpecificTable(null) vuelve al modo por dificultad', () => {
      const gen = new QuestionGenerator(Difficulty.EASY);
      gen.setSpecificTable(9);
      gen.setSpecificTable(null);
      expect(gen.getSpecificTable()).toBeNull();
      for (let i = 0; i < REPS; i++) {
        expect(gen.generateQuestion().factor1).toBeLessThanOrEqual(5);
      }
    });
  });
});
