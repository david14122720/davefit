import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import YogaPracticePage from './YogaPracticePage';

// vi.mock se hoistea: los datos compartidos deben declararse con vi.hoisted.
const { rutinaMock } = vi.hoisted(() => ({
  rutinaMock: {
    id: 'r1',
    nombre: 'Rutina Test',
    nivel: 'principiante',
    posiciones: [
      {
        id: 'p1',
        duracion_segundos: 30,
        posicion: { id: 'pos1', nombre: 'Postura del loto', descripcion: 'Descanso activo' },
      },
    ],
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@davefit.com' } }),
}));

vi.mock('../context/YogaContext', () => ({
  useYoga: () => ({
    rutinaActual: rutinaMock,
    loadingRutinas: false,
    errorRutinas: null,
    fetchRutina: vi.fn(),
    session: { rutina: rutinaMock, posicionIndex: 0, startTime: new Date() },
    startSession: vi.fn(),
    nextPosition: vi.fn(),
    prevPosition: vi.fn(),
    completeSession: vi.fn(),
    resetSession: vi.fn(),
  }),
}));

vi.mock('../hooks/useCelebration', () => ({
  useCelebration: () => ({
    celebrateCompletion: vi.fn(),
    celebrateLevelUp: vi.fn(),
    celebrateStreak: vi.fn(),
    celebrateAchievement: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/yoga/practicar/r1']}>
      <Routes>
        <Route path="/yoga/practicar/:rutinaId" element={<YogaPracticePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('YogaPracticePage', () => {
  // Regresión: `handleFinalizar` se referenciaba en el array de dependencias de
  // `handleTimerComplete`/`handleSiguiente` ANTES de su `const` → el array se
  // evalúa durante el render y lanzaba ReferenceError (TDZ), rompiendo
  // /yoga/practicar/:rutinaId por completo.
  it('renderiza la práctica sin lanzar ReferenceError por uso antes de declarar', () => {
    renderPage();

    expect(screen.getByText('Rutina Test')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });
});
