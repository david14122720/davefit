// ============================================================
// Tipos compartidos del dominio DaveFit
// ============================================================

import type React from 'react';

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

// ---- Rutinas y ejercicios ----

export interface Ejercicio {
  id: string;
  nombre: string;
  descripcion?: string | null;
  grupo_muscular?: string | null;
  nivel?: string | null;
  tipo?: string | null;
  imagen_url?: string | null;
  animacion_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Rutina {
  id: string;
  nombre: string;
  descripcion?: string | null;
  nivel?: string | null;
  duracion_estimada?: number | null;
  imagen_url?: string | null;
  creado_por?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RutinaEjercicio {
  id: string;
  rutina_id: string;
  ejercicio_id: string;
  orden: number;
  repeticiones?: string | null;
  descanso?: string | null;
  ejercicio?: Ejercicio;
}

export interface RutinaConEjercicios extends Rutina {
  rutina_ejercicios?: RutinaEjercicio[];
}

// ---- Yoga ----

export interface YogaPosicion {
  id: string;
  nombre: string;
  nombre_sanscrito?: string | null;
  descripcion?: string | null;
  nivel?: string | null;
  duracion_segundos?: number | null;
  imagen_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RutinaYoga {
  id: string;
  nombre: string;
  descripcion?: string | null;
  nivel?: string | null;
  duracion_estimada?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface RutinaYogaPosicion {
  id: string;
  rutina_id: string;
  posicion_id: string;
  orden: number;
  duracion_segundos?: number | null;
  posicion?: YogaPosicion;
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

// ---- Nutrición ----

export interface NutritionMetrics {
  bmr: number | null;
  tdee: number | null;
  imc: number | null;
  categoriaImc: string;
  caloriasObjetivo: number | null;
  tipoDieta: string;
}

// ---- Leaderboard ----

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url?: string;
  dias_racha: number;
  total_score: number;
  total_workouts: number;
}

// ---- Workout completions ----

export interface WorkoutCompletion {
  id: string;
  user_id: string;
  workout_id: string;
  completed_at: string;
  score_earned: number;
}

// ---- Respuesta de API genérica ----

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface ApiSuccess {
  success: boolean;
  error?: string;
}

// ---- Admin / CRUD ----

export type FormFieldType = 'text' | 'number' | 'select' | 'textarea' | 'file' | 'toggle';

export type AdminFormData = Record<string, string | number | boolean>;

export interface FormField {
    label: string;
    name: string;
    type: FormFieldType;
    options?: { value: string; label: string }[];
    required?: boolean;
    placeholder?: string;
}

export interface AdminCrudTableProps<T> {
    /** Array of items to display */
    data: T[];
    /** Optional table column headings (desktop table mode) */
    columns?: string[];
    /** Render prop for each row/card */
    renderRow: (item: T) => React.ReactNode;
    /** Extracts unique key from each item */
    keyExtractor: (item: T) => string;
    /** Page title (displayed in header) */
    title: string;
    /** Total unfiltered item count (shown in subtitle) */
    itemCount: number;
    /** Loading state */
    loading: boolean;
    /** Current search text */
    search: string;
    /** Search input change handler */
    onSearchChange: (value: string) => void;
    /** Placeholder text for search input */
    searchPlaceholder?: string;
    /** Accent color class (e.g. 'blue', 'purple') */
    accentColor?: string;
    /** Emoji shown in empty state */
    emptyIcon?: string;
    /** Message shown in empty state */
    emptyMessage?: string;
    /** Label for the empty state CTA button */
    emptyActionLabel?: string;
    /** Click handler for empty state CTA */
    onEmptyAction?: () => void;
    /** Label for the "new item" button */
    newButtonLabel?: string;
    /** Click handler for "new item" button */
    onNewClick?: () => void;
}

// ---- Filtros y paginación ----

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface RutinaFilters {
  search?: string;
  nivel?: string;
  tipo?: string;
  lugar?: string;
  duracionMax?: number;
}
