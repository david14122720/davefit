// ============================================================
// /dashboard e2e — authenticated render over a fully mocked backend.
//
// This spec NEVER talks to the production backend:
// - installInsforgeMock() fulfills every request to the InsForge origin
//   from local fixtures and aborts anything else that is not the local
//   dev server; `unmockedRequests` must stay empty.
// - No real login happens (session cookie + mocked POST /api/auth/refresh).
//
// It is the repeatable baseline/verification harness for the
// dashboard-solidify feature (odd/tasks/dashboard-solidify.md, T1/T4).
// ============================================================

import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
    INSFORGE_ORIGIN,
    installInsforgeMock,
    TEST_CSRF,
} from './helpers/insforge-mock';

const EVIDENCE_DIR = path.resolve(process.cwd(), 'odd/evidence/dashboard-solidify');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

// Fixture expectations (see helpers/insforge-mock.ts builders).
const WEEK_COUNT = 3;
const WEEK_MINUTES = 90;
const WEEK_CALORIES = 780;

interface ConsoleEntry {
    type: string;
    text: string;
    location: { url: string; lineNumber: number; columnNumber: number };
}

interface PageErrorEntry {
    message: string;
    stack?: string;
}

/**
 * Console errors that belong to dev-server infrastructure (Astro dev toolbar,
 * Vite client), not to app code. They are still captured in the evidence JSON
 * but do not fail the app-code console gate.
 */
