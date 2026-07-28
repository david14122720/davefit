import type { APIRoute } from 'astro';
import { insforge } from '../../lib/insforge';

/** Sanitización simple para servidor — elimina etiquetas HTML/atributos */
function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')       // elimina < y >
    .replace(/&/g, '&amp;')      // escapa &
    .replace(/"/g, '&quot;')     // escapa "
    .replace(/'/g, '&#x27;');    // escapa '
}

const RATE_LIMIT_MS = 60000;

function getClientIP(request: Request, clientAddress: string | undefined): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const ip = forwarded.split(',')[0].trim();
        if (ip) return ip;
    }
    return clientAddress || 'unknown';
}

export const GET: APIRoute = async ({ url }) => {
    try {
        const rawLimit = parseInt(url.searchParams.get('limit') || '10');
        const limit = Math.min(Math.max(isNaN(rawLimit) ? 10 : rawLimit, 1), 50);

        const { data, error } = await insforge.database
            .from('suggestions')
            .select('message, rating, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ suggestions: data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

const MAX_BODY_BYTES = 10240;

export const POST: APIRoute = async ({ request, clientAddress }) => {
    try {
        const contentLength = parseInt(request.headers.get('content-length') || '0');
        if (contentLength > MAX_BODY_BYTES) {
            return new Response(JSON.stringify({ error: 'Cuerpo demasiado grande' }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const bodyText = await request.text();
        if (bodyText.length > MAX_BODY_BYTES) {
            return new Response(JSON.stringify({ error: 'Cuerpo demasiado grande' }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let body: Record<string, unknown>;
        try {
            body = JSON.parse(bodyText);
        } catch {
            return new Response(JSON.stringify({ error: 'JSON inválido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const ip = getClientIP(request, clientAddress);

        const { data: recent } = await insforge.database
            .from('suggestions')
            .select('created_at')
            .eq('sender_ip', ip)
            .order('created_at', { ascending: false })
            .limit(1);

        if (recent && recent.length > 0) {
            const elapsed = Date.now() - new Date(recent[0].created_at).getTime();
            if (elapsed < RATE_LIMIT_MS) {
                return new Response(JSON.stringify({ 
                    error: 'Demasiadas solicitudes. Por favor espera un minuto.' 
                }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        const { message, rating } = body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Mensaje requerido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (message.length > 1000) {
            return new Response(JSON.stringify({ error: 'Mensaje demasiado largo (máx 1000 caracteres)' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const cleanMessage = sanitizeText(message.trim());

        const ratingValue = typeof rating === 'number' ? Math.min(5, Math.max(0, rating)) : 0;

        const { error } = await insforge.database
            .from('suggestions')
            .insert([{
                message: cleanMessage,
                rating: ratingValue,
                sender_ip: ip,
            }]);

        if (error) {
            console.error('Error guardando sugerencia:', error);
            return new Response(JSON.stringify({ error: 'Error al guardar la sugerencia' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: '¡Gracias por tu sugerencia! La revisaremos pronto.'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        console.error('Exception:', e);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};