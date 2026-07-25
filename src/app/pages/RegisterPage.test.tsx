import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';

const mockSignUp = vi.fn();
const mockSignInWithGoogle = vi.fn();

const mockAuth = {
  user: null,
  perfil: null,
  accessToken: null,
  loading: false,
  isAdmin: false,
  signOut: vi.fn(),
  signIn: vi.fn(),
  signUp: mockSignUp,
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

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockAuth.loading = false;
    mockSignUp.mockResolvedValue({});
  });

  it('renders left brand panel with FitDave branding', () => {
    renderRegisterPage();

    // Left panel branding (hidden on mobile, visible on lg)
    expect(screen.getByText('Plan Estudiante')).toBeInTheDocument();
    expect(
      screen.getByText(/Entrenamientos en casa hechos para estudiantes/)
    ).toBeInTheDocument();
    expect(screen.getByText(/2k/)).toBeInTheDocument();
  });

  it('renders right panel with Crea tu Cuenta heading and form fields', () => {
    renderRegisterPage();

    // Right panel heading
    expect(screen.getByText('Crea tu Cuenta')).toBeInTheDocument();

    // Form fields
    expect(screen.getByPlaceholderText('Tu nombre completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('shows Continuar con Google button', () => {
    renderRegisterPage();

    const googleButton = screen.getByText('Continuar con Google');
    expect(googleButton).toBeInTheDocument();
  });

  it('validates required fields and shows error messages', async () => {
    renderRegisterPage();

    // Submit empty form
    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });
    fireEvent.click(submitButton);

    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText('Ingresa tu nombre completo')).toBeInTheDocument();
    });

    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    mockSignUp.mockResolvedValue({});

    renderRegisterPage();

    fireEvent.change(screen.getByPlaceholderText('Tu nombre completo'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'test@davefit.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), {
      target: { value: 'Test1234' },
    });

    const submitButton = screen.getByRole('button', { name: /Crear Cuenta/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@davefit.com', 'Test1234', 'Test User');
    });
  });

  it('renders link to login page', () => {
    renderRegisterPage();

    const loginLink = screen.getByText('Inicia Sesión');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});
