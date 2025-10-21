/**
 * Tipos TypeScript para las respuestas de la API
 */

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Datos del usuario autenticado
 */
export interface UserData {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  profile: 'student' | 'teacher' | 'admin';
  created_at: string;
  updated_at: string;
}

/**
 * Datos de una sesión de juego
 */
export interface GameSessionData {
  id: number;
  user_id: number;
  started_at: string;
  finished_at: string | null;
  final_score: number;
  max_level_reached: number;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

/**
 * Datos de una sesión finalizada con estadísticas
 */
export interface FinishedSessionData extends GameSessionData {
  total_shots: number;
  correct_shots: number;
  wrong_shots: number;
  accuracy: number;
}

/**
 * Datos de un disparo
 */
export interface ShotData {
  id: number;
  game_session_id: number;
  shot_at: string;
  coordinate_x: number;
  coordinate_y: number;
  factor_1: number;
  factor_2: number;
  correct_answer: number;
  card_value: number;
  is_correct: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Payload para registrar un disparo
 */
export interface RecordShotPayload {
  shot_at: string;
  coordinate_x: number;
  coordinate_y: number;
  factor_1: number;
  factor_2: number;
  correct_answer: number;
  card_value: number;
  is_correct: boolean;
}

/**
 * Payload para finalizar una sesión
 */
export interface FinishSessionPayload {
  finished_at: string;
  final_score: number;
  max_level_reached: number;
  duration_seconds: number;
}

/**
 * Item de la lista de sesiones
 */
export interface SessionListItem {
  id: number;
  started_at: string;
  finished_at: string;
  final_score: number;
  max_level_reached: number;
  duration_seconds: number;
  total_shots: number;
  correct_shots: number;
  accuracy: number;
}

/**
 * Detalle de una sesión con disparos
 */
export interface SessionDetail {
  session: SessionListItem;
  shots: ShotData[];
}

/**
 * Estadísticas generales del usuario
 */
export interface UserStats {
  total_sessions: number;
  total_shots: number;
  total_correct: number;
  total_wrong: number;
  overall_accuracy: number;
  average_score: number;
  best_score: number;
  total_playtime_minutes: number;
}

/**
 * Estadística de una tabla de multiplicar
 */
export interface TableStat {
  table: number;
  total_attempts: number;
  correct_attempts: number;
  wrong_attempts: number;
  accuracy: number;
}
