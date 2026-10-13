# Spec: Hardening de Seguridad

Consolidated spec for change `hardening-seguridad` — 2 new capabilities: `data-access-security` y `content-security-policy`. Canonical per-domain copies: `openspec/changes/hardening-seguridad/specs/{domain}/spec.md`. No modified capabilities (existing specs `ejercicios-import`, `nutrition`, `workout-practice` untouched). Verifies: RLS leaks verified on the real InsForge backend (exploration #396/#397); CSP inventory verified against rendered build HTML (2026-08-09 remediation: 3 inline scripts — SW killer, Astro `astro:only`, Astro `astro-island`; the spec hash `iThovp4...` IS the real served SW killer hash, the `rEmM0...` value published during apply was an extraction artifact).

## Domain: data-access-security

### Purpose

Restrict column-level exposure of `perfiles`/`user_stats` via public views + owner policy, keeping the public leaderboard (`/app/comunidad`), landing stats, and Dashboard working. RLS is row-level only — views are required (Approach A per exploration).

### DAS-1 — Restricted Public Views

The system MUST create views with SELECT granted to `anon` and `authenticated`, exposing exactly: `perfiles_public (id, nombre_completo, avatar_url)` and `user_stats_public (user_id, xp_total, total_workouts, dias_racha)`. MUST NOT expose `email`, `fecha_nacimiento`, `peso_actual` (perfiles) nor `weekly_score`, `monthly_score`, `ultimo_entreno`, `longest_streak`, `racha_bonus`, `nivel` (user_stats).

#### Scenario: View column sets are minimal

- GIVEN the migration applied
- WHEN listing `information_schema.columns` for both views
- THEN column sets match the table exactly

#### Scenario: Anon reads leaderboard columns via view

- GIVEN the public anon key
- WHEN selecting `*` from both views
- THEN rows return containing only the public columns

### DAS-2 — Broad Policies Dropped, Owner Policy Created

The SAME migration MUST DROP `anon_read_leaderboard_perfiles`, `perfiles_read_authenticated` (perfiles) and `anon_read_leaderboard_stats`, `"Users can read all stats"` (user_stats), and CREATE `user_stats_owner` FOR SELECT USING (`user_id = auth.uid()`). `perfiles` owner access stays covered by `perfiles_owner_all_v3`.

#### Scenario: Owner reads own full stats row

- GIVEN authenticated U with a `user_stats` row (`user_id` = U)
- WHEN selecting `*` from `user_stats` with U's token
- THEN the full row (including `weekly_score`, `nivel`) returns

#### Scenario: Cross-user stats read returns zero rows

- GIVEN authenticated U1
- WHEN selecting `user_stats` rows where `user_id` = U2 (≠ U1)
- THEN 0 rows return, no error

#### Scenario: Admin role subqueries still pass

- GIVEN an admin (`rol='admin'`) logged in
- WHEN any policy evaluates `EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')`
- THEN the check passes (own-row read covered)

### DAS-3 — Public Leaderboard Keeps Working

`ComunidadPage` MUST query `perfiles_public` and `user_stats_public` instead of the base tables; reading `dias_racha` for the streak is mandatory (view exposes only that column — opportunistically fixes the dead `streak_days` reference).

#### Scenario: Anonymous leaderboard loads

- GIVEN a visitor without session on `/app/comunidad`
- WHEN the leaderboard queries run against the views
- THEN rank, username, avatar, score and workouts render; no error state

#### Scenario: Streak comes from the view column

- GIVEN `user_stats_public.dias_racha` = 5
- WHEN ComunidadPage builds the row
- THEN the streak shows 5 (previously always 0)

### DAS-4 — Dashboard Reads Own Row

After the migration, `getUserStats` MUST keep returning the current user's stats via `user_stats_owner`.

#### Scenario: Dashboard stats load after migration

- GIVEN a logged-in user with stats
- WHEN the Dashboard requests the stats row
- THEN stats render with no permission-denied error

### DAS-5 — Anonymous MUST NOT Read PII

The anon role MUST NOT read `email` or any sensitive column of `perfiles`/`user_stats`, via tables or views.

#### Scenario: Direct table select of email is denied

- GIVEN the anon key
- WHEN selecting `email` from `perfiles`
- THEN PostgREST returns no rows/permission denied; no email bytes leak

#### Scenario: View has no email column

- GIVEN the anon key
- WHEN selecting `email` from `perfiles_public`
- THEN the query errors: column does not exist

### DAS-6 — Authenticated MUST NOT Read Others' PII

An authenticated user MUST NOT read another user's `email`/PII from `perfiles` (own row remains readable via `perfiles_owner_all_v3`).

#### Scenario: Cross-user email probe returns nothing

- GIVEN authenticated U1 and a profile of U2 (≠ U1)
- WHEN selecting `email` from `perfiles` with U1's token
- THEN only U1's own row is visible; U2's email never returned

### DAS-7 — Landing Stats Count via View

`src/pages/api/stats.ts` MUST count users against `perfiles_public` (not `perfiles`).

#### Scenario: /api/stats still reports users

- GIVEN the migration applied
- WHEN GET `/api/stats` with the anon client
- THEN `users` equals the profile count (from the view), endpoint returns 200

### DAS-8 — Accepted Risks Documented

The change MUST document (spec + verify trace, replacing deleted `auditoria_seguridad.md`): rate-limit client-side accepted (5/10 min, localStorage, eludible — real defense out of scope) and isAdmin UI-only accepted (UI hiding only; data access enforced server-side by `verifyAdmin()` per request).

#### Scenario: Both tradeoffs are traceable

- GIVEN the archived change
- WHEN reading the spec and verify report
- THEN both accepted risks appear with their mitigations

## Domain: content-security-policy

### Purpose

Emit a hardened CSP in production (script hashes instead of `'unsafe-inline'`, no dead `accounts.google.com`) and a permissive CSP in dev so Vite HMR works. CSP construction MUST be a pure, unit-testable helper (Strict TDD — `npx vitest run`). PROD MUST allow every inline script the build actually serves, with the hash inventory computed at build time from rendered HTML (CSP-7).

### CSP-1 — CSP Built by a Pure Helper

The middleware MUST NOT inline policy strings; CSP MUST come from a pure exported function (e.g. `buildCsp({ isProd }): string` in `src/lib/csp.ts`), unit-testable with vitest.

#### Scenario: Deterministic output

- GIVEN `buildCsp({ isProd: true })` called twice
- THEN both outputs are identical strings

### CSP-2 — PROD Policy Hardened

PROD MUST set `script-src 'self'` + sha256 del SW killer (`sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=`, bytes servidos por el build — el hash original del spec, confirmado real en la remediación) + hashes de los scripts inline de Astro (helper `astro:only` + runtime `astro-island`) del inventario generado (CSP-7); MUST NOT contain `'unsafe-inline'` in script directives; MUST NOT contain `accounts.google.com` in script/frame directives. Other directives remain unchanged (`style-src 'unsafe-inline'` kept intentionally, fonts, img, connect, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`, `form-action`).

#### Scenario: PROD header excludes unsafe-inline and Google

- GIVEN a response through the middleware with `isProd: true`
- THEN the CSP header contains the sha256 hashes (SW killer + runtime Astro) and NOT `'unsafe-inline'` nor `accounts.google.com`

#### Scenario: vitest asserts PROD directives

- GIVEN `buildCsp({ isProd: true })` output
- WHEN asserted in vitest
- THEN the hashes are present and `'unsafe-inline'`/`accounts.google.com` are absent from script directives

### CSP-3 — DEV Policy Permissive

With `isProd: false`, the middleware MUST emit the current permissive policy (including `'unsafe-inline'` and `accounts.google.com`).

#### Scenario: DEV header keeps unsafe-inline

- GIVEN `isProd: false`
- WHEN a response passes the middleware
- THEN the CSP header contains `'unsafe-inline'`

### CSP-4 — View Transitions Keep Working

The PROD CSP MUST NOT block `astro:transitions` ClientRouter navigation.

#### Scenario: Preview navigation with zero violations

- GIVEN the production build in preview with the hardened header
- WHEN navigating across pages (landing ↔ `/app`)
- THEN client-side transitions run with no CSP violations in the console

### CSP-5 — Google OAuth Redirect Keeps Working

The PROD CSP MUST NOT break OAuth (full-page redirect, no GSI scripts on the origin). If InsForge migrates to GSI popup/one-tap, `accounts.google.com` MUST be reintroduced — documented in code.

#### Scenario: OAuth redirect completes under PROD CSP

- GIVEN a logged-out user on `/app/login` with the PROD CSP active
- WHEN clicking "Continuar con Google"
- THEN the flow redirects through InsForge/Google and returns with `access_token`; no CSP violation blocks it

### CSP-6 — SW Killer Hash Maintainable

A maintenance comment MUST document the pinned hash (served bytes: `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=`) and recalc via the build pipeline / `scripts/generate-csp-hashes.mjs --print` next to the SW killer script in `BaseLayout.astro` (not source-side extraction: the comment's own text breaks naive parsers).

#### Scenario: Recalc instructions present in source

- GIVEN `src/layouts/BaseLayout.astro`
- WHEN searching for the hash/instructions comment
- THEN a comment documents `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=` and the recalculation pipeline

### CSP-7 — Build-Time Inline Script Inventory

The PROD CSP MUST allow every inline executable script the build actually serves (SW killer + Astro `astro:only` helper + `astro-island` hydration runtime). `scripts/generate-csp-hashes.mjs` MUST boot the built server, render representative pages (`/`, `/app/login`, `/about`, `/faq`), extract inline `<script>` per CSP3 semantics (strip HTML comments, no `src`, executable types), hash the EXACT served bytes (sha256/base64), union across pages and write `src/lib/csp-runtime-hashes.generated.ts`, imported by `buildCsp`. Every `npm run build` MUST run the generator between two `astro build` passes so an Astro upgrade cannot silently break PROD; generation MUST fail fast on empty/malformed inventory; a missing generated module fails the import loudly (the file ships in the repo, regenerated every build).

#### Scenario: PROD covers every served inline script

- GIVEN the full `npm run build` chain and preview running
- WHEN hashing every inline executable `<script>` of a served page with islands
- THEN each hash appears in `script-src`/`script-src-elem` (SW killer, `astro:only`, `astro-island`) with no `'unsafe-inline'` fallback

#### Scenario: Astro upgrade regenerates hashes automatically

- GIVEN an Astro upgrade that changes the inline runtime script content
- WHEN `npm run build` runs
- THEN the generated module is rewritten with the new hashes and the built artifacts serve a matching CSP without manual edits

## Non-Goals (both domains)

- REVOKE per-column and RPC `get_leaderboard` (rejected alternatives, exploration)
- Rate-limit server-side / Astro auth proxy; isAdmin client-side enforcement (accepted risks, DAS-8)
- Native Astro `security.csp` (meta-based, breaks view transitions); removing `style-src 'unsafe-inline'`
- Bundling the SW killer externally (hash + pipeline chosen); manual per-version pinning of Astro runtime hashes (generated-inventory pipeline replaces it)
- Source-side/extraction-based hashing of inline scripts (proven broken — the surrounding comment text corrupts naive parsers; hashes come from rendered HTML only)
- `streak_days` refactor beyond the view-driven rename (DAS-3)
