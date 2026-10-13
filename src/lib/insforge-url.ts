// ============================================================
// URL efectiva del backend InsForge (browser vs SSR)
// ============================================================
//
// En el NAVEGADOR usamos el mismo origen de la app: el dev server
// (proxy Vite) y nginx en producción proxyean /api/auth, /api/storage y
// /rest/v1 hacia el backend real.
//
// Por qué: Chrome rechaza la cookie de sesión `insforge_refresh_token`
// que setea InsForge (SameSite=None sin Secure en respuestas HTTP) cuando
// la respuesta es cross-site; resultado: la sesión moría en cada recarga
// y /api/auth/refresh devolvía 401. Same-origin + rewrite del flag a
// SameSite=Lax (lo hacen los proxies) la vuelve almacenable.
//
// En SSR/Node no hay cookies de navegador ni rechazos del browser: se
// habla directo al backend con la URL del entorno.
//
// Ver odd/tasks/insforge-session-proxy.md

/**
 * Resuelve la URL base del cliente InsForge según el entorno.
 *
 * @param envUrl    Valor de PUBLIC_INSFORGE_URL (backend absoluto).
 * @param isBrowser true si corre en el navegador.
 * @param origin    Origen actual del navegador (window.location.origin).
 * @returns El origen actual en browser (proxy same-origin) o la URL del env.
 */
export function resolveInsforgeBaseUrl(
  envUrl: string | undefined,
  isBrowser: boolean,
  origin?: string,
): string {
  if (isBrowser && origin) return origin;
  return envUrl ?? '';
}

/**
 * URL del endpoint RPC del backend InsForge.
 *
 * La ruta real es `/api/database/rpc/{fn}` (la misma que usa
 * `@insforge/sdk` internamente). Antes se apuntaba a `/rest/v1/rpc/...`,
 * que NO existe en el backend: todo RPC devolvía 404 y el flujo de
 * gamificación (XP/rachas) estaba muerto.
 */
export function buildRpcUrl(baseUrl: string, functionName: string): string {
  return `${baseUrl}/api/database/rpc/${encodeURIComponent(functionName)}`;
}
