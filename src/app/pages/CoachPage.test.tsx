// ============================================================
// CoachPage — tests de comportamiento (test-first, ODD T3)
// ============================================================
//
// Reglas que cubre este test:
// 1. La página carga la cuota vía GET /api/coach y la muestra.
// 2. Enviar un mensaje lo hace por POST /api/coach (nunca directo al
//    gateway de IA) y renderiza la respuesta del Coach.
// 3. Con la cuota agotada (o al recibir 429) se muestra una advertencia
//    amigable y se bloquea el envío.
// 4. La respuesta del Coach se renderiza como Markdown (negritas, listas)
//    con sanitización: los enlaces quedan neutralizados (cero <a>).
// 5. La respuesta se escribe progresivamente (efecto tipeo, S3).

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getUserStats } from '../../lib/stats';
import { calcularBMR, calcularTDEE } from '../../lib/nutrition';
import CoachPage from './CoachPage';

// Perfil base del usuario E2E: sin campos biométricos → TDEE/BMR no computables.
const perfilBase = {
  nombre_completo: 'Coach E2E',
  nivel: null as string | null,
  objetivo: null as string | null,
  peso_actual: null as number | null,
  altura: null as number | null,
  fecha_nacimiento: null as string | null,
  genero: null as string | null,
  dias_entrenamiento_semana: null as number | null,
};

const mockAuth = {
  user: { id: 'user-1', email: 'e2e@davefit.local' },
  perfil: { ...perfilBase },
  accessToken: 'tok-test',
  loading: false,
  isAdmin: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// `user_stats` (racha/nivel) se mockea: el Contexto Activo muestra datos
// reales y el test no debe pegarle a la DB.
vi.mock('../../lib/stats', () => ({
  getUserStats: vi.fn(),
}));

// Stats reales de `user_stats` para el bloque "Contexto Activo".
const statsFixture = {
  id: 'stats-1',
  user_id: 'user-1',
  xp_total: 2450,
  nivel: 6,
  dias_racha: 12,
  ultimo_entreno: null,
  racha_bonus: 0,
  total_workouts: 24,
  longest_streak: 12,
  weekly_score: 100,
  monthly_score: 400,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

interface FakeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}

function fakeResponse(status: number, body: unknown): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const QUOTA_10 = { used: 0, limit: 10, remaining: 10, reset_at: null };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // Por defecto no hay stats (banner de racha oculto) y el perfil no tiene métricas.
  vi.mocked(getUserStats).mockResolvedValue(null);
  mockAuth.perfil = { ...perfilBase };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CoachPage />
    </MemoryRouter>,
  );
}

