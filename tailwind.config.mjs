/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#13ec5b',
                    hover: '#10cc4e',
                    light: '#4cff84',
                    dark: '#0ba33e',
                    glow: 'rgba(19, 236, 91, 0.3)',
                    on: '#0a2e14',
                },
                surface: {
                    DEFAULT: '#2b1c16',
                    container: '#2b1c16',
                    high: '#362720',
                    highest: '#41312a',
                    low: '#261812',
                    lowest: '#170b06',
                },
                background: {
                    dark: '#1d100a',
                    darker: '#170b06',
                    card: '#2b1c16',
                    surface: '#3a281f',
                    elevated: '#4a3428',
                    glass: 'rgba(43, 28, 22, 0.8)',
                },
                on: {
                    surface: '#f8ddd2',
                    'surface-variant': '#e2bfb0',
                },
                text: {
                    muted: '#94a3b8',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-in': 'slideIn 0.4s ease-out forwards',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
}
