// ============================================================
// useTypewriter — tests del efecto tipeo (test-first, ODD T2)
// ============================================================
//
// Reglas cubiertas (S3 de odd/tasks/ia-coach-markdown.md):
// 1. El texto se revela progresivamente hasta completarse.
// 2. Con `enabled: false` (historial) el texto aparece completo, sin tipeo.
// 3. El tipeo avanza por code points: nunca parte emojis.
// 4. onTick avisa mientras escribe (lo usa la página para el autoscroll).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from '../useTypewriter';

afterEach(() => {
  vi.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** true si el string contiene un surrogate UTF-16 suelto (emoji partido). */
function hasLoneSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

describe('useTypewriter', () => {
  it('revela el texto progresivamente hasta completarlo', () => {
    vi.useFakeTimers();
    const full = 'Fuerza total para hoy'; // 22 caracteres
    const { result } = renderHook(() =>
      useTypewriter(full, { intervalMs: 30, durationMs: 300 }),
    );

    // Arranca vacío y marcado como "escribiendo".
    expect(result.current.text).toBe('');
    expect(result.current.isTyping).toBe(true);

    advance(30);
    const parcial = result.current.text;
    expect(parcial.length).toBeGreaterThan(0);
    expect(parcial.length).toBeLessThan(full.length);
    expect(result.current.isTyping).toBe(true);

    advance(600);
    expect(result.current.text).toBe(full);
    expect(result.current.isTyping).toBe(false);
  });

  it('con enabled=false muestra el texto completo de inmediato (sin tipeo)', () => {
    const { result } = renderHook(() => useTypewriter('Texto final del historial', { enabled: false }));

    expect(result.current.text).toBe('Texto final del historial');
    expect(result.current.isTyping).toBe(false);
  });

  it('avanza por grafemas: no parte emojis compuestos ni surrogates', () => {
    vi.useFakeTimers();
    const full = '💪🔥🇦🇷👨‍👩‍👧‍👦ok';
    const { result } = renderHook(() =>
      useTypewriter(full, { intervalMs: 30, durationMs: 5000 }),
    );
    const graphemes = Array.from(
      new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(full),
      (entry) => entry.segment,
    );
    // Todos los prefijos válidos (incluido el texto completo, k = length).
    const prefijosValidos: string[] = [''];
    let acumulado = '';
    for (const grapheme of graphemes) {
      acumulado += grapheme;
      prefijosValidos.push(acumulado);
    }

    for (let i = 0; i < 6; i++) {
      advance(30);
      expect(hasLoneSurrogate(result.current.text)).toBe(false);
      // Cada prefijo visible es concatenación de grafemas COMPLETOS
      // (una bandera o familia nunca aparece a medias).
      expect(prefijosValidos).toContain(result.current.text);
    }
  });

  it('onTick avisa mientras escribe (para el autoscroll)', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const full = 'Contenido que se escribe de a poco';
    const { result } = renderHook(() =>
      useTypewriter(full, { intervalMs: 30, durationMs: 300, onTick }),
    );

    advance(60);
    expect(onTick).toHaveBeenCalled();
    expect(result.current.isTyping).toBe(true);

    advance(600); // completa
    expect(result.current.isTyping).toBe(false);
    const callsAlCompletar = onTick.mock.calls.length;

    advance(120); // ya no debería tickear más
    expect(onTick.mock.calls.length).toBe(callsAlCompletar);
  });
});
