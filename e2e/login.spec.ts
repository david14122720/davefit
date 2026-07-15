import { test, expect } from '@playwright/test';

const INSFORGE_API = '**/api/auth/sessions**';
const INSFORGE_DB = '**/rest/v1/**';

test.describe('Login Page', () => {
    test('login page loads with email and password fields', async ({ page }) => {
        await page.goto('/login');

        // Form, email input, password input, and submit button must be present
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText(/Iniciar/i);
    });

    test('form validation shows errors on empty submit', async ({ page }) => {
        await page.goto('/login');

        // Click submit without filling any fields
        await page.locator('button[type="submit"]').click();

        // Zod validation errors should appear as red text
        const errorMessages = page.locator('.text-red-500');
        await expect(errorMessages.first()).toBeVisible();
    });

    test('successful login redirects to dashboard', async ({ page }) => {
        // Intercept sign-in API call
        await page.route(INSFORGE_API, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: 'mock-access-token',
                    refreshToken: 'mock-refresh-token',
                    user: {
                        id: 'e2e-user-1',
                        email: 'e2e@test.com',
                        name: 'E2E User',
                    },
                }),
            });
        });

        // Intercept profile DB query
        await page.route(INSFORGE_DB, async (route) => {
            const url = route.request().url();
            if (url.includes('perfiles')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: 'e2e-user-1',
                        email: 'e2e@test.com',
                        nombre_completo: 'E2E User',
                        rol: 'usuario',
                    }),
                });
            } else {
                // For other DB queries (e.g. user_stats), return empty success
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]),
                });
            }
        });

        await page.goto('/login');
        await page.locator('input[type="email"]').fill('e2e@test.com');
        await page.locator('input[type="password"]').fill('E2EPassword1');
        await page.locator('button[type="submit"]').click();

        // Should redirect to dashboard after successful login
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('invalid credentials show error message', async ({ page }) => {
        // Intercept sign-in API call with error
        await page.route(INSFORGE_API, async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Invalid login credentials',
                    message: 'Invalid login credentials',
                }),
            });
        });

        await page.goto('/login');
        await page.locator('input[type="email"]').fill('wrong@test.com');
        await page.locator('input[type="password"]').fill('WrongPass1');
        await page.locator('button[type="submit"]').click();

        // Error toast should appear with "incorrectos" message
        await expect(page.getByText(/incorrectos/i)).toBeVisible();
    });
});
