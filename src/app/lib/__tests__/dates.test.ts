import { describe, expect, it } from 'vitest';
import { buildWeekView, getInicioSemana } from '../dates';

/** Fecha local → ISO, tal como llega `fecha` desde InsForge. */
function isoLocal(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString();
}

describe('getInicioSemana', () => {
  it('devuelve el lunes 00:00 local de la semana de la fecha dada', () => {
    const inicio = getInicioSemana(new Date(2026, 9, 7, 23, 30)); // miércoles
    expect(inicio.getFullYear()).toBe(2026);
    expect(inicio.getMonth()).toBe(9);
    expect(inicio.getDate()).toBe(5);
    expect(inicio.getDay()).toBe(1);
    expect(inicio.getHours()).toBe(0);
    expect(inicio.getMinutes()).toBe(0);
  });

  it('para domingo devuelve el lunes anterior (no el lunes siguiente)', () => {
    const inicio = getInicioSemana(new Date(2026, 9, 11, 8, 0)); // domingo
    expect(inicio.getDate()).toBe(5);
    expect(inicio.getDay()).toBe(1);
  });
});

describe('buildWeekView', () => {
  it('mapea Lun..Dom a las fechas reales de la semana (no a "hoy menos i días")', () => {
    // HOY es miércoles: el bug previo pintaba las etiquetas fijas Lun..Dom
    // contra "i días atrás", de modo que Lun recibía la fecha de hoy.
    const view = buildWeekView([], new Date(2026, 9, 7, 15, 0));

    expect(view.map((d) => d.label)).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
    expect(view.map((d) => d.dayOfMonth)).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(view.map((d) => d.isToday)).toEqual([
      false, false, true, false, false, false, false,
    ]);
  });

  it('cruza el límite de mes con aritmética de calendario', () => {
    const view = buildWeekView([], new Date(2026, 9, 1, 9, 0)); // jueves 1-oct
    expect(view.map((d) => d.dayOfMonth)).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(view[3].isToday).toBe(true);
  });

  it('cruza el límite de año con aritmética de calendario', () => {
    const view = buildWeekView([], new Date(2026, 0, 1, 9, 0)); // jueves 1-ene
    expect(view.map((d) => d.dayOfMonth)).toEqual([29, 30, 31, 1, 2, 3, 4]);
    expect(view[3].isToday).toBe(true);
  });

  it('marca hasTraining en el día exacto de la entrada, incluida hoy', () => {
    const view = buildWeekView(
      [{ fecha: isoLocal(2026, 10, 7, 9, 0) }],
      new Date(2026, 9, 7, 15, 0),
    );
    expect(view[2].hasTraining).toBe(true);
    expect(view.filter((d) => d.hasTraining)).toHaveLength(1);
  });

  it('marca hasTraining con varias entradas el mismo día (booleano, no conteo)', () => {
    const view = buildWeekView(
      [
        { fecha: isoLocal(2026, 10, 5, 7, 0) },
        { fecha: isoLocal(2026, 10, 5, 20, 0) },
      ],
      new Date(2026, 9, 7, 12, 0),
    );
    expect(view[0].hasTraining).toBe(true);
    expect(view.filter((d) => d.hasTraining)).toHaveLength(1);
  });

  it('ignora entradas fuera de la semana actual', () => {
    const view = buildWeekView(
      [
        { fecha: isoLocal(2026, 10, 4, 23, 0) }, // domingo anterior
        { fecha: isoLocal(2026, 10, 12, 1, 0) }, // lunes siguiente
      ],
      new Date(2026, 9, 7, 12, 0),
    );
    expect(view.every((d) => !d.hasTraining)).toBe(true);
  });

  it('ignora fechas inválidas sin romper la semana', () => {
    const view = buildWeekView(
      [{ fecha: 'no-es-una-fecha' }, { fecha: '' }],
      new Date(2026, 9, 7, 12, 0),
    );
    expect(view).toHaveLength(7);
    expect(view.every((d) => !d.hasTraining)).toBe(true);
  });

  it('con cero entradas devuelve la semana completa sin entrenamientos y un solo isToday', () => {
    const view = buildWeekView([], new Date(2026, 9, 7, 12, 0));
    expect(view).toHaveLength(7);
    expect(view.every((d) => !d.hasTraining)).toBe(true);
    expect(view.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('mantiene las fechas correctas en la semana del cambio de hora (aritmética de calendario)', () => {
    // Semana del 19 al 25 de octubre de 2026 (cambio horario europeo el domingo 25).
    const view = buildWeekView([], new Date(2026, 9, 21, 12, 0));
    expect(view.map((d) => d.dayOfMonth)).toEqual([19, 20, 21, 22, 23, 24, 25]);
  });
});