const DEV_INFRA_ERROR_URLS = [/\/@id\/astro\//, /\/@vite\/client/, /\/node_modules\/(astro|vite)\//];

function isDevInfraError(entry: ConsoleEntry): boolean {
    return DEV_INFRA_ERROR_URLS.some((pattern) => pattern.test(entry.location.url));
}

test.describe('/dashboard (mocked InsForge backend)', () => {
    test('renders authenticated dashboard with fixtures, clean console, zero unmocked backend requests', async ({
        page,
        context,
    }) => {
        test.setTimeout(120_000);
        mkdirSync(SCREENSHOTS_DIR, { recursive: true });

        const consoleEntries: ConsoleEntry[] = [];
        const pageErrors: PageErrorEntry[] = [];
        page.on('console', (msg) => {
            consoleEntries.push({ type: msg.type(), text: msg.text(), location: msg.location() });
        });
        page.on('pageerror', (error) => {
            pageErrors.push({ message: error.message, stack: error.stack });
        });

        const harness = await installInsforgeMock(page);

        // AuthContext treats this cookie as "session may exist" and starts the
        // SDK browser flow (getCurrentUser → POST /api/auth/refresh, mocked).
        await context.addCookies([
            { name: 'insforge_csrf_token', value: TEST_CSRF, domain: 'localhost', path: '/' },
        ]);

        const navigationStart = Date.now();
        await page.goto('/dashboard');

        // Auth + render gate: the greeting only exists after the mocked refresh
        // call and perfil load resolved and ProtectedRoute let the page through.
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
            /^(Buenos días|Buenas tardes|Buenas noches), Test$/,
            { timeout: 30_000 },
        );
        const timeToGreetingMs = Date.now() - navigationStart;

        // Data-loaded gate so the captured screenshot always shows fixtures.
        await expect(
            page.getByText('esta semana', { exact: true }).locator('..').locator('h3'),
        ).toHaveText(String(WEEK_COUNT));

        // Let the 1s celebration timers and framer-motion animations settle
        // before capturing evidence.
        await page.waitForTimeout(1_600);

        // --- Evidence (raw, for the ODD progress log) ---
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'dashboard-viewport.png') });
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'dashboard-fullpage.png'),
            fullPage: true,
        });
        const appConsoleErrors = consoleEntries.filter(
            (entry) => entry.type === 'error' && !isDevInfraError(entry),
        );
        const devInfraConsoleErrors = consoleEntries.filter(
            (entry) => entry.type === 'error' && isDevInfraError(entry),
        );
        writeFileSync(
            path.join(EVIDENCE_DIR, 'dashboard-console.json'),
            JSON.stringify(
                { consoleEntries, appConsoleErrors, devInfraConsoleErrors, pageErrors },
                null,
                2,
            ),
        );
        const requestCounts = harness.backendRequests.reduce<Record<string, number>>((acc, entry) => {
            const key = entry.split('?')[0];
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
        writeFileSync(
            path.join(EVIDENCE_DIR, 'dashboard-network.json'),
            JSON.stringify(
                {
                    insforgeOrigin: INSFORGE_ORIGIN,
                    backendRequests: harness.backendRequests,
                    backendRequestCounts: requestCounts,
                    nonAppRequests: harness.nonAppRequests,
                    unmockedRequests: harness.unmockedRequests,
                },
                null,
                2,
            ),
        );

    const perfMetrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as
            | PerformanceNavigationTiming
            | undefined;
        const chartBars = Array.from(document.querySelectorAll('.h-48 .rounded-t-lg'));
        return {
            domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
            loadEventMs: nav ? Math.round(nav.loadEventEnd) : null,
            resourceCount: performance.getEntriesByType('resource').length,
            weekChartBarHeightsPx: chartBars.map((el) =>
                Math.round(el.getBoundingClientRect().height),
            ),
        };
    });
        writeFileSync(
            path.join(EVIDENCE_DIR, 'dashboard-perf.json'),
            JSON.stringify(
                {
                    note: 'Astro dev server (unminified, no production bundle) — structural baseline only; absolute numbers are not production perf.',
                    timeToGreetingMs,
                    ...perfMetrics,
                    backendRequestCount: harness.backendRequests.length,
                    backendRequestCounts: requestCounts,
                },
                null,
                2,
            ),
        );

        // --- Hero: greeting + streak badge + level badge ---
        await expect(page.getByText('12 días racha')).toBeVisible();
        await expect(page.getByText('Nivel Intermedio').first()).toBeVisible();

        // --- XPBar (user_stats fixture) ---
        await expect(page.getByText('Total XP')).toBeVisible();
        await expect(page.getByText(/^2[.,]450$/)).toBeVisible();
        await expect(page.getByText('Racha', { exact: true })).toBeVisible();

        // --- WeeklyGoal (3 sessions vs meta 3 → completed) ---
        await expect(page.getByText('Meta Semanal', { exact: true })).toBeVisible();
        await expect(page.getByText('¡Completada!')).toBeVisible();

        // --- Stat cards (anchored by their unique captions; count asserted above) ---
        await expect(page.getByText('kcal quemadas', { exact: true }).locator('..').locator('h3')).toHaveText(
            String(WEEK_CALORIES),
        );
        await expect(page.getByText('min activos', { exact: true }).locator('..').locator('h3')).toHaveText(
            String(WEEK_MINUTES),
        );

        // --- Weekly chart ---
        await expect(page.getByText('Actividad Semanal')).toBeVisible();
        await expect(page.getByText(`${WEEK_MINUTES} min`, { exact: true })).toBeVisible();
        await expect(page.getByText(`${WEEK_CALORIES} kcal`, { exact: true })).toBeVisible();
        await expect(page.locator('span').filter({ hasText: /^(L|M|X|J|V|S|D)$/ })).toHaveCount(7);
    // Baseline defect guard: with 3 fixture sessions in the current week, at
    // least one chart bar must have a non-zero height when drawn.
    expect(
        Math.max(...perfMetrics.weekChartBarHeightsPx),
        `weekly chart bars rendered at 0px: ${JSON.stringify(perfMetrics.weekChartBarHeightsPx)}`,
    ).toBeGreaterThan(0);

        // --- Recent sessions + mini calendar ---
        await expect(page.getByText('Últimas Sesiones')).toBeVisible();
        await expect(page.getByText('Esta Semana', { exact: true })).toBeVisible();
        await expect(page.getByText('Entrenamientos Recientes')).toBeVisible();
        await expect(page.getByText('Full Body Express').first()).toBeVisible();

        // --- The harness actually exercised auth + the dashboard queries ---
        expect(harness.backendRequests.some((r) => r.startsWith('POST /api/auth/refresh'))).toBe(true);
        expect(harness.backendRequests.some((r) => r.includes('/records/perfiles'))).toBe(true);
        expect(harness.backendRequests.some((r) => r.includes('/records/user_stats'))).toBe(true);
        expect(
            harness.backendRequests.filter((r) => r.includes('/records/historial_entrenamientos')).length,
        ).toBeGreaterThanOrEqual(2);

        // --- Hard guarantees ---
        expect(
            appConsoleErrors,
            `console errors from app code: ${JSON.stringify(appConsoleErrors, null, 2)}`,
        ).toEqual([]);
        expect(pageErrors, `page errors: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
        expect(
            harness.unmockedRequests,
            `unmocked requests: ${JSON.stringify(harness.unmockedRequests, null, 2)}`,
        ).toEqual([]);
    });
});
