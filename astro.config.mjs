import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import node from '@astrojs/node';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://davefit.app',
    output: 'server',
    compressHTML: true,
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
    },
});
