import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { insforge } from '../../lib/insforge';
import ComunidadPage from './ComunidadPage';

// Columnas públicas expuestas por las vistas (DAS-1/DAS-3):
// - perfiles_public: id, nombre_completo, avatar_url
// - user_stats_public: user_id, xp_total, total_workouts, dias_racha
// El mock NO incluye streak_days: la vista solo expone dias_racha (DAS-3).

// Sesión mutable: por defecto anónima (la página pública no exige login).
const mockAuth: { user: { id: string; email: string } | null; perfil: any } = {
  user: null,
  perfil: null,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Datos con órdenes distintos por columna real para poder observar el control
// "Ordenar por": Puntos → Ana, Racha → Bea, Sesiones → Carlos.
const mockProfiles = [
  { id: 'u1', nombre_completo: 'Ana Gómez', avatar_url: 'https://cdn.example/ana.jpg' },
  { id: 'u2', nombre_completo: 'Carlos Ruiz', avatar_url: null },
  { id: 'u3', nombre_completo: 'Bea López', avatar_url: null },
];

const mockStats = [
  { user_id: 'u1', xp_total: 1200, total_workouts: 30, dias_racha: 5 },
  { user_id: 'u2', xp_total: 900, total_workouts: 50, dias_racha: 3 },
  { user_id: 'u3', xp_total: 100, total_workouts: 40, dias_racha: 12 },
];

interface BuilderSpy {
  select: ReturnType<typeof vi.fn>;
}

/**
 * Mock de insforge.database.from keyed por tabla.
 * Solo las vistas devuelven filas: si el código consulta las tablas base
 * (perfiles / user_stats) obtiene listas vacías y el leaderboard no renderiza.
 * Devuelve un Map<tabla, builder> para inspeccionar los select() emitidos.
 */
function mockLeaderboardQueries(
  profiles: any[] = mockProfiles,
  stats: any[] = mockStats,
): Map<string, BuilderSpy> {
  const builders = new Map<string, BuilderSpy>();

  (insforge.database.from as any).mockImplementation((table: string) => {
    const builder: any = {};
    builder.select = vi.fn((cols: string) => {
      if (table === 'perfiles_public') {
        return Promise.resolve({ data: profiles, error: null });
      }
      if (table === 'user_stats_public') {
        return Promise.resolve({ data: stats, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    builders.set(table, builder);
    return builder;
  });

  return builders;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ComunidadPage />
    </MemoryRouter>,
  );
}

describe('ComunidadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockAuth.perfil = null;
    // El muro real (SuggestionsSection) consulta /api/suggestions al montar.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions: [] }) }),
    );
  });

  it('consulta las vistas públicas, no las tablas base (DAS-3)', async () => {
    mockLeaderboardQueries();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    // El leaderboard anónimo debe leer de las vistas (DAS-3)
    expect(insforge.database.from).toHaveBeenCalledWith('perfiles_public');
    expect(insforge.database.from).toHaveBeenCalledWith('user_stats_public');
    expect(insforge.database.from).not.toHaveBeenCalledWith('perfiles');
    expect(insforge.database.from).not.toHaveBeenCalledWith('user_stats');
  });

  it('lee solo las columnas públicas de las vistas, incluido dias_racha (DAS-3)', async () => {
    const builders = mockLeaderboardQueries();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    const perfilesSelect = builders.get('perfiles_public')!.select;
    const statsSelect = builders.get('user_stats_public')!.select;

    // perfiles_public: exactamente id, nombre_completo, avatar_url (DAS-1)
    expect(perfilesSelect).toHaveBeenCalledWith('id, nombre_completo, avatar_url');

    // user_stats_public: lee dias_racha (DAS-3) y nunca columnas PII/amplias
    const statsCols: string = statsSelect.mock.calls[0][0];
    expect(statsCols).toContain('dias_racha');
    expect(statsCols).not.toContain('weekly_score');
    expect(statsCols).not.toContain('monthly_score');
    expect(statsCols).not.toContain('longest_streak');
    expect(statsCols).not.toContain('nivel');
  });

  it('renderiza el leaderboard ordenado por XP desde las vistas', async () => {
    mockLeaderboardQueries();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    // Ana (1200 XP) rank #1, Carlos (900 XP) rank #2
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    // toLocaleString() emite el número plano en este entorno (sin separador)
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
  });

  it('reordena el ranking con el control "Ordenar por" usando las columnas reales', async () => {
    mockLeaderboardQueries();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    // Por defecto: Puntos → Ana #1
    expect(within(screen.getByTestId('athlete-u1')).getByText('#1')).toBeInTheDocument();

    // Racha → Bea (12 días) pasa al #1
    fireEvent.click(screen.getByRole('button', { name: /^racha$/i }));
    expect(within(screen.getByTestId('athlete-u3')).getByText('#1')).toBeInTheDocument();

    // Sesiones → Carlos (50 entrenamientos) pasa al #1
    fireEvent.click(screen.getByRole('button', { name: /^sesiones$/i }));
    expect(within(screen.getByTestId('athlete-u2')).getByText('#1')).toBeInTheDocument();
  });

  it('presenta el muro real de la comunidad dentro de la card "Muro de la Comunidad"', async () => {
    mockLeaderboardQueries();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    expect(screen.getByText('Muro de la Comunidad')).toBeInTheDocument();
    // El muro es el SuggestionsSection real (form + listado), no un feed inventado.
    expect(
      screen.getByPlaceholderText('Escribe aquí tu sugerencia, idea o reporte...'),
    ).toBeInTheDocument();
  });

  it('el CTA "Entrenar ahora" navega a la biblioteca', async () => {
    mockLeaderboardQueries();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /entrenar ahora/i })).toHaveAttribute(
      'href',
      '/biblioteca',
    );
  });

  it('muestra la fila "Tú" con nivel, puntos y progreso real hacia el Top 10', async () => {
    // 12 atletas: u12 (sesión actual) queda #12 con 105 XP; el 10º tiene 210 XP
    // → faltan 105 pts y el camino va al 50%.
    const profiles = Array.from({ length: 12 }, (_, i) => ({
      id: `u${i + 1}`,
      nombre_completo: `Atleta ${i + 1}`,
      avatar_url: null,
    }));
    const stats = profiles.map((p, i) => ({
      user_id: p.id,
      xp_total: i === 11 ? 105 : 300 - i * 10,
      total_workouts: 10,
      dias_racha: 1,
    }));
    mockLeaderboardQueries(profiles, stats);
    mockAuth.user = { id: 'u12', email: 'e2e@davefit.local' };
    mockAuth.perfil = { nombre_completo: 'David Test', nivel: 'intermedio' };

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tú (David)')).toBeInTheDocument();
    });

    expect(screen.getByText('Nivel intermedio')).toBeInTheDocument();
    expect(screen.getByText('+105 pts para entrar al Top 10')).toBeInTheDocument();
    expect(screen.getAllByText(/50% camino al Top 10/).length).toBe(1);
    // Puntos reales del usuario (también aparece en su fila de la tabla)
    expect(screen.getAllByText('105').length).toBeGreaterThanOrEqual(2);
  });

  it('muestra un estado coherente (sin barra rota) si el usuario ya está en el Top 10', async () => {
    mockLeaderboardQueries();
    mockAuth.user = { id: 'u1', email: 'ana@davefit.local' };
    mockAuth.perfil = { nombre_completo: 'Ana Gómez', nivel: 'avanzado' };

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tú (Ana)')).toBeInTheDocument();
    });

    expect(screen.getByText('Top 10 asegurado')).toBeInTheDocument();
    expect(screen.getAllByText(/100%/).length).toBeGreaterThan(0);
  });
});
