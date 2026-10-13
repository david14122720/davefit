import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import node from '@astrojs/node';

import sitemap from '@astrojs/sitemap';

// ============================================================
// Proxy same-origin hacia el backend InsForge (solo dev)
// ============================================================
//
// El navegador habla con el MISMO origen de la app (ver
// src/lib/insforge-url.ts): estos prefijos se proxyean al backend.
// El hook proxyRes reescribe `SameSite=None` → `SameSite=Lax` porque
// Chrome rechaza SameSite=None sin Secure en respuestas HTTP, y con eso
// la cookie de refresh nunca se guardaba (sesión perdida en cada
// recarga, 401 en /api/auth/refresh).
// En producción nginx.conf hace lo mismo (proxy_cookie_flags).
// Ver odd/tasks/insforge-session-proxy.md

const INSFORGE_PROXY_PREFIXES = ['/api/auth', '/api/storage', '/api/database', '/api/ai'];

function rewriteSetCookieHeaders(cookies) {
    if (!Array.isArray(cookies)) return cookies;
    return cookies.map((c) => c.replace(/SameSite=None/i, 'SameSite=Lax'));
}

function buildInsforgeProxy(envUrl) {
    const entry = {
        target: envUrl || 'http://192.168.50.121:7130',
        changeOrigin: true,
        configure(proxy) {
            proxy.on('proxyRes', (proxyRes) => {
                const setCookie = proxyRes.headers['set-cookie'];
                if (setCookie) {
                    proxyRes.headers['set-cookie'] = rewriteSetCookieHeaders(setCookie);
                }
            });
        },
    };
    return Object.fromEntries(INSFORGE_PROXY_PREFIXES.map((p) => [p, entry]));
}

const env = loadEnv('', process.cwd(), '');

// ============================================================
// Hardening Fase 3 — vendor chunking manual
// ============================================================
//
// Astro por defecto genera UN chunk vendor con todo React + libs.
// Eso penaliza el cache HTTP: cualquier cambio del bundle invalida
// el cache del vendor completo.
//
// Esta función divide el vendor en chunks granulares y estables:
//   - vendor-react      (cambia solo con updates mayores de React)
//   - vendor-router     (cambia solo con updates de react-router)
//   - vendor-insforge   (cambia solo con updates del SDK backend)
//   - vendor-framer     (cambia solo con updates de framer-motion)
//   - vendor-icons      (lucide-react — iconos estables, cache largo)
//   - vendor-forms      (react-hook-form + zod, paquete estable)
//
// Esto reduce el JS inicial enviado al navegador, mejora el cache
// de larga duración y mejora métricas de LCP/TTI.
function manualChunks(id) {
    if (!id.includes('node_modules')) return;

    if (id.includes('node_modules/react-dom') ||
        id.includes('node_modules/react/') ||
        id.includes('node_modules/scheduler')) {
        return 'vendor-react';
    }
    if (id.includes('node_modules/react-router') ||
        id.includes('node_modules/@remix-run/router')) {
        return 'vendor-router';
    }
    if (id.includes('node_modules/@insforge/')) {
        return 'vendor-insforge';
    }
    if (id.includes('node_modules/framer-motion')) {
        return 'vendor-framer';
    }
    if (id.includes('node_modules/lucide-react')) {
        return 'vendor-icons';
    }
    if (id.includes('node_modules/react-hook-form') ||
        id.includes('node_modules/@hookform/') ||
        id.includes('node_modules/zod')) {
        return 'vendor-forms';
    }
    if (id.includes('node_modules/sonner')) {
        return 'vendor-toast';
    }
    if (id.includes('node_modules/canvas-confetti')) {
        return 'vendor-confetti';
    }
}

export default defineConfig({
    site: 'https://davefit.app',
    output: 'server',
    compressHTML: true,
    security: {
        allowedDomains: [
            { hostname: 'davefit.app', protocol: 'https' },
            { hostname: '*.davefit.app', protocol: 'https' },
        ],
    },
    adapter: node({ mode: 'standalone' }),
    integrations: [
        react(),
        sitemap(),
    ],
    vite: {
        server: {
            proxy: buildInsforgeProxy(env.PUBLIC_INSFORGE_URL),
        },
        plugins: [tailwindcss()],
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-router-dom'],
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks,
                },
            },
        },
    },
});
