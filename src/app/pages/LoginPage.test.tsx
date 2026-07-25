import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();

const mockAuth = {
  user: null,
  perfil: null,
  accessToken: null,
  loading: false,
  isAdmin: false,
  signOut: vi.fn(),
  signIn: mockSignIn,
  signUp: vi.fn(),
  signInWithGoogle: mockSignInWithGoogle,
  refreshPerfil: vi.fn(),
  updatePerfil: vi.fn(),
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn() },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockAuth.loading = false;
    mockSignIn.mockResolvedValue({});
  });

  it('renders left brand panel with FitDave branding and Plan Estudiante tagline', () => {
    renderLoginPage();

    // Left panel branding
    expect(screen.getByText('Plan Estudiante')).toBeInTheDocument();

    // Description text
    expect(
      screen.getByText(/Entrenamientos en casa hechos para estudiantes/)
    ).toBeInTheDocument();

    // Stats
    expect(screen.getByText(/2k/)).toBeInTheDocument();
  });

  it('renders right form panel with Bienvenido heading and input fields', () => {
    renderLoginPage();

    // Right panel heading
    expect(screen.getByText('¡Bienvenido de nuevo!')).toBeInTheDocument();

    // Input fields
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('shows Continuar con Google button', () => {
    renderLoginPage();

    // At least one Google button visible (left panel + mobile)
    const googleButtons = screen.getAllByText('Continuar con Google');
    expect(googleButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('submits form with valid email and password', async () => {
    mockSignIn.mockResolvedValue({});

    renderLoginPage();

    const emailInput = screen.getByPlaceholderText('tu@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'test@davefit.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Test1234' } });

    const submitButton = screen.getByRole('button', { name: /Iniciar Sesión/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@davefit.com', 'Test1234');
    });
  });

  it('renders divider text O CONTINÚA CON EMAIL', () => {
    renderLoginPage();

    expect(screen.getByText('O CONTINÚA CON EMAIL')).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    renderLoginPage();

    const registerLink = screen.getByText('Regístrate');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });
});
