// ============================================================
// Utilidades compartidas de fecha
// ============================================================

/**
 * Retorna el inicio de la semana actual (lunes 00:00:00)
 */
export function getInicioSemana(): Date {
  const hoy = new Date();
  const inicio = new Date(hoy);
  const dia = hoy.getDay();
  const diff = dia === 0 ? 6 : dia - 1;
  inicio.setDate(hoy.getDate() - diff);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
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

/**
 * Formatea una fecha ISO a formato legible en español
 */
export function formatDateEs(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return new Date(dateStr).toLocaleDateString('es-ES', options || defaultOptions);
}
