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
  google_id: string | null;
  email: string;
  name: string;
  lastname: string | null;
  picture: string | null;
  profile: 'student' | 'teacher' | 'admin';
  group: string | null;
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
  canvas_width: number;
  canvas_height: number;
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
 * Item de la lista de sesiones (con estadísticas calculadas)
 */
export interface SessionListItem {
  id: number;
  user_id: number;
  started_at: string;
  finished_at: string | null;
  final_score: number;
  max_level_reached: number;
  duration_seconds: number;
  canvas_width: number;
  canvas_height: number;
  total_shots: number;
  correct_shots: number;
  wrong_shots: number;
  accuracy: number;
  created_at: string;
  updated_at: string;
}

/**
 * Información de paginación
 */
export interface PaginationInfo {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Respuesta paginada de sesiones
 */
export interface SessionsResponse {
  success: boolean;
  data: SessionListItem[];
  pagination: PaginationInfo;
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

/**
 * Usuario en la lista de administración (con conteo de sesiones y estadísticas)
 */
export interface AdminUserListItem extends UserData {
  game_sessions_count: number;
  avg_score: number | null;
  best_score: number | null;
  last_played_at: string | null;
}

/**
 * Filtros aplicados en la respuesta
 */
export interface AdminFiltersApplied {
  group: string | null;
  profile: string | null;
  search: string | null;
}

/**
 * Paginación extendida con from/to
 */
export interface PaginationInfoExtended extends PaginationInfo {
  from: number | null;
  to: number | null;
}

/**
 * Respuesta de lista de usuarios (admin)
 */
export interface AdminUsersResponse {
  success: boolean;
  data: AdminUserListItem[];
  pagination: PaginationInfoExtended;
  filters_applied: AdminFiltersApplied;
}

/**
 * Respuesta de lista de grupos
 */
export interface AdminGroupsResponse {
  success: boolean;
  data: string[];
}

/**
 * Resumen de estadísticas de sesiones de un usuario
 */
export interface UserSessionSummary {
  total_sessions: number;
  avg_score: number;
  best_score: number;
  total_playtime_minutes: number;
  first_session: string | null;
  last_session: string | null;
}

/**
 * Sesión con número de fila
 */
export interface SessionListItemWithRow extends SessionListItem {
  row_number: number;
}

/**
 * Filtros de fecha aplicados
 */
export interface DateFiltersApplied {
  date_from: string | null;
  date_to: string | null;
}

/**
 * Respuesta de sesiones de un usuario específico (admin)
 */
export interface AdminUserSessionsResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    lastname: string | null;
    profile: string;
    group: string | null;
  };
  summary: UserSessionSummary;
  data: SessionListItemWithRow[];
  pagination: PaginationInfoExtended;
  filters_applied: DateFiltersApplied;
}

/**
 * Respuesta de carga de CSV
 */
export interface CsvUploadResponse {
  success: boolean;
  message: string;
  stats: {
    created: number;
    updated: number;
    errors: number;
  };
  error_details: string[];
}

/**
 * Parámetros de filtro para listar usuarios
 */
export interface AdminUsersFilterParams {
  page?: number;
  group?: string;
  profile?: string;
  search?: string;
  per_page?: number;
  sort_by?: 'email' | 'name' | 'group' | 'sessions_count' | 'created_at';
  order?: 'asc' | 'desc';
}

/**
 * Parámetros de filtro para sesiones de usuario
 */
export interface AdminSessionsFilterParams {
  page?: number;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}
