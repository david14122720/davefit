import { test, expect } from '@playwright/test';

const INSFORGE_AUTH = '**/api/auth/**';
const INSFORGE_DB = '**/rest/v1/**';

// ---------------------------------------------------------------------------
// Shared: intercept auth + DB for authenticated routines page
// ---------------------------------------------------------------------------
async function mockAuthenticatedSession(page: any) {
    await page.route(INSFORGE_AUTH, async (route: any) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                accessToken: 'mock-token',
                user: { id: 'e2e-rut', email: 'rutinas@test.com' },
            }),
        });
    });

    await page.route(INSFORGE_DB, async (route: any) => {
        const url = route.request().url();

        if (url.includes('perfiles')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'e2e-rut',
                    email: 'rutinas@test.com',
                    nombre_completo: 'Rutinas User',
                    rol: 'usuario',
                }),
            });
        } else if (url.includes('rutinas') && !url.includes('rutinas_ejercicios')) {
            // Return a list of routines
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'r1',
                        nombre: 'Full Body Express',
                        descripcion: 'Rutina completa de 20 minutos',
                        objetivo: 'tonificar',
                        nivel: 'principiante',
                        duracion_estimada: 20,
                        es_publica: true,
                    },
                    {
                        id: 'r2',
                        nombre: 'Upper Body Blast',
                        descripcion: 'Enfócate en brazos y pecho',
                        objetivo: 'ganar_fuerza',
                        nivel: 'intermedio',
                        duracion_estimada: 30,
                        es_publica: true,
                    },
                    {
                        id: 'r3',
                        nombre: 'Core Challenge',
                        descripcion: 'Fortalece tu núcleo',
                        objetivo: 'mantener_forma',
                        nivel: 'avanzado',
                        duracion_estimada: 15,
                        es_publica: true,
                    },
                ]),
            });
        } else if (url.includes('rutinas_ejercicios')) {
            // Return exercises for a specific routine
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 're1', rutina_id: 'r1', ejercicio_id: 'e1', orden: 1, series: 3, repeticiones: '12', descanso_segundos: 30 },
                    { id: 're2', rutina_id: 'r1', ejercicio_id: 'e2', orden: 2, series: 3, repeticiones: '10', descanso_segundos: 30 },
                ]),
            });
        } else if (url.includes('ejercicios')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'e1', nombre: 'Flexiones', grupo_muscular: 'Pecho' },
                    { id: 'e2', nombre: 'Sentadillas', grupo_muscular: 'Piernas' },
                ]),
            });
        } else if (url.includes('user_stats')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'stats-rut',
                    user_id: 'e2e-rut',
                    xp_total: 500,
                    nivel: 3,
                    dias_racha: 5,
                    ultimo_entreno: '2026-07-12T08:00:00Z',
                    racha_bonus: 50,
                }),
            });
        } else {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        }
    });
}

test.describe('Rutinas Page', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuthenticatedSession(page);
        await page.goto('/app/rutinas');
    });

    test('page loads and renders exercise routine list', async ({ page }) => {
        // Wait for routines to load
        await expect(page.getByText('Full Body Express')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Upper Body Blast')).toBeVisible();
        await expect(page.getByText('Core Challenge')).toBeVisible();
    });

    test('exercises display correct information', async ({ page }) => {
        // Verify level badges or objetivos are displayed
        // principiante, intermedio, avanzado badges
        await expect(page.getByText(/principiante/i)).toBeVisible();
        await expect(page.getByText(/intermedio/i)).toBeVisible();
        await expect(page.getByText(/avanzado/i)).toBeVisible();
    });
});
