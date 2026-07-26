import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import DashboardPage from './DashboardPage';

// Mutable auth values
const mockAuth = {
  user: { id: '1', email: 'test@davefit.com' },
  perfil: { nombre_completo: 'David Test', objetivo: 'ganar_fuerza', nivel: 'intermedio' },
  accessToken: 'fake-token',
  loading: false,
  isAdmin: false,
  signOut: vi.fn(),
  signIn: vi.fn() as any,
  signUp: vi.fn() as any,
  signInWithGoogle: vi.fn() as any,
  refreshPerfil: vi.fn() as any,
  updatePerfil: vi.fn() as any,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => children,
}));

function mockDashboardChain(resolvedValue: any = { data: [], error: null, count: 0 }) {
  const base: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  base.limit = vi.fn().mockResolvedValue(resolvedValue);
  base.order = vi.fn().mockReturnThis();

  return base;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = { id: '1', email: 'test@davefit.com' };
    mockAuth.perfil = { nombre_completo: 'David Test', objetivo: 'ganar_fuerza', nivel: 'intermedio' };
    mockAuth.accessToken = 'fake-token';
    // Reset URL hash to avoid tab state leaking between tests
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('renderiza skeleton loading inicial', () => {
    // Prevent promises from resolving to keep loading state
    vi.mocked(insforge.database.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(new Promise(() => {})),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    }));

    renderPage();

    // Skeleton uses animate-pulse
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    // During loading, tabs are NOT rendered (skeleton-only state)
    expect(screen.queryByText('Resumen')).not.toBeInTheDocument();
  });

  it('muestra las tabs Resumen, Biblioteca de Ejercicios y Mi Calendario después de cargar', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Resumen')).toBeInTheDocument();
    });

    expect(screen.getByText('Biblioteca de Ejercicios')).toBeInTheDocument();
    expect(screen.getByText('Mi Calendario')).toBeInTheDocument();
  });

  it('muestra el saludo y nombre de usuario', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      // The greeting is time-based (Buenos días/tardes/noches), so we check
      // for the user's first name anywhere in the page
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });
  });

  it('muestra datos vacíos correctamente', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument();
    });

    // Should show empty next workout state
    expect(screen.getByText('Sin entrenos aún')).toBeInTheDocument();
    // Should show the user's objective (from mock: ganar_fuerza → 'ganar fuerza')
    expect(screen.getByText('ganar fuerza')).toBeInTheDocument();
  });

  // --- Task 2.4: DashboardPage tabs switch content panels, green accent on active tab ---

  it('cambia el panel de contenido al hacer clic en las tabs y muestra acento verde en tab activa', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Resumen')).toBeInTheDocument();
    });

    // Get tab buttons (there are 3 buttons in the tab bar)
    const tabButtons = document.querySelectorAll('.sticky button');
    const resumenTab = tabButtons[0] as HTMLElement;
    const bibliotecaTab = tabButtons[1] as HTMLElement;
    const calendarioTab = tabButtons[2] as HTMLElement;

    expect(resumenTab.className).toContain('text-primary');
    expect(bibliotecaTab.className).not.toContain('text-primary');
    expect(calendarioTab.className).not.toContain('text-primary');

    // Resumen content should be visible
    expect(screen.getByText('Entrenamientos')).toBeInTheDocument();
    expect(screen.getByText('Calorías')).toBeInTheDocument();
    expect(screen.getByText('Minutos')).toBeInTheDocument();

    // Click "Biblioteca de Ejercicios" tab
    fireEvent.click(bibliotecaTab);

    // Now Biblioteca should be active
    await waitFor(() => {
      expect(bibliotecaTab.className).toContain('text-primary');
    });
    expect(resumenTab.className).not.toContain('text-primary');
    expect(calendarioTab.className).not.toContain('text-primary');

    // Biblioteca content heading should be visible
    expect(screen.getByText('Biblioteca de Ejercicios', { selector: 'h2' })).toBeInTheDocument();

    // Click "Mi Calendario" tab
    fireEvent.click(calendarioTab);

    // Now Calendario should be active
    await waitFor(() => {
      expect(calendarioTab.className).toContain('text-primary');
    });
    expect(resumenTab.className).not.toContain('text-primary');
    expect(bibliotecaTab.className).not.toContain('text-primary');

    // Calendario content should be visible
    expect(screen.getByText('Mi Calendario', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('Esta Semana')).toBeInTheDocument();
  });

  it('muestra streak badge y level badge en el resumen', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      // Level badge should render (inside a pill badge with purple-500 classes)
      const nivelElements = screen.getAllByText(/Nivel/);
      // At least one should be the level badge
      const levelBadge = nivelElements.find(el => el.className.includes('rounded-full'));
      expect(levelBadge).toBeTruthy();
    });

    // Streak badge
    expect(screen.getByText(/días racha/)).toBeInTheDocument();
  });

  it('muestra la CTA Explora la Biblioteca', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Explora la Biblioteca')).toBeInTheDocument();
    });
  });

  it('muestra el botón Entrenar ahora', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Entrenar ahora')).toBeInTheDocument();
    });
  });
});
