import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { insforge } from '../../lib/insforge';
import WorkoutPracticePage from './WorkoutPracticePage';

const mockAuth = {
    user: { id: '1', email: 'test@davefit.com' },
    perfil: {},
    accessToken: 'fake-token',
    loading: false,
    isAdmin: false,
};

vi.mock('../context/AuthContext', () => ({
    useAuth: () => mockAuth,
    AuthProvider: ({ children }: any) => children,
}));

// Real hook creates an AudioContext (thrown in jsdom) — no-op the celebration.
vi.mock('../hooks/useCelebration', () => ({
    useCelebration: () => ({ celebrateCompletion: vi.fn(), celebrateLevelUp: vi.fn() }),
}));

vi.mock('../../lib/gamification', () => ({
    processWorkoutCompletion: vi.fn(),
    calcularCalorias: vi.fn(),
}));

const DESCRIPCION = 'Empuje horizontal para el desarrollo del pecho';
const rutina = { id: 'r1', nombre: 'Rutina Test', duracion_estimada: 30, calorias_estimadas: 200 };
const rutinaEjercicios = [{ id: 're1', rutina_id: 'r1', ejercicio_id: 'e1', orden: 1, series: 3, repeticiones: '10', descanso_segundos: 60 }];
const ejercicioConDescripcion = [{ id: 'e1', nombre: 'Press Banca', grupo_muscular: 'pecho', descripcion: DESCRIPCION, instrucciones: ['Paso uno', 'Paso dos'] }];
const ejercicioSinDescripcion = [{ id: 'e1', nombre: 'Press Banca', grupo_muscular: 'pecho', instrucciones: ['Paso uno'] }];

/**
 * Stubs the insforge.database.from() chain per table on the real `../../lib/insforge`
 * module (globally mocked in src/test/setup.ts). db.ts is NOT mocked — real
 * queryWithRetry/getById run against this chain.
 */
function mockDatabase({ rutina: rutinaData, ejerciciosRutina, ejercicios }: {
    rutina?: any;
    ejerciciosRutina?: any[];
    ejercicios?: any[];
}) {
    vi.mocked(insforge.database.from).mockImplementation(() => {
        const chain: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: ejercicios ?? [], error: null }),
            order: vi.fn().mockResolvedValue({ data: ejerciciosRutina ?? [], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: rutinaData ?? null, error: null }),
        };
        return chain;
    });
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/rutinas/practicar/r1']}>
            <Routes>
                <Route path="/rutinas/practicar/:rutinaId" element={<WorkoutPracticePage />} />
            </Routes>
        </MemoryRouter>
    );
}

async function openInfoModal(container: HTMLElement) {
    const infoButton = container.querySelector('svg.lucide-info')!.closest('button')!;
    fireEvent.click(infoButton);
    expect(screen.getByText('Guía de Operación')).toBeInTheDocument();
}

describe('WorkoutPracticePage — descripción del ejercicio (R1/R2)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('muestra la descripción en el overlay (line-clamp-2) y en la guía modal antes de los pasos', async () => {
        mockDatabase({ rutina, ejerciciosRutina: rutinaEjercicios, ejercicios: ejercicioConDescripcion });
        const { container } = renderPage();

        await waitFor(() => {
            expect(screen.getByText('Press Banca')).toBeInTheDocument();
        });

        // R1: descripción presente en el overlay, con clamp de 2 líneas
        const descOverlay = screen.getByText(DESCRIPCION);
        expect(descOverlay).toHaveClass('line-clamp-2');

        // R2: abrir la guía modal → descripción completa arriba + pasos abajo
        await openInfoModal(container);
        expect(screen.getAllByText(DESCRIPCION)).toHaveLength(2);
        expect(screen.getByText('Paso uno')).toBeInTheDocument();
        expect(screen.getByText('Paso dos')).toBeInTheDocument();
    });

    it('no renderiza ningún bloque de descripción cuando no existe (null-safe)', async () => {
        mockDatabase({ rutina, ejerciciosRutina: rutinaEjercicios, ejercicios: ejercicioSinDescripcion });
        const { container } = renderPage();

        await waitFor(() => {
            expect(screen.getByText('Press Banca')).toBeInTheDocument();
        });

        // R1 ausente: ningún elemento con clamp en el overlay
        expect(container.querySelector('.line-clamp-2')).toBeNull();

        // R2 ausente: la modal no muestra bloque "Descripción" y los pasos siguen intactos
        await openInfoModal(container);
        expect(screen.queryByText('Descripción')).not.toBeInTheDocument();
        expect(screen.queryByText(DESCRIPCION)).not.toBeInTheDocument();
        expect(screen.getByText('Paso uno')).toBeInTheDocument();
    });
});
