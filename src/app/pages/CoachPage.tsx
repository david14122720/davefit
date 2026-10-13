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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AlertTriangle, Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCsrfHeader } from '../../lib/auth';
import { COACH_MESSAGE_LIMIT } from '../../lib/coach';
import { renderCoachMarkdown } from '../lib/markdown';
import { useTypewriter } from '../hooks/useTypewriter';

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

// ------------------------------------------------------------------
// Helpers de UI
// ------------------------------------------------------------------

const SUGERENCIAS = [
  '¿Qué rutina me recomendás para hoy?',
  '¿Cómo viene mi progreso esta semana?',
  'Armame una semana de entrenamiento acorde a mi objetivo',
];

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

// ------------------------------------------------------------------
// Subcomponentes
// ------------------------------------------------------------------

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
    <div className={`flex gap-3 ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      {!esUsuario && (
        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        data-testid={esUsuario ? 'coach-msg-user' : 'coach-msg-assistant'}
        // Mientras el tipeo muta este subárbol (~50 ticks), `aria-busy` le
        // pide al lector de pantalla diferir el anuncio hasta el completado
        // (evita el spam de la live region del chat).
        aria-busy={esUsuario ? undefined : isTyping}
        className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          esUsuario
            ? 'whitespace-pre-wrap bg-primary/15 border border-primary/20 text-white'
            : 'bg-white/5 border border-white/10 text-gray-200 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-white [&_em]:italic [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/30 [&_pre]:p-2 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_hr]:my-2 [&_hr]:border-white/10 [&_h1]:my-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:my-2 [&_h2]:text-sm [&_h2]:font-bold [&_h3]:my-1.5 [&_h3]:font-semibold'
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
    <div className="flex gap-3 justify-start" data-testid="coach-typing">
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        El Coach está pensando…
      </div>
    </div>
  );
}

function EmptyState({ onPick, disabled }: { onPick: (texto: string) => void; disabled: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Bot className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-white font-semibold">¡Hola! Soy tu Coach IA</p>
        <p className="text-on-surface-variant text-sm mt-1 max-w-md">
          Conozco tus rutinas, tus métricas y tu objetivo. Preguntame lo que quieras para
          entrenar mejor.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {SUGERENCIAS.map((sugerencia) => (
          <button
            key={sugerencia}
            type="button"
            onClick={() => onPick(sugerencia)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-surface text-on-surface-variant hover:text-white hover:border-primary/40 text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            {sugerencia}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Página
// ------------------------------------------------------------------

export default function CoachPage() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<CoachQuota | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
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

  const resetLabel = quota ? formatResetTime(quota.reset_at) : null;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 pt-2">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 mb-6 sm:mb-8"
      >
        <div className="w-12 h-12 rounded-lg bg-linear-to-br from-primary/20 to-primary-dark/20 flex items-center justify-center border border-primary/20 shrink-0">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Coach <span className="text-primary">IA</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">
            Tu entrenador personal: conoce tus rutinas, métricas y objetivos.
          </p>
        </div>
        {quota && (
          <div
            data-testid="coach-quota"
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
              quota.remaining > 0
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            Te quedan {quota.remaining}/{quota.limit} mensajes
          </div>
        )}
      </motion.div>

      {/* Advertencia de cuota agotada */}
      {limitReached && (
        <div
          data-testid="coach-limit-warning"
          className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3"
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

      {/* Panel de chat */}
      <div
        data-testid="coach-chat"
        className="bg-surface border border-white/10 rounded-lg flex flex-col h-[62vh] min-h-[440px] overflow-hidden"
      >
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <EmptyState onPick={(texto) => void sendMessage(texto)} disabled={sending || limitReached} />
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
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            enviar();
          }}
          className="border-t border-white/10 p-3 sm:p-4 flex items-end gap-3 bg-background-darker/50"
        >
          <textarea
            data-testid="coach-input"
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
            className="flex-1 resize-none bg-background-darker border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-text-muted focus:outline-hidden focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            data-testid="coach-send"
            type="submit"
            disabled={sending || limitReached || !input.trim()}
            aria-label="Enviar mensaje"
            className="px-4 py-3 bg-primary hover:bg-primary-hover text-black font-bold rounded-lg transition-all shadow-[0_10px_20px_rgba(255,107,0,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>

      {!limitReached && (
        <p className="text-text-muted text-xs mt-3 text-center">
          El Coach conoce tu historial real de DaveFit. Tenés {COACH_MESSAGE_LIMIT} mensajes
          cada 5 horas.
        </p>
      )}
    </div>
  );
}
