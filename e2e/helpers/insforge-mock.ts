// ============================================================
// InsForge backend mock for Playwright e2e tests.
//
// Guarantees (see dashboard.spec.ts assertions):
// - Every backend request is fulfilled from local fixtures; nothing is
//   ever forwarded to the real backend (zero production traffic, zero
//   production writes). The client talks to the app origin and the dev
//   server proxies /api/auth, /api/database and /api/storage to the
//   backend (src/lib/insforge-url.ts), so the mock intercepts those
//   same-origin prefixes too.
// - Requests to origins other than the local dev server are aborted
//   and recorded, so a test can fail when anything escaped the mock.
//
// Boot dance reproduced (from @insforge/sdk 1.2.0 + AuthContext):
// 1. `insforge_csrf_token` cookie present → AuthContext calls
//    auth.getCurrentUser().
// 2. Browser-mode getCurrentUser() has no in-memory session yet, so the
//    SDK calls POST /api/auth/refresh (credentials: include,
//    X-CSRF-Token header) and stores the returned session in memory.
// 3. AuthContext then reads the in-memory token and loads `perfiles`.
// 4. DashboardPage/XPBar/WeeklyGoal fire the records queries mocked here.
// ============================================================

import type { Page, Request, Route } from '@playwright/test';

/**
 * Backend origin under test. Matches PUBLIC_INSFORGE_URL from the local
 * dev environment (.env). If a future environment changes it, the mock
 * will not recognize the traffic and the test fails loudly through
 * `unmockedRequests` instead of leaking to the real backend.
 */
export const INSFORGE_ORIGIN =
    process.env.PUBLIC_INSFORGE_URL ?? 'http://192.168.50.121:7130';

/** Local dev-server origins that should hit the real (local) Astro server. */
const APP_ORIGINS = new Set(['http://localhost:4321', 'http://127.0.0.1:4321']);

/**
 * API prefixes the browser sends to the app origin and the dev server proxies
 * to the backend. They must be mocked here; the app's own routes (/api/stats,
 * /api/suggestions, /api/admin/*) are not in this list and keep reaching the
 * real Astro server.
 */
const SAME_ORIGIN_API_PREFIXES = ['/api/auth', '/api/database', '/api/storage'];

/**
 * True when a request belongs to the backend: either the absolute backend
 * origin (direct mode) or one of the proxied same-origin API prefixes.
 */
