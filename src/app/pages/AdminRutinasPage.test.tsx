import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminRutinasPage from './AdminRutinasPage';
import { getRutinas } from '../lib/rutinasApi';
import { getEjercicios } from '../lib/ejerciciosApi';

const mockAuth = {
    user: { id: '1', email: 'admin@davefit.com' },
    perfil: { rol: 'admin' },
    accessToken: 'fake-token',
    loading: false,
    isAdmin: true,
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

vi.mock('../lib/rutinasApi', () => ({
    getRutinas: vi.fn(),
    deleteRutina: vi.fn(),
    saveRutinaConEjercicios: vi.fn(),
    getRutinaEjercicios: vi.fn(),
}));

vi.mock('../lib/ejerciciosApi', () => ({
    getEjercicios: vi.fn(),
}));

const ejercicioMock = {
    id: '1',
    nombre: 'Press Banca',
    grupo_muscular: 'pecho',
    nivel: 'intermedio',
    imagen_url: '',
};

function renderPage() {
    return render(
        <MemoryRouter>
            <AdminRutinasPage />
        </MemoryRouter>
    );
}

describe('AdminRutinasPage — picker de ejercicios sin nivel (R2)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getRutinas).mockResolvedValue([]);
        vi.mocked(getEjercicios).mockResolvedValue([ejercicioMock] as any);
    });

    it('el picker muestra solo grupo_muscular, sin el nivel del ejercicio', async () => {
        renderPage();
        await waitFor(() => expect(screen.getByText('0 rutinas creadas')).toBeInTheDocument());

        fireEvent.click(screen.getAllByText('Nueva Rutina')[0]);
        fireEvent.click(screen.getByText('Agregar Ejercicios'));

        const pickerButton = screen.getByRole('button', { name: /press banca/i });
        expect(pickerButton).toHaveTextContent('pecho');
        expect(pickerButton.textContent).not.toContain('intermedio');
        expect(pickerButton.textContent).not.toContain('•');
    });
});
