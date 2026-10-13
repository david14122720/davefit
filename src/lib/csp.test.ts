import { describe, expect, it } from 'vitest';
import { buildCsp } from './csp';
import { RUNTIME_INLINE_SCRIPT_HASHES } from './csp-runtime-hashes.generated';

/**
 * Hash sha256 del script inline "SW killer" (BaseLayout.astro), sobre los BYTES
 * SERVED por el build (incluyen el salto de línea tras la etiqueta de apertura).
 *
 * CORRECCIÓN 2026-08-09 (remediación Slice 3): el valor publicado antes
 * (sha256-rEmM0...) era un artefacto de extracción — el comentario HTML junto
 * al script contiene el literal `<script is:inline>`, que rompía awk/regex
 * ingenuos (capturaban comentario + script). El hash REAL servido es:
 *   sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=
 * (el hash original del spec — el spec tenía razón; la "verificación" previa
 * se hizo con la misma extracción rota).
 *
 * Fuente fiable (hashea HTML renderizado, no el fuente):
 *   node scripts/generate-csp-hashes.mjs --print
 */
const SW_KILLER_HASH = 'sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=';

/** Hashes que el CSP PROD debe listar, en orden (Set + dedupe = mismo orden que csp.ts). */
const EXPECTED_PROD_HASHES = [...new Set([SW_KILLER_HASH, ...RUNTIME_INLINE_SCRIPT_HASHES])];

function directive(csp: string, name: string): string {
  return (
    csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith(`${name} `)) ?? ''
  );
}

describe('buildCsp', () => {
  it('CSP-1: deterministic output for isProd:true', () => {
    expect(buildCsp({ isProd: true })).toBe(buildCsp({ isProd: true }));
    expect(buildCsp({ isProd: false })).toBe(buildCsp({ isProd: false }));
  });

  it('CSP-2/CSP-7: PROD has SW killer + Astro runtime hashes and no unsafe-inline/accounts.google.com in script or frame directives', () => {
    const csp = buildCsp({ isProd: true });

    const scriptSrc = directive(csp, 'script-src');
    const scriptSrcElem = directive(csp, 'script-src-elem');
    const frameSrc = directive(csp, 'frame-src');

    // Estructura exacta: 'self' + todos los hashes inline del inventario real.
    // Los hashes van entre comillas simples (source expression CSP válida).
    const quotedHashes = EXPECTED_PROD_HASHES.map((h) => `'${h}'`).join(' ');
    expect(scriptSrc).toBe(`script-src 'self' ${quotedHashes}`);
    expect(scriptSrcElem).toBe(`script-src-elem 'self' ${quotedHashes}`);

    // Inventario verificado contra el HTML servido por el build (2026-08-09):
    // SW killer + helper astro:only + runtime astro-island (CSP-7).
    expect(scriptSrc).toContain("'sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A='");
    expect(scriptSrc).toContain("'sha256-eIXWvAmxkr251LJZkjniEK5LcPF3NkapbJepohwYRIc='");
    expect(scriptSrc).toContain("'sha256-Ya0pUYrC7nM5Cn/056TyVuEiz6dFGrzmkWzgON0pF0U='");

    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrcElem).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain('accounts.google.com');
    expect(scriptSrcElem).not.toContain('accounts.google.com');
    expect(frameSrc).not.toContain('accounts.google.com');
    expect(csp).not.toContain('accounts.google.com');
  });

  it('CSP-7: every generated runtime hash appears in PROD script directives and is well-formed', () => {
    const csp = buildCsp({ isProd: true });
    const scriptSrc = directive(csp, 'script-src');
    const scriptSrcElem = directive(csp, 'script-src-elem');

    expect(RUNTIME_INLINE_SCRIPT_HASHES.length).toBeGreaterThan(0);
    for (const hash of RUNTIME_INLINE_SCRIPT_HASHES) {
      expect(hash).toMatch(/^sha256-[A-Za-z0-9+/=]+$/);
      expect(scriptSrc).toContain(`'${hash}'`);
      expect(scriptSrcElem).toContain(`'${hash}'`);
    }
  });

  // Regresión 2026-10-12 (detectada vía `astro preview` prod): un hash SIN
  // comillas simples es una source expression inválida — el navegador la
  // ignora y bloquea los scripts inline (la SPA no hidrataba en producción).
  it('CSP-7b: PROD hash sources are single-quoted (unquoted hashes are ignored by browsers)', () => {
    const csp = buildCsp({ isProd: true });
    for (const name of ['script-src', 'script-src-elem']) {
      const hashSources = directive(csp, name)
        .split(' ')
        .filter((source) => source.includes('sha256-'));
      expect(hashSources.length).toBeGreaterThan(0);
      for (const source of hashSources) {
        expect(source).toMatch(/^'sha256-[A-Za-z0-9+/=]+'$/);
      }
    }
  });

  it('CSP-2: PROD keeps the rest of the directives', () => {
    const csp = buildCsp({ isProd: true });

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
    // T2: el scheme de connect-src sigue a PUBLIC_INSFORGE_URL (https por
    // defecto; http en dev local). Antes estaba hardcodeado `https://` y
    // bloqueaba por CSP el tráfico InsForge en dev.
    const insforgeScheme =
      /^([a-z][a-z0-9+.-]*):\/\//i.exec(import.meta.env.PUBLIC_INSFORGE_URL ?? '')?.[1]?.toLowerCase() ??
      'https';
    expect(csp).toContain(`connect-src 'self' ${insforgeScheme}://`);
    // T2: canvas-confetti usa un Worker blob:; sin worker-src el navegador
    // cae a script-src y lo bloquea (console error por celebración).
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('CSP-3: DEV keeps unsafe-inline and accounts.google.com', () => {
    const csp = buildCsp({ isProd: false });

    expect(directive(csp, 'script-src')).toContain("'unsafe-inline'");
    expect(directive(csp, 'script-src')).toContain('https://accounts.google.com');
    expect(directive(csp, 'frame-src')).toContain('https://accounts.google.com');
    // El Worker de canvas-confetti debe funcionar también en dev (T1: el error
    // de consola se reprodujo con la política de dev).
    expect(directive(csp, 'worker-src')).toBe("worker-src 'self' blob:");
  });
});