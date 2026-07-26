import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import NutritionPage from './NutritionPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@davefit.com' },
    perfil: {},
    accessToken: 'fake-token',
  }),
}));

function mockChain(resolvedValue: any = { data: [], error: null }) {
  const base: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };
  base.order = vi.fn().mockResolvedValue(resolvedValue);
  return base;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NutritionPage />
    </MemoryRouter>
  );
}

describe('NutritionPage - no premium elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no contiene elementos Premium ni de suscripción en el DOM', async () => {
    vi.mocked(insforge.database.from).mockImplementation(() =>
      mockChain({ data: [], error: null })
    );

    renderPage();

    // Wait for the page to load (empty state should appear)
    await waitFor(() => {
      expect(screen.getByText('Pronto tendremos recetas disponibles')).toBeInTheDocument();
    });

    // Assert no premium/suscripción content exists
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
    expect(screen.queryByText('Actualizar a Premium')).not.toBeInTheDocument();
    expect(screen.queryByText('Desbloquea recetas premium')).not.toBeInTheDocument();
    expect(screen.queryByText('Desbloquea todas las recetas premium')).not.toBeInTheDocument();
  });
});
