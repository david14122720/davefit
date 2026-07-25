import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import BibliotecaPage from './BibliotecaPage';

// Helper to render BibliotecaPage inside Router
function renderPage() {
  return render(
    <MemoryRouter>
      <BibliotecaPage />
    </MemoryRouter>
  );
}

/**
 * Returns a mock chain that resolves data or error for the last call.
 * The chain supports: .select().eq().order() -> Promise
 */
function mockChain(resolvedValue: { data?: any[]; error?: any } = { data: [] }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(resolvedValue),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

describe('BibliotecaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza skeleton loading al inicio', async () => {
    // Make the promise never resolve so skeleton stays visible
    vi.mocked(insforge.database.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(new Promise(() => {})),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    }));

    renderPage();

    // Assert skeleton is visible (animate-pulse class)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    // Main content should NOT be rendered yet
    expect(screen.queryByText((content) => content.includes('Biblioteca de'))).not.toBeInTheDocument();
  });

  it('muestra los filter chips después de cargar', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockChain({ data: [], error: null })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Biblioteca de'))).toBeInTheDocument();
    });

    // All filter chips should be visible (Stitch: Todo/Fuerza/Cardio/Yoga/HIIT)
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.getByText('Fuerza')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
    expect(screen.getByText('Yoga')).toBeInTheDocument();
    expect(screen.getByText('HIIT')).toBeInTheDocument();
  });

  it('tiene input de búsqueda después de cargar', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockChain({ data: [], error: null })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Biblioteca de'))).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      'Buscar rutinas por nombre o descripción...'
    );
    expect(searchInput).toBeInTheDocument();
  });

  it('muestra el estado de error correctamente', async () => {
    const mockError = new Error('Network error');
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockChain({ data: null, error: mockError })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('No pudimos cargar el catálogo. Verifica tu conexión e inténtalo de nuevo.')
      ).toBeInTheDocument();
    });

    // Error state should show retry button
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    // Should show error title
    expect(screen.getByText('Error al cargar')).toBeInTheDocument();
  });

  it('muestra empty state cuando no hay datos', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockChain({ data: [], error: null })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('No hay rutinas disponibles')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('El catálogo estará disponible próximamente.')
    ).toBeInTheDocument();
  });

  // --- Task 2.3: Filter chips toggle active/inactive state correctly ---

  it('alterna estado activo/inactivo al hacer clic en los chips de filtro', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockChain({ data: [], error: null })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Biblioteca de'))).toBeInTheDocument();
    });

    // "Todo" should be active by default
    const todoChip = screen.getByText('Todo');
    const fuerzaChip = screen.getByText('Fuerza');
    const yogaChip = screen.getByText('Yoga');

    // Todo should be active (has bg-primary class)
    expect(todoChip.closest('button')!.className).toContain('bg-primary');

    // Fuerza and Yoga should be inactive
    expect(fuerzaChip.closest('button')!.className).not.toContain('bg-primary');
    expect(yogaChip.closest('button')!.className).not.toContain('bg-primary');

    // Click Fuerza
    fireEvent.click(fuerzaChip);

    // Now Fuerza should be active
    expect(fuerzaChip.closest('button')!.className).toContain('bg-primary');
    // Todo should be inactive
    expect(todoChip.closest('button')!.className).not.toContain('bg-primary');
    // Yoga should still be inactive
    expect(yogaChip.closest('button')!.className).not.toContain('bg-primary');

    // Click Yoga
    fireEvent.click(yogaChip);

    // Now Yoga should be active
    expect(yogaChip.closest('button')!.className).toContain('bg-primary');
    // Fuerza should be inactive
    expect(fuerzaChip.closest('button')!.className).not.toContain('bg-primary');
    // Todo should be inactive
    expect(todoChip.closest('button')!.className).not.toContain('bg-primary');
  });

  it('muestra el widget Momento de Mentalidad después de cargar', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockChain({ data: [], error: null })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Momento de Mentalidad')).toBeInTheDocument();
    });

    expect(screen.getByText('Comenzar')).toBeInTheDocument();
  });
});
