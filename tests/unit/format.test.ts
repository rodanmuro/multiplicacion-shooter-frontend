import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDate,
  formatDateTime,
  formatDurationMMSS,
  formatTime,
} from '../../src/utils/format';

describe('format', () => {
  describe('formatDurationMMSS', () => {
    it.each([
      [0, '00:00'],
      [7, '00:07'],
      [65, '01:05'],
      [300, '05:00'],
      [3599, '59:59'],
      [3600, '60:00'],
    ])('%i s → %s', (s, text) => {
      expect(formatDurationMMSS(s)).toBe(text);
    });
  });

  describe('formatClock', () => {
    it.each([
      [0, '0:00'],
      [9, '0:09'],
      [65, '1:05'],
      [300, '5:00'],
    ])('%i s → %s', (s, text) => {
      expect(formatClock(s)).toBe(text);
    });
  });

  describe('fechas (siempre es-ES, independientes del idioma del navegador)', () => {
    // Fecha local para que la prueba no dependa de la zona horaria
    const d = new Date(2026, 2, 5, 14, 7);

    it('formatDate es dd/mm/aaaa', () => {
      expect(formatDate(d)).toBe('05/03/2026');
    });

    it('formatTime es hh:mm de 24 horas', () => {
      expect(formatTime(d)).toBe('14:07');
      expect(formatTime(new Date(2026, 2, 5, 9, 3))).toBe('09:03');
    });

    it('formatDateTime une fecha y hora', () => {
      expect(formatDateTime(d)).toBe('05/03/2026 14:07');
    });

    it('acepta cadenas ISO', () => {
      expect(formatDate(d.toISOString())).toBe('05/03/2026');
    });
  });
});
