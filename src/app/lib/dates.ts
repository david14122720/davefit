// ============================================================
// Utilidades compartidas de fecha
// ============================================================

/**
 * Retorna el inicio de la semana (lunes 00:00:00 local).
 * @param base Fecha de referencia — por defecto, ahora.
 */
export function getInicioSemana(base: Date = new Date()): Date {
  const inicio = new Date(base);
  const dia = base.getDay();
  const diff = dia === 0 ? 6 : dia - 1;
  inicio.setDate(base.getDate() - diff);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

/** Vista semanal: un día (Lun–Dom) de la semana actual. */
export interface WeekViewDay {
  /** Etiqueta corta del día: Lun, Mar, Mié, Jue, Vie, Sáb, Dom. */
  label: string;
  /** Día del mes (1–31) de la fecha real de ese día. */
  dayOfMonth: number;
  /** true si el día corresponde a la fecha de referencia. */
  isToday: boolean;
  /** true si hay al menos una entrada con entrenamiento ese día. */
  hasTraining: boolean;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Compara dos fechas por día de calendario local (ignora hora). */
function esMismoDiaLocal(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Construye la vista de la semana actual (Lun–Dom) para el mini-calendario.
 *
 * Usa aritmética de calendario (`new Date(y, m, d + i)`) en lugar de dividir
 * milisegundos: así los cambios de hora (DST) no desplazan los días.
 * Las fechas inválidas se ignoran.
 */
export function buildWeekView(
  entries: { fecha: string }[],
  today: Date = new Date()
): WeekViewDay[] {
  const inicio = getInicioSemana(today);

  return DIAS_SEMANA.map((label, i) => {
    const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const hasTraining = entries.some((entry) => {
      const fecha = new Date(entry.fecha);
      return !Number.isNaN(fecha.getTime()) && esMismoDiaLocal(fecha, dia);
    });

    return {
      label,
      dayOfMonth: dia.getDate(),
      isToday: esMismoDiaLocal(dia, today),
      hasTraining,
    };
  });
}

/**
 * Retorna un saludo según la hora del día
 */
export function getSaludo(): string {
  const hora = new Date().getHours();
  if (hora >= 12 && hora < 20) return 'Buenas tardes';
  if (hora >= 20) return 'Buenas noches';
  return 'Buenos días';
}
