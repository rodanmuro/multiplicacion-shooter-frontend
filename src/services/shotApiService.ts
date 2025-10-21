import apiClient from './apiService';
import type { ApiResponse, ShotData, RecordShotPayload } from '../types/api';

/**
 * Servicio para registrar disparos en el backend
 */
export const shotApiService = {
  /**
   * Registrar un disparo en una sesión
   * @param sessionId ID de la sesión
   * @param payload Datos del disparo
   * @returns Disparo registrado
   */
  async recordShot(sessionId: number, payload: RecordShotPayload): Promise<ShotData> {
    const response = await apiClient.post<ApiResponse<ShotData>>(
      `/sessions/${sessionId}/shots`,
      payload
    );

    return response.data.data;
  }
};

