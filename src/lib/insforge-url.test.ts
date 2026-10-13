import { describe, it, expect } from 'vitest';
import { resolveInsforgeBaseUrl, buildRpcUrl } from './insforge-url';

describe('resolveInsforgeBaseUrl', () => {
  const ENV_URL = 'http://192.168.50.121:7130';

  it('en el navegador usa el mismo origen (proxy same-origin)', () => {
    expect(resolveInsforgeBaseUrl(ENV_URL, true, 'http://localhost:4321')).toBe(
      'http://localhost:4321',
    );
  });

  it('en SSR/Node usa la URL absoluta del entorno', () => {
    expect(resolveInsforgeBaseUrl(ENV_URL, false)).toBe(ENV_URL);
  });

  it('en navegador sin origin conocido cae a la URL del entorno', () => {
    expect(resolveInsforgeBaseUrl(ENV_URL, true)).toBe(ENV_URL);
  });

  it('sin env URL devuelve string vacío', () => {
    expect(resolveInsforgeBaseUrl(undefined, false)).toBe('');
  });
});

describe('buildRpcUrl', () => {
  it('apunta a /api/database/rpc (la ruta real del backend)', () => {
    expect(buildRpcUrl('http://localhost:4321', 'process_workout_completion')).toBe(
      'http://localhost:4321/api/database/rpc/process_workout_completion',
    );
  });

  it('escapa el nombre de la función', () => {
    expect(buildRpcUrl('http://x:1', 'fn rara/../x')).toBe(
      'http://x:1/api/database/rpc/fn%20rara%2F..%2Fx',
    );
  });
});
