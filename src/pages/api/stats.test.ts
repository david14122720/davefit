import { describe, it, vi, expect, beforeEach } from 'vitest';
import { insforge } from '../../lib/insforge';
import { GET } from './stats';

/**
 * Mock de insforge.database.from keyed por tabla:
 * - 'perfiles_public' devuelve count 42 (el valor que el endpoint debe reportar)
 * - 'ejercicios' devuelve count 15
 * - 'suggestions' devuelve ratings
 * Cualquier otra tabla (p.ej. 'perfiles' base) devuelve count null -> 0.
 */
function mockStatsQueries() {
  (insforge.database.from as any).mockImplementation((table: string) => {
    const builder: any = {};
    builder.select = vi.fn().mockResolvedValue({
      data: table === 'suggestions' ? [{ rating: 5 }, { rating: 4 }, { rating: 0 }] : null,
      error: null,
      count: table === 'perfiles_public' ? 42 : table === 'ejercicios' ? 15 : null,
    });
    return builder;
  });
}

describe('GET /api/stats (landing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cuenta usuarios contra perfiles_public, no contra perfiles (DAS-7)', async () => {
    mockStatsQueries();

    const response = await GET({} as any);

    expect(insforge.database.from).toHaveBeenCalledWith('perfiles_public');
    expect(insforge.database.from).not.toHaveBeenCalledWith('perfiles');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.users).toBe(42);
  });

  it('sigue reportando ejercicios y rating promedio', async () => {
    mockStatsQueries();

    const response = await GET({} as any);
    const body = await response.json();

    expect(body.exercises).toBe(15);
    expect(body.rating).toBe(4.5); // (5 + 4) / 2, ignorando rating 0
    expect(body.reviews).toBe(2);
  });

  it('sirve stats con caché corta para reflejar sugerencias recientes', async () => {
    mockStatsQueries();

    const response = await GET({} as any);

    // Caché corta (30s cliente / 2 min CDN): tras publicar una sugerencia el
    // valor debe refrescarse rápido en el navegador (bug: max-age=300 dejaba
    // la Valoración en 0 hasta 5 minutos).
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=30, s-maxage=120');
  });
});
