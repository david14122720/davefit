import { insforge } from '../../lib/insforge';
import { recordWorkoutCompletion } from '../../lib/stats';

// Types
export interface PosicionYoga {
    id: string;
    nombre: string;
    nombre_sanscrito?: string | null;
    descripcion?: string | null;
    instrucciones?: string[] | null;
    beneficios?: string[] | null;
    nivel: 'principiante' | 'intermedio' | 'avanzado';
    duracion_segundos_sugerida?: number | null;
    imagen_url?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface RutinaYoga {
    id: string;
    nombre: string;
    descripcion?: string | null;
    nivel: 'principiante' | 'intermedio' | 'avanzado';
    objetivo?: 'flexibilidad' | 'fuerza' | 'relajacion' | null;
    duracion_minutos: number;
    posiciones?: PosicionRutina[];
    created_at?: string;
    updated_at?: string;
}

export interface PosicionRutina {
    id: string;
    rutina_id: string;
    posicion_id: string;
    orden: number;
    duracion_segundos?: number | null;
    posicion?: PosicionYoga;
}

export interface ProgresoYoga {
    id: string;
    user_id: string;
    rutina_id: string;
    completado?: boolean | null;
    fecha_completado?: string | null;
    duracion_real_segundos?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface FiltrosRutina {
    nivel?: 'principiante' | 'intermedio' | 'avanzado';
    objetivo?: 'flexibilidad' | 'fuerza' | 'relajacion';
    duracion_max?: number;
}

// API Functions

/**
 * Obtiene todas las rutinas de yoga disponibles
 */
export async function getRutinas(filters?: FiltrosRutina): Promise<{ data: RutinaYoga[] | null; error: string | null }> {
    try {
        let query = insforge.database
            .from('yoga_rutinas')
            .select(`
                *,
                posiciones:yoga_rutina_posiciones(
                    id,
                    rutina_id,
                    posicion_id,
                    orden,
                    duracion_segundos,
                    posicion:yoga_posiciones(*)
                )
            `)
            .order('created_at', { ascending: false });

        if (filters?.nivel) {
            query = query.eq('nivel', filters.nivel);
        }
        if (filters?.objetivo) {
            query = query.eq('objetivo', filters.objetivo);
        }
        if (filters?.duracion_max) {
            query = query.lte('duracion_minutos', filters.duracion_max);
        }

        const { data, error } = await query;

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as RutinaYoga[], error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'Error al obtener rutinas' };
    }
}

/**
 * Obtiene una rutina específica por ID
 */
export async function getRutina(id: string): Promise<{ data: RutinaYoga | null; error: string | null }> {
    try {
        const { data, error } = await insforge.database
            .from('yoga_rutinas')
            .select(`
                *,
                posiciones:yoga_rutina_posiciones(
                    id,
                    rutina_id,
                    posicion_id,
                    orden,
                    duracion_segundos,
                    posicion:yoga_posiciones(*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        // Ordenar posiciones por el campo 'orden'
        if (data && data.posiciones) {
            data.posiciones = (data.posiciones as PosicionRutina[]).sort((a, b) => a.orden - b.orden);
        }

        return { data: data as RutinaYoga, error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'Error al obtener la rutina' };
    }
}

/**
 * Obtiene todas las posiciones de yoga disponibles
 */
export async function getPosiciones(): Promise<{ data: PosicionYoga[] | null; error: string | null }> {
    try {
        const { data, error } = await insforge.database
            .from('yoga_posiciones')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as PosicionYoga[], error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'Error al obtener posiciones' };
    }
}

/**
 * Guarda el progreso de una sesión de yoga
 */
export async function saveProgreso(data: {
    user_id: string;
    rutina_id: string;
    completado?: boolean;
    fecha_completado?: string;
    duracion_real_segundos?: number;
}): Promise<{ data: ProgresoYoga | null; error: string | null }> {
    try {
        const { data: result, error } = await insforge.database
            .from('yoga_progreso')
            .insert([{
                user_id: data.user_id,
                rutina_id: data.rutina_id,
                completado: true,
                fecha_completado: data.fecha_completado || new Date().toISOString(),
                duracion_real_segundos: data.duracion_real_segundos,
            }])
            .select()
            .single();

        if (error) {
            return { data: null, error: error.message };
        }

        // 2. Registrar en el sistema de progreso global para puntos y rachas
        // Usamos un puntaje base de 15 puntos por sesión de yoga
        try {
            await recordWorkoutCompletion(data.user_id, `yoga_${data.rutina_id}`, 15);
            
            // 3. Unificar con el historial general de entrenamientos (para el Dashboard)
            await insforge.database.from('historial_entrenamientos').insert([{
                usuario_id: data.user_id,
                rutina_id: null, // No es una rutina de pesas, es de yoga
                duracion_real: Math.floor((data.duracion_real_segundos || 0) / 60) || 15,
                calorias_quemadas: Math.floor((data.duracion_real_segundos || 0) / 60) * 5 || 50, // Estimación simple
                notas: 'Sesión de Yoga completada',
                fecha: data.fecha_completado || new Date().toISOString()
            }]);
        } catch (e) {
            console.error('[YogaAPI] Error al registrar progreso unificado:', e);
        }

        return { data: result as ProgresoYoga, error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'Error al guardar progreso' };
    }
}

/**
 * Obtiene el historial de progreso de yoga del usuario
 */
export async function getHistorialProgreso(userId: string, limit = 20): Promise<{ data: ProgresoYoga[] | null; error: string | null }> {
    try {
        const { data, error } = await insforge.database
            .from('yoga_progreso')
            .select(`
                *,
                rutina:yoga_rutinas(nombre, nivel, objetivo)
            `)
            .eq('user_id', userId)
            .order('fecha_completado', { ascending: false })
            .limit(limit);

        if (error) {
            return { data: null, error: error.message };
        }

        return { data: data as ProgresoYoga[], error: null };
    } catch (e: any) {
        return { data: null, error: e.message || 'Error al obtener historial' };
    }
}