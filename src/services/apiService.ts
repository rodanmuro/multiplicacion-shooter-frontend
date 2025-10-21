import axios, { AxiosError } from 'axios';
import { API_CONFIG } from '../config/api';

/**
 * Cliente HTTP base configurado con Axios
 * Incluye interceptores para autenticación y manejo de errores
 */
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true // Para soportar CORS con credenciales
});

/**
 * Interceptor de Request
 * Agrega el token de autenticación a todas las peticiones
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('google_auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Interceptor de Response
 * Maneja errores globalmente
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // El servidor respondió con un status code fuera del rango 2xx
      console.error(`[API Error ${error.response.status}]`, error.response.data);

      switch (error.response.status) {
        case 401:
          console.warn('Token inválido o expirado. Redirigir a login.');
          // Aquí podríamos limpiar el localStorage y redirigir a login
          // localStorage.removeItem('google_auth_token');
          // window.location.href = '/login';
          break;

        case 403:
          console.warn('Acceso prohibido. Permisos insuficientes.');
          break;

        case 404:
          console.warn('Recurso no encontrado.');
          break;

        case 500:
          console.error('Error interno del servidor.');
          break;

        default:
          console.error('Error desconocido del servidor.');
      }
    } else if (error.request) {
      // La petición fue hecha pero no hubo respuesta
      console.error('[API No Response]', error.request);
      console.error('El servidor no respondió. Verifica tu conexión.');
    } else {
      // Algo pasó al configurar la petición
      console.error('[API Setup Error]', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
