import { defineMiddleware } from "astro:middleware";
import { logger } from "./lib/logger";

const protectedRoutes = ["/dashboard", "/admin", "/onboarding"];
const adminRoutes = ["/admin"];
const authRoutes = ["/login", "/register"];

const INSFORGE_URL = import.meta.env.PUBLIC_INSFORGE_URL || '*';

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, cookies, redirect } = context;
    const pathname = url.pathname;

    logger.log(`[Middleware] Ruta: ${pathname}`);

    const accessToken = cookies.get("if-access-token")?.value;
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    // Redirección si ya está autenticado
    if (isAuthRoute && accessToken) {
        logger.log('[Middleware] Usuario autenticado en ruta de auth → dashboard');
        return redirect("/dashboard");
    }

    // Lógica de protección de rutas
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
    if (isProtected && !accessToken) {
        logger.log('[Middleware] Sin token en ruta protegida → login');
        return redirect("/login");
    }

    // Verificación de Admin
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    const userRol = cookies.get("user_rol")?.value;
    if (isAdminRoute && userRol !== 'admin') {
        logger.log('[Middleware] Usuario no es admin → dashboard');
        return redirect("/dashboard");
    }

    // Obtener la respuesta
    const response = await next();

    // NO aplicar CSP a respuestas JSON (APIs)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
        response.headers.set('Content-Security-Policy',
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-eval' data: https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com data:; " +
            "img-src 'self' data: blob: https://*.unsplash.com https://images.unsplash.com https://insforge.tesh.online https://*.googleusercontent.com; " +
            "connect-src 'self' https://insforge.tesh.online http://localhost:4321 ws://localhost:4321; " +
            "frame-src 'self' https://accounts.google.com;"
        );
    }

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
});
