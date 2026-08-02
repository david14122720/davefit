import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminEjerciciosPage from './AdminEjerciciosPage';
import { getEjercicios, createEjercicio } from '../lib/ejerciciosApi';

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

vi.mock('../lib/ejerciciosApi', () => ({
    getEjercicios: vi.fn(),
    createEjercicio: vi.fn(),
    updateEjercicio: vi.fn(),
    deleteEjercicio: vi.fn(),
}));

const ejerciciosMock = [
    { id: '1', nombre: 'Press Banca', grupo_muscular: 'pecho', nivel: 'intermedio', imagen_url: '' },
    { id: '2', nombre: 'Sentadilla', grupo_muscular: 'piernas', nivel: 'principiante', imagen_url: '' },
];

function renderPage() {
    return render(
        <MemoryRouter>
            <AdminEjerciciosPage />
        </MemoryRouter>
    );
}

describe('AdminEjerciciosPage — catálogo sin nivel/tipo_lugar (R2/R3)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getEjercicios).mockResolvedValue(ejerciciosMock as any);
    });

    it('la búsqueda ya no filtra por nivel: buscar "intermedio" no oculta ejercicios', async () => {
        renderPage();
        await waitFor(() => expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0));

        fireEvent.change(screen.getByPlaceholderText('Buscar ejercicios...'), { target: { value: 'intermedio' } });

        // "intermedio" solo existe en el campo nivel (eliminado del filtro) → ningún resultado
        expect(screen.queryAllByText('Press Banca')).toHaveLength(0);
        expect(screen.queryAllByText('Sentadilla')).toHaveLength(0);
        expect(screen.queryAllByText('No hay ejercicios').length).toBeGreaterThan(0);
    });

    it('la búsqueda sigue funcionando por grupo_muscular', async () => {
        renderPage();
        await waitFor(() => expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0));

        fireEvent.change(screen.getByPlaceholderText('Buscar ejercicios...'), { target: { value: 'pecho' } });

        expect(screen.queryAllByText('Press Banca').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Sentadilla')).toHaveLength(0);
    });

    it('el formulario de creación NO envía nivel ni tipo_lugar en el payload', async () => {
        vi.mocked(createEjercicio).mockResolvedValue(ejerciciosMock[0] as any);
        renderPage();
        await waitFor(() => expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0));

        fireEvent.click(screen.getByText('Nuevo Ejercicio'));
        fireEvent.change(screen.getByPlaceholderText('Nombre del ejercicio'), { target: { value: 'Curl Bíceps' } });
        fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

        await waitFor(() => expect(createEjercicio).toHaveBeenCalled());
        const payload = vi.mocked(createEjercicio).mock.calls[0][1] as Record<string, unknown>;
        expect(payload.nombre).toBe('Curl Bíceps');
        expect(payload.grupo_muscular).toBe('pecho');
        expect('nivel' in payload).toBe(false);
        expect('tipo_lugar' in payload).toBe(false);
    });

    it('la tabla desktop no muestra columnas Lugar ni Nivel', async () => {
        renderPage();
        await waitFor(() => expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0));

        expect(screen.queryAllByText('Lugar')).toHaveLength(0);
        expect(screen.queryAllByText('Nivel')).toHaveLength(0);
    });

    it('las cards mobile no muestran badge de nivel', async () => {
        renderPage();
        await waitFor(() => expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0));

        expect(screen.queryAllByText('intermedio')).toHaveLength(0);
        expect(screen.queryAllByText('principiante')).toHaveLength(0);
    });

    it('el select de grupo muscular ofrece la opción cuello (R3)', async () => {
        renderPage();
        await waitFor(() => expect(screen.getAllByText('Press Banca').length).toBeGreaterThan(0));

        fireEvent.click(screen.getByText('Nuevo Ejercicio'));

        const grupoSelect = screen.getAllByRole('combobox')[0];
        expect(grupoSelect).toHaveValue('pecho');
        const options = Array.from(grupoSelect.querySelectorAll('option')).map(o => o.textContent);
        expect(options).toContain('cuello');
    });
});
