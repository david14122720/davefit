/**
 * Helpers para endpoints API.
 * Garantizan respuestas JSON consistentes con Content-Type correcto.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function jsonResponse(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export function errorResponse(message: string, status = 500) {
    return new Response(JSON.stringify({ error: message }), { status, headers: JSON_HEADERS });
}

export function successResponse(data: Record<string, unknown> = {}) {
    return jsonResponse({ success: true, ...data });
}

/**
 * Decodifica un JWT sin verificar la firma.
 * Útil en el servidor para obtener la identidad del usuario de forma inmediata.
 */
export function decodeJWT(token: string): { sub: string; email: string;[key: string]: unknown } {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) throw new Error('Token malformado');
    return JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
}
