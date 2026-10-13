// ============================================================
// useTypewriter — efecto tipeo para el chat del Coach (ODD T2)
// ============================================================
//
// Revela `fullText` progresivamente (efecto "escribir en tiempo real",
// S3 de odd/tasks/ia-coach-markdown.md):
//   - Intervalo fijo (`intervalMs`) y duración objetivo (`durationMs`):
//     el paso por tick se calcula para que cualquier mensaje termine en
//     ~durationMs, sin importar el largo.
//   - Avanza por GRAFEMAS (Intl.Segmenter; fallback: code points): nunca
//     parte emojis compuestos (familia/bandera/tono) ni surrogates.
//   - Cada tick expone un prefijo del texto final — exactamente los
//     "fragmentos incompletos" que el renderer debe tolerar (S3).
//   - Con `enabled: false` (historial ya mostrado) no anima nada.
//   - `onTick` permite a la página mantener el autoscroll mientras escribe
//     (se llama en cada tick, INCLUIDO el que completa el mensaje).

import { useEffect, useMemo, useState } from 'react';

export interface UseTypewriterOptions {
  /** Animar el tipeo. `false` = mostrar completo de inmediato (historial). */
  enabled?: boolean;
  /** Milisegundos entre ticks. */
  intervalMs?: number;
  /** Duración objetivo total del tipeo, en milisegundos. */
  durationMs?: number;
  /** Se llama en cada tick, incluido el que completa el mensaje. */
  onTick?: () => void;
}

export interface UseTypewriterResult {
  /** Prefijo visible del texto en este tick. */
  text: string;
  /** true mientras quedan unidades por revelar. */
  isTyping: boolean;
}

/**
 * Divide el texto en unidades visibles: grafemas si el entorno soporta
 * `Intl.Segmenter` (navegadores modernos, Node 16+), o code points como
 * fallback. En ambos casos nunca se parte un surrogate.
 */
function splitUnits(text: string): string[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }
  return Array.from(text);
}

export function useTypewriter(
  fullText: string,
  { enabled = true, intervalMs = 30, durationMs = 1500, onTick }: UseTypewriterOptions = {},
): UseTypewriterResult {
  const units = useMemo(() => splitUnits(fullText), [fullText]);
  // Sin animación (historial/usuarios) arranca ya completo: sin parpadeo.
  const [count, setCount] = useState(() => (enabled ? 0 : units.length));

  useEffect(() => {
    if (!enabled || units.length === 0) {
      setCount(units.length);
      return;
    }

    setCount(0);
    const totalTicks = Math.max(1, Math.round(durationMs / intervalMs));
    const step = Math.max(1, Math.ceil(units.length / totalTicks));

    let current = 0;
    const id = setInterval(() => {
      current = Math.min(units.length, current + step);
      setCount(current);
      if (current >= units.length) clearInterval(id);
    }, intervalMs);

    return () => clearInterval(id);
  }, [units, enabled, intervalMs, durationMs]);

  useEffect(() => {
    if (count > 0) onTick?.();
  }, [count, onTick]);

  return {
    text: units.slice(0, count).join(''),
    isTyping: enabled && count < units.length,
  };
}
