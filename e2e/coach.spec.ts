// ============================================================
// /coach — e2e REAL del IA Coach (backend de producción)
// ============================================================
//
// A diferencia del harness mocked del dashboard, este spec SÍ habla con el
// backend real: valida el flujo completo exigido por las specs
// (odd/tasks/ia-coach-mvp.md + odd/tasks/ia-coach-markdown.md):
//   1. /coach renderiza integrado en el diseño global (validación Playwright).
//   2. El chat responde a través del endpoint seguro /api/coach (nunca
//      directo al gateway con la anon key).
//   3. El mensaje N° 11 queda bloqueado y la UI muestra una advertencia amigable.
//   4. La respuesta del modelo evidencia las rutinas/métricas/objetivo reales
//      del usuario en sesión.
//   5. Markdown: las viñetas se renderizan como listas HTML reales, no quedan
//      asteriscos visibles y NINGÚN enlace es clickeable (cero <a> en el chat).
//      Se captura evidencia DURANTE el tipeo y AL FINAL (S3/S5).
//
// Usuario: ROTADO e inyectado por env (ver auditoría F1); sembrado en prod
// solo con datos de prueba (objetivo ganar_fuerza,
// 3 rutinas E2E con historial, métricas 2450 XP / racha 12).
//
// Precondición: el usuario de prueba necesita cuota disponible (se renueva
// sola a las 5 h; para forzar, resetear su fila de `coach_usage`). El test 1
// afirma el descuento RELATIVO (antes − 2), así es re-ejecutable mientras
// queden al menos 2 mensajes en la ventana.
//
// NOTA (Judgment Day ronda 1 del MVP): la versión anterior "reseteaba" la
// cuota con el RPC de reembolso — que resultó ser un bypass user-callable de
// la cuota y fue eliminado. El reset ahora es una precondición externa
// documentada.

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Auditoría F1 (2026-10-18): las credenciales ya no viven en el repo. Se
// leen del entorno o de un .env local (gitignored); si faltan, el spec
// entero se salta con test.skip en lugar de fallar por credenciales ausentes.
function loadDotEnv(pathname: string): void {
  try {
    const raw = readFileSync(pathname, 'utf8');
    for (const line of raw.split('\n')) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // Sin .env no pasa nada: en CI las vars llegan por shell/secrets.
  }
}
loadDotEnv(path.resolve(process.cwd(), '.env'));

const EMAIL = process.env.E2E_COACH_EMAIL ?? '';
const PASSWORD = process.env.E2E_COACH_PASSWORD ?? '';
const EVIDENCE_DIR = path.resolve(process.cwd(), 'odd/evidence/ia-coach-mvp');
const APP_ORIGIN = 'http://localhost:4321';

test.skip(
  EMAIL.length === 0 || PASSWORD.length === 0,
  'E2E_COACH_EMAIL/E2E_COACH_PASSWORD no definidas: credenciales se inyectan por env (auditoría F1), nunca por el repo.'
);

// Serial: el test 2 depende de la cuota consumida por el test 1.
test.describe.configure({ mode: 'serial' });

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
    page.getByRole('button', { name: /Iniciar Sesión/i }).click(),
  ]);
}

/**
 * Navega a /coach capturando el Authorization que la página manda en su
 * GET de cuota — es el token real de la sesión (Bearer), no la anon key.
 */
async function gotoCoachAndGetToken(page: Page): Promise<string> {
  const requestPromise = page.waitForRequest(
    (request) => request.url().includes('/api/coach') && request.method() === 'GET',
  );
  await page.goto('/coach');
  const request = await requestPromise;
  const authorization = request.headers()['authorization'];
  expect(authorization, 'la página debe llamar a /api/coach con Bearer de sesión').toBeTruthy();
  return authorization;
}