describe('CoachPage', () => {
  it('renderiza el header y la cuota cargada por GET /api/coach', async () => {
    fetchMock.mockImplementation(async () => fakeResponse(200, QUOTA_10));

    renderPage();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Coach');
    await waitFor(() => {
      expect(screen.getByTestId('coach-quota').textContent).toContain('10/10');
    });
    // El GET fue al endpoint propio, con el token de la sesión.
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/coach');
    expect(init.headers.Authorization).toBe('Bearer tok-test');
  });

  it('envía el mensaje por POST /api/coach y renderiza la respuesta', async () => {
    fetchMock.mockImplementation(async (_url: unknown, init?: any) => {
      if (!init || init.method !== 'POST') return fakeResponse(200, QUOTA_10);
      return fakeResponse(200, {
        reply: '¡Dale! Arrancamos con fuerza esta semana.',
        used: 1,
        limit: 10,
        remaining: 9,
        reset_at: null,
      });
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('10/10'));

    const input = screen.getByTestId('coach-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: ' ¿Qué rutina me recomendás? ' } });
    fireEvent.click(screen.getByTestId('coach-send'));

    // El mensaje del usuario aparece de inmediato (optimistic)…
    expect(await screen.findByText('¿Qué rutina me recomendás?')).toBeTruthy();
    // …y la respuesta del Coach llega por el endpoint seguro (con efecto
    // tipeo: el texto completo aparece cuando termina de escribirse).
    expect(
      await screen.findByText('¡Dale! Arrancamos con fuerza esta semana.', {}, { timeout: 5000 }),
    ).toBeTruthy();

    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('9/10'));

    const postCall = fetchMock.mock.calls.find(([, init]: any) => init?.method === 'POST');
    expect(postCall?.[0]).toBe('/api/coach');
    expect(postCall?.[1].headers.Authorization).toBe('Bearer tok-test');
    const sentBody = JSON.parse(postCall?.[1].body);
    expect(sentBody.message).toBe('¿Qué rutina me recomendás?');

    // El input se limpia tras enviar.
    expect(input.value).toBe('');
  });

  it('muestra advertencia amigable y bloquea el envío cuando la cuota está agotada', async () => {
    fetchMock.mockImplementation(async () =>
      fakeResponse(200, {
        used: 10,
        limit: 10,
        remaining: 0,
        reset_at: '2026-10-14T02:30:00.000Z',
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('coach-limit-warning').textContent).toContain('límite de 10 mensajes');
    });

    const input = screen.getByTestId('coach-input') as HTMLTextAreaElement;
    const send = screen.getByTestId('coach-send') as HTMLButtonElement;
    expect(input.disabled).toBe(true);
    expect(send.disabled).toBe(true);
  });

  it('si llega un 429, avisa, restaura el texto y no deja el mensaje fantasma', async () => {
    fetchMock.mockImplementation(async (_url: unknown, init?: any) => {
      if (!init || init.method !== 'POST') return fakeResponse(200, { ...QUOTA_10, remaining: 1, used: 9 });
      return fakeResponse(429, {
        error: 'limit_reached',
        message: 'Llegaste al límite de 10 mensajes por 5 horas.',
        used: 10,
        limit: 10,
        remaining: 0,
        reset_at: '2026-10-14T02:30:00.000Z',
      });
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('1/10'));

    const input = screen.getByTestId('coach-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Último intento' } });
    fireEvent.click(screen.getByTestId('coach-send'));

    await waitFor(() => {
      expect(screen.getByTestId('coach-limit-warning')).toBeTruthy();
    });
    // El mensaje no se procesó: no queda burbuja fantasma y el texto vuelve al input.
    // (El selector `div` excluye el <textarea>, que contiene el texto restaurado.)
    expect(screen.queryByText('Último intento', { selector: 'div' })).toBeNull();
    expect(input.value).toBe('Último intento');
  });

  it('renderiza Markdown del Coach (negritas y viñetas) y neutraliza enlaces', async () => {
    const reply =
      '**Fuerza:**\n- Press banca\n- Sentadilla\n\nMirá [este plan](https://evil.example)';
    fetchMock.mockImplementation(async (_url: unknown, init?: any) => {
      if (!init || init.method !== 'POST') return fakeResponse(200, QUOTA_10);
      return fakeResponse(200, { reply, used: 1, limit: 10, remaining: 9, reset_at: null });
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('10/10'));

    const input = screen.getByTestId('coach-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '¿Qué hago hoy?' } });
    fireEvent.click(screen.getByTestId('coach-send'));

    const bubble = await screen.findByTestId('coach-msg-assistant');

    // Negritas y viñetas como HTML real (aparecen mientras/se termina de escribir).
    await waitFor(
      () => expect(bubble.querySelector('strong')?.textContent).toBe('Fuerza:'),
      { timeout: 5000 },
    );
    await waitFor(() => expect(bubble.querySelectorAll('li')).toHaveLength(2), { timeout: 5000 });

    // S2: el enlace NO es clickeable — no existe ningún <a> en la burbuja.
    expect(bubble.querySelector('a')).toBeNull();
    // Y no quedan asteriscos de markdown visibles.
    await waitFor(() => expect(bubble.textContent).not.toContain('**'), { timeout: 5000 });
  });

  it('el mensaje del usuario queda como texto plano (sin interpretar markdown)', async () => {
    fetchMock.mockImplementation(async (_url: unknown, init?: any) => {
      if (!init || init.method !== 'POST') return fakeResponse(200, QUOTA_10);
      return fakeResponse(200, { reply: 'ok', used: 1, limit: 10, remaining: 9, reset_at: null });
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('10/10'));

    const literal = '**esto** [no](https://x.example)';
    const input = screen.getByTestId('coach-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: literal } });
    fireEvent.click(screen.getByTestId('coach-send'));

    const userBubble = await screen.findByTestId('coach-msg-user');
    // El texto se muestra tal cual: sin <strong> y sin enlaces.
    expect(userBubble.textContent).toBe(literal);
    expect(userBubble.querySelector('strong')).toBeNull();
    expect(userBubble.querySelector('a')).toBeNull();
  });

  it('escribe la respuesta progresivamente (efecto tipeo) y la completa', async () => {
    const reply =
      'Arrancamos suave: movilidad de hombros, sentadillas al aire y plancha. Después sumamos peso. Todo con descansos de un minuto entre series para recuperar bien.';
    fetchMock.mockImplementation(async (_url: unknown, init?: any) => {
      if (!init || init.method !== 'POST') return fakeResponse(200, QUOTA_10);
      return fakeResponse(200, { reply, used: 1, limit: 10, remaining: 9, reset_at: null });
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('10/10'));

    const input = screen.getByTestId('coach-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '¿Cómo arranco?' } });
    fireEvent.click(screen.getByTestId('coach-send'));

    const bubble = await screen.findByTestId('coach-msg-assistant');
    // Recién aparece: todavía no está el texto completo (efecto tipeo).
    const parcial = bubble.textContent?.length ?? 0;
    expect(parcial).toBeLessThan(reply.length);

    // Y termina mostrando el texto completo.
    await waitFor(() => expect(bubble.textContent).toBe(reply), { timeout: 6000 });
  });

  it('los chips de consultas sugeridas rellenan el input sin enviar nada', async () => {
    fetchMock.mockImplementation(async () => fakeResponse(200, QUOTA_10));

    renderPage();
    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('10/10'));

    fireEvent.click(
      screen.getByRole('button', { name: /Armame una cena hiperproteica rápida/ }),
    );

    const input = screen.getByTestId('coach-input') as HTMLTextAreaElement;
    expect(input.value).toBe('Armame una cena hiperproteica rápida');
    // Rellenar el input NO consume cuota: no debe existir ningún POST.
    expect(fetchMock.mock.calls.filter(([, init]: any) => init?.method === 'POST')).toHaveLength(0);
  });

  it('muestra el Contexto Activo con datos reales y "—" en métricas no computables', async () => {
    mockAuth.perfil = { ...perfilBase, nivel: 'intermedio', objetivo: 'ganar_fuerza' };
    vi.mocked(getUserStats).mockResolvedValue({ ...statsFixture, dias_racha: 12 } as any);
    fetchMock.mockImplementation(async () => fakeResponse(200, QUOTA_10));

    renderPage();

    await waitFor(() => expect(screen.getByTestId('coach-quota').textContent).toContain('10/10'));

    // Datos reales del perfil y de user_stats en el contexto.
    expect(screen.getByText('Ganar músculo')).toBeTruthy();
    expect(screen.getByText(/Nivel Intermedio/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/12 días racha/)).toBeTruthy());

    // Sin datos base, TDEE/BMR/Peso se muestran honestamente como "—".
    expect(screen.getByText('TDEE / Gasto')).toBeTruthy();
    expect(screen.getByText('BMR basal')).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('calcula TDEE/BMR solo cuando el perfil tiene los datos base', async () => {
    mockAuth.perfil = {
      ...perfilBase,
      peso_actual: 72,
      altura: 178,
      fecha_nacimiento: '1990-01-01',
      genero: 'masculino',
      dias_entrenamiento_semana: 4,
    };
    fetchMock.mockImplementation(async () => fakeResponse(200, QUOTA_10));

    // La misma función de dominio que usa la página: valor esperado exacto.
    const bmrEsperado = calcularBMR(mockAuth.perfil as any) as number;
    const tdeeEsperado = calcularTDEE(mockAuth.perfil as any) as number;
    expect(bmrEsperado).toBeGreaterThan(0);
    expect(tdeeEsperado).toBeGreaterThan(bmrEsperado);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(`${bmrEsperado} kcal/d`)).toBeTruthy(),
    );
    expect(screen.getByText(`${tdeeEsperado.toLocaleString('es-AR')} kcal/d`)).toBeTruthy();
  });
});
