// ============================================================
// Coach IA — helpers puros del endpoint /api/coach
// ============================================================
//
// Todo lo testeable vive acá y no toca la red:
//   - buildCoachSystemPrompt: inyecta el contexto del usuario
//     (3 últimas rutinas + objetivo principal + métricas) en el system prompt.
//   - validateCoachRequest: sanitiza mensaje + historial que manda el cliente.
//   - buildCoachMessages: arma el array final de mensajes para el gateway.
//
// El endpoint (src/pages/api/coach.ts) hace las llamadas (RPC de cuota,
// lecturas con RLS y el gateway de IA). Ver odd/tasks/ia-coach-mvp.md.

/** Modelo habilitado en el gateway de InsForge (el id sin prefijo da 500 "not enabled"). */
export const COACH_MODEL = 'openai/gpt-6-luna';

/** Cuota del MVP: 10 mensajes por ventana de 5 horas. */
export const COACH_MESSAGE_LIMIT = 10;
export const COACH_WINDOW_HOURS = 5;

/** Límites de entrada (defensa de payload). */
export const MAX_COACH_MESSAGE_CHARS = 2000;
export const MAX_COACH_HISTORY_MESSAGES = 6;
export const MAX_COACH_HISTORY_CHARS = 2000;

// ------------------------------------------------------------------
// Contexto del usuario
// ------------------------------------------------------------------

export interface CoachPerfilContext {
  objetivo: string | null;
  nivel: string | null;
  peso_actual: number | null;
  altura: number | null;
  dias_entrenamiento_semana: number | null;
}

export interface CoachStatsContext {
  xp_total: number | null;
  nivel: number | null;
  dias_racha: number | null;
  total_workouts: number | null;
  longest_streak: number | null;
  weekly_score: number | null;
  monthly_score: number | null;
  ultimo_entreno: string | null;
}

export interface CoachRutinaReciente {
  fecha: string | null;
  duracion_real: number | null;
  calorias_quemadas: number | null;
  sensacion: number | null;
  rutina: string | null;
}

export interface CoachContextData {
  perfil: CoachPerfilContext | null;
  stats: CoachStatsContext | null;
  rutinas: CoachRutinaReciente[];
}

/** Fecha ISO → `YYYY-MM-DD` (sin dependencias de locale). */
function formatFecha(iso: string | null | undefined): string {
  if (!iso) return 'fecha desconocida';
  return iso.slice(0, 10);
}

function formatNumero(valor: number | null | undefined): string | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : null;
}

/** Etiquetas legibles para los valores de `objetivo` que guarda la DB. */
const OBJETIVO_LABELS: Record<string, string> = {
  mantener_forma: 'mantener la forma',
  tonificar: 'tonificar',
  ganar_fuerza: 'ganar fuerza',
  perder_peso: 'perder peso',
};

function formatObjetivo(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return OBJETIVO_LABELS[valor] ?? valor;
}

function formatRutina(rutina: CoachRutinaReciente, index: number): string {
  const nombre = rutina.rutina?.trim() || 'Rutina sin nombre';
  const partes: string[] = [formatFecha(rutina.fecha)];
  const duracion = formatNumero(rutina.duracion_real);
  if (duracion) partes.push(`${duracion} min`);
  const calorias = formatNumero(rutina.calorias_quemadas);
  if (calorias) partes.push(`${calorias} kcal`);
  const sensacion = formatNumero(rutina.sensacion);
  if (sensacion) partes.push(`sensación ${sensacion}/5`);
  return `${index + 1}. ${nombre} — ${partes.join(', ')}`;
}

/**
 * Arma el system prompt con el contexto real del usuario.
 * Debe incluir ESTRICTAMENTE: 3 últimas rutinas, objetivo principal y
 * un resumen compacto de métricas generales (spec S5).
 */
