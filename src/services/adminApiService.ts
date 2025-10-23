import type {
  AdminUsersResponse,
  AdminUserSessionsResponse,
  CsvUploadResponse,
} from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Servicio para llamadas a la API de administración
 */
class AdminApiService {
  /**
   * Obtiene el token de autenticación desde localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('google_auth_token');
  }

  /**
   * Lista todos los usuarios del sistema (solo admin)
   */
  async listUsers(page: number = 1): Promise<AdminUsersResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_URL}/admin/users?page=${page}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener usuarios');
    }

    return response.json();
  }

  /**
   * Obtiene las sesiones de un usuario específico (solo admin)
   */
  async getUserSessions(
    userId: number,
    page: number = 1
  ): Promise<AdminUserSessionsResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(
      `${API_URL}/admin/users/${userId}/sessions?page=${page}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener sesiones del usuario');
    }

    return response.json();
  }

  /**
   * Carga masiva de usuarios desde CSV (solo admin)
   */
  async uploadCsv(file: File): Promise<CsvUploadResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/admin/users/upload-csv`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg = errorData.message
        ? `${errorData.error}: ${errorData.message}`
        : errorData.error || 'Error al cargar CSV';
      throw new Error(errorMsg);
    }

    return response.json();
  }
}

export const adminApiService = new AdminApiService();
