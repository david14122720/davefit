import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// ---------------------------------------------------------------------------
// Mock AuthContext — hoisted above module declarations by vi.mock
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Helper: renders ProtectedRoute + a Location spy so we can assert redirects
// ---------------------------------------------------------------------------
function LocationDisplay() {
    const location = useLocation();
    return <span data-testid="location-pathname">{location.pathname}</span>;
}

function renderProtectedRoute({
    adminOnly = false,
    initialEntries = ['/'],
}: { adminOnly?: boolean; initialEntries?: string[] } = {}) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <LocationDisplay />
            <ProtectedRoute adminOnly={adminOnly}>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
        </MemoryRouter>,
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ProtectedRoute', () => {
    beforeEach(() => {
        mockUseAuth.mockReset();
    });

    it('shows loading spinner when loading is true', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true, isAdmin: false });

        renderProtectedRoute();

        // Spinner must be visible; protected content must NOT be present
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('redirects to /login when user is null', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false, isAdmin: false });

        renderProtectedRoute();

        // After the Navigate fires, location should be /login
        expect(screen.getByTestId('location-pathname')).toHaveTextContent('/login');
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders children when user is authenticated', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'test@test.com' },
            loading: false,
            isAdmin: false,
        });

        renderProtectedRoute();

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('redirects non-admin user to /dashboard on admin-only route', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'test@test.com' },
            loading: false,
            isAdmin: false,
        });

        renderProtectedRoute({ adminOnly: true });

        expect(screen.getByTestId('location-pathname')).toHaveTextContent('/dashboard');
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders children for admin user on admin-only route', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '2', email: 'admin@test.com' },
            loading: false,
            isAdmin: true,
        });

        renderProtectedRoute({ adminOnly: true });

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});
