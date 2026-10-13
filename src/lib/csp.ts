/**
 * Content-Security-Policy (CSP) — helper puro, unit-testable (CSP-1).
 *
 * PROD (isProd: true):
 *  - script-src/script-src-elem = 'self' + sha256 de TODOS los scripts inline
 *    ejecutables que el build realmente sirve, y NO incluyen 'unsafe-inline'
 *    (CSP-2/CSP-7):
 *      1. SW killer (BaseLayout.astro) — constante SW_KILLER_HASH.
 *      2. Runtime inline de Astro (helper `astro:only` + hydratación
 *         `astro-island`) — hashes en csp-runtime-hashes.generated.ts,
 *         AUTO-regenerados en cada `npm run build` por
 *         scripts/generate-csp-hashes.mjs (renderiza el HTML del build y
 *         hashea los bytes servidos). Un upgrade de Astro que cambie esos
 *         scripts se cubre solo en el siguiente build.
 *    Sin 'unsafe-inline' ni fake-hashes: el hash es sobre bytes servidos.
 *  - frame-src se omite: el flujo OAuth es un redirect completo
 *    (InsForge → Google → vuelta con #access_token), no GSI popup/iframe.
 *    Si InsForge migra a GSI popup/one-tap, reintroducir
 *    https://accounts.google.com en script-src y frame-src (CSP-5).
 *  - style-src conserva 'unsafe-inline' a propósito (React SSR/framer-motion).
 *
 * DEV (isProd: false): política permisiva actual — 'unsafe-inline' y
 * accounts.google.com — para que Vite HMR y OAuth local sigan funcionando (CSP-3).
 *
 * CORRECCIÓN 2026-08-09 (remediación): el hash publicado previamente
 * (sha256-rEmM0...) era un artefacto de extracción — el comentario HTML junto
 * al script contiene el literal `<script is:inline>`, que rompía el awk/regex
 * ingenuo (capturaba comentario+script). El hash REAL de los bytes servidos es
 * sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A= (el del spec original).
 * La verificación fiable es node scripts/generate-csp-hashes.mjs --print o el
 * script de build; ambas hashean el HTML renderizado, no el fuente.
 */
import { RUNTIME_INLINE_SCRIPT_HASHES } from './csp-runtime-hashes.generated';

// sha256 del script inline "SW killer" (BaseLayout.astro) — bytes SERVED
// (incluyen el salto de línea tras la etiqueta de apertura). Verificado contra
// HTML renderizado (2026-08-09): iThovp4... == hash del spec original.
// El pipeline de build regenera automáticamente este valor vía
// csp-runtime-hashes.generated.ts; esta constante se mantiene para
// determinismo en tests y como valor verificado documentado.
const SW_KILLER_HASH = 'sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=';

// Conserva el scheme configurado (http en dev local, https en prod): antes se
// strippeaba el scheme y se recalculaba `https://` hardcodeado, lo que bloqueaba
// por CSP el 100% del tráfico InsForge en dev (http://192.168.50.121:7130).
// Con una URL https (valor de producción) el output es byte-idéntico al previo.
const INSFORGE_RAW_URL = import.meta.env.PUBLIC_INSFORGE_URL;
const INSFORGE_SCHEME =
  /^([a-z][a-z0-9+.-]*):\/\//i.exec(INSFORGE_RAW_URL ?? '')?.[1]?.toLowerCase() ?? 'https';
const INSFORGE_HOST =
  INSFORGE_RAW_URL?.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '') || 'insforge.tesh.online';
const INSFORGE_ORIGIN = `${INSFORGE_SCHEME}://${INSFORGE_HOST}`;

export interface BuildCspOptions {
  /** true en producción (Astro build), false en dev server */
  isProd: boolean;
}

/**
 * Hashes inline que el CSP PROD debe permitir. Set + dedupe: el SW killer
 * aparece en la constante verificada Y en el inventario generado por el build;
 * el orden es determinista (primera aparición).
 */
const PROD_INLINE_HASHES = [...new Set([SW_KILLER_HASH, ...RUNTIME_INLINE_SCRIPT_HASHES])];

/**
 * Fuentes CSP válidas: cada hash DEBE ir entre comillas simples ('sha256-…').
 * Un hash sin comillas es una source expression inválida y el navegador la
 * IGNORA en silencio (con warning de consola) — los valores de hash pueden ser
 * exactos y aun así los scripts inline quedan bloqueados. Corregido 2026-10-12
 * tras detectarse vía `astro preview` que la SPA no hidrataba en producción.
 */
const PROD_HASH_SOURCES = PROD_INLINE_HASHES.map((hash) => `'${hash}'`);

export function buildCsp({ isProd }: BuildCspOptions): string {
  const scriptSrc = isProd
    ? `'self' ${PROD_HASH_SOURCES.join(' ')}`
    : `'self' 'unsafe-inline' https://accounts.google.com`;

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `script-src-elem ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: ${INSFORGE_ORIGIN} https://raw.githubusercontent.com`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${INSFORGE_ORIGIN}`,
    // canvas-confetti crea un Worker desde un blob: sin worker-src explícito,
    // el navegador cae a script-src (sin blob:) y bloquea el Worker — un
    // console error por celebración (evidencia T1). Aplica a dev y prod.
    "worker-src 'self' blob:",
    // PROD: frame-src omitido (default-src 'self' cubre frames; OAuth es redirect, CSP-5).
    // DEV: necesario para el flujo local actual.
    ...(isProd ? [] : ['frame-src https://accounts.google.com']),
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
}