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
    image: {
        remotePatterns: [
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: '**.insforge.net' },
            { protocol: 'http', hostname: 'localhost' },
        ],
    },
    output: 'server',
    adapter: node({
        mode: 'standalone'
    }),
    prefetch: {
        prefetchAll: true,
        defaultStrategy: 'hover'
    },
    experimental: {
        clientPrerender: true,
    },
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
