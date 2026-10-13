# Content Security Policy Specification

> New capability spec for change `hardening-seguridad`. Full spec (no prior main spec). Hardens the production CSP header emitted by `src/middleware.ts`: `script-src` currently uses `'unsafe-inline'` and a dead `https://accounts.google.com` entry.
>
> **Verified inventory (2026-08-09, remediation)**: production pages with islands serve EXACTLY three inline executable `<script>` elements: the "SW killer" in `BaseLayout.astro` (`is:inline`), the Astro `astro:only` helper, and the `astro-island` hydration runtime (the latter two byte-identical across pages). JSON-LD blocks are data (not subject to `script-src` per CSP3); Google OAuth is a redirect flow (no GSI scripts on the origin). Hashes are derived from the RENDERED build HTML (not from source extraction — see CSP-7), because the maintenance comment next to the SW killer contains the literal text "script is:inline" that broke naive source-side extraction and produced a bogus hash. The original spec hash `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=` IS the real served hash of the SW killer; the later `rEmM0...` value was that extraction artifact.

## Purpose

Emit a hardened CSP in production (script hashes instead of `'unsafe-inline'`, no `accounts.google.com`) and a permissive CSP in development so Vite HMR keeps working. CSP construction MUST be a pure, unit-testable helper (Strict TDD — `npx vitest run`). PROD MUST allow every inline script the build actually serves; the hash inventory is computed at build time from rendered HTML and regenerated automatically on every build.

## Requirements

### Requirement: CSP-1 — CSP Built by a Pure Helper

The middleware MUST NOT inline the policy strings; CSP MUST come from a pure exported function (e.g. `buildCsp({ isProd }): string` in `src/lib/csp.ts`) unit-testable with vitest.

#### Scenario: Deterministic output

- GIVEN `buildCsp({ isProd: true })` called twice
- THEN both outputs are identical strings

### Requirement: CSP-2 — PROD Policy Hardened

The PROD policy MUST set `script-src 'self'` + the sha256 hash of the SW killer (`sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=`, served bytes) + the hashes of Astro's inline runtime scripts from the generated inventory (CSP-7), same for `script-src-elem`; MUST NOT contain `'unsafe-inline'` in any script directive; MUST NOT contain `https://accounts.google.com` in script or frame directives. Other directives remain: `default-src 'self'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` (+elem — kept intentionally), img-src (`self`, `data:`, `blob:`, InsForge host, `raw.githubusercontent.com`), `font-src 'self' https://fonts.gstatic.com`, connect-src (`self`, InsForge), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.

#### Scenario: PROD header excludes unsafe-inline and Google

- GIVEN a response through the middleware with `isProd: true`
- THEN the CSP header contains the sha256 hashes (SW killer + Astro runtime) and NOT `'unsafe-inline'` nor `accounts.google.com`

#### Scenario: vitest asserts PROD directives

- GIVEN `buildCsp({ isProd: true })` output
- WHEN asserted in vitest
- THEN the hashes are present and `'unsafe-inline'`/`accounts.google.com` are absent from script directives

### Requirement: CSP-3 — DEV Policy Permissive

With `isProd: false`, the middleware MUST emit the current permissive policy (including `'unsafe-inline'` and `accounts.google.com`) so Vite HMR and local OAuth keep working.

#### Scenario: DEV header keeps unsafe-inline

- GIVEN `isProd: false`
- WHEN a response passes the middleware
- THEN the CSP header contains `'unsafe-inline'`

### Requirement: CSP-4 — View Transitions Keep Working

The PROD CSP MUST NOT block `astro:transitions` ClientRouter navigation (header-based CSP; transitions run on external module scripts).

#### Scenario: Preview navigation with zero violations

- GIVEN the production build in preview with the hardened header
- WHEN navigating across pages (landing ↔ `/app`)
- THEN client-side transitions run with no CSP violations in the console

