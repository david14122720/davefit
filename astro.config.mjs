import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://davefit.app',
    output: 'server',
    adapter: node({ mode: 'standalone' }),
    integrations: [
        tailwind({
            applyBaseStyles: false,
        }),
        react(),
        sitemap(),
    ],
    vite: {
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-router-dom', 'chart.js'],
        },
    },
});
