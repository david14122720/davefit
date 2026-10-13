import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import AcercaDePage from './AcercaDePage';

// La card "Valoración" debe refrescarse al instante cuando SuggestionsSection
// publica con éxito (evento "suggestion:submitted") y sin caché del navegador.
const fetchMock = vi.fn();
let statsCalls = 0;

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response);
}

describe('AcercaDePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statsCalls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/stats')) {
        statsCalls += 1;
        const first = statsCalls === 1;
        return jsonResponse({
          exercises: 1324,
          users: 2,
          rating: first ? 0 : 5,
          reviews: first ? 0 : 1,
        });
      }
      if (url.startsWith('/api/suggestions')) {
        return jsonResponse({ suggestions: [] });
      }
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('refresca la Valoración al recibir suggestion:submitted, sin caché', async () => {
    render(
      <MemoryRouter>
        <AcercaDePage />
      </MemoryRouter>,
    );

    // Estado inicial: sin rating todavía (la card muestra placeholder)
    await waitFor(() => {
      expect(statsCalls).toBe(1);
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('suggestion:submitted'));
    });

    // Refetch sin caché y valor fresco visible (5 → "5.0")
    await waitFor(() => {
      expect(screen.getByText('5.0')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/stats', { cache: 'no-store' });
  });
});
