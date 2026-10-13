import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCelebration } from '../useCelebration';

// Carga dinámica fallida de canvas-confetti (chunk caído): el hook debe
// capturarla y resolver sin rechazar (antes: import estático + sin guard).
vi.mock('canvas-confetti', () => {
  throw new Error('chunk load failed');
});

/**
 * Sustituye window.AudioContext por un contador de instancias para verificar
 * la creación perezosa y el cierre al desmontar. `src/test/setup.ts` mantiene
 * su mock por defecto; este helper lo reemplaza temporalmente.
 */
function installTrackingAudioContext() {
  const stats = { created: 0, closed: 0 };
  const original = (window as unknown as { AudioContext: unknown }).AudioContext;

  function TrackingAudioContext(this: Record<string, unknown>) {
    stats.created += 1;
    this.currentTime = 0;
    this.destination = {};
    this.createOscillator = () => ({
      type: 'sine',
      frequency: { setValueAtTime: () => undefined },
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    });
    this.createGain = () => ({
      gain: { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined },
      connect: () => undefined,
    });
    this.close = () => {
      stats.closed += 1;
      return Promise.resolve();
    };
  }

  (window as unknown as { AudioContext: unknown }).AudioContext = TrackingAudioContext;
  return {
    stats,
    restore: () => {
      (window as unknown as { AudioContext: unknown }).AudioContext = original;
    },
  };
}

describe('useCelebration', () => {
  it('crea el AudioContext de forma perezosa (primer sonido) y lo cierra al desmontar', () => {
    const tracking = installTrackingAudioContext();
    try {
      const { result, unmount } = renderHook(() => useCelebration());

      // Antes vivía en useState y se creaba en el mount effect.
      expect(tracking.stats.created).toBe(0);

      result.current.playSound('streak');
      expect(tracking.stats.created).toBe(1);

      // Un segundo sonido reutiliza el mismo contexto.
      result.current.playSound('streak');
      expect(tracking.stats.created).toBe(1);

      unmount();
      expect(tracking.stats.closed).toBe(1);
    } finally {
      tracking.restore();
    }
  });

  it('mantiene la identidad de los callbacks exportados entre renders', () => {
    const { result, rerender } = renderHook(() => useCelebration());
    const first = result.current;

    rerender();

    expect(result.current.celebrate).toBe(first.celebrate);
    expect(result.current.celebrateStreak).toBe(first.celebrateStreak);
    expect(result.current.celebrateAchievement).toBe(first.celebrateAchievement);
    expect(result.current.playSound).toBe(first.playSound);
    expect(result.current.fireConfetti).toBe(first.fireConfetti);
  });

  it('fireConfetti no rechaza aunque canvas-confetti falle o no cargue', async () => {
    const { result } = renderHook(() => useCelebration());

    await expect(result.current.fireConfetti('streak')).resolves.toBeUndefined();
  });
});
