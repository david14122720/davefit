import { insforge } from './insforge';

export interface WorkoutCompletion {
  id: string;
  user_id: string;
  workout_id: string;
  completed_at: string;
  score_earned: number;
}

export interface UserStats {
  id: string;
  user_id: string;
  streak_days: number;
  longest_streak: number;
  total_workouts: number;
  total_score: number;
  last_workout_date: string | null;
  weekly_score: number;
  monthly_score: number;
  created_at: string;
  updated_at: string;
}

export async function recordWorkoutCompletion(
  userId: string,
  workoutId: string,
  scoreEarned: number = 10
): Promise<{ success: boolean; error?: string }> {
  try {
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

export async function getLeaderboard(
  filter: 'weekly' | 'monthly' | 'all' = 'all',
  limit: number = 20
): Promise<{ username: string; avatar_url?: string; streak_days: number; total_score: number; total_workouts: number }[]> {
  try {
    const scoreColumn = filter === 'weekly' ? 'weekly_score' : filter === 'monthly' ? 'monthly_score' : 'total_score';

    const { data, error } = await insforge.database
      .from('user_stats')
      .select(`
        user_id,
        streak_days,
        total_score,
        total_workouts,
        ${scoreColumn}
      `)
      .order(scoreColumn as any, { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return [];
    }

    const userIds = data.map((s: any) => s.user_id);
    const { data: profiles } = await insforge.database
      .from('perfiles')
      .select('id, nombre_completo, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    return data.map((stat: any) => {
      const profile = profileMap.get(stat.user_id);
      return {
        user_id: stat.user_id,
        username: profile?.nombre_completo || 'Usuario',
        avatar_url: profile?.avatar_url,
        streak_days: stat.streak_days || 0,
        total_score: stat[scoreColumn] || stat.total_score || 0,
        total_workouts: stat.total_workouts || 0,
      };
    });
  } catch (e) {
    console.error('[Stats] Exception getting leaderboard:', e);
    return [];
  }
}

export async function getUserRank(userId: string, filter: 'weekly' | 'monthly' | 'all' = 'all'): Promise<number | null> {
  try {
    const scoreColumn = filter === 'weekly' ? 'weekly_score' : filter === 'monthly' ? 'monthly_score' : 'total_score';

    const { data, error } = await insforge.database
      .from('user_stats')
      .select('user_id, ' + scoreColumn)
      .order(scoreColumn as any, { ascending: false });

    if (error || !data) {
      return null;
    }

    const index = data.findIndex((s: any) => s.user_id === userId);
    return index >= 0 ? index + 1 : null;
  } catch (e) {
    console.error('[Stats] Exception getting user rank:', e);
    return null;
  }
}
