import { describe, it, expect } from 'vitest';
import { grupoIcons, nivelColors } from './fitness';

describe('Vocabulario de grupos musculares (R3)', () => {
    const vocabulario = ['pecho', 'espalda', 'piernas', 'brazo', 'hombros', 'core', 'cardio', 'full_body', 'cuello'];

    it('grupoIcons cubre el vocabulario completo de 9 grupos, incluyendo cuello', () => {
        for (const grupo of vocabulario) {
            expect(grupoIcons[grupo]).toBeTruthy();
        }
    });

    it('cuello tiene su icono asignado', () => {
        expect(grupoIcons.cuello).toBe('🦒');
    });

    it('nivelColors se conserva intacto (lo usan las páginas de yoga admin)', () => {
        expect(nivelColors.principiante).toBe('bg-green-500/10 text-green-400 border-green-500/20');
        expect(nivelColors.intermedio).toBe('bg-yellow-500/10 text-yellow-400 border-yellow-500/20');
        expect(nivelColors.avanzado).toBe('bg-red-500/10 text-red-400 border-red-500/20');
    });
});
