import type { APIRoute } from 'astro';
import { createClient } from '@insforge/sdk';
import { jsonResponse, errorResponse, decodeJWT } from '../../lib/api-helpers';
import { logger } from '../../lib/logger';
import { checkRateLimit } from '../../lib/rate-limit';

const INSFORGE_URL = import.meta.env.PUBLIC_INSFORGE_URL;
const INSFORGE_ANON_KEY = import.meta.env.PUBLIC_INSFORGE_ANON_KEY;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
    // Rate Limit (10 actualizaciones por minuto)
    const { success } = checkRateLimit(clientAddress || 'unknown', 10, 60000);
    if (!success) {
        return errorResponse('Demasiadas solicitudes de actualización.', 429);
    }

    try {
        const accessToken = cookies.get("if-access-token")?.value;
        if (!accessToken) {
            return errorResponse('No autorizado - Inicie sesión', 401);
        }

        if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
            return errorResponse('Configuración del servidor incompleta', 500);
        }

        // Decodificar JWT para obtener identidad
        let userId: string;
        let userEmail: string;
        try {
            const payload = decodeJWT(accessToken);
            userId = payload.sub || (payload as any).id;
            userEmail = payload.email;
            if (!userId) throw new Error('JWT sin ID');
        } catch {
            return errorResponse('Token inválido', 401);
        }

        // Cliente autenticado para toda la petición
        const userClient = createClient({
            baseUrl: INSFORGE_URL,
            anonKey: INSFORGE_ANON_KEY,
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const formData = await request.formData();

        // Construir objeto de perfil
        const perfilesData: Record<string, unknown> = {
            id: userId,
            email: userEmail,
            updated_at: new Date().toISOString()
        };

        // Helpers para procesar campos del formulario
        const getString = (key: string) => {
            const val = formData.get(key);
            return val ? String(val).trim() || null : null;
        };

        const parseNum = (key: string) => {
            const val = formData.get(key);
            if (!val || String(val).trim() === '') return null;
            const num = parseFloat(String(val));
            return isNaN(num) ? null : num;
        };

        // Campos de texto
        const nombre = getString('nombre_completo');
        if (nombre) perfilesData.nombre_completo = nombre;
        const genero = getString('genero');
        if (genero) perfilesData.genero = genero;
        const fechaNac = getString('fecha_nacimiento');
        if (fechaNac) perfilesData.fecha_nacimiento = fechaNac;
        const objetivo = getString('objetivo');
        if (objetivo) perfilesData.objetivo = objetivo;
        const nivel = getString('nivel');
        if (nivel) perfilesData.nivel = nivel;

        // Campos numéricos
        const peso = parseNum('peso_actual');
        if (peso !== null) perfilesData.peso_actual = peso;
        const altura = parseNum('altura');
        if (altura !== null) perfilesData.altura = altura;
        const dias = parseNum('dias_entrenamiento_semana');
        if (dias !== null) perfilesData.dias_entrenamiento_semana = Math.floor(dias);

        // Avatar
        const avatarFile = formData.get('avatar') as File | null;
        let avatarUrl: string | null = null;

        if (avatarFile && avatarFile.size > 0) {
            try {
                const fileExt = avatarFile.name.split('.').pop() || 'jpg';
                const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;

                logger.log('Subiendo avatar:', filePath);
                const { error: uploadError } = await userClient.storage
                    .from('profiles')
                    .upload(filePath, avatarFile);

                if (!uploadError) {
                    const res = userClient.storage.from('profiles').getPublicUrl(filePath);
                    avatarUrl = (res as any).data?.publicUrl || (res as any).publicUrl || null;
                    if (avatarUrl) perfilesData.avatar_url = avatarUrl;
                } else {
                    logger.error('Error subiendo avatar:', uploadError);
                }
            } catch (e: any) {
                logger.error('Excepción en avatar:', e.message);
            }
        }

        // Upsert en base de datos
        logger.log('Upsert en perfiles...');
        try {
            const { error: dbError } = await userClient.database
                .from('perfiles')
                .upsert([perfilesData]);

            if (dbError) {
                logger.error('Error DB Upsert:', dbError);
                return errorResponse(dbError.message, 400);
            }
        } catch (fetchErr: any) {
            logger.error('Fallo el fetch a la BD:', fetchErr);
            return errorResponse('No se pudo contactar con la base de datos. Verifique la URL de InsForge.', 500);
        }

        // Actualizar cookies para reflejar cambios inmediatamente
        const cookieOpts = { path: '/', maxAge: 604800, secure: import.meta.env.PROD } as const;
        if (nombre) cookies.set('user_name', nombre, cookieOpts);
        if (avatarUrl) cookies.set('user_avatar', avatarUrl, cookieOpts);

        return jsonResponse({
            message: '¡Perfil actualizado con éxito!',
            avatar_url: avatarUrl,
        });

    } catch (err: any) {
        logger.error('API Error Crítico en update-profile:', err);
        return errorResponse('Error interno del servidor. Inténtelo más tarde.', 500);
    }
};
