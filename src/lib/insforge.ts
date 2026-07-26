// ============================================================
// Cliente InsForge singleton + RPC seguro con validación
// ============================================================

import { createClient } from '@insforge/sdk';

const insforgeUrl = import.meta.env.PUBLIC_INSFORGE_URL;
const insforgeAnonKey = import.meta.env.PUBLIC_INSFORGE_ANON_KEY;

const MAX_RPC_PAYLOAD_BYTES = 4096;
const RPC_RATE_LIMIT_MS = 2000; // 2 segundos entre llamadas al mismo RPC
const RPC_RATE_LIMIT_MAX = 10; // máx llamadas en ventana

if (!insforgeUrl) {
  console.error('[InsForge] PUBLIC_INSFORGE_URL no está definida');
}
if (!insforgeAnonKey) {
  console.error('[InsForge] PUBLIC_INSFORGE_ANON_KEY no está definida');
}

// =================================================================
// Singleton SDK
// =================================================================

/**
 * Cliente InsForge singleton para toda la aplicación.
 * El SDK maneja la persistencia de la sesión y los tokens automáticamente.
 */
export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey,
});

// =================================================================
// RPC invoker con seguridad
// =================================================================

/** Lista blanca de funciones RPC permitidas */
const ALLOWED_RPCS = new Set([
  'process_workout_completion',
]);

/** Patrón seguro para nombres de parámetros */
const SAFE_PARAM_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Ventana de rate-limit por función */
const rpcCallLog = new Map<string, number[]>();

/**
 * Valida que el payload del RPC sea seguro:
 * - Tamaño límite
 * - Nombres de parámetros seguros
 * - Tipos básicos (string, number, boolean, null)
 */
function validatePayload(payload: Record<string, any>): string | null {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json).length;

  if (bytes > MAX_RPC_PAYLOAD_BYTES) {
    return `Payload demasiado grande: ${bytes} bytes (máx ${MAX_RPC_PAYLOAD_BYTES})`;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (!SAFE_PARAM_RE.test(key)) {
      return `Nombre de parámetro inválido: "${key}"`;
    }
    if (value !== null && typeof value === 'object') {
      return `Parámetro "${key}": no se permiten objetos anidados`;
    }
  }

  return null; // OK
}

/**
 * Rate-limit simple por función RPC.
 * Previene llamadas accidentales repetidas (no es seguridad real,
 * es defensa contra bugs en el cliente).
 */
function checkRateLimit(functionName: string): string | null {
  const now = Date.now();
  const calls = rpcCallLog.get(functionName) || [];
  const recent = calls.filter((t) => now - t < RPC_RATE_LIMIT_MS);

  if (recent.length >= RPC_RATE_LIMIT_MAX) {
    return `Demasiadas llamadas a "${functionName}" — espera ${RPC_RATE_LIMIT_MS / 1000}s`;
  }

  recent.push(now);
  rpcCallLog.set(functionName, recent);
  return null;
}

/**
 * Invoca una función RPC en la base de datos con validación de
 * seguridad, rate-limit y normalización de errores.
 *
 * @returns Objeto con `data` y `error` normalizado.
 */
export async function invokeRpc<T = any>(
  functionName: string,
  payload: Record<string, any> = {},
): Promise<{ data: T | null; error: { message: string; code: string; retryable: boolean } | null }> {
  // 1. Lista blanca
  if (!ALLOWED_RPCS.has(functionName)) {
    const msg = `RPC "${functionName}" no está en la lista blanca`;
    console.error(`[InsForge] ${msg}`);
    return { data: null, error: { message: msg, code: 'RPC_NOT_ALLOWED', retryable: false } };
  }

  // 2. Validación de payload
  const validationError = validatePayload(payload);
  if (validationError) {
    console.error(`[InsForge] Payload inválido: ${validationError}`);
    return { data: null, error: { message: validationError, code: 'RPC_INVALID_PAYLOAD', retryable: false } };
  }

  // 3. Rate-limit
  const rateError = checkRateLimit(functionName);
  if (rateError) {
    console.warn(`[InsForge] Rate limit: ${rateError}`);
    return { data: null, error: { message: rateError, code: 'RPC_RATE_LIMITED', retryable: true } };
  }

  // 4. Ejecución
  try {
    const { data: sessionData } = await insforge.auth.getSession();
    const token = sessionData?.session?.accessToken ?? null;

    const response = await fetch(`${insforgeUrl}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': insforgeAnonKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const retryable = [502, 503, 504, 520].includes(response.status);
      let message: string;
      try {
        const errBody = await response.json();
        message = errBody?.message || errBody?.error || `HTTP ${response.status}`;
      } catch {
        message = `HTTP ${response.status}: ${response.statusText}`;
      }
      return {
        data: null,
        error: { message, code: `HTTP_${response.status}`, retryable },
      };
    }

    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: err?.message || 'Error de red al invocar RPC',
        code: 'RPC_NETWORK_ERROR',
        retryable: true,
      },
    };
  }
}
