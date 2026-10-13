import { describe, it, expect } from 'vitest';
import { decodeAccessTokenClaims } from './insforge-types';

// El flujo OAuth legacy devuelve el access token en el fragmento de la URL.
// Para registrar la sesión en el cliente singleton necesitamos las claims
// (sub/email) SIN verificar firma: el token ya vino de nuestro backend y la
// autorización real la hace el servidor en cada request.

/** Arma un JWT sin firmar (header.payload.sig) con payload UTF-8 seguro. */
function fakeJwt(payload: unknown): string {
  const b64url = (text: string) =>
    btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(JSON.stringify(payload))}.signature`;
}

describe('decodeAccessTokenClaims', () => {
  it('decodifica sub/email/name incluyendo UTF-8', () => {
    const token = fakeJwt({
      sub: '9700cf6c-4ff2-4e98-a10c-2b677e2fe80b',
      email: 'juana@davefit.com',
      name: 'Juana Ñandú',
    });

    expect(decodeAccessTokenClaims(token)).toEqual({
      sub: '9700cf6c-4ff2-4e98-a10c-2b677e2fe80b',
      email: 'juana@davefit.com',
      name: 'Juana Ñandú',
    });
  });

  it('devuelve null para tokens malformados o vacíos', () => {
    expect(decodeAccessTokenClaims('')).toBeNull();
    expect(decodeAccessTokenClaims('no-es-un-jwt')).toBeNull();
    expect(decodeAccessTokenClaims('a.%%%%.c')).toBeNull();
    expect(decodeAccessTokenClaims('a.b')).toBeNull();
  });

  it('devuelve null cuando el payload no es JSON', () => {
    const b64url = (text: string) =>
      btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const token = `${b64url('{"alg":"HS256"}')}.${b64url('esto-no-es-json')}.sig`;

    expect(decodeAccessTokenClaims(token)).toBeNull();
  });
});
