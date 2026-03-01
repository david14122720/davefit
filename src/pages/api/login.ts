import type { APIRoute } from 'astro';
import { createClient } from '@insforge/sdk';
import { jsonResponse, errorResponse, successResponse } from '../../lib/api-helpers';
import { logger } from '../../lib/logger';
import { getInsforgeClient } from '../../lib/insforge';

export const POST: APIRoute = async ({ request, cookies }) => {
    const INSFORGE_URL = import.meta.env.PUBLIC_INSFORGE_URL;
    const INSFORGE_ANON_KEY = import.meta.env.PUBLIC_INSFORGE_ANON_KEY;

    if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
        return errorResponse('Configuración incompleta: falta URL o KEY de InsForge', 500);
    }

    try {
        const { email, password } = await request.json();

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
            return errorResponse(error.message, 401);
        }

        const session = (data as any).session || data;
        const accessToken = session?.access_token || session?.accessToken;
        const user = session?.user;

        if (!accessToken) {
            return errorResponse('No se pudo obtener el token de acceso', 500);
        }

        // Configuración de cookies (Permitimos HTTP para facilitar pruebas en VPS/IP)
        const cookieOpts = {
            path: '/',
            httpOnly: true,
            secure: false, // Temporalmente false para asegurar compatibilidad en http://
            sameSite: 'lax' as const,
            maxAge: 604800,
        };

        logger.log(`[API Login] Estableciendo cookie para token: ${accessToken.substring(0, 10)}...`);
        cookies.set('if-access-token', accessToken, cookieOpts);

        if (user) {
            const userId = user.id;
            const metadata = (user as any).user_metadata || {};
            logger.log(`[API Login] Usuario identificado: ${userId} - ${user.email}`);

            // Obtener perfil de la DB
            const userClient = getInsforgeClient(accessToken);
            const { data: dbProfile, error: dbError } = await userClient.database
                .from('perfiles')
                .select('nombre_completo, rol, avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (dbError) logger.error(`[API Login] Error buscando perfil DB: ${dbError.message}`);

            const userName = dbProfile?.nombre_completo || metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Usuario';
            const userRol = dbProfile?.rol || 'usuario';
            const avatarUrl = dbProfile?.avatar_url || metadata.avatar_url || null;

            const uiCookieOpts = { ...cookieOpts, httpOnly: false };
            logger.log(`[API Login] Guardando cookies UI: nombre=${userName}, rol=${userRol}`);
            cookies.set('user_name', userName, uiCookieOpts);
            cookies.set('user_rol', userRol, uiCookieOpts);
            if (avatarUrl) {
                cookies.set('user_avatar', avatarUrl, uiCookieOpts);
            }
        }

        return successResponse({ redirect: '/dashboard' });

    } catch (err: any) {
        logger.error('Error en /api/login:', err.message);
        return errorResponse('No se pudo procesar la solicitud: ' + err.message, 500);
    }
};
