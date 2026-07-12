import { describe, it, expect } from 'vitest';
import {
  calcularBMR,
  calcularTDEE,
  calcularIMC,
  getCategoriaIMC,
  calcularCaloriasObjetivo,
  getInfoActividad,
} from './nutrition';

describe('calcularBMR', () => {
  it('returns null for incomplete profile', () => {
    expect(calcularBMR({ id: '1' })).toBeNull();
  });

  it('returns null without weight', () => {
    expect(calcularBMR({
      id: '1', genero: 'masculino', altura: 175, fecha_nacimiento: '1990-06-15',
    })).toBeNull();
  });

  it('returns null without height', () => {
    expect(calcularBMR({
      id: '1', genero: 'masculino', peso_actual: 80, fecha_nacimiento: '1990-06-15',
    })).toBeNull();
  });

  it('returns null without date of birth', () => {
    expect(calcularBMR({
      id: '1', genero: 'masculino', peso_actual: 80, altura: 175,
    })).toBeNull();
  });

  it('returns null without gender', () => {
    expect(calcularBMR({
      id: '1', peso_actual: 80, altura: 175, fecha_nacimiento: '1990-06-15',
    })).toBeNull();
  });

  it('returns null for age under 10', () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 5);
    expect(calcularBMR({
      id: '1', genero: 'masculino', peso_actual: 20, altura: 110,
      fecha_nacimiento: recent.toISOString().split('T')[0],
    })).toBeNull();
  });

  it('returns null for age over 100', () => {
    const old = new Date();
    old.setFullYear(old.getFullYear() - 110);
    expect(calcularBMR({
      id: '1', genero: 'masculino', peso_actual: 70, altura: 170,
      fecha_nacimiento: old.toISOString().split('T')[0],
    })).toBeNull();
  });

  it('calculates BMR for male (Mifflin-St Jeor)', () => {
    // (10 * 80) + (6.25 * 175) - (5 * 34) + 5 = 800 + 1093.75 - 170 + 5 = 1728.75 → 1729
    const bmr = calcularBMR({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
    });
    expect(bmr).toBe(1729);
  });

  it('calculates BMR for female (Mifflin-St Jeor)', () => {
    // (10 * 65) + (6.25 * 165) - (5 * 30) - 161 = 650 + 1031.25 - 150 - 161 = 1370.25 → 1370
    const bmr = calcularBMR({
      id: '1',
      genero: 'femenino',
      peso_actual: 65,
      altura: 165,
      fecha_nacimiento: '1994-03-20',
    });
    expect(bmr).toBe(1370);
  });

  it('averages male and female formulas for other genders', () => {
    // Male: (10*70)+(6.25*170)-(5*25)+5 = 700+1062.5-125+5 = 1642.5
    // Female: (10*70)+(6.25*170)-(5*25)-161 = 700+1062.5-125-161 = 1476.5
    // Average: (1642.5 + 1476.5) / 2 = 1559.5 → 1560
    const bmr = calcularBMR({
      id: '1',
      genero: 'otro',
      peso_actual: 70,
      altura: 170,
      fecha_nacimiento: '2000-01-01',
    });
    expect(bmr).toBe(1560);
  });
});

describe('calcularTDEE', () => {
  it('returns null when BMR cannot be calculated', () => {
    expect(calcularTDEE({ id: '1' })).toBeNull();
  });

  it('calculates TDEE with activity factor', () => {
    // BMR = 1729, factor = 1.55 (moderado from 3-5 days)
    const tdee = calcularTDEE({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      nivel: 'intermedio',
      dias_entrenamiento_semana: 4,
    });
    // 1729 * 1.55 = 2679.95 → 2680
    expect(tdee).toBe(2680);
  });

  it('uses default sedentary factor when no training days provided', () => {
    const tdee = calcularTDEE({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
    });
    // BMR = 1729 * 1.2 = 2074.8 → 2075
    expect(tdee).toBe(2075);
  });

  it('maps 0 days to sedentary', () => {
    const tdee = calcularTDEE({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      dias_entrenamiento_semana: 0,
    });
    expect(tdee).toBe(2075); // 1729 * 1.2
  });

  it('maps 6 days to activo', () => {
    const tdee = calcularTDEE({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      dias_entrenamiento_semana: 6,
    });
    expect(tdee).toBe(2983); // 1729 * 1.725
  });
});

