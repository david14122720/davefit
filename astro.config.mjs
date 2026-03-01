import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    integrations: [
        tailwind({
            applyBaseStyles: false,
        }),
        preact({
            compat: true,
        })
    ],
    adapter: node({
        mode: 'standalone'
    }),
    output: 'server',
    vite: {
        optimizeDeps: {
            include: [
                'preact',
                'preact/hooks',
                'preact/compat',
                'chart.js'
            ],
        },
        build: {
            cssCodeSplit: true,
            rollupOptions: {
                output: {
                    manualChunks: {
                        'vendor': ['preact', 'preact/hooks', 'preact/compat'],
                        'insforge': ['@insforge/sdk'],
                    }
                }
            },
        },
    },
});
