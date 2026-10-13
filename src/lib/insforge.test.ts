import { describe, it, expect, vi, beforeEach } from 'vitest';

// Este archivo testea el módulo REAL de insforge (el mock global de
// src/test/setup.ts se anula acá). El bug que cubre: invokeRpc leía el token
// con `insforge.auth.getSession()`, método que NO existe en el SDK → el RPC
// fallaba siempre con RPC_NETWORK_ERROR (TypeError capturado). El token vive
// en el tokenManager interno del SDK y se lee con `readAccessToken`.

vi.unmock('./insforge');

describe('invokeRpc', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(payload: unknown) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('envía el token de sesión del tokenManager en Authorization', async () => {
    const { invokeRpc, insforge } = await import('./insforge');
    (insforge as any).tokenManager.setAccessToken('tok-sesion-123');
    const fetchMock = stubFetch({ xp_ganado: 70 });

    const { data, error } = await invokeRpc('process_workout_completion', {
      req_user_id: 'u-1',
      duracion_minutos: 10,
    });

    expect(error).toBeNull();
    expect(data).toEqual({ xp_ganado: 70 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer tok-sesion-123');
  });

  it('sin sesión no manda Authorization (queda la anon key como apikey)', async () => {
    const { invokeRpc, insforge } = await import('./insforge');
    (insforge as any).tokenManager.setAccessToken(null);
    const fetchMock = stubFetch({ ok: true });

    await invokeRpc('process_workout_completion', {
      req_user_id: 'u-1',
      duracion_minutos: 10,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect('Authorization' in init.headers).toBe(false);
  });
});
