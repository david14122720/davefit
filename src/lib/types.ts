export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string
          email: string
          nombre_completo: string | null
          avatar_url: string | null
          fecha_nacimiento: string | null
          genero: 'masculino' | 'femenino' | 'otro' | null
          peso_actual: number | null
          altura: number | null
          objetivo: 'mantener_forma' | 'tonificar' | 'ganar_fuerza' | null
          nivel: 'principiante' | 'intermedio' | 'avanzado' | null
          preferencia_lugar: 'casa' | 'gimnasio' | 'ambos' | null
          rol: 'usuario' | 'admin'
          dias_entrenamiento_semana: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nombre_completo?: string | null
          avatar_url?: string | null
          fecha_nacimiento?: string | null
          genero?: 'masculino' | 'femenino' | 'otro' | null
          peso_actual?: number | null
          altura?: number | null
          objetivo?: 'mantener_forma' | 'tonificar' | 'ganar_fuerza' | null
          nivel?: 'principiante' | 'intermedio' | 'avanzado' | null
          preferencia_lugar?: 'casa' | 'gimnasio' | 'ambos' | null
          rol?: 'usuario' | 'admin'
          dias_entrenamiento_semana?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre_completo?: string | null
          avatar_url?: string | null
          fecha_nacimiento?: string | null
          genero?: 'masculino' | 'femenino' | 'otro' | null
          peso_actual?: number | null
          altura?: number | null
          objetivo?: 'mantener_forma' | 'tonificar' | 'ganar_fuerza' | null
          nivel?: 'principiante' | 'intermedio' | 'avanzado' | null
          preferencia_lugar?: 'casa' | 'gimnasio' | 'ambos' | null
          rol?: 'usuario' | 'admin'
          dias_entrenamiento_semana?: number
          created_at?: string
          updated_at?: string
        }
      }
      ejercicios: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          musculos_principales: string[] | null
          musculos_secundarios: string[] | null
          equipo_necesario: string[] | null
          video_url: string | null
          imagen_url: string | null
          tipo_lugar: 'casa' | 'gimnasio' | 'ambos'
          nivel: 'principiante' | 'intermedio' | 'avanzado'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          musculos_principales?: string[] | null
          musculos_secundarios?: string[] | null
          equipo_necesario?: string[] | null
          video_url?: string | null
          imagen_url?: string | null
          tipo_lugar: 'casa' | 'gimnasio' | 'ambos'
          nivel: 'principiante' | 'intermedio' | 'avanzado'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          musculos_principales?: string[] | null
          musculos_secundarios?: string[] | null
          equipo_necesario?: string[] | null
          video_url?: string | null
          imagen_url?: string | null
          tipo_lugar?: 'casa' | 'gimnasio' | 'ambos'
          nivel?: 'principiante' | 'intermedio' | 'avanzado'
          created_at?: string
          updated_at?: string
        }
      }
      rutinas: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          creado_por: string | null
          es_publica: boolean
          nivel: 'principiante' | 'intermedio' | 'avanzado'
          tipo_lugar: 'casa' | 'gimnasio' | 'ambos'
          duracion_estimada: number | null
          dias_por_semana: number
          objetivo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          creado_por?: string | null
          es_publica?: boolean
          nivel: 'principiante' | 'intermedio' | 'avanzado'
          tipo_lugar: 'casa' | 'gimnasio' | 'ambos'
          duracion_estimada?: number | null
          dias_por_semana?: number
          objetivo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          creado_por?: string | null
          es_publica?: boolean
          nivel?: 'principiante' | 'intermedio' | 'avanzado'
          tipo_lugar?: 'casa' | 'gimnasio' | 'ambos'
          duracion_estimada?: number | null
          dias_por_semana?: number
          objetivo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rutinas_ejercicios: {
        Row: {
          id: string
          rutina_id: string
          ejercicio_id: string
          orden: number
          series: number
          repeticiones: string | null
          descanso_segundos: number
        }
        Insert: {
          id?: string
          rutina_id: string
          ejercicio_id: string
          orden: number
          series?: number
          repeticiones?: string | null
          descanso_segundos?: number
        }
        Update: {
          id?: string
          rutina_id?: string
          ejercicio_id?: string
          orden?: number
          series?: number
          repeticiones?: string | null
          descanso_segundos?: number
        }
      }
      historial_entrenamientos: {
        Row: {
          id: string
          usuario_id: string
          rutina_id: string | null
          fecha: string
          duracion_minutos: number | null
          calorias_quemadas: number | null
          percibe_esfuerzo: number | null
          comentarios: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          rutina_id?: string | null
          fecha?: string
          duracion_minutos?: number | null
          calorias_quemadas?: number | null
          percibe_esfuerzo?: number | null
          comentarios?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          rutina_id?: string | null
          fecha?: string
          duracion_minutos?: number | null
          calorias_quemadas?: number | null
          percibe_esfuerzo?: number | null
          comentarios?: string | null
          created_at?: string
        }
      }
      favoritos_rutinas: {
        Row: {
          id: string
          usuario_id: string
          rutina_id: string
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          rutina_id: string
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          rutina_id?: string
          created_at?: string
        }
      }
    }
  }
}

export type Perfil = Database['public']['Tables']['perfiles']['Row']
export type Ejercicio = Database['public']['Tables']['ejercicios']['Row']
export type Rutina = Database['public']['Tables']['rutinas']['Row']
export type RutinaEjercicio = Database['public']['Tables']['rutinas_ejercicios']['Row']
export type HistorialEntrenamiento = Database['public']['Tables']['historial_entrenamientos']['Row']
export type FavoritoRutina = Database['public']['Tables']['favoritos_rutinas']['Row']
