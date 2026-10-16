import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressionManager } from '../../src/managers/ProgressionManager';
import { GAME_CONFIG, PROGRESSION_CONFIG } from '../../src/utils/constants';

describe('ProgressionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T10:00:00Z'));
  });

  describe('niveles', () => {
    it('empieza en nivel 1', () => {
      expect(new ProgressionManager().getCurrentLevel()).toBe(1);
    });

    it.each([
      [0, 1],
      [10, 1],
      [39, 1],
      [40, 2],
      [79, 2],
      [80, 3],
      [400, 11],
      [1000, 26],
    ])('con %i puntos está en nivel %i', (score, level) => {
      const pm = new ProgressionManager();
      pm.updateProgress(score);
      expect(pm.getCurrentLevel()).toBe(level);
    });

    it('un puntaje negativo mantiene el nivel 1', () => {
      const pm = new ProgressionManager();
      pm.updateProgress(-50);
      expect(pm.getCurrentLevel()).toBe(1);
    });

    it('el nivel puede bajar si baja el puntaje', () => {
      const pm = new ProgressionManager();
      pm.updateProgress(120);
      expect(pm.getCurrentLevel()).toBe(4);
      pm.updateProgress(30);
      expect(pm.getCurrentLevel()).toBe(1);
    });
  });

  describe('tabla de multiplicar por nivel', () => {
    it('niveles 1-10 siguen TABLE_ORDER', () => {
      const pm = new ProgressionManager();
      PROGRESSION_CONFIG.TABLE_ORDER.forEach((table, i) => {
        pm.updateProgress(i * PROGRESSION_CONFIG.POINTS_PER_LEVEL);
        expect(pm.getCurrentLevel()).toBe(i + 1);
        expect(pm.getCurrentTable()).toBe(table);
      });
    });

    it('del nivel 11 en adelante rota entre las tablas difíciles', () => {
      const pm = new ProgressionManager();
      const expected: Record<number, number> = {
        11: 6, 12: 7, 13: 8, 14: 9, 15: 6, 16: 7, 18: 9, 19: 6, 20: 7, 21: 8,
      };
      for (const [level, table] of Object.entries(expected)) {
        pm.updateProgress((Number(level) - 1) * PROGRESSION_CONFIG.POINTS_PER_LEVEL);
        expect(pm.getCurrentLevel()).toBe(Number(level));
        expect(pm.getCurrentTable()).toBe(table);
      }
    });
  });

  describe('multiplicador de velocidad', () => {
    const at = (level: number) => {
      const pm = new ProgressionManager();
      pm.updateProgress((level - 1) * PROGRESSION_CONFIG.POINTS_PER_LEVEL);
      return pm.getSpeedMultiplier();
    };

    it('nivel 1 va a velocidad base', () => {
      expect(at(1)).toBe(1.0);
    });

    it('sube 0.11 por nivel hasta el nivel 10', () => {
      expect(at(2)).toBeCloseTo(1.11, 10);
      expect(at(5)).toBeCloseTo(1.44, 10);
      expect(at(10)).toBeCloseTo(1.99, 10);
    });

    it('después del nivel 10 se mantiene constante', () => {
      expect(at(11)).toBeCloseTo(at(10), 10);
      expect(at(40)).toBeCloseTo(at(10), 10);
    });

    it('nunca supera MAX_MULTIPLIER', () => {
      expect(at(100)).toBeLessThanOrEqual(PROGRESSION_CONFIG.SPEED_SCALE.MAX_MULTIPLIER);
    });
  });

  describe('tiempo de sesión', () => {
    it('al crearse lleva 0 ms transcurridos y el total como restante', () => {
      const pm = new ProgressionManager();
      expect(pm.getElapsedTime()).toBe(0);
      expect(pm.getRemainingTime()).toBe(GAME_CONFIG.SESSION_DURATION);
      expect(pm.isSessionComplete()).toBe(false);
    });

    it('calcula transcurrido y restante según el reloj', () => {
      const pm = new ProgressionManager();
      vi.advanceTimersByTime(90_000);
      expect(pm.getElapsedTime()).toBe(90_000);
      expect(pm.getRemainingTime()).toBe(GAME_CONFIG.SESSION_DURATION - 90_000);
    });

    it('la sesión se completa exactamente al cumplir la duración', () => {
      const pm = new ProgressionManager();
      vi.advanceTimersByTime(GAME_CONFIG.SESSION_DURATION - 1);
      expect(pm.isSessionComplete()).toBe(false);
      vi.advanceTimersByTime(1);
      expect(pm.isSessionComplete()).toBe(true);
    });

    it('el tiempo restante no baja de 0', () => {
      const pm = new ProgressionManager();
      vi.advanceTimersByTime(GAME_CONFIG.SESSION_DURATION * 2);
      expect(pm.getRemainingTime()).toBe(0);
    });

    it('reset reinicia nivel y reloj', () => {
      const pm = new ProgressionManager();
      pm.updateProgress(200);
      vi.advanceTimersByTime(60_000);
      pm.reset();
      expect(pm.getCurrentLevel()).toBe(1);
      expect(pm.getElapsedTime()).toBe(0);
    });
  });

  it('getProgressInfo reúne el estado actual', () => {
    const pm = new ProgressionManager();
    pm.updateProgress(85);
    vi.advanceTimersByTime(10_000);
    expect(pm.getProgressInfo()).toEqual({
      level: 3,
      table: 2,
      elapsedTime: 10_000,
      remainingTime: GAME_CONFIG.SESSION_DURATION - 10_000,
      speedMultiplier: pm.getSpeedMultiplier(),
      isComplete: false,
    });
  });
});
