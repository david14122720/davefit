import type { APIRoute } from 'astro';
import { logger } from '../../lib/logger';

/**
 * Endpoint de logout.
 * Borra TODAS las cookies de sesión (incluyendo httpOnly) y redirige a /login.
 */
export const POST: APIRoute = async ({ cookies, redirect }) => {
    logger.log('Logout solicitado');

    // Lista completa de cookies a borrar
    const cookieNames = [
        'if-access-token',
        'user_name',
        'user_rol',
        'user_avatar',
        'user_profile_cache',
    ];

    for (const name of cookieNames) {
        cookies.delete(name, { path: '/' });
    }

    logger.log('Cookies borradas, redirigiendo a /login');
    return redirect('/login', 302);
};

// También aceptar GET por si se navega directamente
export const GET: APIRoute = async ({ cookies, redirect }) => {
    const cookieNames = [
        'if-access-token',
        'user_name',
        'user_rol',
        'user_avatar',
        'user_profile_cache',
    ];

    for (const name of cookieNames) {
        cookies.delete(name, { path: '/' });
    }

    return redirect('/login', 302);
};
