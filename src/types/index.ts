// ============================================================
// Tipos compartidos del dominio DaveFit
// ============================================================

// ---- Perfil de usuario ----

export interface Perfil {
  id: string;
  email?: string | null;
  nombre_completo?: string | null;
  avatar_url?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  peso_actual?: number | null;
  altura?: number | null;
  objetivo?: string | null;
  nivel?: string | null;
  preferencia_lugar?: string | null;
  rol?: string | null;
  dias_entrenamiento_semana?: number | null;
  onboarding_completado?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ---- Estadísticas de usuario (tabla user_stats) ----

export interface UserStats {
  id: string;
  user_id: string;
  xp_total: number;
  nivel: number;
  dias_racha: number;
  ultimo_entreno: string | null;
  racha_bonus: number;
  total_workouts: number;
  longest_streak: number;
  weekly_score: number;
  monthly_score: number;
  created_at: string;
  updated_at: string;
}

// ---- XP & Gamificación ----

export interface XpCalculation {
  xp_ganado: number;
  nivel_anterior: number;
  nivel_nuevo: number;
  subio_nivel: boolean;
  xp_para_siguiente_nivel: number;
  xp_en_nivel_actual: number;
}

// ---- Historial de entrenamientos ----

export interface HistorialEntrenamiento {
  id: string;
  usuario_id: string;
  rutina_id?: string | null;
  tipo: string;
  duracion_real: number;
  calorias_quemadas?: number | null;
  fecha: string;
  created_at?: string;
  rutinas?: { nombre: string } | null;
}

/**
 * Pile former members removed (2026-11-01 cleanup):
 * Rutina, YogaPosicion, RutinaYoga, RutinaYogaPosicion, NutritionMetrics,
 * LeaderboardEntry, WorkoutCompletion, ApiResponse, ApiSuccess,
 * PaginationParams, RutinaFilters — they were defined but never imported.
 * Domain owners now: rutinasApi.ts / yogaAdminApi.ts / lib/nutrition.ts.
 */
