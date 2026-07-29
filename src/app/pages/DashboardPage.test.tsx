import { render, screen, waitFor } from '@testing-library/react';
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
    // During loading, full content is NOT rendered
    expect(screen.queryByText(/David/)).not.toBeInTheDocument();
  });

  it('muestra el saludo y nombre de usuario', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });
  });

  it('muestra datos vacíos correctamente', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    // Chart empty state
    expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument();
    // Empty next workout state
    expect(screen.getByText('Sin entrenos aún')).toBeInTheDocument();
    // User objective (from mock: ganar_fuerza → 'ganar fuerza')
    expect(screen.getByText('ganar fuerza')).toBeInTheDocument();
  });

  it('muestra streak badge y level badge', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      const nivelElements = screen.getAllByText(/Nivel/);
      const levelBadge = nivelElements.find(el => el.className.includes('rounded-full'));
      expect(levelBadge).toBeTruthy();
    });

    expect(screen.getByText(/días racha/)).toBeInTheDocument();
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

  // ============== T3.1: No tab bar ==============

  it('no tiene barra de navegación por tabs (vista única)', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    // No tab buttons should exist — page is a single continuous view
    expect(screen.queryByText('Resumen')).not.toBeInTheDocument();
    expect(screen.queryByText('Biblioteca de Ejercicios')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi Calendario')).not.toBeInTheDocument();

    // No sticky tab navigation bar
    expect(document.querySelector('.sticky')).not.toBeInTheDocument();
  });

  // ============== T3.2: Sections in correct order with calendar content integrated ==============

  it('integra el calendario semanal e historial completo en la vista principal', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    // Calendar content (formerly in Mi Calendario tab) is now visible in main flow
    expect(screen.getByText('Esta Semana')).toBeInTheDocument();
    // Training history section is visible (empty state since no historial data)
    expect(
      screen.getByText('Sin entrenamientos registrados')
    ).toBeInTheDocument();
  });

  // ============== T3.4: Empty data renders gracefully ==============

  it('maneja correctamente datos vacíos en todas las secciones', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    // Hero is visible with badges
    expect(screen.getByText(/días racha/)).toBeInTheDocument();
    const nivelElements = screen.getAllByText(/Nivel/);
    expect(nivelElements.length).toBeGreaterThanOrEqual(1);

    // Time selector and "Entrenar ahora" are visible
    expect(screen.getByText('Entrenar ahora')).toBeInTheDocument();

    // Stats show zero/empty data
    expect(screen.getByText('Entrenamientos')).toBeInTheDocument();
    expect(screen.getByText('Calorías')).toBeInTheDocument();
    expect(screen.getByText('Minutos')).toBeInTheDocument();
    // Stat values exist (empty data shows 0)
    const zeroMatches = screen.getAllByText('0');
    expect(zeroMatches.length).toBeGreaterThanOrEqual(1);

    // Chart shows empty state
    expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument();

    // No crash or error toast visible
    expect(screen.queryByText(/Error al cargar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No pudimos cargar/i)).not.toBeInTheDocument();
  });

  // ============== T3.4b: Empty training history with calendar ==============

  it('muestra calendario e historial vacío cuando no hay entrenamientos', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain({ data: [], error: null, count: 0 })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    // Weekly mini calendar heading is visible
    expect(screen.getByText('Esta Semana')).toBeInTheDocument();
    // Day headers should render (Lun, Mar, Mié, etc.)
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();

    // With no historial data, we expect either "Sin entrenamientos registrados"
    // or "Entrenamientos Recientes" is visible (the section renders)
    // Since data is empty (count=0), the history section's empty state appears
    expect(
      screen.getByText('Sin entrenamientos registrados')
    ).toBeInTheDocument();
  });
});
