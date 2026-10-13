// ============================================================
// Tipos del SDK InsForge que NO están exportados oficialmente
// ============================================================
//
// El SDK InsForge expone una superficie pública mínima. Varios
// métodos que usamos (getCurrentUser, _tokenManager, baseUrl,
// anonKey) están en runtime pero no declarados en .d.ts.
//
// Este archivo centraliza los "escape hatches" tipados para que
// ningún consumidor tenga que escribir `(insforge as any)`.
//
// Si el SDK publica tipos oficiales en versiones futuras,
// este módulo se vuelve obsoleto y debe eliminarse.

// ------------------------------------------------------------
// Token manager interno
// ------------------------------------------------------------

export interface InsforgeTokenManager {
  accessToken: string | null;
  // Guarda la sesión en memoria del SDK (lo usan login/OAuth/refresh).
  saveSession?(session: { accessToken: string; user: unknown }): void;
  // Otras propiedades existen en runtime pero no se usan.
}

// ------------------------------------------------------------
// Auth shape extendido
// ------------------------------------------------------------

export interface InsforgeUser {
  id: string;
  email: string;
  profile?: {
    name?: string;
    avatar_url?: string;
  } | null;
}

export interface InsforgeAuthResult {
  data?: { user?: InsforgeUser | null } | null;
  error?: { message: string } | null;
}

export interface InsforgeAuthShape {
  signInWithPassword(params: {
    email: string;
    password: string;
  }): Promise<{ data: any; error: any }>;

  signUp(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ data: any; error: any }>;

  signInWithOAuth(params: {
    provider: string;
    redirectTo: string;
  }): Promise<void>;

  signOut(): Promise<void>;

  getSession(): Promise<{ data: { session: any } | null; error: any }>;

  refreshSession(): Promise<{ data: any; error: any }>;

  onAuthStateChange(cb: (event: string, session: any) => void): {
    data: { subscription: { unsubscribe: () => void } };
  };

  // Métodos no declarados pero existentes en runtime:
  getCurrentUser?(): Promise<InsforgeAuthResult>;
}

// ------------------------------------------------------------
// Cliente InsForge extendido
// ------------------------------------------------------------

export interface InsforgeClient {
  baseUrl: string;
  anonKey: string;
  auth: InsforgeAuthShape;
  database: any; // La query builder del SDK no está totalmente tipada.
  storage: any;
  _tokenManager?: InsforgeTokenManager;
  tokenManager?: InsforgeTokenManager;
  accessToken?: string | null;
  // Acceso al HTTP client interno (método público del SDK): permite setear
  // el Authorization de todas las requests (p. ej. en la vuelta de OAuth).
  getHttpClient?(): { setAuthToken(token: string | null): void };
}

// ------------------------------------------------------------
// Helpers tipados
// ------------------------------------------------------------

/** Devuelve getCurrentUser si existe, sino null. Tipado correctamente. */
export function getCurrentUserSafely(client: InsforgeClient) {
  return client.auth.getCurrentUser ?? null;
}

/** Lee el access token desde cualquier slot conocido del SDK. */
export function readAccessToken(client: InsforgeClient): string | null {
  return (
    client._tokenManager?.accessToken ??
    client.tokenManager?.accessToken ??
    client.accessToken ??
    null
  );
}

// ------------------------------------------------------------
// Claims del access token (OAuth legacy)
// ------------------------------------------------------------

/** Claims útiles del payload de un access token. */
export interface AccessTokenClaims {
  sub?: string;
  email?: string;
  name?: string;
}

/**
 * Decodifica el payload de un access token JWT SIN verificar la firma.
 *
 * Uso: registrar la sesión en la vuelta de OAuth legacy (token en el
 * fragmento de la URL) cuando el fragmento no trae `user_id`/`email`.
 * Es solo para hidratar el cliente: la autorización real la valida el
 * backend en cada request. Entradas malformadas devuelven `null`.
 */
export function decodeAccessTokenClaims(token: string): AccessTokenClaims | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    // Decodificación UTF-8 segura del base64 (maneja acentos/ñ).
    const json = decodeURIComponent(
      Array.from(binary, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
    );

    const claims = JSON.parse(json);
    return claims && typeof claims === 'object' ? (claims as AccessTokenClaims) : null;
  } catch {
    return null;
  }
}
