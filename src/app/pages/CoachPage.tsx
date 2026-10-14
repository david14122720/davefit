// ============================================================
// CoachPage — /coach (MVP IA Coach + Markdown seguro y tipeo)
// ============================================================
//
// Página dedicada del Coach IA (sin widget flotante, spec S6):
//   - Hereda el layout global (PublicLayout) y el sistema de diseño.
//   - El chat habla SIEMPRE con /api/coach (endpoint seguro): nunca llama
//     al gateway de IA directamente con la anon key.
//   - Muestra la cuota (10 mensajes / 5 h) y una advertencia amigable
//     cuando se agota (mensaje N° 11 bloqueado).
//   - Las respuestas de la IA se renderizan como Markdown SANITIZADO
//     (negritas, cursivas, listas; enlaces neutralizados) y con efecto
//     tipeo fragment-safe (ver odd/tasks/ia-coach-markdown.md).
//   - Rediseño Stitch (T8): cabecera con cuota real, panel "Contexto Activo"
//     con datos REALES (perfil + user_stats) y chat de 2 columnas en
//     desktop, apilado en móvil. Se omiten los bloques del diseño que
//     requerirían funcionalidad inexistente (historial de conversaciones,
//     adjuntos, feedback, latencia, latencia/motor, etc.).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Fingerprint,
  Flame,
  HeartPulse,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCsrfHeader } from '../../lib/auth';
import { COACH_MESSAGE_LIMIT } from '../../lib/coach';
import { getUserStats } from '../../lib/stats';
import { calcularBMR, calcularTDEE } from '../../lib/nutrition';
import { renderCoachMarkdown } from '../lib/markdown';
import { useTypewriter } from '../hooks/useTypewriter';
import type { UserStats } from '../../types';

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CoachQuota {
  used: number;
  limit: number;
  remaining: number;
  reset_at: string | null;
}

interface Sugerencia {
  texto: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ------------------------------------------------------------------
// Constantes
// ------------------------------------------------------------------

/** Chips estáticos del diseño (adaptados al español rioplatense). */
const SUGERENCIAS: Sugerencia[] = [
  { texto: '¿Qué rutina me recomendás para hoy?', icon: Flame },
  { texto: '¿Cómo viene mi progreso esta semana?', icon: Activity },
  { texto: 'Armame una cena hiperproteica rápida', icon: UtensilsCrossed },
  { texto: 'Molestia en muñeca al hacer push-ups', icon: HeartPulse },
];

/** Labels de objetivo del dominio real (mismos textos que el resto de la app). */
const OBJETIVO_LABELS: Record<string, string> = {
  perder_peso: 'Bajar grasa',
  tonificar: 'Tonificar',
  ganar_fuerza: 'Ganar músculo',
  mantener_forma: 'Mantener forma',
};

/** Capacidades del motor (lista informativa estática del diseño). */
const CAPACIDADES = [
  'Ajuste dinámico por fatiga muscular',
  'Adaptación a espacios reducidos',
  'Equivalencias de macros al instante',
  'Reemplazo seguro por molestias articulares',
];

// ------------------------------------------------------------------
// Helpers de UI
// ------------------------------------------------------------------

/** Formatea `reset_at` en hora local; si es otro día, agrega la fecha. */
function formatResetTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return null;
    const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const esHoy = fecha.toDateString() === new Date().toDateString();
    if (esHoy) return hora;
    const dia = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    return `${dia} ${hora}`;
  } catch {
    return null;
  }
}

/** "pérdida" → "Pérdida" (label legible del nivel del perfil). */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ------------------------------------------------------------------
// Subcomponentes
// ------------------------------------------------------------------

/** Tile de métrica biométrica del "Contexto Activo". */
function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#201f20] rounded-lg p-3 flex flex-col min-w-0">
      <span className="text-[11px] text-[#5f636e]">{label}</span>
      <span className="text-sm font-bold text-[#e5e2e3] mt-0.5 truncate">{value}</span>
    </div>
  );
}

