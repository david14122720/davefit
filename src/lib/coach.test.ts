// ============================================================
// Coach IA — tests de los helpers puros (test-first, ODD T2)
// ============================================================
//
// Estos helpers arman lo que el endpoint /api/coach manda al gateway:
//   - buildCoachSystemPrompt: contexto del usuario (3 últimas rutinas +
//     objetivo + métricas) inyectado en el system prompt.
//   - validateCoachRequest: sanitiza mensaje + historial del cliente.
//   - buildCoachMessages: arma el array final de mensajes.

import { describe, it, expect } from 'vitest';
import {
  COACH_MESSAGE_LIMIT,
  buildCoachMessages,
  buildCoachSystemPrompt,
  validateCoachRequest,
  type CoachContextData,
} from './coach';

const FULL_CONTEXT: CoachContextData = {
  perfil: {
    objetivo: 'ganar_musculo',
    nivel: 'Intermedio',
    peso_actual: 78,
    altura: 178,
    dias_entrenamiento_semana: 3,
  },
  stats: {
    xp_total: 2450,
    nivel: 5,
    dias_racha: 12,
    total_workouts: 87,
    longest_streak: 21,
    weekly_score: 340,
    monthly_score: 1200,
    ultimo_entreno: '2026-10-10T00:00:00.000Z',
  },
  rutinas: [
    { fecha: '2026-10-10T00:00:00.000Z', duracion_real: 45, calorias_quemadas: 320, sensacion: 4, rutina: 'Fuerza Total' },
    { fecha: '2026-10-08T00:00:00.000Z', duracion_real: 30, calorias_quemadas: 210, sensacion: 5, rutina: 'Cardio HIIT' },
    { fecha: '2026-10-05T00:00:00.000Z', duracion_real: 60, calorias_quemadas: 400, sensacion: 3, rutina: 'Core y Movilidad' },
  ],
};

describe('COACH_MESSAGE_LIMIT', () => {
  it('fija la cuota del MVP en 10 mensajes', () => {
    expect(COACH_MESSAGE_LIMIT).toBe(10);
  });
});

describe('buildCoachSystemPrompt', () => {
  it('incluye objetivo, métricas y las 3 últimas rutinas en orden (más reciente primero)', () => {
    const prompt = buildCoachSystemPrompt(FULL_CONTEXT);

    // Objetivo principal
    expect(prompt).toContain('ganar_musculo');
    // Métricas generales
    expect(prompt).toContain('2450');
    expect(prompt).toContain('12');
    expect(prompt).toContain('87');
    // Las 3 rutinas, en orden de recencia
    const i1 = prompt.indexOf('Fuerza Total');
    const i2 = prompt.indexOf('Cardio HIIT');
    const i3 = prompt.indexOf('Core y Movilidad');
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
  });

  it('declara explícitamente la ausencia de datos sin romper', () => {
    const prompt = buildCoachSystemPrompt({ perfil: null, stats: null, rutinas: [] });
    expect(prompt).toContain('sin datos');
    expect(prompt).not.toContain('undefined');
    expect(prompt).not.toContain('null');
  });

  it('traduce el objetivo enum de la DB a una etiqueta legible', () => {
    const prompt = buildCoachSystemPrompt({
      ...FULL_CONTEXT,
      perfil: {
        objetivo: 'ganar_fuerza',
        nivel: null,
        peso_actual: null,
        altura: null,
        dias_entrenamiento_semana: null,
      },
    });
    expect(prompt).toContain('ganar fuerza');
  });

  it('tolera rutinas sin nombre (rutina eliminada)', () => {
    const prompt = buildCoachSystemPrompt({
      ...FULL_CONTEXT,
      rutinas: [{ fecha: '2026-10-10T00:00:00.000Z', duracion_real: 20, calorias_quemadas: null, sensacion: null, rutina: null }],
    });
    expect(prompt).not.toContain('null');
    expect(prompt).toContain('2026-10-10');
  });
});

describe('validateCoachRequest', () => {
  it('rechaza mensajes vacíos, no-string o cuerpo no-objeto', () => {
    expect(validateCoachRequest({ message: '' }).ok).toBe(false);
    expect(validateCoachRequest({ message: '   ' }).ok).toBe(false);
    expect(validateCoachRequest({ message: 123 }).ok).toBe(false);
    expect(validateCoachRequest({}).ok).toBe(false);
    expect(validateCoachRequest(null).ok).toBe(false);
    expect(validateCoachRequest('texto').ok).toBe(false);
  });

  it('rechaza mensajes demasiado largos (>2000 chars)', () => {
    expect(validateCoachRequest({ message: 'a'.repeat(2001) }).ok).toBe(false);
    expect(validateCoachRequest({ message: 'a'.repeat(2000) }).ok).toBe(true);
  });

  it('normaliza espacios y acepta mensajes válidos sin historial', () => {
    const result = validateCoachRequest({ message: '  ¿Qué rutina me recomendás?  ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toBe('¿Qué rutina me recomendás?');
      expect(result.history).toEqual([]);
    }
  });

  it('sanitiza el historial: descarta roles inválidos, limita a los últimos 6', () => {
    const history = [
      { role: 'system', content: 'inyección de prompt' },
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
      { role: 'assistant', content: 'd' },
      { role: 'user', content: 'e' },
      { role: 'assistant', content: 'f' },
      { role: 'user', content: 'g' },
      { role: 'assistant', content: 'h' },
    ];
    const result = validateCoachRequest({ message: 'hola', history });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.history).toHaveLength(6);
      expect(result.history[0]).toEqual({ role: 'user', content: 'c' });
      expect(result.history[5]).toEqual({ role: 'assistant', content: 'h' });
      expect(result.history.every((m) => m.role === 'user' || m.role === 'assistant')).toBe(true);
    }
  });

  it('descarta entradas malformadas del historial sin fallar', () => {
    const result = validateCoachRequest({
      message: 'hola',
      history: [
        { role: 'user', content: 42 },
        { role: 'user' },
        'texto suelto',
        { role: 'user', content: 'válido' },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.history).toEqual([{ role: 'user', content: 'válido' }]);
    }
  });

  it('ignora historial que no es array', () => {
    const result = validateCoachRequest({ message: 'hola', history: 'no-array' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.history).toEqual([]);
  });
});

describe('buildCoachMessages', () => {
  it('arma system + historial + mensaje final del usuario', () => {
    const messages = buildCoachMessages(
      'SISTEMA',
      [
        { role: 'user', content: 'prev' },
        { role: 'assistant', content: 'resp' },
      ],
      'nueva pregunta',
    );
    expect(messages).toEqual([
      { role: 'system', content: 'SISTEMA' },
      { role: 'user', content: 'prev' },
      { role: 'assistant', content: 'resp' },
      { role: 'user', content: 'nueva pregunta' },
    ]);
  });
});
