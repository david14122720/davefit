import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  if (response && response.headers) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    if (import.meta.env.PROD) {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
  }

  return response;
});
