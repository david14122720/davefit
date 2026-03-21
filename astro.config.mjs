import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
    output: 'server',
    adapter: node({ mode: 'standalone' }),
    integrations: [
        tailwind({
            applyBaseStyles: false,
        }),
        react(),
    ],
    vite: {
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-router-dom', 'chart.js'],
        },
        build: {
            cssCodeSplit: true,
            rollupOptions: {
                output: {
                    manualChunks: {
                        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                        'insforge': ['@insforge/sdk'],
                    }
                }
            },
        },
    },
});
