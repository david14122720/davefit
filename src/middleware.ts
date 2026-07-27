import { defineMiddleware } from 'astro:middleware';

const INSFORGE_URL = import.meta.env.PUBLIC_INSFORGE_URL?.replace(/^https?:\/\//, '') || 'insforge.tesh.online';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "script-src-elem 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://${INSFORGE_URL}`,
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' https://${INSFORGE_URL}`,
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** Métodos HTTP mutantes que requieren validación CSRF */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Valida CSRF para mutaciones en rutas /api/*.
 * Double-submit cookie pattern: el header X-XSRF-TOKEN debe coincidir
 * con la cookie __Host-xsrf-token.
 */
function validateCsrf(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)__Host-xsrf-token=([^;]+)/);
  const cookieToken = match ? decodeURIComponent(match[1]) : null;

  const headerToken = request.headers.get('X-XSRF-TOKEN');

  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);

  // CSRF check for API mutations
  if (url.pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method)) {
    if (!validateCsrf(request)) {
      return new Response(JSON.stringify({ error: 'CSRF token inválido o ausente' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const response = await next();

  if (response && typeof response.headers?.set === 'function') {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    response.headers.set('Content-Security-Policy', CSP);

    if (import.meta.env.PROD) {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  }

  return response;
});
