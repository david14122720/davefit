import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '../../../lib/api-helpers';
import { logger } from '../../../lib/logger';
import { getInsforgeClient } from '../../../lib/insforge';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { accessToken, user } = await request.json();

        if (!accessToken) {
            return errorResponse('Token no proporcionado', 400);
        }

        const cookieOpts = {
            path: '/',
            httpOnly: true,
            secure: false, // Forzamos false para evitar problemas en localhost
            sameSite: 'lax' as const,
            maxAge: 604800, // 7 días
        };

        cookies.set('if-access-token', accessToken, cookieOpts);

        if (user) {
            const userId = user.id;
            const metadata = (user as any).user_metadata || {};

            // 1. Intentar obtener el perfil real de la DB para tener el nombre editado
            const userClient = getInsforgeClient(accessToken);
            const { data: dbProfile } = await userClient.database
                .from('perfiles')
                .select('nombre_completo, avatar_url, rol')
                .eq('id', userId)
                .maybeSingle();

            // 2. Priorizar datos de la DB, luego metadatos de la cuenta
            const userName = dbProfile?.nombre_completo || metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Usuario';
            const userRol = dbProfile?.rol || 'usuario';
            const avatarUrl = dbProfile?.avatar_url || metadata.avatar_url || metadata.picture || null;

            logger.log(`[Set-Session] Sincronizando cookies para ${userId}. Nombre: ${userName}`);

            // Estas cookies son accesibles desde el cliente para la UI (httpOnly: false)
            const uiCookieOpts = { ...cookieOpts, httpOnly: false };
            cookies.set('user_name', userName, uiCookieOpts);
            cookies.set('user_rol', userRol, uiCookieOpts);
            if (avatarUrl) {
                cookies.set('user_avatar', avatarUrl, uiCookieOpts);
            } else {
                cookies.delete('user_avatar', { path: '/' });
            }
        }

        return jsonResponse({ success: true });
    } catch (err: any) {
        logger.error('Error en /api/auth/set-session:', err.message);
        return errorResponse('Error interno: ' + err.message, 500);
    }
};
