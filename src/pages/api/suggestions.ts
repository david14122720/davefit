import type { APIRoute } from 'astro';
import { isIP } from 'node:net';
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

/** Largo máximo de una IP (IPv6 con scope). Evita persistir texto arbitrario. */
const MAX_IP_LENGTH = 45;

/** Rangos IPv4 que no identifican a un usuario final (privados/loopback). */
function isPrivateIpv4(ip: string): boolean {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local
    return false;
}

function isPrivateOrLoopback(ip: string): boolean {
    const version = isIP(ip);
    if (version === 4) return isPrivateIpv4(ip);
    if (version === 6) {
        const lower = ip.toLowerCase();
        if (lower === '::' || lower === '::1') return true;
        if (/^fe[89ab]/.test(lower)) return true;            // fe80::/10 link-local
        if (/^f[cd]/.test(lower)) return true;               // fc00::/7 unique local
        const mapped = lower.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
        if (mapped) return isPrivateIpv4(mapped[1]);          // ::ffff:a.b.c.d
        return false;
    }
    return false;
}

/**
 * Resuelve la IP del cliente que se guarda en `sender_ip` y define el cupo de
 * 1/minuto.
 *
 * Reglas (de más a menos confiable):
 * 1. La dirección real del socket cuando es una IP pública: en una conexión
 *    directa el cliente no puede falsificarla.
 * 2. El ÚLTIMO hop válido de `X-Forwarded-For`: con un proxy delante, ese es
 *    el valor que el proxy agrega (el prefijo lo controla el cliente).
 * 3. La dirección del socket aunque sea privada/loopback.
 *
 * Toda entrada se valida como IP real y se descarta la que exceda
 * `MAX_IP_LENGTH`: antes se persistía el primer valor de la cabecera sin
 * validar, así que un cliente podía escribir texto arbitrario en la DB y
 * saltarse el rate-limit.
 *
 * Despliegue: nginx ya agrega `X-Forwarded-For $proxy_add_x_forwarded_for`
 * (el último hop es el peer real que vio el proxy), así que detrás de nginx
 * el valor usado es la IP real del cliente. El dev server de Vite no agrega
 * el header, pero ahí `clientAddress` ya es la del socket directo.
 */
export function resolveClientIp(
    forwardedFor: string | null,
    clientAddress: string | undefined,
): string {
    if (clientAddress && isIP(clientAddress) !== 0 && !isPrivateOrLoopback(clientAddress)) {
        return clientAddress;
    }

    if (forwardedFor) {
        const candidates = forwardedFor.split(',');
        for (let i = candidates.length - 1; i >= 0; i--) {
            const candidate = candidates[i].trim();
            if (!candidate || candidate.length > MAX_IP_LENGTH) continue;
            if (isIP(candidate) === 0) continue;
            return candidate;
        }
    }

    if (clientAddress && isIP(clientAddress) !== 0) return clientAddress;

    return 'unknown';
}

function getClientIP(request: Request, clientAddress: string | undefined): string {
    return resolveClientIp(request.headers.get('x-forwarded-for'), clientAddress);
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