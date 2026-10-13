import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

// El callback OAuth debe dejar la sesión lista en el cliente singleton:
// - flujo legacy (token en el fragmento #access_token): registrar la sesión
//   en el tokenManager + setAuthToken para que database/storage/invokeRpc
//   salgan autenticados (antes SOLO se seteaba estado de React → el SDK
//   seguía hablando como anon y la sesión no había quedado en el cliente).
// - flujo PKCE (?insforge_code=...): el SDK intercambia el código en
//   getCurrentUser(); la restauración no debe depender SOLO de la cookie
//   csrf (en la vuelta de OAuth todavía no existe).

const mocks = vi.hoisted(() => ({
  saveSession: vi.fn(),
  setAuthToken: vi.fn(),
  getCurrentUser: vi.fn(),
  readAccessToken: vi.fn(() => 'session-token'),
}));

vi.mock('../../lib/insforge', () => ({
  insforge: {
    auth: {
      getCurrentUser: mocks.getCurrentUser,
      signOut: vi.fn().mockResolvedValue(undefined),
    },
    database: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
    _tokenManager: { saveSession: mocks.saveSession },
    getHttpClient: () => ({ setAuthToken: mocks.setAuthToken }),
  },
  readAccessToken: mocks.readAccessToken,
}));

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <div data-testid="out">loading</div>;
  return <div data-testid="out">{user ? user.email : 'anon'}</div>;
}

/** Arma un JWT sin firmar con payload UTF-8 seguro. */
function fakeJwt(payload: unknown): string {
  const b64url = (text: string) =>
    btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify(payload))}.sig`;
}

describe('AuthProvider — vuelta de OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readAccessToken.mockReturnValue('session-token');
    history.replaceState(null, '', '/');
  });

  afterEach(() => {
    history.replaceState(null, '', '/');
  });

  it('registra la sesión del fragmento legacy en el cliente singleton', async () => {
    history.replaceState(
      null,
      '',
      '/#access_token=tok-hash&user_id=user-1&email=juana@davefit.com&name=Juana',
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mocks.saveSession).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    expect(mocks.saveSession).toHaveBeenCalledWith({
      accessToken: 'tok-hash',
      user: expect.objectContaining({ id: 'user-1', email: 'juana@davefit.com' }),
    });
    expect(mocks.setAuthToken).toHaveBeenCalledWith('tok-hash');
    await waitFor(() =>
      expect(screen.getByTestId('out').textContent).toBe('juana@davefit.com'),
    );
    // El fragmento se limpia para no dejar el token visible en la URL.
    expect(window.location.hash).toBe('');
  });

  it('sin user_id/email usa las claims del JWT del fragmento', async () => {
    const jwt = fakeJwt({ sub: 'user-9', email: 'nueve@davefit.com' });
    history.replaceState(null, '', `/#access_token=${jwt}`);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mocks.saveSession).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    expect(mocks.saveSession).toHaveBeenCalledWith({
      accessToken: jwt,
      user: expect.objectContaining({ id: 'user-9', email: 'nueve@davefit.com' }),
    });
  });

  it('con insforge_code (PKCE) restaura la sesión aunque no haya cookie csrf', async () => {
    history.replaceState(null, '', '/?insforge_code=abc123');
    mocks.getCurrentUser.mockResolvedValue({
      data: { user: { id: 'user-2', email: 'pkce@davefit.com' } },
      error: null,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mocks.getCurrentUser).toHaveBeenCalled(), {
      timeout: 3000,
    });
    await waitFor(() =>
      expect(screen.getByTestId('out').textContent).toBe('pkce@davefit.com'),
    );
  });
});
