import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import SuggestionsSection from './SuggestionsSection';

// CSRF-1: todo POST a /api/* debe incluir el header X-XSRF-TOKEN.
// El middleware usa double-submit cookie (header === cookie); sin header
// responde 403 "CSRF token inválido o ausente".
vi.mock('../../lib/auth', () => ({
  getCsrfToken: vi.fn(() => 'test-csrf-token'),
  getCsrfHeader: vi.fn(() => ({ 'X-XSRF-TOKEN': 'test-csrf-token' })),
}));

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

describe('SuggestionsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse({ success: true }, 201);
      }
      return jsonResponse({ suggestions: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('envía el header X-XSRF-TOKEN en el POST de sugerencias (CSRF-1)', async () => {
    render(<SuggestionsSection />);

    fireEvent.change(
      screen.getByPlaceholderText('Escribe aquí tu sugerencia, idea o reporte...'),
      { target: { value: 'Agregar modo oscuro' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /enviar sugerencia/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/suggestions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': 'test-csrf-token',
          }),
        }),
      );
    });

    // El usuario debe ver el feedback de éxito cuando el server acepta
    await waitFor(() => {
      expect(screen.getByText('¡Gracias por tu sugerencia!')).toBeInTheDocument();
    });
  });

  it('notifica "suggestion:submitted" tras un envío exitoso (refresh de stats)', async () => {
    render(<SuggestionsSection />);

    const listener = vi.fn();
    window.addEventListener('suggestion:submitted', listener);

    fireEvent.change(
      screen.getByPlaceholderText('Escribe aquí tu sugerencia, idea o reporte...'),
      { target: { value: 'Mejorar la sección de nutrición' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /enviar sugerencia/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Gracias por tu sugerencia!')).toBeInTheDocument();
    });
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('suggestion:submitted', listener);
  });
});
