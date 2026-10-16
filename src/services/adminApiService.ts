import type {
  AdminUsersResponse,
  AdminUserSessionsResponse,
  AdminGroupsResponse,
  CsvUploadResponse,
  AdminUsersFilterParams,
  AdminSessionsFilterParams,
} from '../types/api';
import { downloadBlob, filenameFromContentDisposition } from '../utils/download';

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
   * Construye query string desde un objeto de parámetros
   */
  private buildQueryString(
    params: AdminUsersFilterParams | AdminSessionsFilterParams
  ): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Obtiene la lista de grupos únicos
   */
  async getGroups(): Promise<AdminGroupsResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_URL}/admin/groups`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener grupos');
    }

    return response.json();
  }

  /**
   * Lista todos los usuarios del sistema con filtros (solo admin)
   */
  async listUsers(params: AdminUsersFilterParams = {}): Promise<AdminUsersResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const queryString = this.buildQueryString(params);
    const response = await fetch(`${API_URL}/admin/users${queryString}`, {
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
   * Obtiene las sesiones de un usuario específico con filtros (solo admin)
   */
  async getUserSessions(
    userId: number,
    params: AdminSessionsFilterParams = {}
  ): Promise<AdminUserSessionsResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const queryString = this.buildQueryString(params);
    const response = await fetch(
      `${API_URL}/admin/users/${userId}/sessions${queryString}`,
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

  /**
   * Exporta la lista de usuarios a CSV
   */
  async exportUsers(params: AdminUsersFilterParams = {}): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const queryString = this.buildQueryString(params);
    const response = await fetch(`${API_URL}/admin/export/users${queryString}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al exportar usuarios');
    }

    // Descargar el archivo
    const blob = await response.blob();
    const filename = filenameFromContentDisposition(
      response.headers.get('Content-Disposition'),
      'usuarios.csv'
    );
    downloadBlob(blob, filename);
  }

  /**
   * Exporta las sesiones de un usuario a CSV
   */
  async exportUserSessions(
    userId: number,
    params: AdminSessionsFilterParams = {}
  ): Promise<void> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const queryString = this.buildQueryString(params);
    const response = await fetch(
      `${API_URL}/admin/export/users/${userId}/sessions${queryString}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al exportar sesiones');
    }

    // Descargar el archivo
    const blob = await response.blob();
    const filename = filenameFromContentDisposition(
      response.headers.get('Content-Disposition'),
      'sesiones.csv'
    );
    downloadBlob(blob, filename);
  }
}

export const adminApiService = new AdminApiService();
