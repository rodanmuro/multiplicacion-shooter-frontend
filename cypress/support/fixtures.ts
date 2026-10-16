// Respuestas de ejemplo con la misma forma que devuelve el backend (ver bitácoras 006 y 007).

export function sessionData(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    user_id: 1,
    started_at: '2026-03-01T10:00:00.000000Z',
    finished_at: null,
    final_score: 0,
    max_level_reached: 1,
    duration_seconds: 0,
    canvas_width: 1200,
    canvas_height: 800,
    created_at: '2026-03-01T10:00:00.000000Z',
    updated_at: '2026-03-01T10:00:00.000000Z',
    ...overrides,
  };
}

export function finishedSessionData(overrides: Record<string, unknown> = {}) {
  return sessionData({
    finished_at: '2026-03-01T10:05:00.000000Z',
    final_score: 120,
    max_level_reached: 4,
    duration_seconds: 300,
    total_shots: 37,
    correct_shots: 25,
    wrong_shots: 12,
    accuracy: 67.57,
    ...overrides,
  });
}

export function shotData(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    game_session_id: 7,
    shot_at: '2026-03-01T10:00:15.123Z',
    coordinate_x: 450.5,
    coordinate_y: 320.25,
    factor_1: 1,
    factor_2: 5,
    correct_answer: 5,
    card_value: 5,
    is_correct: true,
    ...overrides,
  };
}

export function userData(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    google_id: '106839451234567890123',
    email: 'estudiante@cevu.edu.co',
    name: 'Ana',
    lastname: 'Pérez',
    picture: null,
    profile: 'student',
    group: '10A2026',
    created_at: '2026-03-01T10:00:00.000000Z',
    updated_at: '2026-03-01T10:00:00.000000Z',
    ...overrides,
  };
}

export const emptyPagination = { current_page: 1, last_page: 1, per_page: 9, total: 0 };