describe('calcularIMC', () => {
  it('returns null for null weight', () => {
    expect(calcularIMC(null, 170)).toBeNull();
  });

  it('returns null for null height', () => {
    expect(calcularIMC(70, null)).toBeNull();
  });

  it('returns null for zero height', () => {
    expect(calcularIMC(70, 0)).toBeNull();
  });

  it('returns null for negative height', () => {
    expect(calcularIMC(70, -10)).toBeNull();
  });

  it('calculates BMI correctly', () => {
    // 70 / (1.70^2) = 70 / 2.89 = 24.22...
    const bmi = calcularIMC(70, 170);
    expect(bmi).toBeCloseTo(24.22, 1);
  });

  it('calculates BMI for underweight range', () => {
    // 50 / (1.70^2) = 50 / 2.89 = 17.30
    expect(calcularIMC(50, 170)).toBeCloseTo(17.3, 1);
  });

  it('calculates BMI for obese range', () => {
    // 100 / (1.70^2) = 100 / 2.89 = 34.60
    expect(calcularIMC(100, 170)).toBeCloseTo(34.6, 1);
  });
});

describe('getCategoriaIMC', () => {
  it('returns "--" for null BMI', () => {
    expect(getCategoriaIMC(null)).toBe('--');
  });

  it('classifies underweight (< 18.5)', () => {
    expect(getCategoriaIMC(16)).toBe('Bajo peso');
    expect(getCategoriaIMC(18.4)).toBe('Bajo peso');
  });

  it('classifies normal weight (18.5 - 24.9)', () => {
    expect(getCategoriaIMC(18.5)).toBe('Peso normal');
    expect(getCategoriaIMC(22)).toBe('Peso normal');
    expect(getCategoriaIMC(24.9)).toBe('Peso normal');
  });

  it('classifies overweight (25 - 29.9)', () => {
    expect(getCategoriaIMC(25)).toBe('Sobrepeso');
    expect(getCategoriaIMC(27.5)).toBe('Sobrepeso');
    expect(getCategoriaIMC(29.9)).toBe('Sobrepeso');
  });

  it('classifies obesity (>= 30)', () => {
    expect(getCategoriaIMC(30)).toBe('Obesidad');
    expect(getCategoriaIMC(35)).toBe('Obesidad');
    expect(getCategoriaIMC(50)).toBe('Obesidad');
  });
});

describe('calcularCaloriasObjetivo', () => {
  it('returns null calories when profile is incomplete', () => {
    const result = calcularCaloriasObjetivo({ id: '1' });
    expect(result.calorias).toBeNull();
    expect(result.tipo).toBe('No calculable');
  });

  it('returns maintenance when goal is mantener_forma', () => {
    const result = calcularCaloriasObjetivo({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      objetivo: 'mantener_forma',
    });
    // TDEE = 1729 * 1.2 = 2075
    expect(result.calorias).toBe(2075);
    expect(result.tipo).toBe('Mantenimiento');
  });

  it('returns deficit for perder_peso', () => {
    const result = calcularCaloriasObjetivo({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      objetivo: 'perder_peso',
    });
    // TDEE - 500 = 2075 - 500 = 1575
    expect(result.calorias).toBe(1575);
    expect(result.tipo).toBe('Déficit calórico');
  });

  it('returns deficit for tonificar', () => {
    const result = calcularCaloriasObjetivo({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      objetivo: 'tonificar',
    });
    // TDEE - 400 = 2075 - 400 = 1675
    expect(result.calorias).toBe(1675);
  });

  it('returns surplus for ganar_fuerza', () => {
    const result = calcularCaloriasObjetivo({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      objetivo: 'ganar_fuerza',
    });
    // TDEE + 400 = 2075 + 400 = 2475
    expect(result.calorias).toBe(2475);
    expect(result.tipo).toBe('Superávit calórico');
  });

  it('defaults to maintenance for unknown goal', () => {
    const result = calcularCaloriasObjetivo({
      id: '1',
      genero: 'masculino',
      peso_actual: 80,
      altura: 175,
      fecha_nacimiento: '1990-06-15',
      objetivo: 'unknown_goal',
    });
    expect(result.calorias).toBe(2075);
    expect(result.tipo).toBe('Mantenimiento');
  });
});

describe('getInfoActividad', () => {
  it('returns sedentary for 0 days', () => {
    const info = getInfoActividad(null, 0);
    expect(info.nivel).toBe('Sedentario');
    expect(info.factor).toBe(1.2);
  });

  it('returns ligero for 2 days', () => {
    const info = getInfoActividad(null, 2);
    expect(info.nivel).toBe('Ligero');
    expect(info.factor).toBe(1.375);
  });

  it('returns moderado for 4 days', () => {
    const info = getInfoActividad(null, 4);
    expect(info.nivel).toBe('Moderado');
    expect(info.factor).toBe(1.55);
  });

  it('returns activo for 6 days', () => {
    const info = getInfoActividad(null, 6);
    expect(info.nivel).toBe('Activo');
    expect(info.factor).toBe(1.725);
  });

  it('returns muy activo for 7+ days', () => {
    const info = getInfoActividad(null, 7);
    expect(info.nivel).toBe('Muy activo');
    expect(info.factor).toBe(1.9);
  });
});
