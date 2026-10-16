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

/* ------------------------------------------------------------------ */
/* Estadísticas del estudiante y panel de administración                */
/* ------------------------------------------------------------------ */

/** Fila del historial del estudiante (GET /sessions). */
export function listSession(overrides: Record<string, unknown> = {}) {
  return sessionData({
    finished_at: '2026-03-01T15:35:00.000000Z',
    final_score: 1250,
    max_level_reached: 4,
    duration_seconds: 300,
    total_shots: 40,
    correct_shots: 29,
    wrong_shots: 11,
    accuracy: 72.5,
    started_at: '2026-03-01T15:30:00.000000Z',
    ...overrides,
  });
}

/** `count` sesiones con ids 1..count, de la más reciente a la más antigua y puntajes distintos. */
export function listSessions(count: number) {
  return Array.from({ length: count }, (_, i) =>
    listSession({
      id: count - i,
      started_at: `2026-03-${String(28 - i).padStart(2, '0')}T15:30:00.000000Z`,
      final_score: 2000 - i * 100,
      max_level_reached: 6 - (i % 4),
      total_shots: 40 + i,
      correct_shots: 30 + i,
      wrong_shots: 10,
      accuracy: [72.5, 91.2, 55.0, 70.0, 69.9][i % 5],
    })
  );
}

export function shotsOf(count: number) {
  return Array.from({ length: count }, (_, i) => shotData({ id: i + 1, is_correct: i % 2 === 0 }));
}

/** Usuario de la lista de administración (GET /admin/users). */
export function adminUser(overrides: Record<string, unknown> = {}) {
  return userData({
    id: 1,
    email: 'ana.perez@cevu.edu.co',
    name: 'Ana',
    lastname: 'Pérez',
    group: '10A2026',
    game_sessions_count: 12,
    avg_score: 1432.5,
    best_score: 2100,
    last_played_at: '2026-03-20T15:30:00.000000Z',
    ...overrides,
  });
}

/** `count` usuarios con ids 1..count. */
export function adminUsers(count: number) {
  return Array.from({ length: count }, (_, i) =>
    adminUser({
      id: i + 1,
      email: `estudiante${i + 1}@cevu.edu.co`,
      name: `Nombre${i + 1}`,
      lastname: `Apellido${i + 1}`,
      group: ['10A2026', '10B2026', '11A2026'][i % 3],
      game_sessions_count: i + 1,
      avg_score: 1000 + i * 25.5,
      best_score: 1500 + i * 10,
    })
  );
}

/** Sesión en la vista de administración (GET /admin/users/{id}/sessions). */
export function adminSessionRow(row: number, overrides: Record<string, unknown> = {}) {
  return {
    ...listSession({ id: 100 + row }),
    row_number: row,
    started_at: `2026-03-${String(30 - row).padStart(2, '0')}T15:30:00.000000Z`,
    final_score: 2000 - row * 150,
    max_level_reached: 5,
    total_shots: 50,
    correct_shots: 40,
    accuracy: [95, 82, 80, 79.99, 61, 60, 41.5, 90][row % 8],
    ...overrides,
  };
}

export function adminSessionSummary(overrides: Record<string, unknown> = {}) {
  return {
    total_sessions: 9,
    avg_score: 1100,
    best_score: 1850,
    total_playtime_minutes: 45,
    first_session: '2026-01-10T15:30:00.000000Z',
    last_session: '2026-03-20T15:30:00.000000Z',
    ...overrides,
  };
}
