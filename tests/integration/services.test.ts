import { describe, expect, it } from 'vitest';
import { authApiService } from '../../src/services/authApiService';
import { sessionApiService } from '../../src/services/sessionApiService';
import { shotApiService } from '../../src/services/shotApiService';
import { mockApi } from '../helpers/mockAdapter';

describe('authApiService', () => {
  it('verifyGoogleToken hace POST /auth/verify con el token y devuelve el usuario', async () => {
    const user = { id: 1, email: 'a@b.co', profile: 'student' };
    const calls = mockApi({ data: { success: true, data: user } });

    const result = await authApiService.verifyGoogleToken('jwt-de-google');

    expect(calls[0].method).toBe('post');
    expect(calls[0].url).toBe('/auth/verify');
    expect(JSON.parse(calls[0].data)).toEqual({ token: 'jwt-de-google' });
    expect(result).toEqual(user);
  });
});

describe('sessionApiService', () => {
  it('createSession hace POST /sessions con inicio y dimensiones del canvas', async () => {
    const session = { id: 7 };
    const calls = mockApi({ status: 201, data: { success: true, data: session } });

    const result = await sessionApiService.createSession('2026-03-01T10:00:00.000Z', 1200, 800);

    expect(calls[0].method).toBe('post');
    expect(calls[0].url).toBe('/sessions');
    expect(JSON.parse(calls[0].data)).toEqual({
      started_at: '2026-03-01T10:00:00.000Z',
      canvas_width: 1200,
      canvas_height: 800,
    });
    expect(result).toEqual(session);
  });

  it('createSession redondea las dimensiones del canvas', async () => {
    const calls = mockApi({ data: { data: {} } });

    await sessionApiService.createSession('2026-03-01T10:00:00.000Z', 1199.6, 800.4);

    expect(JSON.parse(calls[0].data)).toMatchObject({ canvas_width: 1200, canvas_height: 800 });
  });

  it('finishSession hace PUT /sessions/{id}/finish con el payload', async () => {
    const finished = { id: 7, total_shots: 10, accuracy: 70 };
    const calls = mockApi({ data: { success: true, data: finished } });
    const payload = {
      finished_at: '2026-03-01T10:05:00.000Z',
      final_score: 120,
      max_level_reached: 4,
      duration_seconds: 300,
    };

    const result = await sessionApiService.finishSession(7, payload);

    expect(calls[0].method).toBe('put');
    expect(calls[0].url).toBe('/sessions/7/finish');
    expect(JSON.parse(calls[0].data)).toEqual(payload);
    expect(result).toEqual(finished);
  });

  it('getSession hace GET /sessions/{id}', async () => {
    const calls = mockApi({ data: { data: { id: 7 } } });

    const result = await sessionApiService.getSession(7);

    expect(calls[0].method).toBe('get');
    expect(calls[0].url).toBe('/sessions/7');
    expect(result).toEqual({ id: 7 });
  });

  describe('getSessions', () => {
    const response = { success: true, data: [], pagination: { total: 0 } };

    it('por defecto pide la página 1 sin filtros', async () => {
      const calls = mockApi({ data: response });

      const result = await sessionApiService.getSessions();

      expect(calls[0].method).toBe('get');
      expect(calls[0].url).toBe('/sessions?page=1');
      expect(result).toEqual(response);
    });

    it('agrega min_score y date_from cuando tienen valor', async () => {
      const calls = mockApi({ data: response });

      await sessionApiService.getSessions(2, 1000, '2026-01-01');

      expect(calls[0].url).toBe('/sessions?page=2&min_score=1000&date_from=2026-01-01');
    });

    it('omite min_score cuando es 0', async () => {
      const calls = mockApi({ data: response });

      await sessionApiService.getSessions(1, 0, '2026-01-01');

      expect(calls[0].url).toBe('/sessions?page=1&date_from=2026-01-01');
    });

    it('omite date_from cuando está vacío', async () => {
      const calls = mockApi({ data: response });

      await sessionApiService.getSessions(3, 500, '');

      expect(calls[0].url).toBe('/sessions?page=3&min_score=500');
    });
  });

  it('getSessionDetail hace GET /sessions/{id} y devuelve sesión + disparos', async () => {
    const detail = { session: { id: 7 }, shots: [{ id: 1 }] };
    const calls = mockApi({ data: { success: true, data: detail } });

    const result = await sessionApiService.getSessionDetail(7);

    expect(calls[0].url).toBe('/sessions/7');
    expect(result).toEqual(detail);
  });
});

describe('shotApiService', () => {
  it('recordShot hace POST /sessions/{id}/shots con el payload', async () => {
    const shot = { id: 99, is_correct: true };
    const calls = mockApi({ status: 201, data: { success: true, data: shot } });
    const payload = {
      shot_at: '2026-03-01T10:00:15.123Z',
      coordinate_x: 450.5,
      coordinate_y: 320.25,
      factor_1: 7,
      factor_2: 6,
      correct_answer: 42,
      card_value: 42,
      is_correct: true,
    };

    const result = await shotApiService.recordShot(9, payload);

    expect(calls[0].method).toBe('post');
    expect(calls[0].url).toBe('/sessions/9/shots');
    expect(JSON.parse(calls[0].data)).toEqual(payload);
    expect(result).toEqual(shot);
  });
});
