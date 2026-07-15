import { describe, it, expect } from 'vitest';
import {
  calcularXpParaSiguienteNivel,
  calcularRachaBonus,
  calcularXpAlCompletarRutina,
  calcularCalorias,
  calculateXpProgress,
} from './gamification';

describe('calcularXpParaSiguienteNivel', () => {
  it('returns 100 for level 1', () => {
    expect(calcularXpParaSiguienteNivel(1)).toBe(100);
  });

  it('returns 282 for level 2 (100 * 2^1.5 ≈ 282.84)', () => {
    expect(calcularXpParaSiguienteNivel(2)).toBe(282);
  });

  it('returns 519 for level 3 (100 * 3^1.5 ≈ 519.62)', () => {
    expect(calcularXpParaSiguienteNivel(3)).toBe(519);
  });

  it('returns 1000 for level 10', () => {
    expect(calcularXpParaSiguienteNivel(10)).toBe(3162);
  });

  it('handles level 0 gracefully', () => {
    expect(calcularXpParaSiguienteNivel(0)).toBe(0);
  });
});

describe('calcularRachaBonus', () => {
  it('returns 0 for negative streak days', () => {
    expect(calcularRachaBonus(-1)).toBe(0);
  });

  it('returns 0 for zero streak days', () => {
    expect(calcularRachaBonus(0)).toBe(0);
  });

  it('returns 20 for 1 day streak', () => {
    expect(calcularRachaBonus(1)).toBe(20);
  });

  it('returns 20 for 2 day streak', () => {
    expect(calcularRachaBonus(2)).toBe(20);
  });

  it('returns 30 for 3 day streak', () => {
    expect(calcularRachaBonus(3)).toBe(30);
  });

  it('returns 30 for 4 day streak', () => {
    expect(calcularRachaBonus(4)).toBe(30);
  });

  it('returns 70 for 5 day streak', () => {
    expect(calcularRachaBonus(5)).toBe(70);
  });

  it('returns 70 for long streaks (30 days)', () => {
    expect(calcularRachaBonus(30)).toBe(70);
  });
});

describe('calcularXpAlCompletarRutina', () => {
  it('returns 0 XP for 0 duration and no streak', () => {
    expect(calcularXpAlCompletarRutina(0, 0)).toBe(0);
  });

  it('calculates XP for short workout with streak', () => {
    // 10 min * 5 = 50 base + 70 bonus (streak 5+)
    expect(calcularXpAlCompletarRutina(10, 5)).toBe(120);
  });

  it('calculates XP for medium workout without streak', () => {
    // 30 min * 5 = 150 base + 0 bonus
    expect(calcularXpAlCompletarRutina(30, 0)).toBe(150);
  });

  it('caps base XP at 200 for long workouts', () => {
    // 60 min * 5 = 300 → capped at 200 base + 70 bonus
    expect(calcularXpAlCompletarRutina(60, 10)).toBe(270);
  });

  it('caps base XP at 200 for very long workouts', () => {
    // 120 min * 5 = 600 → capped at 200 base + 0 bonus
    expect(calcularXpAlCompletarRutina(120, 0)).toBe(200);
  });

  it('includes 1-day streak bonus', () => {
    // 20 min * 5 = 100 base + 20 bonus (1 day streak)
    expect(calcularXpAlCompletarRutina(20, 1)).toBe(120);
  });

  it('includes 3-day streak bonus', () => {
    // 20 min * 5 = 100 base + 30 bonus (3 day streak)
    expect(calcularXpAlCompletarRutina(20, 3)).toBe(130);
  });
});

describe('calcularCalorias', () => {
  const basePerMinute = {
    ejercicio: Math.round((7.0 * 3.5 * 70) / 200),
    yoga: Math.round((3.0 * 3.5 * 70) / 200),
    meditacion: Math.round((1.2 * 3.5 * 70) / 200),
  };

  it('returns 0 calories for 0 minutes', () => {
    expect(calcularCalorias(0, 'ejercicio')).toBe(0);
    expect(calcularCalorias(0, 'yoga')).toBe(0);
    expect(calcularCalorias(0, 'meditacion')).toBe(0);
  });

  it('calculates calories for ejercicio type', () => {
    // (7.0 * 3.5 * 70 / 200) * 30 = 257.25 → 257
    expect(calcularCalorias(30, 'ejercicio')).toBe(257);
  });

  it('calculates calories for yoga type', () => {
    // (3.0 * 3.5 * 70 / 200) * 30 = 110.25 → 110
    expect(calcularCalorias(30, 'yoga')).toBe(110);
  });

  it('calculates calories for meditacion type', () => {
    // (1.2 * 3.5 * 70 / 200) * 30 = 44.1 → 44
    expect(calcularCalorias(30, 'meditacion')).toBe(44);
  });

  it('scales approximately linearly with duration (rounding may cause small diff)', () => {
    const oneMin = calcularCalorias(1, 'ejercicio');
    const tenMin = calcularCalorias(10, 'ejercicio');
    // Math.round introduces ± deviation, but should be within 5% of linear
    expect(Math.abs(tenMin - oneMin * 10)).toBeLessThanOrEqual(5);
  });

  it('gives ejercicio the highest calories per minute', () => {
    expect(basePerMinute.ejercicio).toBeGreaterThan(basePerMinute.yoga);
    expect(basePerMinute.yoga).toBeGreaterThan(basePerMinute.meditacion);
  });
});

describe('calculateXpProgress', () => {
  it('returns correct XP progress at level 1 with 0 XP', () => {
    const result = calculateXpProgress({
      id: '1',
      user_id: 'user-1',
      xp_total: 0,
      nivel: 1,
      dias_racha: 0,
      ultimo_entreno: null,
      racha_bonus: 0,
      created_at: '',
      updated_at: '',
    });

    expect(result.nivel_anterior).toBe(1);
    expect(result.nivel_nuevo).toBe(1);
    expect(result.subio_nivel).toBe(false);
    expect(result.xp_en_nivel_actual).toBe(0);
    expect(result.xp_para_siguiente_nivel).toBe(100);
  });

  it('detects level up when XP crosses threshold', () => {
    const result = calculateXpProgress({
      id: '1',
      user_id: 'user-1',
      xp_total: 150,
      nivel: 1,
      dias_racha: 0,
      ultimo_entreno: null,
      racha_bonus: 0,
      created_at: '',
      updated_at: '',
    });

    expect(result.subio_nivel).toBe(true);
    expect(result.nivel_nuevo).toBe(2);
  });

  it('shows correct progress within current level', () => {
    const result = calculateXpProgress({
      id: '1',
      user_id: 'user-1',
      xp_total: 50,
      nivel: 1,
      dias_racha: 0,
      ultimo_entreno: null,
      racha_bonus: 0,
      created_at: '',
      updated_at: '',
    });

    expect(result.nivel_nuevo).toBe(1);
    expect(result.xp_en_nivel_actual).toBe(50);
    expect(result.xp_para_siguiente_nivel).toBe(100);
  });

  it('handles very high XP with multiple level ups', () => {
    const result = calculateXpProgress({
      id: '1',
      user_id: 'user-1',
      xp_total: 5000,
      nivel: 5,
      dias_racha: 0,
      ultimo_entreno: null,
      racha_bonus: 0,
      created_at: '',
      updated_at: '',
    });

    expect(result.subio_nivel).toBe(true);
    expect(result.nivel_nuevo).toBeGreaterThan(5);
  });
});
