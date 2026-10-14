import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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

// Placeholder del buscador según el rediseño Stitch
const SEARCH_PLACEHOLDER =
  'Buscar recetas por nombre, ingredientes o macros (ej. pollo, avena, post-entreno)...';

// Dataset de prueba: 3 recetas con tiempos/proteínas/calorías distintos y
// la tercera sin `grasas` para validar el render condicional de macros.
const RECETAS_MOCK = [
  {
    id: 'r1',
    nombre: 'Avena Nocturna',
    descripcion: 'Avena con frutos rojos',
    ingredientes: ['avena'],
    instrucciones: ['mezclar'],
    tiempo_preparacion: 5,
    dificultad: 'facil',
    calorias: 380,
    proteinas: 30,
    carbos: 45,
    grasas: 10,
    imagen_url: null,
  },
  {
    id: 'r2',
    nombre: 'Bowl de Pollo',
    descripcion: 'Pollo con arroz y aguacate',
    ingredientes: ['pollo'],
    instrucciones: ['cocinar'],
    tiempo_preparacion: 20,
    dificultad: 'media',
    calorias: 520,
    proteinas: 45,
    carbos: 52,
    grasas: 12,
    imagen_url: null,
  },
  {
    id: 'r3',
    nombre: 'Wrap de Atún',
    descripcion: 'Wrap integral con atún',
    ingredientes: ['atún'],
    instrucciones: ['armar'],
    tiempo_preparacion: 10,
    dificultad: 'dificil',
    calorias: 410,
    proteinas: 38,
    carbos: 35,
    imagen_url: null,
  },
];

function mockRecetas() {
  vi.mocked(insforge.database.from).mockImplementation(() =>
    mockChain({ data: RECETAS_MOCK, error: null })
  );
}

async function renderWithRecetas() {
  renderPage();
  await waitFor(() => {
    expect(screen.getByText('Bowl de Pollo')).toBeInTheDocument();
  });
}

/** Títulos de las cards (solo <article>) en orden de DOM */
function titulos() {
  return Array.from(document.querySelectorAll('article')).map(
    (card) => card.querySelector('h3')?.textContent ?? ''
  );
}

function selectorOrden() {
  return screen.getByRole('combobox', { name: 'Ordenar por' });
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

describe('NutritionPage - rediseño Stitch (orden y tarjetas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conserva el orden de la consulta con "Más recientes" y muestra el contador', async () => {
    mockRecetas();
    await renderWithRecetas();

    expect(titulos()).toEqual(['Avena Nocturna', 'Bowl de Pollo', 'Wrap de Atún']);
    expect(screen.getByText('3 disponibles')).toBeInTheDocument();
  });

  it('ordena por mayor proteína', async () => {
    mockRecetas();
    await renderWithRecetas();

    fireEvent.change(selectorOrden(), { target: { value: 'proteinas' } });

    expect(titulos()).toEqual(['Bowl de Pollo', 'Wrap de Atún', 'Avena Nocturna']);
  });

  it('ordena por menor tiempo de preparación', async () => {
    mockRecetas();
    await renderWithRecetas();

    fireEvent.change(selectorOrden(), { target: { value: 'tiempo' } });

    expect(titulos()).toEqual(['Avena Nocturna', 'Wrap de Atún', 'Bowl de Pollo']);
  });

  it('ordena por menos calorías', async () => {
    mockRecetas();
    await renderWithRecetas();

    fireEvent.change(selectorOrden(), { target: { value: 'calorias' } });

    expect(titulos()).toEqual(['Avena Nocturna', 'Wrap de Atún', 'Bowl de Pollo']);
  });

  it('muestra la fila de macros solo con los campos disponibles', async () => {
    mockRecetas();
    await renderWithRecetas();

    // Card con todos los macros (incluye grasas)
    const cardBowl = screen.getByText('Bowl de Pollo').closest('article')!;
    expect(within(cardBowl).getByText('Calorías')).toBeInTheDocument();
    expect(within(cardBowl).getByText('520 kcal')).toBeInTheDocument();
    expect(within(cardBowl).getByText('Proteínas')).toBeInTheDocument();
    expect(within(cardBowl).getByText('45g')).toBeInTheDocument();
    expect(within(cardBowl).getByText('Carbohidratos')).toBeInTheDocument();
    expect(within(cardBowl).getByText('52g')).toBeInTheDocument();
    expect(within(cardBowl).getByText('Grasas')).toBeInTheDocument();
    expect(within(cardBowl).getByText('12g')).toBeInTheDocument();

    // Card sin grasas: no debe mostrar la celda de Grasas
    const cardWrap = screen.getByText('Wrap de Atún').closest('article')!;
    expect(within(cardWrap).queryByText('Grasas')).not.toBeInTheDocument();
    expect(within(cardWrap).getByText('410 kcal')).toBeInTheDocument();
  });

  it('el CTA de cada tarjeta dice "Ver Receta Completa"', async () => {
    mockRecetas();
    await renderWithRecetas();

    expect(screen.getAllByText('Ver Receta Completa')).toHaveLength(3);
  });
});

describe('NutritionPage - filtros existentes (regresión)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra por búsqueda de texto en nombre o descripción', async () => {
    mockRecetas();
    await renderWithRecetas();

    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
      target: { value: 'pollo' },
    });

    expect(titulos()).toEqual(['Bowl de Pollo']);
    expect(screen.getByText('1 disponibles')).toBeInTheDocument();
  });

  it('filtra por dificultad con el chip activo en bg-primary', async () => {
    mockRecetas();
    await renderWithRecetas();

    fireEvent.click(screen.getByText('Fáciles'));

    expect(titulos()).toEqual(['Avena Nocturna']);
    expect(screen.getByText('Fáciles').closest('button')!.className).toContain('bg-primary');
  });

  it('muestra "Sin resultados" y Limpiar filtros cuando la búsqueda no coincide', async () => {
    mockRecetas();
    await renderWithRecetas();

    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
      target: { value: 'zzz' },
    });

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Limpiar filtros'));

    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue('');
    expect(titulos()).toHaveLength(3);
  });
});
