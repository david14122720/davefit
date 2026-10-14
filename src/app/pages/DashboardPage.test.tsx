import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import DashboardPage from './DashboardPage';

// Mutable auth values
const mockAuth = {
  user: { id: '1', email: 'test@davefit.com' },
  perfil: { nombre_completo: 'David Test', objetivo: 'ganar_fuerza', nivel: 'intermedio' } as {
    nombre_completo: string;
    objetivo: string;
    nivel: string;
    preferencia_lugar?: string;
  },
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

function mockDashboardChain(
  resolvedValue: any = { data: [], error: null, count: 0 },
  weekValue: any = resolvedValue
) {
  const base: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue(weekValue),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  base.limit = vi.fn().mockResolvedValue(resolvedValue);
  base.order = vi.fn().mockReturnThis();

  return base;
}

/**
 * Mock enrutado por tabla para escenarios con datos reales (historial,
 * semana, recetas, ranking). `null` en recetas/perfiles/userStats simula
 * un fallo de query.
 */
function mockTables(cfg: {
  historial?: any[];
  semana?: any[];
  recetas?: any[] | null;
  perfiles?: any[] | null;
  userStats?: any[] | null;
}) {
  vi.mocked(insforge.database.from).mockImplementation((table: any) => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      gte: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    if (table === 'historial_entrenamientos') {
      const historial = cfg.historial ?? [];
      const semana = cfg.semana ?? [];
      chain.limit = vi
        .fn()
        .mockResolvedValue({ data: historial, error: null, count: historial.length });
      chain.gte = vi
        .fn()
        .mockResolvedValue({ data: semana, error: null, count: semana.length });
    } else if (table === 'recetas') {
      chain.limit = vi.fn().mockResolvedValue(
        cfg.recetas === null
          ? { data: null, error: { message: 'fail' } }
          : { data: cfg.recetas ?? [], error: null }
      );
    } else if (table === 'perfiles_public') {
      // Nueva cadena del widget de comunidad: .select(...).in('id', ids)
      chain.select = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockResolvedValue(
        cfg.perfiles === null
          ? { data: null, error: { message: 'fail' } }
          : { data: cfg.perfiles ?? [], error: null }
      );
    } else if (table === 'user_stats_public') {
      // Nueva cadena del widget de comunidad: .select(...).order(...).limit(3)
      chain.select = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockResolvedValue(
        cfg.userStats === null
          ? { data: null, error: { message: 'fail' } }
          : { data: cfg.userStats ?? [], error: null }
      );
    }

    return chain;
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/rutinas/practicar/:rutinaId" element={<div>PRACTICAR RUTINA</div>} />
        <Route path="*" element={<DashboardPage />} />
      </Routes>
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
      gte: vi.fn().mockReturnValue(new Promise(() => {})),
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
    // User objective (from mock: ganar_fuerza → 'Ganar Fuerza', banner + tarjeta de objetivo)
    expect(screen.getAllByText('Ganar Fuerza').length).toBeGreaterThanOrEqual(1);
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

    // Stats cards show zero/empty data (rediseño: nuevos títulos de tarjeta)
    await waitFor(() => {
      expect(screen.getByText('Progreso de Jugador')).toBeInTheDocument();
    });
    expect(screen.getByText('Meta de Sesiones')).toBeInTheDocument();
    expect(screen.getByText('Quema Acumulada')).toBeInTheDocument();
    expect(screen.getByText('Tiempo en Zona Activa')).toBeInTheDocument();
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

  // ============== JD-1 S4: sesiones sin kcal registradas ==============

  it('muestra el estado vacío del gráfico cuando hay sesiones pero 0 kcal registradas', async () => {
    const weekRows = [
      { fecha: '2026-10-12T10:00:00.000Z', duracion_real: 30, calorias_quemadas: null },
      { fecha: '2026-10-13T10:00:00.000Z', duracion_real: 45, calorias_quemadas: 0 },
    ];
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockDashboardChain(
        { data: [], error: null, count: 0 },
        { data: weekRows, error: null, count: weekRows.length }
      )
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    // Hay 2 sesiones esta semana, pero 0 kcal: la gráfica no debe
    // renderizar barras invisibles (0%), sino el estado vacío existente.
    expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument();
    expect(screen.queryByText('Registro de Esfuerzo Semanal')).not.toBeInTheDocument();
  });

  // ============== T3 rediseño: gráfica en kcal ==============

  it('gráfica de esfuerzo semanal usa kcal y muestra el promedio por día activo', async () => {
    const semana = [
      { fecha: '2026-10-12T10:00:00.000Z', duracion_real: 40, calorias_quemadas: 420 },
      { fecha: '2026-10-14T10:00:00.000Z', duracion_real: 50, calorias_quemadas: 510 },
    ];
    mockTables({ semana, historial: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    expect(screen.getByText('Registro de Esfuerzo Semanal')).toBeInTheDocument();
    expect(
      screen.getByText('Promedio semanal: 465 kcal / día activo')
    ).toBeInTheDocument();
    expect(screen.queryByText('Sin actividad registrada')).not.toBeInTheDocument();
    // Leyenda sin "Programado" (no existe la planificación en la app)
    expect(screen.getByText('Completado')).toBeInTheDocument();
    expect(screen.queryByText('Programado')).not.toBeInTheDocument();
  });

  // ============== T3 rediseño: sesión recomendada ==============

  it('muestra la sesión recomendada con datos reales de la rutina y navega a practicar', async () => {
    const historial = [
      {
        id: 'h1',
        fecha: '2026-10-12T10:00:00.000Z',
        duracion_real: 30,
        calorias_quemadas: 300,
        rutina_id: 'r1',
        rutinas: {
          nombre: 'HIIT Express',
          imagen_cover_url: null,
          nivel: 'intermedio',
          descripcion: 'Circuito dinámico para dormitorio',
          duracion_estimada: 25,
          objetivo: 'tonificar',
          tipo_lugar: 'casa',
        },
      },
    ];
    mockTables({ historial, semana: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sesión Recomendada de Hoy')).toBeInTheDocument();
    });

    // La rutina aparece en la recomendada y en el historial completo
    expect(screen.getAllByText('HIIT Express').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Circuito dinámico para dormitorio')).toBeInTheDocument();
    expect(screen.getByText('Intermedio')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('Tonificar Cuerpo')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Iniciar Sesión de Hoy'));
    await waitFor(() => {
      expect(screen.getByText('PRACTICAR RUTINA')).toBeInTheDocument();
    });
  });

  it('sin rutina_id muestra CTA Explorar Rutinas hacia la biblioteca', async () => {
    const historial = [
      {
        id: 'h2',
        fecha: '2026-10-11T10:00:00.000Z',
        duracion_real: 20,
        calorias_quemadas: 100,
        rutina_id: null,
        rutinas: { nombre: 'Rutina Borrada', imagen_cover_url: null },
      },
    ];
    mockTables({ historial, semana: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Sesión Recomendada de Hoy')).toBeInTheDocument();
    });

    expect(screen.queryByText('Iniciar Sesión de Hoy')).not.toBeInTheDocument();
    const enlaces = screen.getAllByRole('link', { name: /Explorar Rutinas/ });
    expect(enlaces.some((el) => el.getAttribute('href') === '/biblioteca')).toBe(true);
  });

  // ============== T3 rediseño: recarga post-entreno ==============

  it('renderiza la recarga post-entreno cuando hay recetas', async () => {
    mockTables({
      recetas: [
        {
          id: 'rec1',
          nombre: 'Bowl de Pollo & Arroz',
          imagen_url: 'https://img.test/1.jpg',
          proteinas: 38,
          calorias: 520,
          tiempo_preparacion: 15,
        },
        {
          id: 'rec2',
          nombre: 'Batido Energético',
          imagen_url: null,
          proteinas: 26,
          calorias: 310,
          tiempo_preparacion: 3,
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Recarga Post-Entreno Sugerida')).toBeInTheDocument();
    });

    expect(screen.getByText('Bowl de Pollo & Arroz')).toBeInTheDocument();
    expect(screen.getByText('Batido Energético')).toBeInTheDocument();
    expect(screen.getByText(/38g Proteína/)).toBeInTheDocument();
    const menuLink = screen.getByRole('link', { name: /Ver menú completo/ });
    expect(menuLink.getAttribute('href')).toBe('/nutricion');
  });

  it('oculta la recarga post-entreno si la query de recetas falla', async () => {
    mockTables({ recetas: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Recarga Post-Entreno Sugerida')).not.toBeInTheDocument();
  });

  // ============== T3 rediseño: comunidad en vivo ==============

  it('muestra el top 3 de la comunidad por XP y marca al usuario actual', async () => {
    mockTables({
      perfiles: [
        { id: 'u1', nombre_completo: 'Daniel Rojas', avatar_url: null },
        { id: 'u2', nombre_completo: 'Sofía Martín', avatar_url: null },
        { id: 'u3', nombre_completo: 'Ana Vera', avatar_url: null },
        { id: '1', nombre_completo: 'David Test', avatar_url: null },
      ],
      userStats: [
        { user_id: 'u1', xp_total: 5000, total_workouts: 20, dias_racha: 12 },
        { user_id: 'u2', xp_total: 3000, total_workouts: 12, dias_racha: 4 },
        { user_id: 'u3', xp_total: 900, total_workouts: 5, dias_racha: 0 },
        { user_id: '1', xp_total: 4000, total_workouts: 15, dias_racha: 7 },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Comunidad en Vivo')).toBeInTheDocument();
    });

    // Top 3 por XP: Daniel (5000), Tú/David (4000), Sofía (3000)
    expect(screen.getByText('Daniel')).toBeInTheDocument();
    expect(screen.getByText('Tú (David)')).toBeInTheDocument();
    expect(screen.getByText('Sofía')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /Ir al muro de la Comunidad/ });
    expect(cta.getAttribute('href')).toBe('/comunidad');
  });

  it('oculta la comunidad si la query del ranking falla', async () => {
    mockTables({ perfiles: null });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/David/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Comunidad en Vivo')).not.toBeInTheDocument();
  });

  // ============== T3 rediseño: objetivo activo ==============

  it('muestra el objetivo y la modalidad con labels legibles', async () => {
    mockAuth.perfil = {
      nombre_completo: 'David Test',
      objetivo: 'tonificar',
      nivel: 'intermedio',
      preferencia_lugar: 'casa',
    };
    mockTables({});

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tu Objetivo Activo')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Tonificar Cuerpo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Modalidad: En casa')).toBeInTheDocument();
    expect(screen.getByText('Foco Principal')).toBeInTheDocument();
  });
});
