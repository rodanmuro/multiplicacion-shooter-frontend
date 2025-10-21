/**
 * Servicio para gestionar sesiones de juego con la API
 */

import apiClient from './apiService';
import type { ApiResponse, GameSessionData, FinishSessionPayload, FinishedSessionData } from '../types/api';

export const sessionApiService = {
  /**
   * Crear una nueva sesión de juego
   * @param startedAt Timestamp ISO de inicio de la sesión
   * @returns Datos de la sesión creada
   */
  async createSession(startedAt: string, canvasWidth: number, canvasHeight: number): Promise<GameSessionData> {
    const response = await apiClient.post<ApiResponse<GameSessionData>>(
      '/sessions',
      { started_at: startedAt, canvas_width: Math.round(canvasWidth), canvas_height: Math.round(canvasHeight) }
    );

    return response.data.data;
  },

  /**
   * Finalizar una sesión de juego
   * @param sessionId ID de la sesión
   * @param payload Datos finales de la sesión
   * @returns Sesión actualizada
   */
  async finishSession(sessionId: number, payload: FinishSessionPayload): Promise<FinishedSessionData> {
    const response = await apiClient.put<ApiResponse<FinishedSessionData>>(
      `/sessions/${sessionId}/finish`,
      payload
    );

    return response.data.data;
  },

  /**
   * Obtener una sesión por ID
   * @param sessionId ID de la sesión
   * @returns Datos de la sesión
   */
  async getSession(sessionId: number): Promise<GameSessionData> {
    const response = await apiClient.get<ApiResponse<GameSessionData>>(
      `/sessions/${sessionId}`
    );

    return response.data.data;
  }
};
