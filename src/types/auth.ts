/**
 * Tipos relacionados con autenticación OAuth de Google
 */

/**
 * Información del usuario de Google
 */
export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  profile: 'student' | 'teacher' | 'admin';
}

/**
 * Respuesta de Google OAuth
 */
export interface GoogleCredentialResponse {
  credential: string;  // JWT token de Google
  select_by?: string;
  clientId?: string;
}

/**
 * Token decodificado de Google (payload del JWT)
 */
export interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
}

/**
 * Estado de autenticación en la aplicación
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: GoogleUser | null;
  token: string | null;
}
