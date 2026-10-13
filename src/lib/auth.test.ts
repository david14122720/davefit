import { describe, it, expect, afterEach } from 'vitest';
import { clearStaleInsforgeSessionCookie } from './auth';

describe('clearStaleInsforgeSessionCookie', () => {
  const COOKIE = 'insforge_csrf_token';

  afterEach(() => {
    document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
  });

  it('borra la cookie de sesión de InsForge', () => {
    document.cookie = `${COOKIE}=abc123; path=/`;
    expect(document.cookie).toContain(COOKIE);

    clearStaleInsforgeSessionCookie();

    expect(document.cookie).not.toContain(COOKIE);
  });

  it('no explota si la cookie no existe', () => {
    expect(() => clearStaleInsforgeSessionCookie()).not.toThrow();
  });
});
