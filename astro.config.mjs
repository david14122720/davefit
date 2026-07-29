import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import node from '@astrojs/node';

import sitemap from '@astrojs/sitemap';

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
//   - vendor-chart      (chart.js si se añade en el futuro)
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
    if (id.includes('node_modules/chart.js') ||
        id.includes('node_modules/react-chartjs-2')) {
        return 'vendor-chart';
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
