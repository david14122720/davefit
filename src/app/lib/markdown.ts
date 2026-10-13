// ============================================================
// markdown — renderer seguro del Coach IA (ODD T1)
// ============================================================
//
// Convierte las respuestas del modelo (markdown) en HTML LIMPIO listo para
// inyectar en el DOM:
//   marked (parser GFM) → DOMPurify (sanitizador obligatorio, S4).
//
// Política de seguridad (S2/S4 de odd/tasks/ia-coach-markdown.md):
//   - Allowlist mínima de tags estructurales; CERO atributos permitidos
//     (`ALLOWED_ATTR: []`) → no sobreviven href, style, on* ni data-*.
//   - `FORBID_TAGS: ['a']` + `KEEP_CONTENT: true` → todo enlace (markdown,
//     URL suelta o esquema javascript:) queda como texto plano, nunca <a>.
//   - La salida SIEMPRE está balanceada: DOMPurify normaliza fragmentos
//     incompletos (efecto tipeo, S3) sin dejar etiquetas abiertas.

import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** Tags estructurales permitidos (S1). Todo lo demás se purga. */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'blockquote',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
];

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: [] as string[],
  // DOMPurify permite data-* por defecto y `ALLOWED_ATTR: []` NO los frena:
  // sin esto sobrevivirían atributos controlados por el modelo (inertes hoy,
  // pero contradicen el claim de "cero atributos" y serían un canal latente).
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['a'],
  KEEP_CONTENT: true,
};

/**
 * Renderiza markdown del Coach a HTML sanitizado.
 * Devuelve `''` para entrada vacía; nunca lanza.
 */
export function renderCoachMarkdown(text: string): string {
  if (typeof text !== 'string' || text.trim().length === 0) return '';
  const html = marked.parse(text, { breaks: true, gfm: true, async: false }) as string;
  // `.trim()`: marked agrega un `\n` final tras el último tag; lo sacamos para
  // que el HTML inyectado no arrastre whitespace al textContent del DOM.
  return DOMPurify.sanitize(html, PURIFY_CONFIG).trim();
}
