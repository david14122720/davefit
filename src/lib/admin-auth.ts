// ================================================================
// Admin Authorization — Server-Side
// ================================================================
// Esta función se ejecuta exclusivamente en el servidor (Astro API routes).
// Verifica que el JWT sea válido y que el usuario tenga rol 'admin'.
// NUNCA confía en datos enviados por el cliente — solo en el JWT.
// ================================================================

import { createClient } from '@insforge/sdk';

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export interface VerifiedAdmin {
  userId: string;
  email: string;
}

/**
 * Verifica que el token JWT corresponda a un administrador válido.
 *
 * 1. Extrae el token del header Authorization
 * 2. Crea un cliente InsForge server-side con el token
 * 3. Verifica el JWT contra el backend (getCurrentSession)
 * 4. Consulta la tabla `perfiles` para confirmar rol === 'admin'
 *
 * @throws AdminAuthError si el token es inválido o el usuario no es admin
 */
export async function verifyAdmin(
  request: Request,
): Promise<VerifiedAdmin> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AdminAuthError('Token de autorización requerido', 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token || token.length < 20) {
    throw new AdminAuthError('Token inválido', 401);
  }

  // Crear cliente server-side — usa el token del usuario para autenticarse
  const serverClient = createClient({
    baseUrl: import.meta.env.PUBLIC_INSFORGE_URL,
    anonKey: import.meta.env.PUBLIC_INSFORGE_ANON_KEY,
    headers: { Authorization: `Bearer ${token}` },
  });

  // Verificar el JWT contra el backend de InsForge
  let session;
  try {
    const { data, error } = await serverClient.auth.getCurrentSession();
    if (error || !data?.session) {
      throw new AdminAuthError('Sesión inválida o expirada', 401);
    }
    session = data.session;
  } catch (err) {
    if (err instanceof AdminAuthError) throw err;
    throw new AdminAuthError('Error verificando autenticación', 500);
  }

  const userId = session.user?.id;
  if (!userId) {
    throw new AdminAuthError('Usuario no identificado', 401);
  }

  // Consultar perfil para verificar rol de administrador
  try {
    const { data: perfil, error: perfilError } = await serverClient.database
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single();

    if (perfilError || !perfil) {
      throw new AdminAuthError('Perfil no encontrado', 403);
    }

    if (perfil.rol !== 'admin') {
      throw new AdminAuthError('Se requieren permisos de administrador', 403);
    }
  } catch (err) {
    if (err instanceof AdminAuthError) throw err;
    throw new AdminAuthError('Error verificando permisos', 500);
  }

  return {
    userId,
    email: session.user?.email || '',
  };
}
