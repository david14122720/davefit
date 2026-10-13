# Archive Report: hardening-seguridad

**Date**: 2026-08-09
**Change**: `hardening-seguridad`
**Status**: COMPLETE — archived (intentional-with-warnings; 3 documented close-out warnings, none blocking)
**Mode**: both (Engram + OpenSpec)
**Store** (user-declared execution_store): `engram` + `openspec` (hybrid) — filesystem archive in `openspec/`, audit trail in both.

**Review gate**: `disabled/unmanaged` — no native review artifacts exist for this change (`openspec/changes/hardening-seguridad/reviews/*` absent; Engram topics `sdd/hardening-seguridad/review/{transaction,ledger,receipt,gate-context}` absent per search; review kill-switch not enabled, so no terminal receipt is demanded and none was manufactured). Verify admitted the report via `gentle-ai sdd-verify-validate` (valid: true, 15/15 requirements, 23/23 scenarios, 0 blockers, 0 critical, per Engram #402).

## Final State (at close)

Authority: native verify admission (#402) > persisted tasks artifact > orchestrator launch-prompt final-state facts > intermediate snapshots (apply-progress #401, verify report). Numbers below are the terminal record, not snapshot echoes.

- **Tasks**: 25/25 complete (1.1–5.3; count per file on disk; the "27 (1.1–5.3)" figure in the verify report is a miscount and is not propagated here).
- **Task reconciliation (exceptional, archive-time)**: tasks 5.2 and 5.3 were left unchecked in the persisted `tasks.md` but were executed during the final verification phase. The orchestrator explicitly instructed to close the change with final-state facts, and verify-report #402 proves completion: 5.2 (build 2-pass exit 0 + preview port 4477 with PROD CSP header carrying the 3 hashes; `/api/stats` 200 anon; CSP-4/CSP-5 limited to header+coverage evidence — no browser in the environment) and 5.3 (`auditoria_seguridad.md` deleted; DAS-8 tradeoffs documented in consolidated + domain specs). Checkboxes were reconciled at archive time per the Task Completion Gate exception; reason recorded here. No other stale checkboxes remain.
- **Requirements**: 15/15 compliant (DAS-1..8 = 8, CSP-1..7 = 7).
- **Scenarios**: 23/23 compliant (DAS: 13, CSP: 10; 21 with runtime/policy evidence, 2 LIMITED by declared environment constraints — see warnings).
- **Tests**: `npx vitest run` — 71 passed / 0 failed / 0 skipped (15 files), exit 0. `test_output_hash: sha256:a8adf0db635fcab8641a07d64e83df85da82f528e97e8f219384c820354dad04`.
- **Build**: `npm run build` exit 0 — 2-pass chain `astro build && node scripts/generate-csp-hashes.mjs && astro build` (generator booted `dist/server/entry.mjs`, rendered `/`, `/app/login`, `/about`, `/faq`, extracted 3 inline scripts, regenerated `src/lib/csp-runtime-hashes.generated.ts`). `build_output_hash: sha256:799b6e66a9f5eba4e3a7da080080619b724775312991b5173b1c51e9f2683db3`.
- **Preview**: `npm run preview -- --port 4477` — PROD CSP header served on `/` and `/app/login` with the 3 hashes (SW killer `sha256-iThovp4...`, `astro:only` `sha256-eIXWvA...`, `astro-island` `sha256-Ya0pUY...`), no `'unsafe-inline'` in script directives, no `accounts.google.com`; `/api/stats` 200 for anon.
- **Verdict** (verify-report, machine + human): `pass_with_warnings` — 0 blockers, 0 critical findings; warnings are environment-completeness/hygiene, not implementation defects.
- **Commits**: NONE. No `git commit`, no `git push`, no PR (user restriction, explicit). All implementation and the SDD change folder remain uncommitted in the working tree. Chained PRs (stacked-to-main, 3 slices) remain pending approval.

## What Shipped (3 chained slices)

| Slice | Scope | Delivered |
|-------|-------|-----------|
| 1 (PR 1) | SQL/BD | `db/migrations/hardening_seguridad.sql` — views `perfiles_public (id, nombre_completo, avatar_url)` / `user_stats_public (user_id, xp_total, total_workouts, dias_racha)`, GRANT SELECT anon/authenticated, DROP of the 4 broad policies (`anon_read_leaderboard_perfiles`, `perfiles_read_authenticated`, `anon_read_leaderboard_stats`, `"Users can read all stats"`), CREATE `user_stats_owner (user_id = auth.uid())` in the same transaction; `hardening_seguridad_rollback.sql` restores the 4 policies + drops views. Email leak closed on the real backend (probes DAS-5/DAS-6: 0 rows / column-does-not-exist). |
| 2 (PR 2) | Code | `src/app/pages/ComunidadPage.tsx` queries `perfiles_public`/`user_stats_public`; `streak_days` → `dias_racha` (interface + mapping); `src/pages/api/stats.ts:9` counts against `perfiles_public`. Tests: `ComunidadPage.test.tsx` (3), `stats.test.ts` (2). |
| 3 (PR 3) | CSP | `src/lib/csp.ts` pure `buildCsp({isProd})`; `src/middleware.ts` delegates (no inline strings); DEV keeps `'unsafe-inline'` + `accounts.google.com`; PROD hardened with `'self'` + 3 sha256 hashes via build-time inventory. `scripts/generate-csp-hashes.mjs` (rendered-HTML extraction per CSP3, fail-fast on empty/malformed); `src/lib/csp-runtime-hashes.generated.ts` versioned, regenerated every build; `package.json` 2-pass build chain; maintenance comment + real hash in `src/layouts/BaseLayout.astro`. Tests: `csp.test.ts` (5), incl. fail-fast verified by temporarily removing the generated module. |

Also deleted: `auditoria_seguridad.md` — its knowledge lives in the SDD artifact trail (exploration #396, discovery #397, proposal #398, spec #399, verify #402).

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `data-access-security` | **Not merged — documented as delta** | No prior base spec exists under `openspec/specs/` (only `ejercicios-import`, `nutrition`, `workout-practice` exist). Per orchestrator instruction ("si no hay spec base previo, documenta en el archive que las capabilities nuevas quedan como delta"), the capability remains a delta spec: full spec preserved in the archived change folder `specs/data-access-security/spec.md`, requirements DAS-1..DAS-8. |
| `content-security-policy` | **Not merged — documented as delta** | Same: no prior base spec; full delta spec preserved in the archived change folder `specs/content-security-policy/spec.md`, requirements CSP-1..CSP-7. |
| `ejercicios-import`, `nutrition`, `workout-practice` | Untouched | No modified capabilities per proposal/spec; verified unchanged in `openspec/specs/`. |

No existing main spec was modified. If the project later promotes these capabilities to first-class base specs, the archived delta specs are the canonical source (they are full specs, not incremental deltas).

## Audit Findings Resolution (from exploration #396 / discovery #397)

| Original finding | Status at close |
|------------------|-----------------|
| 1. Email exposed to anon + any authenticated via RLS `qual=true` (`perfiles`, `user_stats`) | **RESOLVED** — views + policy DROP + `user_stats_owner`; verified on real backend (0 rows, column error, own-row only) |
| 2. CSP `'unsafe-inline'` in script-src + dead `accounts.google.com` | **RESOLVED** — PROD hardened with 3 build-time hashes; DEV unchanged; Google removed (full-page redirect flow documented) |
| 3. Rate-limit client-side (5/10 min, localStorage, eludible) | **DOCUMENTED** — accepted tradeoff DAS-8 (server-side/proxy out of scope) |
| 4. isAdmin UI-only (React DevTools bypass) | **DOCUMENTED** — accepted tradeoff DAS-8 (data protected server-side by `verifyAdmin()` per request) |
| 5. Bug `streak_days` → real column `dias_racha` (streak always 0) | **RESOLVED** — fixed opportunistically in slice 2 (DAS-3), tested |
| 6. Already-good items (verifyAdmin, `protect_roles` trigger, magic bytes, CSRF, allowlist) | **CONFIRMED INTACT** — no changes made |

## Close-Out Warnings (documented, non-blocking)

1. **CSP browser smoke pending post-PR** (CSP-4/CSP-5 LIMITED): no browser/Playwright in the verification environment. Evidence at close = served PROD header + programmatic 100% inline-script coverage across 4 sampled pages + OAuth is full-page redirect with no GSI scripts on origin. Re-verify with a real browser (landing ↔ `/app` navigation with console open, Google OAuth click-through) after delivery.
2. **Residue in `auth.users`**: verification temp user `verify-das-1786295255@davefit.test` (id `b0ea05c0-...`) remains in `auth.users` (its `perfiles`/`user_stats` rows were cleaned; backend back to 2/2 baseline). The MCP blocks DELETE on schema `auth` and the endpoint requires an admin token. **Action**: delete via InsForge admin dashboard, or leave (inert, no profile, no data).
3. **Latent bug (out of scope, carried forward)**: `invokeRpc` (client) calls `/rest/v1/rpc/` but the InsForge SDK v1.2.0 routes RPC through `/api/database/rpc/`. Not triggered by this change; pending verification in a future change.

## Delivery State

- No commits, no push, no PR (explicit user restriction — working tree retains all changes).
- Chained PRs (stacked-to-main, per tasks forecast `auto-chain` PR 1 SQL → PR 2 Code → PR 3 CSP) remain **pending orchestrator/user approval**. The archived task forecast documents the intended slice boundaries; each slice has autonomous scope, focused verification, and rollback.
- Other active changes in `openspec/changes/` (`ejercicios-schema-dataset`, `stitch-ui-overhaul`) were NOT touched.

## Artifacts (traceability)

| Artifact | Engram observation | File (now archived) |
|----------|--------------------|---------------------|
| exploration | #396 | `exploration.md` |
| discovery | #397 | (Engram-only backend findings) |
| proposal | #398 | `proposal.md` |
| spec | #399 | `spec.md` (consolidated) |
| tasks | #400 | `tasks.md` |
| apply-progress | #401 | (Engram topic `sdd/hardening-seguridad/apply-progress`; remediation Slice 3 CSP record) |
| verify-report | #402 | `verify-report.md` |
| archive-report | this topic (`sdd/hardening-seguridad/archive-report`) | `archive-report.md` |
| domain specs | — | `specs/data-access-security/spec.md`, `specs/content-security-policy/spec.md` |

Note: `design.md` was never produced for this change — design decisions (Approach A = views vs REVOKE/RPC; CSP inventory pipeline; hash from served bytes) live in exploration #396, the consolidated spec (incl. Non-Goals), and the verify report's Coherence section. Intentional partial archive w.r.t. `design.md`, per orchestrator's artifact list and explicit close instruction.

## Next Recommended

User-side close-out (this phase performs no git operations):
1. Approve delivery of the 3 chained PRs (stacked-to-main): PR 1 SQL → PR 2 Code → PR 3 CSP, in that order.
2. Post-delivery browser smoke (CSP-4/CSP-5) to close the LIMITED evidence gap.
3. Remove `verify-das-1786295255@davefit.test` from `auth.users` via InsForge admin dashboard (or confirm inert residue is acceptable).
4. Track the `invokeRpc` `/rest/v1/rpc/` vs `/api/database/rpc/` mismatch as a future change.
5. Optional: promote `data-access-security` / `content-security-policy` to base specs in `openspec/specs/` if they become standing capabilities.