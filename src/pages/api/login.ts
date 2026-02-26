import type { APIRoute } from 'astro';
import { createClient } from '@insforge/sdk';
import { jsonResponse, errorResponse } from '../../lib/api-helpers';
import { logger } from '../../lib/logger';

export const POST: APIRoute = async ({ request, cookies }) => {
    const INSFORGE_URL = import.meta.env.PUBLIC_INSFORGE_URL;
    const INSFORGE_ANON_KEY = import.meta.env.PUBLIC_INSFORGE_ANON_KEY;

    if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
        return errorResponse('Configuración incompleta: falta URL o KEY de InsForge', 500);
    }

    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return errorResponse('Email y contraseña son requeridos', 400);
        }

        const authClient = createClient({
            baseUrl: INSFORGE_URL,
            anonKey: INSFORGE_ANON_KEY
        });

        const { data, error } = await authClient.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            logger.error('Fallo login InsForge:', error.message);
            // Devolver el mensaje exacto para depuración
            return errorResponse(`Auth Error: ${error.message}`, 401);
        }

        if (!data || (!(data as any).session && !(data as any).accessToken)) {
            logger.error('Respuesta de sesión inválida de InsForge:', data);
            return errorResponse('Respuesta de sesión inválida', 401);
        }

        const accessToken = (data as any).session?.access_token || (data as any).accessToken || (data as any).access_token;
        const user = (data as any).session?.user || (data as any).user;

        if (!accessToken) {
            logger.error('Token no encontrado en data:', data);
            return errorResponse('Token no encontrado en la respuesta del servidor', 500);
        }

        // Establecer cookies
        const isProd = import.meta.env.PROD;
        cookies.set('if-access-token', accessToken, {
            path: '/',
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            maxAge: 604800,
        });

        if (user) {
            const profile = user.profile || {};
            const userName = profile.nombre_completo || profile.name || user.email?.split('@')[0] || 'Usuario';
            const userRol = profile.rol || 'usuario';

            cookies.set('user_name', userName, { path: '/', httpOnly: false, secure: isProd, sameSite: 'lax', maxAge: 604800 });
            cookies.set('user_rol', userRol, { path: '/', httpOnly: false, secure: isProd, sameSite: 'lax', maxAge: 604800 });
        }

        return jsonResponse({ success: true, redirect: '/dashboard' });

    } catch (err: any) {
        logger.error('Error en /api/login:', err.message);
        return errorResponse('Excepción en el servidor: ' + err.message, 500);
    }
};
