import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from './AppLayout';

// Mutable auth values — mutations survive the hoisted vi.mock because the
// closure captures the *reference*, not the value at factory time.
const mockAuth = {
  user: null as any,
  perfil: null as any,
  accessToken: null as any,
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

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/biblioteca']}>
      <AppLayout>
        <div data-testid="content">Main Content</div>
      </AppLayout>
    </MemoryRouter>
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockAuth.isAdmin = false;
    mockAuth.perfil = null;
  });

  it('renderiza nav item público Nutrición cuando no hay usuario', () => {
    renderLayout();

    expect(screen.getAllByText('Nutrición').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Entrenamientos')).not.toBeInTheDocument();
    expect(screen.queryByText('Progreso')).not.toBeInTheDocument();
    expect(screen.queryByText('Comunidad')).not.toBeInTheDocument();
    expect(screen.queryByText('Ajustes')).not.toBeInTheDocument();
  });

  it('NO renderiza Dashboard cuando no hay usuario', () => {
    renderLayout();

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renderiza nav items completos cuando hay usuario autenticado', () => {
    mockAuth.user = { id: '1', email: 'test@davefit.com' };

    renderLayout();

    expect(screen.getAllByText('Entrenamientos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Nutrición').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Progreso').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Comunidad').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ajustes').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra botones Iniciar Sesión y Registro cuando no hay usuario', () => {
    renderLayout();

    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByText('Registro')).toBeInTheDocument();
  });

  it('NO muestra botones de auth cuando hay usuario (muestra cerrar sesión)', () => {
    mockAuth.user = { id: '1', email: 'test@davefit.com' };
    mockAuth.perfil = { nombre_completo: 'Test User' };

    renderLayout();

    expect(screen.queryByText('Iniciar Sesión')).not.toBeInTheDocument();
    expect(screen.queryByText('Registro')).not.toBeInTheDocument();
    expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
  });

  it('renderiza el contenido hijo dentro del layout', () => {
    renderLayout();

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });
});
