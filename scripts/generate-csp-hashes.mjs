#!/usr/bin/env node
/**
 * generate-csp-hashes.mjs — derive CSP hashes from the REAL rendered HTML.
 *
 * WHY THIS DESIGN (authority: SDD remediation Slice 3, hardening-seguridad, 2026-08-09):
 * - Astro 7 SSR (`output: 'server'`) renders HTML per request; there is no static
 *   dist HTML to read. The only truthful inventory of inline executable scripts is
 *   what the built server actually serves.
 * - Manual/source-side extraction is PROVEN WRONG: the maintenance comment in
 *   BaseLayout.astro contains the literal text `<script is:inline>`, so naive
 *   regex/awk extraction captured comment+script and produced a bogus hash
 *   (`rEmM0...`) that blocked the SW killer in production and missed the Astro
 *   runtime scripts entirely (black screen on /app). Hashing rendered bytes is
 *   immune to compressHTML, comment placement, whitespace and Astro upgrades.
 *
 * FLOW (package.json):
 *   astro build          # pass 1: dist to render from
 *   generate-csp-hashes  # this script: render pages, extract, hash, emit .ts
 *   astro build          # pass 2: final dist with the fresh hashes baked in
 *
 * The generator runs BEFORE any preview/SSR that must serve the correct CSP, and
 * every `npm run build` regenerates the hashes — an Astro upgrade that changes
 * the inline runtime scripts can never silently break PROD.
 *
 * EXTRACTION RULES (mirror CSP3 semantics):
 * 1. Strip HTML comments first (they may legally contain `<script` text).
 * 2. Match `<script ...>content</script>`; skip tags with a `src` attribute
 *    (external modules are covered by 'self').
 * 3. Skip non-executable types (application/ld+json, importmap, ...). Inline
 *    `type="module"`/classic scripts ARE covered by script-src-elem, keep them.
 * 4. sha256 over the EXACT served bytes (what the browser hashes), base64.
 * 5. Union across representative pages (/, /app/login, /about, /faq) — the CSP
 *    header is global and must cover inline scripts on every page.
 *
 * USAGE:
 *   node scripts/generate-csp-hashes.mjs          # write src/lib/csp-runtime-hashes.generated.ts
 *   node scripts/generate-csp-hashes.mjs --print  # inventory only, no write
 * Env: CSP_HASHES_PORT (default 41237 — ephemeral, avoid dev's 4321).
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRY = new URL('../dist/server/entry.mjs', import.meta.url).pathname;
const OUT_FILE = new URL('../src/lib/csp-runtime-hashes.generated.ts', import.meta.url).pathname;
const PORT = process.env.CSP_HASHES_PORT || '41237';
const PAGES = ['/', '/app/login', '/about', '/faq'];
const PRINT_ONLY = process.argv.includes('--print');

const BASE64_RE = /^sha256-[A-Za-z0-9+/=]+$/;

/** Extract inline executable scripts from served HTML. */
function extractInlineScripts(html) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const scripts = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(noComments)) !== null) {
    const attrs = m[1] || '';
    const content = m[2] ?? '';
    if (/\bsrc\s*=/.test(attrs)) continue; // external: covered by 'self'
    const type = (attrs.match(/\btype\s*=\s*["']([^"']*)["']/) || [])[1] ?? '';
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) {
      continue; // JSON-LD, importmap, speculation rules... not script-src subjects
    }
    if (!content.trim()) continue;
    scripts.push({ attrs: attrs.trim(), content });
  }
  return scripts;
}

function sha256Base64(content) {
  return createHash('sha256').update(content, 'utf8').digest('base64');
}

/** Boot the real standalone server (entry.mjs autostarts unless disabled). */
async function renderPage(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  if (!res.ok && res.status !== 404) {
    throw new Error(`GET ${path} -> HTTP ${res.status}`);
  }
  return res.text();
}

async function assertPortFree(port) {
  const net = await import('node:net');
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (err) => {
      reject(new Error(`port ${port} is already in use (${err.code}) — a stale server may serve an old dist; set CSP_HASHES_PORT to a free port`));
    });
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}

async function main() {
  process.env.PORT = PORT;
  process.env.HOST = '127.0.0.1';
  await assertPortFree(Number(PORT));
  await import(ENTRY);

  // Wait for the server to accept connections (startServer is async internally).
  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/`);
      up = true;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (!up) throw new Error(`built server never came up on port ${PORT}`);

  // Union of hashes across pages, first-seen order => deterministic output.
  const inventory = []; // { hash, page, len, snippet }
  const seen = new Set();
  for (const page of PAGES) {
    const html = await renderPage(page);
    for (const { attrs, content } of extractInlineScripts(html)) {
      const hash = `sha256-${sha256Base64(content)}`;
      if (seen.has(hash)) continue;
      seen.add(hash);
      inventory.push({
        hash,
        page,
        len: content.length,
        snippet: content.slice(0, 48).replace(/\s+/g, ' '),
        attrs,
      });
    }
  }

  if (inventory.length === 0) {
    throw new Error(
      'CSP hash generation found ZERO inline executable scripts in the rendered HTML. ' +
      'Refusing to emit an empty inventory — a broken build must fail here, not in production.',
    );
  }
  for (const item of inventory) {
    if (!BASE64_RE.test(item.hash)) {
      throw new Error(`malformed hash produced for ${item.page}: ${item.hash}`);
    }
  }

  const lines = inventory.map((s, i) =>
    `  ${JSON.stringify(s.hash)}, // [${i + 1}/${inventory.length}] ${s.page} (${s.len} B, ${s.attrs || 'classic'})`,
  );

  console.log(`[generate-csp-hashes] ${inventory.length} inline script hash(es) from ${PAGES.join(', ')}:`);
  for (const s of inventory) {
    console.log(`  ${s.hash}  ${s.page}  ${s.snippet}`);
  }

  if (PRINT_ONLY) {
    // --print must not leave the server alive or block the terminal.
    process.exit(0);
  }

  const body = `/**
 * csp-runtime-hashes.generated.ts — AUTO-GENERATED by scripts/generate-csp-hashes.mjs.
 * DO NOT EDIT: regenerated on every \`npm run build\` (astro build -> generate -> astro build).
 *
 * sha256 hashes of the inline executable <script> elements that the built server
 * ACTUALLY serves (rendered bytes, incl. leading whitespace), extracted from:
 * ${PAGES.join(', ')}
 *
 * These feed buildCsp({ isProd: true }) so PROD runs script-src WITHOUT
 * 'unsafe-inline' while still allowing Astro's inline runtime scripts
 * (astro:only helper, astro-island hydration) and our SW killer. If an Astro
 * upgrade changes the runtime scripts, the next build regenerates this file.
 */
export const RUNTIME_INLINE_SCRIPT_HASHES: string[] = [
${lines.join('\n')}
];
`;

  writeFileSync(OUT_FILE, body, 'utf8');
  console.log(`[generate-csp-hashes] wrote ${OUT_FILE}`);

  // The standalone server keeps the event loop alive; exit explicitly
  // (same reason the probe needed process.exit).
  process.exit(0);
}

main().catch((err) => {
  console.error('[generate-csp-hashes] FAILED:', err.message);
  process.exit(1);
});