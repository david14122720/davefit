/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#ff6b00',
                    light: '#ff8533',
                    dark: '#e65100',
                    hover: '#e65a00',
                    on: '#ffffff',
                    glow: 'rgba(255, 107, 0, 0.3)',
                },
                background: {
                    dark: '#0a0a0a',
                    darker: '#050505',
                    card: '#141414',
                    surface: '#1e1e1e',
                    elevated: '#252525',
                    glass: 'rgba(20, 20, 20, 0.8)',
                },
                surface: {
                    DEFAULT: '#1e1e1e',
                    dark: '#141414',
                },
                'on-surface': {
                    DEFAULT: '#f8ddd2',
                    variant: '#9ca3af',
                },
                'text-muted': {
                    DEFAULT: '#9ca3af',
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
