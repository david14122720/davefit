import { describe, it, expect, beforeEach, vi } from 'vitest';
import { __mockDbResponse } from '../test/setup';
import {
  getWeeklyWorkoutCount,
  getUserStats,
  recordWorkoutCompletion,
} from './stats';

beforeEach(() => {
  // Reset mock response before each test
  __mockDbResponse.data = null;
  __mockDbResponse.error = null;
});

describe('getWeeklyWorkoutCount', () => {
  it('returns 0 when there are no workouts this week', async () => {
    __mockDbResponse.data = [];

    const count = await getWeeklyWorkoutCount('user-1');

    expect(count).toBe(0);
  });

  it('returns the count of weekly workouts', async () => {
    __mockDbResponse.data = [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }];

    const count = await getWeeklyWorkoutCount('user-1');

    expect(count).toBe(3);
  });

  it('returns 0 and logs error when query fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    __mockDbResponse.error = new Error('DB connection failed');

    const count = await getWeeklyWorkoutCount('user-1');

    expect(count).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Stats] Error getting weekly workouts:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('makes the correct query chain', async () => {
    const { insforge } = await import('./insforge');
    const mockFrom = vi.mocked(insforge.database.from);
    __mockDbResponse.data = [{ id: 'w1' }];

    await getWeeklyWorkoutCount('user-1');

    expect(mockFrom).toHaveBeenCalledWith('historial_entrenamientos');
  });
});

describe('getUserStats', () => {
  const mockStats = {
    id: 'stats-1',
    user_id: 'user-1',
    xp_total: 1250,
    nivel: 5,
    dias_racha: 7,
    ultimo_entreno: '2026-07-10T12:00:00Z',
    racha_bonus: 70,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-07-10T12:00:00Z',
  };

  it('returns user stats when found', async () => {
    __mockDbResponse.data = mockStats;

    const stats = await getUserStats('user-1');

    expect(stats).toEqual(mockStats);
  });

  it('returns null when user has no stats', async () => {
    __mockDbResponse.data = null;

    const stats = await getUserStats('user-1');

    expect(stats).toBeNull();
  });

  it('returns null and logs error on query failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    __mockDbResponse.error = new Error('Query failed');

    const stats = await getUserStats('user-1');

    expect(stats).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Stats] Error getting user stats:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('returns specific stats fields', async () => {
    __mockDbResponse.data = mockStats;

    const stats = await getUserStats('user-1');

    expect(stats?.xp_total).toBe(1250);
    expect(stats?.nivel).toBe(5);
    expect(stats?.dias_racha).toBe(7);
  });
});

describe('recordWorkoutCompletion', () => {
  it('returns success when insert succeeds', async () => {
    const result = await recordWorkoutCompletion('user-1', 'workout-1', 10);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns error when insert fails', async () => {
    __mockDbResponse.error = new Error('Insert failed');

    const result = await recordWorkoutCompletion('user-1', 'workout-1', 10);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insert failed');
  });

  it('uses default score of 10 when not specified', async () => {
    const result = await recordWorkoutCompletion('user-1', 'workout-1');

    expect(result.success).toBe(true);
  });

  it('returns error when insert error occurs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    __mockDbResponse.error = new Error('DB error');

    const result = await recordWorkoutCompletion('user-1', 'workout-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
    consoleSpy.mockRestore();
  });
});