### Requirement: CSP-5 — Google OAuth Redirect Keeps Working

The PROD CSP MUST NOT break OAuth: full-page redirect to InsForge → Google → back with `#access_token` (no GSI scripts/iframes on the origin). If InsForge ever migrates to GSI popup/one-tap, `accounts.google.com` MUST be reintroduced — documented in the code.

#### Scenario: OAuth redirect completes under PROD CSP

- GIVEN a logged-out user on `/app/login` with the PROD CSP active
- WHEN clicking "Continuar con Google"
- THEN the flow redirects through InsForge/Google and returns with `access_token` in the hash; no CSP violation blocks it

### Requirement: CSP-6 — SW Killer Hash Maintainable

The system MUST keep a maintenance comment next to the SW killer script in `BaseLayout.astro` documenting the pinned hash (the verified served hash `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=`) and directing to the build pipeline/`--print` inspection instead of fragile source-side extraction (the comment itself contains text that broke naive script extraction).

#### Scenario: Recalc instructions present in source

- GIVEN `src/layouts/BaseLayout.astro`
- WHEN searching for the hash/instructions comment
- THEN a comment documents `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=` and points to `scripts/generate-csp-hashes.mjs` / `npm run build` for recalculation

### Requirement: CSP-7 — Build-Time Inline Script Inventory

The PROD CSP MUST allow every inline executable script the build actually serves. `scripts/generate-csp-hashes.mjs` MUST: boot the built server (`dist/server/entry.mjs`), render representative pages with islands (e.g. `/`, `/app/login`, `/about`, `/faq`), extract inline `<script>` elements per CSP3 semantics (strip HTML comments first; exclude tags with `src`; exclude non-executable types like `application/ld+json`), compute sha256/base64 over the EXACT served bytes, take the union across pages, and write `src/lib/csp-runtime-hashes.generated.ts` (`RUNTIME_INLINE_SCRIPT_HASHES: string[]`) which `buildCsp({ isProd: true })` imports into `script-src`/`script-src-elem`. Every `npm run build` MUST run the generator between two `astro build` passes (pass 1 renders the HTML the generator hashes; pass 2 bakes the fresh hashes into the artifacts served by preview/SSR), so an Astro upgrade that changes the inline runtime scripts can never silently break PROD. Generation MUST fail fast (non-zero exit) if the inventory is empty or malformed; a missing generated module fails the build/test import immediately (fail-fast by design — the file ships in the repo and is regenerated every build).

#### Scenario: PROD covers every served inline script

- GIVEN the full `npm run build` chain and preview running
- WHEN the CSP header of a served page with islands is inspected and every inline executable `<script>` in that HTML is hashed
- THEN each hash appears in `script-src`/`script-src-elem` (SW killer, `astro:only` helper, `astro-island` runtime) and no script is left to `'unsafe-inline'`

#### Scenario: No generated inventory fails loud

- GIVEN `src/lib/csp-runtime-hashes.generated.ts` deleted
- WHEN vitest or `astro build` runs
- THEN the import of the module fails with a clear module-not-found error (no silent CSP degradation)

#### Scenario: Astro upgrade regenerates hashes automatically

- GIVEN an Astro upgrade that changes the inline runtime script content
- WHEN `npm run build` runs
- THEN the generated module is rewritten with the new hashes and the built artifacts serve a matching CSP without manual edits

## Non-Goals

- Native Astro `security.csp` config (meta-based, incompatible with view transitions — rejected in exploration)
- Removing `style-src 'unsafe-inline'` (React SSR/framer-motion rely on it; low risk, kept)
- Bundling the SW killer as an external module (alternative to the hash — not chosen; hash + pipeline suffices)
- Manual per-version pinning of Astro runtime hashes (the generated-inventory pipeline replaces it; regeneration is automatic)
- Source-side/extraction-based hashing of inline scripts (proven broken: the surrounding comment text corrupts naive parsers — hashes come from rendered HTML only)