function isBackendRequest(url: URL): boolean {
    if (url.origin === INSFORGE_ORIGIN) return true;
    if (!APP_ORIGINS.has(url.origin)) return false;
    return SAME_ORIGIN_API_PREFIXES.some(
        (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
}

/**
 * Static third-party asset origins fulfilled with empty responses so the
 * browser never reaches the real internet and no console error is caused
 * by the harness itself (the app links Inter from Google Fonts).
 */
const STUBBED_ASSET_ORIGINS = new Set(['https://fonts.googleapis.com', 'https://fonts.gstatic.com']);

/**
 * CORS headers for cross-origin fulfillments. Playwright does not add them
 * automatically; `access-control-expose-headers` is required so the browser
 * exposes `Content-Range` (postgrest-js reads it for `{ count: 'exact' }`).
 */
const CORS_HEADERS: Record<string, string> = {
    'access-control-allow-origin': 'http://localhost:4321',
    'access-control-allow-credentials': 'true',
    'access-control-expose-headers': 'content-range',
};

export const TEST_CSRF = 'e2e-csrf-token';
export const TEST_ACCESS_TOKEN = 'e2e-access-token';

export const TEST_USER = {
    id: 'e2e00000-0000-4000-8000-000000000001',
    email: 'e2e.dashboard@davefit.test',
    profile: { name: 'Test' },
    metadata: null,
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

export const TEST_PERFIL = {
    id: TEST_USER.id,
    email: TEST_USER.email,
    nombre_completo: 'Test Usuario',
    avatar_url: null,
    fecha_nacimiento: '1995-06-15',
    genero: 'masculino',
    peso_actual: 78,
    altura: 178,
    objetivo: 'ganar_musculo',
    nivel: 'Intermedio',
    preferencia_lugar: 'casa',
    rol: 'usuario',
    dias_entrenamiento_semana: 3,
    onboarding_completado: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
};

export const TEST_STATS = {
    id: 'e2e00000-0000-4000-8000-000000000002',
    user_id: TEST_USER.id,
    xp_total: 2450,
    nivel: 5,
    dias_racha: 12,
    ultimo_entreno: '2026-01-01T00:00:00.000Z',
    racha_bonus: 0,
    total_workouts: 87,
    longest_streak: 21,
    weekly_score: 340,
    monthly_score: 1200,
    created_at: '2026-01-01T00:00:00.000Z',
};

/**
 * Two recipes for the dashboard "Recarga Post-Entreno" section
 * (recetas query: select * order created_at desc limit 2).
 */
export const TEST_RECIPES = [
    {
        id: 'e2e-receta-1',
        nombre: 'Bowl E2E de Pollo y Arroz',
        descripcion: 'Receta fixture para el e2e del dashboard.',
        ingredientes: ['pollo', 'arroz'],
        instrucciones: ['cocinar'],
        tiempo_preparacion: 20,
        dificultad: 'facil',
        calorias: 520,
        proteinas: 45,
        carbos: 52,
        grasas: 12,
        imagen_url: null,
        created_at: '2026-01-02T00:00:00.000Z',
    },
    {
        id: 'e2e-receta-2',
        nombre: 'Batido E2E de Plátano y Café',
        descripcion: 'Receta fixture para el e2e del dashboard.',
        ingredientes: ['plátano', 'café'],
        instrucciones: ['licuar'],
        tiempo_preparacion: 3,
        dificultad: 'facil',
        calorias: 260,
        proteinas: 22,
        carbos: 36,
        grasas: 4,
        imagen_url: null,
        created_at: '2026-01-01T00:00:00.000Z',
    },
];

/**
 * Public community fixtures (perfiles_public + user_stats_public) consumed by
 * the dashboard "Comunidad en Vivo" widget (top 3 by XP). Names are single
 * words because the widget shows only the first name.
 */
export const TEST_COMMUNITY_PERFILES = [
    { id: 'e2e-atleta-1', nombre_completo: 'AtletaUno', avatar_url: null },
    { id: 'e2e-atleta-2', nombre_completo: 'AtletaDos', avatar_url: null },
    { id: 'e2e-atleta-3', nombre_completo: 'AtletaTres', avatar_url: null },
];

export const TEST_COMMUNITY_STATS = [
    { user_id: 'e2e-atleta-1', xp_total: 1800, total_workouts: 42, dias_racha: 9 },
    { user_id: 'e2e-atleta-2', xp_total: 1200, total_workouts: 30, dias_racha: 5 },
    { user_id: 'e2e-atleta-3', xp_total: 600, total_workouts: 12, dias_racha: 2 },
];

const HISTORY_NAMES = [
    'Full Body Express',
    'Fuerza Total',
    'Core y Movilidad',
    'Cardio HIIT',
    'Piernas y Glúteos',
    'Empuje Superior',
    'Tirón Superior',
    'Yoga Flow',
    'Funcional 30',
    'Estiramiento Total',
];

export interface HistorialRow {
    id: string;
    usuario_id: string;
    rutina_id: string;
    tipo: string;
    duracion_real: number;
    calorias_quemadas: number;
    fecha: string;
    created_at: string;
    rutinas: { nombre: string };
}

export interface WeekItem {
    id: string;
    usuario_id: string;
    rutina_id: string;
    tipo: string;
    duracion_real: number;
    calorias_quemadas: number;
    fecha: string;
}

/** Monday 00:00 local, mirroring `getInicioSemana` in src/app/lib/dates.ts. */
function getInicioSemana(now: Date): Date {
    const inicio = new Date(now);
    const dia = now.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    inicio.setDate(now.getDate() - diff);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
}

/** 10 history rows with nested `rutinas(nombre)`, one per day, newest first. */
export function buildHistoryRows(now: Date = new Date()): HistorialRow[] {
    return HISTORY_NAMES.map((nombre, i) => ({
        id: `e2e-hist-${i + 1}`,
        usuario_id: TEST_USER.id,
        rutina_id: `e2e-rutina-${i + 1}`,
        tipo: 'fuerza',
        duracion_real: 30 + i * 5,
        calorias_quemadas: 200 + i * 25,
        fecha: new Date(now.getTime() - i * 86_400_000).toISOString(),
        created_at: new Date(now.getTime() - i * 86_400_000).toISOString(),
        rutinas: { nombre },
    }));
}

/**
 * 3 sessions inside the current Mon–Sun window (today, yesterday, and
 * two days ago, clamped to Monday 00:30 so the week always has data).
 * Totals: 90 min, 780 kcal.
 */
export function buildWeekItems(now: Date = new Date()): WeekItem[] {
    const floor = getInicioSemana(now).getTime() + 30 * 60_000;
    const durations = [35, 30, 25];
    const calories = [300, 260, 220];
    return durations.map((duracion_real, k) => {
        const ts = Math.max(now.getTime() - k * 86_400_000, floor);
        return {
            id: `e2e-week-${k + 1}`,
            usuario_id: TEST_USER.id,
            rutina_id: `e2e-rutina-${k + 1}`,
            tipo: 'fuerza',
            duracion_real,
            calorias_quemadas: calories[k],
            fecha: new Date(ts).toISOString(),
        };
    });
}

export interface InsforgeMockHarness {
    /** Every intercepted backend request, e.g. "GET /api/database/records/user_stats?select=*". */
    backendRequests: string[];
    /** Backend or third-party requests that had no fixture (test must assert empty). */
    unmockedRequests: string[];
    /** Non-app, non-backend origins that were blocked. */
    nonAppRequests: string[];
}

interface FulfillResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
}

interface Fixtures {
    historyRows: HistorialRow[];
    weekItems: WeekItem[];
}

/**
 * Installs a catch-all route on the page:
 * - backend requests (backend origin or proxied same-origin API prefix) →
 *   fixture fulfillment only;
 * - local dev server → continue (real app assets);
 * - anything else → abort + record.
 */
export async function installInsforgeMock(page: Page): Promise<InsforgeMockHarness> {
    const harness: InsforgeMockHarness = {
        backendRequests: [],
        unmockedRequests: [],
        nonAppRequests: [],
    };
    const fixtures: Fixtures = {
        historyRows: buildHistoryRows(),
        weekItems: buildWeekItems(),
    };

    await page.route('**/*', async (route: Route) => {
        const request = route.request();
        const url = new URL(request.url());

        if (isBackendRequest(url)) {
            const label = `${request.method()} ${url.pathname}${url.search}`;
            harness.backendRequests.push(label);
            const response = resolveBackendResponse(request, url, fixtures);
            if (!response) {
                harness.unmockedRequests.push(label);
                await route.fulfill({
                    status: 400,
                    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
                    body: JSON.stringify({ message: `E2E: unmocked backend request — ${label}` }),
                });
                return;
            }
            await route.fulfill(response);
            return;
        }

        // Non-network schemes (data:, blob:, ws: is not routed anyway).
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            await route.continue();
            return;
        }

        if (APP_ORIGINS.has(url.origin)) {
            await route.continue();
            return;
        }

        if (STUBBED_ASSET_ORIGINS.has(url.origin)) {
            await route.fulfill({
                status: 200,
                headers: { 'content-type': 'text/css', ...CORS_HEADERS },
                body: '',
            });
            return;
        }

        const label = `${request.method()} ${request.url()}`;
        harness.nonAppRequests.push(label);
        harness.unmockedRequests.push(label);
        await route.abort('blockedbyclient');
    });

    return harness;
}

/** Serializes a fixture the way postgrest-js expects, honoring maybeSingle Accept. */
function jsonBody(request: Request, data: unknown, extraHeaders: Record<string, string> = {}): FulfillResponse {
    const accept = request.headers()['accept'] ?? '';
    const wantsObject = accept.includes('application/vnd.pgrst.object+json');
    let payload = data;
    if (wantsObject && Array.isArray(data)) {
        payload = data[0] ?? null;
    }
    return {
        status: 200,
        headers: { 'content-type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
        body: JSON.stringify(payload),
    };
}

function resolveBackendResponse(request: Request, url: URL, fixtures: Fixtures): FulfillResponse | null {
    const method = request.method();
    const path = url.pathname;

    // --- Auth (SDK browser flow) ---
    if (method === 'POST' && path === '/api/auth/refresh') {
        return jsonBody(request, {
            accessToken: TEST_ACCESS_TOKEN,
            user: TEST_USER,
            csrfToken: TEST_CSRF,
        });
    }
    if (method === 'POST' && path === '/api/auth/logout') {
        return jsonBody(request, { success: true });
    }
    if (method === 'GET' && path === '/api/auth/sessions/current') {
        return jsonBody(request, { user: TEST_USER });
    }

    // --- PostgREST-style records (SDK route: /api/database/records/<table>) ---
    if (method === 'GET' && path.startsWith('/api/database/records/')) {
        const table = path.slice('/api/database/records/'.length);
        const select = url.searchParams.get('select') ?? '';

        if (table === 'perfiles') {
            return jsonBody(request, [TEST_PERFIL]);
        }
        if (table === 'user_stats') {
            return jsonBody(request, [TEST_STATS]);
        }
        if (table === 'recetas') {
            // Dashboard "Recarga Post-Entreno": select * order created_at desc limit 2.
            return jsonBody(request, TEST_RECIPES);
        }
        if (table === 'perfiles_public') {
            return jsonBody(request, TEST_COMMUNITY_PERFILES);
        }
        if (table === 'user_stats_public') {
            return jsonBody(request, TEST_COMMUNITY_STATS);
        }
        if (table === 'historial_entrenamientos') {
            // DashboardPage: select('*, rutinas(nombre)') — recent history list.
            if (select.includes('rutinas(')) {
                return jsonBody(request, fixtures.historyRows);
            }
            // DashboardPage week query: select('duracion_real, calorias_quemadas, fecha', {count:'exact'}).
            if (select.includes('duracion_real')) {
                const count = fixtures.weekItems.length;
                return jsonBody(request, fixtures.weekItems, { 'content-range': `0-${count - 1}/${count}` });
            }
            // WeeklyGoal: select('id') — count-only style query.
            if (select === 'id') {
                return jsonBody(request, fixtures.weekItems.map((item) => ({ id: item.id })));
            }
        }
        return null; // unknown table/query → loud failure via unmockedRequests
    }

    return null; // unknown backend endpoint → loud failure via unmockedRequests
}
