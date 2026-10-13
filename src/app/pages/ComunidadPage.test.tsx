import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { insforge } from '../../lib/insforge';
import ComunidadPage from './ComunidadPage';

// Columnas públicas expuestas por las vistas (DAS-1/DAS-3):
// - perfiles_public: id, nombre_completo, avatar_url
// - user_stats_public: user_id, xp_total, total_workouts, dias_racha
// El mock NO incluye streak_days: la vista solo expone dias_racha (DAS-3).
const mockProfiles = [
  { id: 'u1', nombre_completo: 'Ana Gómez', avatar_url: 'https://cdn.example/ana.jpg' },
  { id: 'u2', nombre_completo: 'Carlos Ruiz', avatar_url: null },
];

const mockStats = [
  { user_id: 'u1', xp_total: 1200, total_workouts: 30, dias_racha: 5 },
  { user_id: 'u2', xp_total: 900, total_workouts: 18, dias_racha: 3 },
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
function mockLeaderboardQueries(): Map<string, BuilderSpy> {
  const builders = new Map<string, BuilderSpy>();

  (insforge.database.from as any).mockImplementation((table: string) => {
    const builder: any = {};
    builder.select = vi.fn((cols: string) => {
      if (table === 'perfiles_public') {
        return Promise.resolve({ data: mockProfiles, error: null });
      }
      if (table === 'user_stats_public') {
        return Promise.resolve({ data: mockStats, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    builders.set(table, builder);
    return builder;
  });

  return builders;
}

describe('ComunidadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta las vistas públicas, no las tablas base (DAS-3)', async () => {
    mockLeaderboardQueries();

    render(<ComunidadPage />);

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

    render(<ComunidadPage />);

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

    render(<ComunidadPage />);

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    // Ana (1200 XP) rank #1, Carlos (900 XP) rank #2
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    // toLocaleString() emite el número plano en este entorno (sin separador)
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
  });
});
