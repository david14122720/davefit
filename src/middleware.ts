import type { MiddlewareHandler } from 'astro';

/**
 * Middleware mínimo.
 * La autenticación y protección de rutas ahora se maneja
 * completamente en el cliente con React + InsForge SDK.
 * 
 * Solo mantenemos headers de seguridad básicos.
 */
export const onRequest: MiddlewareHandler = async (_context, next) => {
    const response = await next();

    // Headers de seguridad básicos
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
};
