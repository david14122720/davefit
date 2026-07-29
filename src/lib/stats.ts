import { insforge } from './insforge';
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

export async function getUserStats(userId: string): Promise<UserStats | null> {
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

    return data;
  } catch (e) {
    console.error('[Stats] Exception getting user stats:', e);
    return null;
  }
}

export async function getWeeklyWorkoutCount(userId: string): Promise<number> {
  try {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

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
