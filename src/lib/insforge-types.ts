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
