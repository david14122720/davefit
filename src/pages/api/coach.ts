// ============================================================
// POST/GET /api/coach — endpoint seguro del Coach IA
// ============================================================
//
// Reglas del MVP (odd/tasks/ia-coach-mvp.md):
//   - Exige sesión: el cliente manda `Authorization: Bearer <accessToken>`
//     (el mismo patrón que invokeRpc en src/lib/insforge.ts). El backend
//     valida el JWT de verdad en cada llamada (RPC + RLS con auth.uid()).
//   - PROHIBIDO llamar al gateway de IA desde el frontend con la anon key:
//     solo este endpoint server-side habla con /api/ai/*, y solo después de
//     validar sesión y cuota.
//   - Cuota: RPC atómico `coach_consumir_mensaje` (10 mensajes / 5 horas).
//     El mensaje N° 11 se bloquea ANTES de llamar a la IA (no gasta tokens).
//   - Contexto: lecturas con el token del usuario — RLS scopea por auth.uid();
//     se inyectan las 3 últimas rutinas + objetivo + métricas.
//   - SIN reembolso (Judgment Day ronda 1: el RPC de reembolso era un bypass
//     de cuota user-callable y fue eliminado). Si el gateway falla después
//     del consumo, el mensaje se pierde; la cuota se renueva sola a las 5 h.

import type { APIRoute } from 'astro';
import {
  COACH_MODEL,
  COACH_MESSAGE_LIMIT,
  buildCoachMessages,
  buildCoachSystemPrompt,
  validateCoachRequest,
  type CoachContextData,
  type CoachRutinaReciente,
} from '../../lib/coach';

const INSFORGE_URL = import.meta.env.PUBLIC_INSFORGE_URL;
const INSFORGE_ANON_KEY = import.meta.env.PUBLIC_INSFORGE_ANON_KEY;

const MAX_BODY_BYTES = 10_240;
const AI_TIMEOUT_MS = 60_000;
const MAX_AI_TOKENS = 512;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

interface RpcResult {
  status: number;
  ok: boolean;
  data: any;
}

