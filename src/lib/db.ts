// ============================================================
// Capa de consultas a base de datos con retry, timeout y
// normalización de errores.
// ============================================================

import { insforge } from './insforge';

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export interface QueryResult<T> {
  data: T | null;
  error: DbError | null;
}

export interface DbError {
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
}

type QueryBuilder<T> = () => Promise<{ data: T | null; error: any }>;

/**
 * Variante que preserva el `count` devuelto por queries con
 * `{ count: 'exact' | 'estimated' }`.
 */
type QueryBuilderWithCount<T> = () => Promise<{
  data: T | null;
  error: any;
  count: number | null;
}>;

// ------------------------------------------------------------------
// Configuración
// ------------------------------------------------------------------

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  /** Códigos HTTP considerados recuperables */
  retryableStatuses: new Set([408, 502, 503, 504, 520, 524]),
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Espera con backoff exponencial + jitter */
function delay(attempt: number, baseMs: number): Promise<void> {
  const exponential = Math.min(baseMs * 2 ** attempt, RETRY_CONFIG.maxDelayMs);
  const jitter = Math.random() * exponential * 0.3;
  return new Promise((r) => setTimeout(r, exponential + jitter));
}

/** Normaliza un error de cualquier origen a DbError */
function normalizeError(err: any, status?: number): DbError {
  if (err?.message && err?.retryable !== undefined) {
    return err as DbError; // ya normalizado
  }

  const message =
    err?.message ||
    err?.error_description ||
    err?.error ||
    (typeof err === 'string' ? err : 'Error desconocido');

  // 502/503/504/520 son recuperables
  const code =
    typeof status === 'number'
      ? `HTTP_${status}`
      : err?.code || 'UNKNOWN';

  const retryable = status
    ? RETRY_CONFIG.retryableStatuses.has(status)
    : false;

  return { message, code, status, retryable };
}

// ------------------------------------------------------------------
// Core: query con retry
// ------------------------------------------------------------------

/**
 * Ejecuta una query con reintentos automáticos para errores
 * recuperables (502, 503, 504, 520, timeout).
 *
 * @example
 * const { data, error } = await queryWithRetry(() =>
 *   insforge.database.from('ejercicios').select('*')
 * );
 */
export async function queryWithRetry<T>(
  queryFn: QueryBuilder<T>,
  options?: { retries?: number }
): Promise<QueryResult<T>> {
  const maxRetries = options?.retries ?? RETRY_CONFIG.maxRetries;
  let lastError: DbError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await queryFn();

      if (error) {
        const dbErr = normalizeError(error);
        if (dbErr.retryable && attempt < maxRetries) {
          lastError = dbErr;
          console.warn(
            `[DB] Error recuperable (intento ${attempt + 1}/${maxRetries + 1}):`,
            dbErr.message
          );
          await delay(attempt, RETRY_CONFIG.baseDelayMs);
          continue;
        }
        return { data: null, error: dbErr };
      }

      return { data, error: null };
    } catch (err: any) {
      const dbErr = normalizeError(err);

      if (dbErr.retryable && attempt < maxRetries) {
        lastError = dbErr;
        console.warn(
          `[DB] Excepción recuperable (intento ${attempt + 1}/${maxRetries + 1}):`,
          dbErr.message
        );
        await delay(attempt, RETRY_CONFIG.baseDelayMs);
        continue;
      }

      return { data: null, error: dbErr };
    }
  }

  // Si llegamos aquí, todos los reintentos fallaron
  return {
    data: null,
    error: lastError || {
      message: 'La operación falló después de varios intentos',
      code: 'MAX_RETRIES',
      retryable: false,
    },
  };
}

/**
 * Como `queryWithRetry` pero preserva el `count` de queries
 * que usan `{ count: 'exact' }`.
 */
export async function queryWithRetryAndCount<T>(
  queryFn: QueryBuilderWithCount<T>,
  options?: { retries?: number }
): Promise<QueryResult<T> & { count: number | null }> {
  const maxRetries = options?.retries ?? RETRY_CONFIG.maxRetries;
  let lastError: DbError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error, count } = await queryFn();

      if (error) {
        const dbErr = normalizeError(error);
        if (dbErr.retryable && attempt < maxRetries) {
          lastError = dbErr;
          console.warn(
            `[DB] Error recuperable (intento ${attempt + 1}/${maxRetries + 1}):`,
            dbErr.message
          );
          await delay(attempt, RETRY_CONFIG.baseDelayMs);
          continue;
        }
        return { data: null, error: dbErr, count: null };
      }

      return { data, error: null, count: count ?? null };
    } catch (err: any) {
      const dbErr = normalizeError(err);

      if (dbErr.retryable && attempt < maxRetries) {
        lastError = dbErr;
        console.warn(
          `[DB] Excepción recuperable (intento ${attempt + 1}/${maxRetries + 1}):`,
          dbErr.message
        );
        await delay(attempt, RETRY_CONFIG.baseDelayMs);
        continue;
      }

      return { data: null, error: dbErr, count: null };
    }
  }

  return {
    data: null,
    error: lastError || {
      message: 'La operación falló después de varios intentos',
      code: 'MAX_RETRIES',
      retryable: false,
    },
    count: null,
  };
}

// ------------------------------------------------------------------
// Helpers específicos para queries frecuentes
// ------------------------------------------------------------------

/**
 * Obtiene un solo registro por ID con retry.
 */
export async function getById<T>(
  table: string,
  id: string | number,
  idColumn: string = 'id',
  select: string = '*'
): Promise<QueryResult<T>> {
  return queryWithRetry<T>(() =>
    insforge.database
      .from(table)
      .select(select)
      .eq(idColumn, id)
      .maybeSingle()
  );
}

/**
 * Lista registros con filtro opcional y orden.
 */
export async function listRows<T>(
  table: string,
  options?: {
    select?: string;
    filters?: Record<string, any>;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  }
): Promise<QueryResult<T[]>> {
  let query = insforge.database.from(table).select(options?.select || '*');

  if (options?.filters) {
    for (const [col, val] of Object.entries(options.filters)) {
      if (val !== undefined && val !== null) {
        query = query.eq(col, val);
      }
    }
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy, {
      ascending: options?.ascending ?? true,
    });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return queryWithRetry<T[]>(() => query);
}
