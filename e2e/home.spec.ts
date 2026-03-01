import { test, expect } from '@playwright/test';

test('debe cargar la página de inicio', async ({ page }) => {
    await page.goto('/');
    // Verificar que el título principal o algún texto distintivo esté presente
    await expect(page).toHaveTitle(/DaveFit/i);
});

test('debe mostrar el formulario de login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(/Entrar/i);
});
