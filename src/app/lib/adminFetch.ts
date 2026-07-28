// ================================================================
// Admin Fetch — Client-Side
// ================================================================
// Wrapper sobre fetch para llamar a los endpoints de administración.
// Incluye automáticamente el JWT y el token CSRF en cada request.
//
// NUNCA llama a insforge.database directamente.
// Todas las operaciones pasan por el servidor (verificación JWT + rol).
// ================================================================

import { getCsrfHeader } from '../../lib/auth';

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Ejecuta una llamada autenticada a un endpoint de administración.
 *
 * @param url  Ruta del endpoint (ej: '/api/admin/ejercicios')
 * @param token  JWT del usuario (accessToken)
 * @param options  Opciones adicionales de fetch (method, body, etc.)
 */
export async function adminFetch<T = any>(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  // Solo agregar CSRF para métodos mutantes
  if (CSRF_METHODS.has(method)) {
    Object.assign(headers, getCsrfHeader());
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Manejar 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Intentar parsear JSON
  const data = await response.json().catch(() => ({ error: response.statusText }));

  if (!response.ok) {
    const message = data?.error || `Error del servidor (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}
