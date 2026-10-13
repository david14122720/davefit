// ============================================================
// Tests de las funciones de stats usadas por el dashboard:
// ventana semanal (lunes 00:00) y deduplicación in-flight de getUserStats.
//
// El setup global (src/test/setup.ts) mockea './insforge'; cada test
// reemplaza `database.from` por una cadena controlable.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { insforge } from './insforge';
import { getUserStats, getWeeklyWorkoutCount } from './stats';

/** ISO de una fecha local a las 00:00 (TZ-safe para la ventana semanal). */
function localIso(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 0, 0, 0, 0).toISOString();
}

/** Instala `from` devolviendo la cadena dada; devuelve el mock de `from`. */
function installFrom(chain: any) {
  const fromMock = vi.mocked(insforge.database.from);
  fromMock.mockImplementation(() => chain);
  return fromMock;
}

describe('getWeeklyWorkoutCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('usa la ventana semanal que empieza el LUNES (no el domingo)', async () => {
    // Miércoles 2026-10-14 15:00 hora local.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 14, 15, 0, 0, 0));

    const gte = vi.fn().mockResolvedValue({ data: [{ id: 'a' }], error: null });
    const eq = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq });
    installFrom({ select });

    const count = await getWeeklyWorkoutCount('user-1');

    expect(count).toBe(1);
    expect(select).toHaveBeenCalledWith('id');
    expect(eq).toHaveBeenCalledWith('usuario_id', 'user-1');
    expect(gte).toHaveBeenCalledWith('fecha', localIso(2026, 9, 12));
    // La implementación anterior arrancaba el domingo 2026-10-11.
    expect(gte.mock.calls[0][1]).not.toBe(localIso(2026, 9, 11));
  });

  it('en domingo la ventana sigue siendo el lunes anterior', async () => {
    // Domingo 2026-10-18 10:00 hora local.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 10, 0, 0, 0));

    const gte = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq });
    installFrom({ select });

    await getWeeklyWorkoutCount('user-1');

    // El domingo pertenece a la semana que empezó el lunes 2026-10-12.
    expect(gte).toHaveBeenCalledWith('fecha', localIso(2026, 9, 12));
    expect(gte.mock.calls[0][1]).not.toBe(localIso(2026, 9, 18));
  });
});

describe('getUserStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesce llamadas concurrentes en una sola consulta y re-consulta tras asentarse', async () => {
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const maybeSingle = vi.fn(async () => {
      await gate;
      return { data: { user_id: 'user-dedup', xp_total: 42 }, error: null };
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const fromMock = installFrom({ select });

    const first = getUserStats('user-dedup');
    const second = getUserStats('user-dedup');
    const builderRunsWhileInFlight = fromMock.mock.calls.length;

    releaseGate();
    const [a, b] = await Promise.all([first, second]);

    // Dos llamadas concurrentes → una única consulta a la tabla.
    expect(builderRunsWhileInFlight).toBe(1);
    expect(a).toEqual({ user_id: 'user-dedup', xp_total: 42 });
    expect(b).toEqual(a);
    expect(select).toHaveBeenCalledWith('*');

    // Sin TTL: tras asentarse, un montaje posterior vuelve a consultar.
    await getUserStats('user-dedup');
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it('conserva la semántica de error (null) y no envenena la deduplicación', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      .mockResolvedValueOnce({ data: { user_id: 'u2' }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    installFrom({ select });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getUserStats('u2')).resolves.toBeNull();
    await expect(getUserStats('u2')).resolves.toEqual({ user_id: 'u2' });

    expect(errorSpy).toHaveBeenCalled();
  });

  it('sin fila todavía (usuario nuevo) devuelve stats en cero, no null', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    installFrom({ select });

    const stats = await getUserStats('user-nuevo');

    expect(stats).not.toBeNull();
    expect(stats).toMatchObject({
      user_id: 'user-nuevo',
      xp_total: 0,
      nivel: 1,
      dias_racha: 0,
      total_workouts: 0,
      ultimo_entreno: null,
    });
  });
});
