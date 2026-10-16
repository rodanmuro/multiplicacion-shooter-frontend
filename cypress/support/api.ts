import { emptyPagination, finishedSessionData, sessionData, shotData } from './fixtures';

export interface GameApiOptions {
  sessionId?: number;
  /** POST /sessions falla con 500 (el juego debe seguir sin sincronizar). */
  createFails?: boolean;
  /** PUT /sessions/{id}/finish falla con 500 (resumen local). */
  finishFails?: boolean;
  /** Estadísticas que devuelve el backend al finalizar. */
  finishStats?: Record<string, unknown>;
}

/**
 * Simula los endpoints que usa una partida. Alias: createSession, recordShot, finishSession.
 * Usa pathname + método para no confundir /sessions con /sessions?page=1.
 */
export function stubGameApi(options: GameApiOptions = {}): void {
  const { sessionId = 7, createFails = false, finishFails = false, finishStats = {} } = options;

  cy.intercept(
    { method: 'POST', pathname: '/api/sessions' },
    createFails
      ? { statusCode: 500, body: { success: false, error: 'Error simulado' } }
      : { statusCode: 201, body: { success: true, data: sessionData({ id: sessionId }) } }
  ).as('createSession');

  cy.intercept(
    { method: 'POST', pathname: `/api/sessions/${sessionId}/shots` },
    { statusCode: 201, body: { success: true, data: shotData({ game_session_id: sessionId }) } }
  ).as('recordShot');

  cy.intercept({ method: 'PUT', pathname: `/api/sessions/${sessionId}/finish` }, (req) => {
    if (finishFails) {
      req.reply({ statusCode: 500, body: { success: false, error: 'Error simulado' } });
      return;
    }
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: finishedSessionData({ id: sessionId, ...req.body, ...finishStats }),
      },
    });
  }).as('finishSession');
}

/** Historial vacío para cuando una prueba solo necesita que StatsScene no falle. */
export function stubEmptyHistory(): void {
  cy.intercept(
    { method: 'GET', pathname: '/api/sessions' },
    { statusCode: 200, body: { success: true, data: [], pagination: emptyPagination } }
  ).as('getSessions');
}
