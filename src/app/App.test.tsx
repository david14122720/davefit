import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';

// --- Mock all page modules BEFORE importing App ---

// Mutable auth control
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

vi.mock('./context/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => children,
}));

// Mock sonner to avoid portal issues
vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock all lazy-loaded page modules (they won't load in test environment)
vi.mock('./pages/BibliotecaPage', () => ({
  default: () => <div data-testid="page-biblioteca">Biblioteca Page</div>,
}));
vi.mock('./pages/LoginPage', () => ({
  default: () => <div data-testid="page-login">Login Page</div>,
}));
vi.mock('./pages/RegisterPage', () => ({
  default: () => <div data-testid="page-register">Register Page</div>,
}));
vi.mock('./pages/DashboardPage', () => ({
  default: () => <div data-testid="page-dashboard">Dashboard Page</div>,
}));
vi.mock('./pages/RoutinesPage', () => ({
  default: () => <div data-testid="page-routines">Routines Page</div>,
}));
vi.mock('./pages/ComunidadPage', () => ({
  default: () => <div data-testid="page-comunidad">Comunidad Page</div>,
}));
vi.mock('./pages/YogaPracticePage', () => ({
  default: () => <div data-testid="page-yoga-practice">Yoga Practice Page</div>,
}));
vi.mock('./pages/WorkoutPracticePage', () => ({
  default: () => <div data-testid="page-workout-practice">Workout Practice Page</div>,
}));
vi.mock('./pages/YogaPosicionesPage', () => ({
  default: () => <div data-testid="page-yoga-posiciones">Yoga Posiciones Page</div>,
}));
vi.mock('./pages/AdminPage', () => ({
  default: () => <div data-testid="page-admin">Admin Page</div>,
}));
vi.mock('./pages/AdminEjerciciosPage', () => ({
  default: () => <div data-testid="page-admin-ejercicios">Admin Ejercicios Page</div>,
}));
vi.mock('./pages/AdminRutinasPage', () => ({
  default: () => <div data-testid="page-admin-rutinas">Admin Rutinas Page</div>,
}));
vi.mock('./pages/AdminYogaPosicionesPage', () => ({
  default: () => <div data-testid="page-admin-yoga-posiciones">Admin Yoga Posiciones Page</div>,
}));
vi.mock('./pages/NutritionPage', () => ({
  default: () => <div data-testid="page-nutrition">Nutrition Page</div>,
}));
vi.mock('./pages/ProfilePage', () => ({
  default: () => <div data-testid="page-profile">Profile Page</div>,
}));
vi.mock('./pages/AdminYogaRutinasPage', () => ({
  default: () => <div data-testid="page-admin-yoga-rutinas">Admin Yoga Rutinas Page</div>,
}));

// Import App after all mocks are set up
import App from './App';

function renderAppAtRoute(route: string) {
  window.history.pushState({}, '', route);
  return render(<App />);
}

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockAuth.loading = false;
    window.history.pushState({}, '', '/');
  });

  it('la ruta /biblioteca es accesible sin autenticación', async () => {
    renderAppAtRoute('/biblioteca');

    await waitFor(() => {
      expect(screen.getByTestId('page-biblioteca')).toBeInTheDocument();
    });

    // BibliotecaPage should render, not redirect
    expect(screen.getByText('Biblioteca Page')).toBeInTheDocument();
  });

  it('la ruta /dashboard redirige a login sin autenticación (ProtectedRoute)', async () => {
    renderAppAtRoute('/dashboard');

    await waitFor(() => {
      expect(screen.getByTestId('page-login')).toBeInTheDocument();
    });

    // Dashboard should NOT render
    expect(screen.queryByTestId('page-dashboard')).not.toBeInTheDocument();
  });

  it('la ruta /rutinas/practicar/:id redirige a login sin autenticación', async () => {
    renderAppAtRoute('/rutinas/practicar/123');

    await waitFor(() => {
      expect(screen.getByTestId('page-login')).toBeInTheDocument();
    });

    // WorkoutPracticePage debe estar oculta
    expect(screen.queryByTestId('page-workout-practice')).not.toBeInTheDocument();
  });

  it('la ruta /rutinas/practicar/:id renderiza WorkoutPracticePage con autenticación', async () => {
    mockAuth.user = { id: '1', email: 'test@davefit.com' };

    renderAppAtRoute('/rutinas/practicar/123');

    await waitFor(() => {
      expect(screen.getByTestId('page-workout-practice')).toBeInTheDocument();
    });

    expect(screen.getByText('Workout Practice Page')).toBeInTheDocument();
  });

  it('la ruta /yoga/practicar/:id redirige a login sin autenticación', async () => {
    renderAppAtRoute('/yoga/practicar/123');

    await waitFor(() => {
      expect(screen.getByTestId('page-login')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('page-yoga-practice')).not.toBeInTheDocument();
  });

  it('la ruta /yoga/practicar/:id renderiza YogaPracticePage con autenticación', async () => {
    mockAuth.user = { id: '1', email: 'test@davefit.com' };

    renderAppAtRoute('/yoga/practicar/123');

    await waitFor(() => {
      expect(screen.getByTestId('page-yoga-practice')).toBeInTheDocument();
    });

    expect(screen.getByText('Yoga Practice Page')).toBeInTheDocument();
  });

  // --- Task 3.4: /perfil renders ProfilePage (not redirect), /nutricion renders NutritionPage ---

  it('la ruta /perfil redirige a login sin autenticación (ProtectedRoute)', async () => {
    renderAppAtRoute('/perfil');

    await waitFor(() => {
      expect(screen.getByTestId('page-login')).toBeInTheDocument();
    });

    // Profile should NOT render
    expect(screen.queryByTestId('page-profile')).not.toBeInTheDocument();
  });

  it('la ruta /perfil renderiza ProfilePage con autenticación (sin redirect)', async () => {
    mockAuth.user = { id: '1', email: 'test@davefit.com' };

    renderAppAtRoute('/perfil');

    await waitFor(() => {
      expect(screen.getByTestId('page-profile')).toBeInTheDocument();
    });

    expect(screen.getByText('Profile Page')).toBeInTheDocument();
  });

  it('la ruta /nutricion es accesible sin autenticación', async () => {
    renderAppAtRoute('/nutricion');

    await waitFor(() => {
      expect(screen.getByTestId('page-nutrition')).toBeInTheDocument();
    });

    expect(screen.getByText('Nutrition Page')).toBeInTheDocument();
  });
});