test('/coach renderiza integrado, chatea seguro, renderiza markdown y descuenta cuota', async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  await login(page);
  await gotoCoachAndGetToken(page);

  // ---- 1) Página integrada en el diseño global ----
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Coach');
  await expect(page.getByTestId('coach-chat')).toBeVisible();
  await expect(page.getByTestId('coach-quota')).toContainText(/\d+\/10/, { timeout: 15_000 });

  const quotaText = await page.getByTestId('coach-quota').innerText();
  const remainingBefore = Number(quotaText.match(/(\d+)\/10/)?.[1] ?? NaN);
  expect(
    remainingBefore,
    `se necesitan al menos 2 mensajes de cuota para el test ("${quotaText}")`,
  ).toBeGreaterThan(1);

  // Acceso integrado en la navegación principal (nav desktop del header).
  await expect(page.locator('header a[href="/coach"]')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'coach-page.png'), fullPage: true });

  // ---- 2) Chat real a través del endpoint seguro ----
  await page.fill('[data-testid="coach-input"]', 'En una sola línea: ¿cuáles son mis últimas rutinas y mi objetivo?');
  await page.click('[data-testid="coach-send"]');

  // Burbuja del usuario inmediata + respuesta real de la IA (contexto inyectado).
  await expect(page.getByTestId('coach-chat')).toContainText('¿cuáles son mis últimas rutinas', { timeout: 10_000 });
  await expect(page.getByTestId('coach-chat')).toContainText(
    /ganar fuerza|Fuerza E2E Alpha|Cardio E2E Beta|Movilidad E2E Gamma/i,
    { timeout: 90_000 },
  );

  // La cuota se descontó con la respuesta del servidor (no en el cliente).
  await expect(page.getByTestId('coach-quota')).toContainText(
    `${remainingBefore - 1}/10`,
    { timeout: 10_000 },
  );

  // ---- 3) Markdown del Coach: listas reales + enlaces neutralizados ----
  await page.fill(
    '[data-testid="coach-input"]',
    'Dame una lista con viñetas de 3 ejercicios cortos para hoy, en formato de lista.',
  );
  await page.click('[data-testid="coach-send"]');

  // Espera la SEGUNDA respuesta de la IA (la primera ya está en el DOM).
  await expect(page.getByTestId('coach-msg-assistant')).toHaveCount(2, { timeout: 90_000 });

  // Efecto tipeo: las viñetas se renderizan como <li> reales mientras escribe.
  await expect(page.locator('[data-testid="coach-chat"] li').first()).toBeVisible({ timeout: 90_000 });
  // Evidencia DURANTE el streaming (tipeo en curso).
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'coach-streaming.png'), fullPage: true });

  // Deja terminar el tipeo (~1.5 s máx) y captura el estado final.
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('coach-quota')).toContainText(
    `${remainingBefore - 2}/10`,
    { timeout: 10_000 },
  );

  const chatText = await page.getByTestId('coach-chat').innerText();
  expect(chatText, 'no deben quedar asteriscos de markdown visibles').not.toContain('**');
  expect(
    await page.locator('[data-testid="coach-chat"] a').count(),
    'cero enlaces clickeables dentro del chat (S2)',
  ).toBe(0);

  // Evidencia: transcripción final del chat.
  writeFileSync(path.join(EVIDENCE_DIR, 'coach-transcript.txt'), chatText);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'coach-chat.png'), fullPage: true });
});

test('bloquea el mensaje N° 11 y muestra advertencia amigable en la UI', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  await login(page);
  const authorization = await gotoCoachAndGetToken(page);

  // Consume la cuota real vía RPC (sin gastar tokens de IA): el mensaje N° 11
  // debe devolver allowed=false. Re-ejecutable: si ya estaba agotada, la
  // primera llamada ya devuelve false.
  let lastBody: any = null;
  for (let i = 0; i < 12; i++) {
    const response = await page.request.post(`${APP_ORIGIN}/api/database/rpc/coach_consumir_mensaje`, {
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      data: {},
    });
    expect(response.ok()).toBe(true);
    lastBody = await response.json();
    if (!lastBody?.allowed) break;
  }
  expect(lastBody?.allowed, 'el consumo N° 11 debe quedar bloqueado').toBe(false);
  expect(lastBody?.remaining).toBe(0);

  // UI: al cargar /coach la advertencia aparece y el envío queda deshabilitado.
  await page.reload();
  await expect(page.getByTestId('coach-limit-warning')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('coach-limit-warning')).toContainText('límite de 10 mensajes');
  await expect(page.getByTestId('coach-input')).toBeDisabled();
  await expect(page.getByTestId('coach-send')).toBeDisabled();

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'coach-limit.png'), fullPage: true });
});