export function buildCoachSystemPrompt(data: CoachContextData): string {
  const lineas: string[] = [
    'Eres "Coach DaveFit", el entrenador personal con IA de la plataforma DaveFit.',
    'Respondé siempre en español, de forma cercana, motivadora y concreta. Sé breve: apuntá a menos de 150 palabras salvo que el usuario pida más detalle.',
    'Sos experto en entrenamiento, nutrición deportiva y hábitos saludables. No inventes datos: usá solo el contexto de abajo y, si falta información, decilo.',
    'No des consejo médico: ante dolor, lesión o condición de salud, recomendá consultar a un profesional.',
    '',
    'Contexto real del usuario (no lo repitas entero; usalo para personalizar):',
  ];

  const perfil = data.perfil;
  const objetivo = formatObjetivo(perfil?.objetivo?.trim() ?? null);
  lineas.push(`- Objetivo principal: ${objetivo || 'sin datos (el usuario no completó su objetivo)'}`);

  const stats = data.stats;
  if (stats) {
    const partes = [
      stats.nivel != null ? `nivel ${stats.nivel}` : null,
      stats.xp_total != null ? `${stats.xp_total} XP` : null,
      stats.dias_racha != null ? `racha de ${stats.dias_racha} días` : null,
      stats.total_workouts != null ? `${stats.total_workouts} entrenamientos totales` : null,
      stats.longest_streak != null ? `mejor racha ${stats.longest_streak} días` : null,
      stats.weekly_score != null ? `score semanal ${stats.weekly_score}` : null,
      stats.monthly_score != null ? `score mensual ${stats.monthly_score}` : null,
      stats.ultimo_entreno ? `último entreno ${formatFecha(stats.ultimo_entreno)}` : null,
    ].filter((parte): parte is string => Boolean(parte));
    lineas.push(`- Métricas: ${partes.length > 0 ? partes.join(', ') : 'sin datos'}`);
  } else {
    lineas.push('- Métricas: sin datos (todavía no registró entrenamientos)');
  }

  const fisico: string[] = [];
  if (perfil?.peso_actual != null) fisico.push(`${perfil.peso_actual} kg`);
  if (perfil?.altura != null) fisico.push(`${perfil.altura} cm`);
  if (perfil?.dias_entrenamiento_semana != null) {
    fisico.push(`entrena ${perfil.dias_entrenamiento_semana} días/semana`);
  }
  lineas.push(`- Datos físicos: ${fisico.length > 0 ? fisico.join(', ') : 'sin datos'}`);

  if (data.rutinas.length > 0) {
    lineas.push('- Últimas rutinas realizadas (de la más reciente a la más antigua):');
    data.rutinas.slice(0, 3).forEach((rutina, index) => {
      lineas.push(`  ${formatRutina(rutina, index)}`);
    });
  } else {
    lineas.push('- Últimas rutinas realizadas: sin entrenamientos registrados todavía');
  }

  return lineas.join('\n');
}

// ------------------------------------------------------------------
// Validación de la request
// ------------------------------------------------------------------

export interface CoachHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type CoachRequestValidation =
  | { ok: true; message: string; history: CoachHistoryMessage[] }
  | { ok: false; error: string };

/**
 * Valida y sanitiza el body del POST /api/coach:
 *   - message: string no vacío, ≤ 2000 chars (trim incluido).
 *   - history: opcional; solo roles user/assistant con contenido string;
 *     se descartan entradas malformadas y se conservan los últimos 6.
 */
export function validateCoachRequest(body: unknown): CoachRequestValidation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Cuerpo inválido' };
  }

  const { message, history } = body as { message?: unknown; history?: unknown };

  if (typeof message !== 'string' || message.trim().length === 0) {
    return { ok: false, error: 'Mensaje requerido' };
  }

  const cleanMessage = message.trim();
  if (cleanMessage.length > MAX_COACH_MESSAGE_CHARS) {
    return { ok: false, error: `Mensaje demasiado largo (máx ${MAX_COACH_MESSAGE_CHARS} caracteres)` };
  }

  const cleanHistory: CoachHistoryMessage[] = [];
  if (Array.isArray(history)) {
    for (const entry of history) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { role, content } = entry as { role?: unknown; content?: unknown };
      if (role !== 'user' && role !== 'assistant') continue;
      if (typeof content !== 'string') continue;
      const cleanContent = content.trim().slice(0, MAX_COACH_HISTORY_CHARS);
      if (!cleanContent) continue;
      cleanHistory.push({ role, content: cleanContent });
    }
  }

  return {
    ok: true,
    message: cleanMessage,
    history: cleanHistory.slice(-MAX_COACH_HISTORY_MESSAGES),
  };
}

// ------------------------------------------------------------------
// Mensajes para el gateway
// ------------------------------------------------------------------

export interface CoachGatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Arma el array final: system prompt + historial + pregunta del usuario. */
export function buildCoachMessages(
  systemPrompt: string,
  history: CoachHistoryMessage[],
  message: string,
): CoachGatewayMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ];
}
