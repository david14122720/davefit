import { describe, it, expect } from 'vitest';
import { calcularCalorias } from './gamification';

// Caracterización de la fórmula MET: (MET * 3.5 * peso_kg / 200) * minutos.
// El peso real del perfil reemplaza al 70 kg fijo que se usaba antes.
describe('calcularCalorias', () => {
  it('usa el peso real del perfil cuando está disponible', () => {
    // (7.0 * 3.5 * 80 / 200) * 30 = 294
    expect(calcularCalorias(30, 'ejercicio', 80)).toBe(294);
  });

  it('cae a 70 kg cuando no hay peso o es inválido', () => {
    // (7.0 * 3.5 * 70 / 200) * 30 = 257.25 → 257
    expect(calcularCalorias(30, 'ejercicio')).toBe(257);
    expect(calcularCalorias(30, 'ejercicio', 0)).toBe(257);
    expect(calcularCalorias(30, 'ejercicio', -10)).toBe(257);
  });

  it('mantiene los MET por tipo de actividad', () => {
    // yoga 3.0 → (3.0 * 3.5 * 70 / 200) * 30 = 110.25 → 110
    expect(calcularCalorias(30, 'yoga', 70)).toBe(110);
    // meditación 1.2 → (1.2 * 3.5 * 60 / 200) * 60 = 75.6 → 76
    expect(calcularCalorias(60, 'meditacion', 60)).toBe(76);
  });
});
