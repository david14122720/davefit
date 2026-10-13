# Tasks: Hardening de Seguridad

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450–550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 SQL → PR 2 Código → PR 3 CSP |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Vistas + RLS owner (SQL) | PR 1 | Smoke SQL por rol vía MCP; sin vitest | Backend InsForge real (`insforge_run-raw-sql`) | Script rollback: restaurar 4 políticas + DROP vistas |
| 2 | Consumidores usan vistas + fix `dias_racha` | PR 2 | `npx vitest run -t "ComunidadPage"` / `-t "stats"` | vitest con insforge mock; `/app/comunidad` anon manual | `git revert` slice; queries vuelven a tablas base |
| 3 | Helper `buildCsp` + split DEV/PROD | PR 3 | `npx vitest run -t "buildCsp"` | `npm run build && npm run preview` + grep HTML + consola | Revert middleware; CSP actual = DEV fallback |

## Phase 1: SQL/BD — Vistas y RLS (Slice 1, PR 1)

- [x] 1.1 Crear `db/migrations/hardening_seguridad.sql`: `CREATE VIEW perfiles_public(id, nombre_completo, avatar_url)` y `user_stats_public(user_id, xp_total, total_workouts, dias_racha)` — sin columnas PII (DAS-1).
- [x] 1.2 En la MISMA migración: GRANT SELECT a anon/authenticated + DROP de las 4 políticas amplias (`anon_read_leaderboard_perfiles`, `perfiles_read_authenticated`, `anon_read_leaderboard_stats`, `"Users can read all stats"`) (DAS-2).
- [x] 1.3 En la MISMA migración: `CREATE POLICY user_stats_owner ON user_stats FOR SELECT USING (user_id = auth.uid())` — atómico con 1.2 para no romper Dashboard (DAS-2/DAS-4).
- [x] 1.4 Crear `db/migrations/hardening_seguridad_rollback.sql`: restaurar las 4 políticas + `DROP VIEW` (reversible).
- [x] 1.5 Aplicar migración vía MCP `insforge_run-raw-sql` con apiKey admin.

## Phase 2: Verificación SQL por rol (Slice 1)

- [x] 2.1 Smoke anon: `SELECT email FROM perfiles` → denied/0 filas; `SELECT email FROM perfiles_public` → error columna inexistente (DAS-5).
- [x] 2.2 Smoke anon: `SELECT *` de ambas vistas → solo columnas públicas (DAS-1); `information_schema.columns` coincide con el set (DAS-1).
- [x] 2.3 Smoke auth: `user_stats` fila propia → completa (`weekly_score`, `nivel`); user_id ≠ uid → 0 filas (DAS-2/DAS-4).
- [x] 2.4 Smoke auth: probe email de U2 → solo fila propia (DAS-6); smoke admin: subquery `rol='admin'` OK (DAS-2).

## Phase 3: Código — Consumidores de vistas (Slice 2, PR 2)

- [x] 3.1 RED: crear `src/app/pages/ComunidadPage.test.tsx` con mock: assert consultas a `perfiles_public`/`user_stats_public` y lectura de `dias_racha` (DAS-3).
- [x] 3.2 GREEN: en `ComunidadPage.tsx` (líneas 132-143) cambiar `from('perfiles')` → `perfiles_public` y `from('user_stats').select('*')` → `user_stats_public` con las 4 columnas (DAS-3).
- [x] 3.3 GREEN: renombrar `streak_days` → `dias_racha` en interface y mapeo (líneas 11, 167) (DAS-3).
- [x] 3.4 RED→GREEN: test + cambio en `src/pages/api/stats.ts` (línea 9): count contra `perfiles_public` (DAS-7).

## Phase 4: CSP — Helper puro + split (Slice 3, PR 3)

- [x] 4.1 RED: `src/lib/csp.test.ts`: `buildCsp({isProd:true})` determinista (CSP-1), con hash y sin `'unsafe-inline'`/`accounts.google.com` en script/frame (CSP-2); `isProd:false` conserva ambos (CSP-3).
- [x] 4.2 GREEN: crear `src/lib/csp.ts` exportando `buildCsp({isProd}): string`.
- [x] 4.3 `src/middleware.ts`: reemplazar CSP inline (líneas 5-19) por `buildCsp({isProd: import.meta.env.PROD})` (CSP-1/CSP-2).
- [x] 4.4 `src/layouts/BaseLayout.astro` (~línea 87): comentario con hash REAL del SW killer (`sha256-rEmM0GNwATMUbfnbMfLVcal6woJkFRXuLPWBs42peZk=`, verificado; el del spec no coincide) + comando de recálculo (CSP-6).

## Phase 4b: CSP remediación — Inventario de scripts inline Astro (Slice 3, PR 3)

- [x] 4.5 `scripts/generate-csp-hashes.mjs`: bootea el server del dist, renderiza `/`, `/app/login`, `/about`, `/faq`, extrae `<script>` inline (CSP3: sin comentarios HTML, sin src, tipos ejecutables), hashea los bytes servidos (sha256/base64), unión entre páginas, emite `src/lib/csp-runtime-hashes.generated.ts`; fail-fast si inventario vacío (CSP-7).
- [x] 4.6 Cadena de build en `package.json`: `astro build && node scripts/generate-csp-hashes.mjs && astro build` — regeneración automática en cada build; un upgrade de Astro no rompe PROD (CSP-7).
- [x] 4.7 `csp.ts`: PROD = `'self'` + hash SW killer + hashes del runtime (import del generado, dedupe). CORREGIDO `SW_KILLER_HASH` → `sha256-iThovp4Zn5AOL4TSEHmvakw9X1ZP0Rc1FW4R2+ted4A=` (bytes servidos; `rEmM0...` era artefacto de extracción — el hash del spec original era el real) (CSP-2).
- [x] 4.8 `csp.test.ts` actualizado: PROD incluye hashes del runtime (determinista, well-formed), sin `'unsafe-inline'`/accounts.google.com (CSP-2/CSP-7).
- [x] 4.9 Spec enmendado: CSP-7 (inventario build-time) + inventario real en header, CSP-2/CSP-6 corregidos — spec de dominio (`specs/content-security-policy/spec.md`) y consolidado (`spec.md`); comentario `BaseLayout.astro` corregido (apunta al pipeline, no a extracción sobre fuente).

## Phase 5: Verificación integrada + Cleanup

- [x] 5.1 `npx vitest run` completo en verde.
- [x] 5.2 `npm run build && npm run preview`: header CSP PROD con los 3 hashes (SW killer + astro:only + astro-island); cobertura: todo script inline servido tiene su hash (CSP-7); SPA `/app/login` hidrata; navegar landing ↔ `/app` y OAuth sin violaciones (CSP-4/CSP-5); `/api/stats` 200 con anon (DAS-7). Evidencia CSP ya recolectada en remediación; navegación/OAuth son del verify formal. **CERRADO EN VERIFY #402**: build 2 pasadas exit 0 + preview (puerto 4477) con header PROD y los 3 hashes; `/api/stats` 200 anon; cobertura 100% verificada programáticamente (8 scripts inline en 4 páginas). CSP-4/CSP-5 limitados a evidencia header+cobertura (sin browser) — ver verify-report #402.
- [x] 5.3 Borrar `auditoria_seguridad.md`; tradeoffs (rate-limit, isAdmin UI-only) documentados en spec (DAS-8). **CERRADO EN VERIFY #402**: `rm auditoria_seguridad.md` ejecutado; DAS-8 presente en spec consolidado y domain spec; rastro en exploration/proposal/verify.
