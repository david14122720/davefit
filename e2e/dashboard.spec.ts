import { test, expect } from '@playwright/test';

const INSFORGE_AUTH = '**/api/auth/**';
const INSFORGE_DB = '**/rest/v1/**';

// ---------------------------------------------------------------------------
// Shared: intercept auth + DB so every test is "authenticated"
// ---------------------------------------------------------------------------
async function mockAuthenticatedSession(page: any) {
    // Auth calls — sign-in and getSession
    await page.route(INSFORGE_AUTH, async (route: any) => {
        const url = route.request().url();
        if (url.includes('sessions')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: 'mock-token',
                    user: { id: 'e2e-dash', email: 'dashboard@test.com' },
                }),
            });
        } else {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
        }
    });

    // DB queries — return meaningful data
    await page.route(INSFORGE_DB, async (route: any) => {
        const url = route.request().url();

        if (url.includes('perfiles')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'e2e-dash',
                    email: 'dashboard@test.com',
                    nombre_completo: 'Dashboard User',
                    rol: 'usuario',
                }),
            });
        } else if (url.includes('user_stats')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'stats-1',
                    user_id: 'e2e-dash',
                    xp_total: 2500,
                    nivel: 8,
                    dias_racha: 12,
                    ultimo_entreno: '2026-07-13T10:00:00Z',
                    racha_bonus: 120,
                }),
            });
        } else if (url.includes('historial_entrenamientos')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 'h1',
                        rutina_id: 'r1',
                        fecha: '2026-07-13T10:00:00Z',
                        duracion_real: 30,
                        calorias_quemadas: 150,
                        score: 85,
                        rutinas: { nombre: 'Full Body' },
                    },
                ]),
            });
        } else {
            // All other queries return empty
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        }
    });
}

test.describe('Dashboard (Authenticated)', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuthenticatedSession(page);
        await page.goto('/app/dashboard');
    });

    test('dashboard shows user stats (XP, level, streaks) when authenticated', async ({ page }) => {
        // The XPBar component renders level, streak, and XP
        await expect(page.getByText('Nivel')).toBeVisible();
        await expect(page.getByText('Racha')).toBeVisible();
        await expect(page.getByText('Total XP')).toBeVisible();
    });

    test('weekly goal section is visible', async ({ page }) => {
        // The WeeklyGoal component or section should be present
        await expect(page.getByText(/Meta/i)).toBeVisible();
    });

    test('navigation links work correctly', async ({ page }) => {
        // Main navigation should be visible
        const nav = page.locator('nav, aside, [role="navigation"]');
        await expect(nav).toBeVisible();

        // Click on "Rutinas" link in navigation
        const rutinasLink = nav.getByText('Rutinas');
        if (await rutinasLink.isVisible()) {
            await rutinasLink.click();
            await expect(page).toHaveURL(/\/rutinas/);
        }
    });
});
