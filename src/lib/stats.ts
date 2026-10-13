import { insforge } from './insforge';
import { getInicioSemana } from '../app/lib/dates';
import type { UserStats } from '../types';

export async function recordWorkoutCompletion(
  userId: string,
  workoutId: string,
  scoreEarned: number = 10
): Promise<{ success: boolean; error?: string }> {
  try {
    // Si el usuario ya está autenticado, el RLS protegerá que no use un userId ajeno.
    const { error } = await insforge.database
      .from('workout_completions')
      .insert([{
        user_id: userId,
        workout_id: workoutId,
        score_earned: scoreEarned,
      }]);

    if (error) {
      console.error('[Stats] Error recording workout:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    console.error('[Stats] Exception recording workout:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Peticiones en vuelo por userId. Coalesce llamadas CONCURRENTES a
 * `getUserStats` (p. ej. DashboardPage + XPBar montando a la vez) en una sola
 * consulta; la entrada se elimina en cuanto la promesa se asienta (`finally`),
 * así un montaje posterior vuelve a consultar. In-flight only: sin TTL ni
 * caché de resultados.
 */
const statsInFlight = new Map<string, Promise<UserStats | null>>();

/**
 * Fila "vacía" de `user_stats` para usuarios que todavía no entrenaron.
 *
 * La fila real la crea el RPC `process_workout_completion` en el primer
 * entrenamiento. Hasta entonces, mostrar ceros es más honesto (y menos
 * roto) que tratar la ausencia como error fatal — eso causaba el
 * "Identidad Extraviada" en el perfil de usuarios nuevos.
 */
export function buildEmptyUserStats(userId: string): UserStats {
  const now = new Date().toISOString();
  return {
    id: '',
    user_id: userId,
    xp_total: 0,
    nivel: 1,
    dias_racha: 0,
    ultimo_entreno: null,
    racha_bonus: 0,
    total_workouts: 0,
    longest_streak: 0,
    weekly_score: 0,
    monthly_score: 0,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Obtiene las estadísticas del usuario.
 *
 * `select('*')` es intencional: `user_stats` es una tabla de una fila por
 * usuario y varios consumidores (XPBar, ProfilePage) leen columnas distintas;
 * recortar columnas los rompería de forma silenciosa.
 *
 * Las llamadas concurrentes para el mismo userId se deduplican (in-flight).
 * Si el usuario todavía no tiene fila, devuelve stats en cero (no null):
 * null queda reservado para errores reales.
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const inFlight = statsInFlight.get(userId);
  if (inFlight) return inFlight;

  const request = (async (): Promise<UserStats | null> => {
    try {
      const { data, error } = await insforge.database
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Stats] Error getting user stats:', error);
        return null;
      }

      if (!data) return buildEmptyUserStats(userId);

      return data;
    } catch (e) {
      console.error('[Stats] Exception getting user stats:', e);
      return null;
    }
  })();

  statsInFlight.set(userId, request);

  try {
    return await request;
  } finally {
    statsInFlight.delete(userId);
  }
}

/**
 * Cuenta los entrenamientos de la semana actual.
 *
 * La ventana arranca el LUNES 00:00 local (helper compartido
 * `getInicioSemana`), la misma que usa el resto de la app — así la meta
 * semanal (WeeklyGoal) no diverge del "esta semana" del dashboard.
 */
export async function getWeeklyWorkoutCount(userId: string): Promise<number> {
  try {
    const inicioSemana = getInicioSemana();

    const { data, error } = await insforge.database
      .from('historial_entrenamientos')
      .select('id')
      .eq('usuario_id', userId)
      .gte('fecha', inicioSemana.toISOString());

    if (error) {
      console.error('[Stats] Error getting weekly workouts:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (e) {
    console.error('[Stats] Exception getting weekly workouts:', e);
    return 0;
  }
}
