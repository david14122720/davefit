import { describe, it, expect } from 'vitest';
import { calcularIMC, getCategoriaIMC, calcularBMR } from './nutrition';

describe('Nutrition Utils', () => {
    it('debe calcular el IMC correctamente', () => {
        // 70kg / (1.75m * 1.75m) = 22.86
        expect(calcularIMC(70, 175)).toBeCloseTo(22.86, 2);
    });

    it('debe categorizar el IMC correctamente', () => {
        expect(getCategoriaIMC(22.86)).toBe('Peso normal');
        expect(getCategoriaIMC(18)).toBe('Bajo peso');
        expect(getCategoriaIMC(30)).toBe('Obesidad');
    });

    it('debe calcular el BMR para hombres correctamente', () => {
        const profile: any = {
            genero: 'masculino',
            peso_actual: 70,
            altura: 175,
            fecha_nacimiento: '1990-01-01',
            nivel: 'intermedio',
            objetivo: 'tonificar',
            dias_entrenamiento_semana: 4
        };
        // Edad aproximada 36 (2026 - 1990)
        // Mifflin-St Jeor: (10 * 70) + (6.25 * 175) - (5 * 36) + 5 = 700 + 1093.75 - 180 + 5 = 1618.75
        const bmr = calcularBMR(profile);
        expect(bmr).toBeGreaterThan(1600);
        expect(bmr).toBeLessThan(1700);
    });
});
