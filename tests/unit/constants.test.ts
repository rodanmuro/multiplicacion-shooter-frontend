import { describe, expect, it } from 'vitest';
import { CARD_CONFIG, DIFFICULTY_CONFIG, GAME_CONFIG, PROGRESSION_CONFIG } from '../../src/utils/constants';

// Solo invariantes: los valores de ajuste fino (velocidades, intervalos) cambian
// con el diseño del juego y no se fijan aquí.
describe('invariantes de configuración', () => {
  it('TABLE_ORDER contiene cada tabla del 1 al 10 exactamente una vez', () => {
    expect([...PROGRESSION_CONFIG.TABLE_ORDER].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('HARD_TABLES está incluido en TABLE_ORDER', () => {
    for (const t of PROGRESSION_CONFIG.HARD_TABLES) {
      expect(PROGRESSION_CONFIG.TABLE_ORDER).toContain(t);
    }
  });

  it('los rangos de dificultad son crecientes', () => {
    const { easy, medium, hard } = DIFFICULTY_CONFIG;
    expect(easy.maxFactor).toBeLessThan(medium.maxFactor);
    expect(medium.maxFactor).toBeLessThan(hard.maxFactor);
  });

  it('las velocidades de tarjeta son coherentes', () => {
    expect(CARD_CONFIG.MIN_SPEED).toBeGreaterThan(0);
    expect(CARD_CONFIG.MAX_SPEED).toBeGreaterThanOrEqual(CARD_CONFIG.MIN_SPEED);
    expect(CARD_CONFIG.CORRECT_CARD_PROBABILITY).toBeGreaterThan(0);
    expect(CARD_CONFIG.CORRECT_CARD_PROBABILITY).toBeLessThan(1);
  });

  it('la sesión dura 5 minutos', () => {
    expect(GAME_CONFIG.SESSION_DURATION).toBe(5 * 60 * 1000);
  });
});