function ChatBubble({
  message,
  animate = false,
  onTick,
}: {
  message: ChatMessage;
  /** Animar el tipeo (solo respuestas de la IA al llegar). */
  animate?: boolean;
  /** Aviso en cada tick del tipeo (autoscroll). */
  onTick?: () => void;
}) {
  const esUsuario = message.role === 'user';

  // Efecto tipeo: el texto visible es un prefijo (fragmento) que se
  // re-renderiza en cada tick — así el parser demuestra tolerancia a
  // markdown incompleto sin romper la estructura (S3).
  const { text: textoVisible, isTyping } = useTypewriter(message.content, {
    enabled: !esUsuario && animate,
    onTick,
  });

  // Markdown SIEMPRE sanitizado antes de tocar el DOM (S4): negritas,
  // cursivas, listas y saltos; enlaces neutralizados (S2).
  const htmlSanitizado = useMemo(
    () => (esUsuario ? '' : renderCoachMarkdown(textoVisible)),
    [esUsuario, textoVisible],
  );

  return (
    <div className={`flex items-start gap-3 ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      {!esUsuario && (
        <div className="w-9 h-9 rounded-lg bg-[#2a2a2b] flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}
      <div
        data-testid={esUsuario ? 'coach-msg-user' : 'coach-msg-assistant'}
        // Mientras el tipeo muta este subárbol (~50 ticks), `aria-busy` le
        // pide al lector de pantalla diferir el anuncio hasta el completado
        // (evita el spam de la live region del chat).
        aria-busy={esUsuario ? undefined : isTyping}
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          esUsuario
            ? 'whitespace-pre-wrap bg-primary text-white rounded-tr-sm shadow-md'
            : `bg-[#201f20] text-[#e5e2e3] rounded-tl-sm shadow-sm [&_p]:text-[#e5e2e3] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-white [&_em]:italic [&_code]:rounded [&_code]:bg-[#353436] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[#0e0e0f] [&_pre]:p-2 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_hr]:my-2 [&_hr]:border-white/10 [&_h1]:my-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:my-2 [&_h2]:text-sm [&_h2]:font-bold [&_h3]:my-1.5 [&_h3]:font-semibold`
        }`}
      >
        {esUsuario ? (
          message.content
        ) : (
          <div dangerouslySetInnerHTML={{ __html: htmlSanitizado }} />
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-3 justify-start" data-testid="coach-typing">
      <div className="w-9 h-9 rounded-lg bg-[#2a2a2b] flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-5 h-5 text-primary" />
      </div>
      <div className="bg-[#201f20] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-[#9ea3ae] text-sm shadow-sm">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        El Coach está pensando…
      </div>
    </div>
  );
}

/** Bienvenida del chat vacío: burbuja del Coach + chips de consultas. */
function EmptyState({
  onFill,
  disabled,
  nombre,
}: {
  onFill: (texto: string) => void;
  disabled: boolean;
  nombre: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#2a2a2b] flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-5 h-5 text-primary" />
      </div>
      <div className="flex flex-col gap-3 max-w-[85%] sm:max-w-2xl min-w-0">
        <div className="bg-[#201f20] text-[#e5e2e3] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
          <p className="text-[#e5e2e3]">
            ¡Hola {nombre}! 👋 Soy tu{' '}
            <strong className="font-semibold text-primary">Coach IA</strong>. Conozco tus rutinas,
            tus métricas y tu objetivo. Preguntame lo que quieras para entrenar mejor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGERENCIAS.map(({ texto, icon: Icon }) => (
            <button
              key={texto}
              type="button"
              onClick={() => onFill(texto)}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#2a2a2b] hover:bg-[#353436] text-[#e5e2e3] text-xs sm:text-sm transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
              {texto}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Página
// ------------------------------------------------------------------

export default function CoachPage() {
  const { user, perfil, accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<CoachQuota | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** ¿El usuario está pegado al final del chat? (para no pelearle el scroll). */
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    pinnedToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  /** Autoscroll durante el efecto tipeo (solo si está pegado al final). */
  const handleTypeTick = useCallback(() => {
    if (!pinnedToBottomRef.current) return;
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // ------------------------------------------------------------------
  // Cuota inicial (GET) — nunca consume mensajes
  // ------------------------------------------------------------------

  const loadQuota = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await fetch('/api/coach', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data && typeof data.remaining === 'number') {
        setQuota({
          used: data.used ?? 0,
          limit: data.limit ?? COACH_MESSAGE_LIMIT,
          remaining: data.remaining,
          reset_at: data.reset_at ?? null,
        });
        setLimitReached(data.remaining <= 0);
      }
    } catch {
      // Silencioso: la cuota se reintenta al enviar.
    }
  }, [accessToken]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  // ------------------------------------------------------------------
  // Stats reales (racha/nivel) para el contexto del atleta — solo lectura.
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!user?.id) return;
    let activo = true;
    void getUserStats(user.id).then((data) => {
      if (activo) setStats(data);
    });
    return () => {
      activo = false;
    };
  }, [user?.id]);

  useEffect(() => {
    // Scrollear SOLO el contenedor interno del chat: `scrollIntoView` sobre un
    // ancla interna también arrastra la ventana hacia el fondo de la página
    // (regresión detectada en Judgment Day).
    const el = scrollContainerRef.current;
    // jsdom (tests unitarios) no implementa scrollTo: guarda explícita.
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, sending]);

  // ------------------------------------------------------------------
  // Enviar mensaje (POST al endpoint seguro)
  // ------------------------------------------------------------------

  async function sendMessage(texto?: string) {
    const content = (texto ?? input).trim();
    if (!content || sending || limitReached || !accessToken) return;

    setSending(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...getCsrfHeader(),
        },
        body: JSON.stringify({ message: content, history: messages.slice(-6) }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 200 && typeof data?.reply === 'string') {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        setQuota({
          used: data.used ?? 0,
          limit: data.limit ?? COACH_MESSAGE_LIMIT,
          remaining: data.remaining ?? 0,
          reset_at: data.reset_at ?? null,
        });
        return;
      }

      // Falló: quitar la burbuja optimista y devolver el texto al input.
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);

      if (response.status === 429) {
        setLimitReached(true);
        if (data) {
          setQuota({
            used: data.used ?? COACH_MESSAGE_LIMIT,
            limit: data.limit ?? COACH_MESSAGE_LIMIT,
            remaining: 0,
            reset_at: data.reset_at ?? null,
          });
        }
        return; // La advertencia persistente ya lo explica.
      }

      if (response.status === 401) {
        toast.error('Tu sesión expiró. Volvé a iniciar sesión.');
        return;
      }

      toast.error(data?.message || 'No pudimos enviar tu mensaje. Intentá de nuevo.');
      void loadQuota(); // Refleja el reembolso si el gateway falló.
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
      toast.error('Error de conexión. Intentá de nuevo.');
    } finally {
      setSending(false);
    }
  }

  const enviar = () => {
    void sendMessage();
  };

  /** Chips del diseño: solo rellenan el input (no consumen cuota). */
  const rellenarInput = useCallback((texto: string) => {
    setInput(texto);
    inputRef.current?.focus();
  }, []);

  /** Limpia la conversación local (la cuota vive en el servidor). */
  const limpiarConversacion = useCallback(() => {
    setMessages([]);
  }, []);

  // ------------------------------------------------------------------
  // Datos reales para el "Contexto Activo"
  // ------------------------------------------------------------------

  const resetLabel = quota ? formatResetTime(quota.reset_at) : null;
  const porcentajeCuota =
    quota && quota.limit > 0 ? Math.round((quota.remaining / quota.limit) * 100) : 0;

  const nombre = perfil?.nombre_completo || user?.email?.split('@')[0] || 'Atleta';
  const inicial = nombre.charAt(0).toUpperCase();
  const nivelLabel = perfil?.nivel ? capitalizar(perfil.nivel) : null;
  const objetivoLabel = perfil?.objetivo
    ? OBJETIVO_LABELS[perfil.objetivo] || perfil.objetivo
    : null;
  const racha = stats?.dias_racha ?? 0;
  const bioLinea = [
    nivelLabel ? `Nivel ${nivelLabel}` : null,
    racha > 0 ? `${racha} ${racha === 1 ? 'día' : 'días'} racha 🔥` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  // TDEE/BMR solo si son computables con datos persistidos reales.
  const { bmr, tdee } = useMemo(
    () => ({
      bmr: calcularBMR(perfil ?? {}),
      tdee: calcularTDEE(perfil ?? {}),
    }),
    [perfil],
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Cabecera: título + descripción + cuota real */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-[#2a2a2b] flex items-center justify-center shrink-0 shadow-lg">
            <Bot className="w-7 h-7 text-primary" />
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-[#0b0b0c] animate-pulse"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#e5e2e3]">
              Coach <span className="text-primary">IA</span>
            </h1>
            <p className="text-sm text-[#9ea3ae] max-w-2xl mt-0.5">
              Tu entrenador personal y nutricionista 24/7: conoce tus rutinas, métricas biométricas
              y objetivo actual.
            </p>
          </div>
        </div>

        {quota && (
          <div className="flex items-center gap-4 bg-[#1c1b1c] border border-white/5 px-4 py-3 rounded-xl shadow-sm w-full lg:w-auto shrink-0">
            <div className="flex flex-col flex-1 lg:flex-none lg:min-w-[170px] min-w-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9ea3ae]">
                  Consultas
                </span>
                <span data-testid="coach-quota" className="text-sm font-bold text-[#e5e2e3]">
                  {quota.remaining}/{quota.limit} disponibles
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#353436] rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${porcentajeCuota}%` }}
                />
              </div>
              <span className="text-[11px] text-[#5f636e] mt-1 text-right">
                {resetLabel ? `Próximo reinicio: ${resetLabel}` : 'Se renueva cada 5 horas'}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-lg bg-[#2a2a2b] text-[#9ea3ae] flex items-center justify-center shrink-0"
            >
              <Zap className="w-4 h-4" />
            </div>
          </div>
        )}
      </motion.div>

      {/* Advertencia de cuota agotada */}
      {limitReached && (
        <div
          data-testid="coach-limit-warning"
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium text-sm">
              Llegaste al límite de {COACH_MESSAGE_LIMIT} mensajes por 5 horas
            </p>
            <p className="text-amber-200/70 text-xs mt-1">
              {resetLabel
                ? `Tu cuota se renueva automáticamente a las ${resetLabel}.`
                : 'Tu cuota se renueva automáticamente tras 5 horas.'}
            </p>
          </div>
        </div>
      )}

      {/* Workspace: contexto del atleta (aside) + chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Contexto Activo (sidebar desktop / bloque superior móvil) */}
        <aside className="lg:col-span-4 w-full flex flex-col gap-4">
          <div className="bg-[#1c1b1c] rounded-xl p-5 shadow-md flex flex-col gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5f636e] flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-primary" />
              Contexto Activo
            </span>

            {/* Snapshot del atleta (datos reales del perfil) */}
            <div className="flex items-center gap-3 bg-[#201f20] rounded-lg p-2.5">
              <div className="w-11 h-11 rounded-full bg-[#353436] shrink-0 flex items-center justify-center">
                <span className="text-base font-bold text-primary">{inicial}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#e5e2e3] truncate">{nombre}</span>
                {bioLinea && <span className="text-xs text-[#9ea3ae] truncate">{bioLinea}</span>}
              </div>
            </div>

            {/* Métricas biométricas reales (o "—" si no son computables) */}
            <div className="grid grid-cols-2 gap-2">
              <MetricTile label="Meta actual" value={objetivoLabel || '—'} />
              <MetricTile
                label="TDEE / Gasto"
                value={tdee ? `${tdee.toLocaleString('es-AR')} kcal/d` : '—'}
              />
              <MetricTile label="BMR basal" value={bmr ? `${bmr} kcal/d` : '—'} />
              <MetricTile
                label="Peso actual"
                value={perfil?.peso_actual ? `${perfil.peso_actual} kg` : '—'}
              />
            </div>
          </div>

          {/* Capacidades del Motor (info estática del diseño; solo desktop) */}
          <div className="hidden lg:flex bg-[#1c1b1c] rounded-xl p-5 shadow-md flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5f636e] flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-primary" />
              Capacidades del Motor
            </span>
            <div className="flex flex-col gap-2 mt-1">
              {CAPACIDADES.map((capacidad) => (
                <div key={capacidad} className="flex items-center gap-2 text-xs text-[#9ea3ae]">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  {capacidad}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Panel de chat */}
        <section
          data-testid="coach-chat"
          className="lg:col-span-8 w-full bg-[#1c1b1c] rounded-2xl shadow-xl flex flex-col overflow-hidden h-[60vh] min-h-[440px] lg:h-[700px]"
        >
          {/* Barra superior del chat */}
          <div className="px-4 sm:px-6 py-3 bg-[#201f20] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-[#353436] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary" />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#201f20]"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#e5e2e3] truncate">
                    Coach IA DaveFit
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">
                    Online
                  </span>
                </div>
                <span className="text-xs text-[#5f636e] truncate">Memoria de sesión activa</span>
              </div>
            </div>
            <button
              type="button"
              onClick={limpiarConversacion}
              disabled={messages.length === 0 || sending}
              aria-label="Limpiar conversación"
              title="Limpiar conversación"
              className="w-9 h-9 rounded-lg bg-[#2a2a2b] text-[#9ea3ae] hover:text-white hover:bg-[#353436] flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <EmptyState
                onFill={rellenarInput}
                disabled={sending || limitReached}
                nombre={nombre}
              />
            ) : (
              messages.map((message, index) => (
                <ChatBubble
                  key={`${message.role}-${index}`}
                  message={message}
                  animate={message.role === 'assistant'}
                  onTick={handleTypeTick}
                />
              ))
            )}
            {sending && <TypingBubble />}
            <div />
          </div>

          {/* Compositor */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              enviar();
            }}
            className="px-4 sm:px-6 py-4 bg-[#201f20] flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 bg-[#0e0e0f] rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-primary/60 transition-all">
              <textarea
                data-testid="coach-input"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    enviar();
                  }
                }}
                placeholder={
                  limitReached ? 'Cuota agotada por ahora…' : 'Escribí tu consulta al Coach…'
                }
                disabled={limitReached}
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[#e5e2e3] placeholder:text-[#5f636e] focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                data-testid="coach-send"
                type="submit"
                disabled={sending || limitReached || !input.trim()}
                aria-label="Enviar mensaje"
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-all shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </div>
            {/* Privacidad y disclaimer (franja estática del diseño) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1 px-1 text-[11px] text-[#5f636e]">
              <span className="flex items-center gap-1 text-center sm:text-left">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                Tus datos biométricos se procesan con privacidad en DaveFit Core.
              </span>
              <span className="text-center sm:text-right">
                Coach IA puede cometer errores. Consultá siempre ante dolores agudos.
              </span>
            </div>
          </form>
        </section>
      </div>

      {/* Banner motivacional de racha (solo con datos reales de user_stats) */}
      {stats && (
        <div className="w-full bg-gradient-to-r from-[#1c1b1c] via-[#201f20] to-[#1c1b1c] rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-[#e5e2e3]">
                ¿Listo para superar tu récord de racha?
              </span>
              <span className="text-sm text-[#9ea3ae]">
                {racha > 0
                  ? `Llevás ${racha} ${racha === 1 ? 'día' : 'días'} consecutivos. Completá una sesión hoy para mantener la racha.`
                  : 'Todavía no arrancaste tu racha: completá una sesión y empezá a sumar.'}
              </span>
            </div>
          </div>
          <Link
            to="/biblioteca"
            className="px-5 py-2.5 rounded-lg bg-[#2a2a2b] hover:bg-[#353436] text-[#e5e2e3] text-sm font-semibold transition-colors shrink-0"
          >
            Explorar todas las rutinas →
          </Link>
        </div>
      )}
    </div>
  );
}