/** RPC con el token del usuario: el backend valida el JWT y resuelve auth.uid(). */
async function callCoachRpc(functionName: string, token: string): Promise<RpcResult> {
  const response = await fetch(`${INSFORGE_URL}/api/database/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': INSFORGE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: '{}',
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // Respuesta sin JSON válido: `data` queda en null.
  }

  return { status: response.status, ok: response.ok, data };
}

/**
 * Lectura de tabla con el token del usuario. RLS scopea por auth.uid():
 * sin filtros explícitos, cada tabla devuelve SOLO las filas del usuario.
 * Devuelve null si la lectura falla (el contexto se degrada con gracia).
 */
async function fetchRecords(table: string, query: string, token: string): Promise<any[] | null> {
  try {
    const response = await fetch(`${INSFORGE_URL}/api/database/records/${table}?${query}`, {
      headers: {
        'apikey': INSFORGE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function toNumero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const parsed = Number(valor);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toTexto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

/** Arma el contexto del usuario desde la DB (con RLS por token). */
async function buildContext(token: string): Promise<CoachContextData> {
  const [perfilRows, statsRows, historialRows] = await Promise.all([
    fetchRecords(
      'perfiles',
      'select=objetivo,nivel,peso_actual,altura,dias_entrenamiento_semana&limit=1',
      token,
    ),
    fetchRecords(
      'user_stats',
      'select=xp_total,nivel,dias_racha,total_workouts,longest_streak,weekly_score,monthly_score,ultimo_entreno&limit=1',
      token,
    ),
    fetchRecords(
      'historial_entrenamientos',
      'select=fecha,duracion_real,calorias_quemadas,sensacion,rutinas(nombre)&order=fecha.desc&limit=3',
      token,
    ),
  ]);

  const perfilRow = perfilRows?.[0] ?? null;
  const statsRow = statsRows?.[0] ?? null;

  const rutinas: CoachRutinaReciente[] = (historialRows ?? []).map((row) => ({
    fecha: toTexto(row?.fecha),
    duracion_real: toNumero(row?.duracion_real),
    calorias_quemadas: toNumero(row?.calorias_quemadas),
    sensacion: toNumero(row?.sensacion),
    rutina: toTexto(row?.rutinas?.nombre),
  }));

  return {
    perfil: perfilRow
      ? {
          objetivo: toTexto(perfilRow.objetivo),
          nivel: toTexto(perfilRow.nivel),
          peso_actual: toNumero(perfilRow.peso_actual),
          altura: toNumero(perfilRow.altura),
          dias_entrenamiento_semana: toNumero(perfilRow.dias_entrenamiento_semana),
        }
      : null,
    stats: statsRow
      ? {
          xp_total: toNumero(statsRow.xp_total),
          nivel: toNumero(statsRow.nivel),
          dias_racha: toNumero(statsRow.dias_racha),
          total_workouts: toNumero(statsRow.total_workouts),
          longest_streak: toNumero(statsRow.longest_streak),
          weekly_score: toNumero(statsRow.weekly_score),
          monthly_score: toNumero(statsRow.monthly_score),
          ultimo_entreno: toTexto(statsRow.ultimo_entreno),
        }
      : null,
    rutinas,
  };
}

// =================================================================
// GET — estado de la cuota (sin consumir)
// =================================================================

export const GET: APIRoute = async ({ request }) => {
  if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
    return jsonResponse({ error: 'Configuración del servidor incompleta' }, 500);
  }

  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'No autenticado. Iniciá sesión para usar el Coach.' }, 401);
  }

  try {
    const estado = await callCoachRpc('coach_estado', token);

    if (estado.status === 401 || estado.status === 403) {
      return jsonResponse({ error: 'Sesión inválida o expirada' }, 401);
    }
    if (!estado.ok || !estado.data) {
      return jsonResponse({ error: 'No pudimos obtener tu cuota del Coach' }, 502);
    }

    return jsonResponse({
      used: estado.data.used ?? 0,
      limit: estado.data.limit ?? COACH_MESSAGE_LIMIT,
      remaining: estado.data.remaining ?? COACH_MESSAGE_LIMIT,
      reset_at: estado.data.reset_at ?? null,
    });
  } catch (e: any) {
    console.error('[Coach] Error obteniendo estado:', e?.message);
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};

// =================================================================
// POST — enviar un mensaje al Coach
// =================================================================

export const POST: APIRoute = async ({ request }) => {
  if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
    return jsonResponse({ error: 'Configuración del servidor incompleta' }, 500);
  }

  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'No autenticado. Iniciá sesión para usar el Coach.' }, 401);
  }

  try {
    // --- Guardas de payload ---
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Cuerpo demasiado grande' }, 413);
    }

    const bodyText = await request.text();
    if (bodyText.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Cuerpo demasiado grande' }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ error: 'JSON inválido' }, 400);
    }

    const validation = validateCoachRequest(body);
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, 400);
    }

    // --- 1) Cuota (consume atómico; bloquea el mensaje N° 11 sin gastar IA) ---
    const quota = await callCoachRpc('coach_consumir_mensaje', token);

    if (quota.status === 401 || quota.status === 403) {
      return jsonResponse({ error: 'Sesión inválida o expirada' }, 401);
    }
    if (!quota.ok || !quota.data) {
      return jsonResponse({ error: 'No pudimos validar tu cuota del Coach' }, 502);
    }

    if (!quota.data.allowed) {
      return jsonResponse(
        {
          error: 'limit_reached',
          message: 'Llegaste al límite de 10 mensajes por 5 horas. Tu cuota se renueva automáticamente.',
          used: quota.data.used ?? COACH_MESSAGE_LIMIT,
          limit: quota.data.limit ?? COACH_MESSAGE_LIMIT,
          remaining: 0,
          reset_at: quota.data.reset_at ?? null,
        },
        429,
      );
    }

    // --- 2) Contexto del usuario (RLS por token; degradación con gracia) ---
    const context = await buildContext(token);

    // --- 3) Gateway de IA (server-side, con la anon key SOLO acá) ---
    const messages = buildCoachMessages(
      buildCoachSystemPrompt(context),
      validation.history,
      validation.message,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let aiResponse: Response;
    try {
      aiResponse = await fetch(`${INSFORGE_URL}/api/ai/chat/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
        },
        body: JSON.stringify({
          model: COACH_MODEL,
          messages,
          maxTokens: MAX_AI_TOKENS,
        }),
        signal: controller.signal,
      });
    } catch (aiError: any) {
      console.error('[Coach] Gateway inalcanzable:', aiError?.message);
      return jsonResponse(
        { error: 'gateway_error', message: 'El Coach no está disponible en este momento. Intentá de nuevo en unos minutos.' },
        502,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResponse.ok) {
      console.error('[Coach] Gateway respondió', aiResponse.status);
      return jsonResponse(
        { error: 'gateway_error', message: 'El Coach no está disponible en este momento. Intentá de nuevo en unos minutos.' },
        502,
      );
    }

    const aiData = await aiResponse.json().catch(() => null);
    const reply = typeof aiData?.text === 'string' ? aiData.text.trim() : '';

    if (!reply) {
      console.error('[Coach] Respuesta vacía del gateway');
      return jsonResponse(
        { error: 'gateway_error', message: 'El Coach no pudo generar una respuesta. Intentá de nuevo.' },
        502,
      );
    }

    return jsonResponse({
      reply,
      used: quota.data.used,
      limit: quota.data.limit ?? COACH_MESSAGE_LIMIT,
      remaining: quota.data.remaining,
      reset_at: quota.data.reset_at ?? null,
    });
  } catch (e: any) {
    console.error('[Coach] Excepción:', e?.message);
    return jsonResponse({ error: 'Error interno del servidor' }, 500);
  }
};
