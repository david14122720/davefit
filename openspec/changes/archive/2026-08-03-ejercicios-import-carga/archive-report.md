# Archive Report: ejercicios-import-carga

**Date**: 2026-08-03
**Change**: `ejercicios-import-carga`
**Status**: COMPLETE — archived (intentional full archive, no warnings pending)
**Mode**: both (Engram + OpenSpec)
**Review gate**: `disabled/unmanaged` — no native review topics exist for this change (`sdd/ejercicios-import-carga/review/*` absent from Engram, no `state.yaml` in the change folder); same status as the preceding change `ejercicios-import-script`.

## Final State (at close)

> Per the Final-State Authority, this report describes the change AT CLOSE. The verify envelope (13/15, one PARTIAL) was an intermediate snapshot; the R5S3 gap was fixed after verify, so no warnings remain pending.

- **Tasks**: 11/11 complete (T0–T10; `tasks.md` all `[x]` — Task Completion Gate passed, no stale checkboxes, no reconciliation needed).
- **Requirements**: 8/8 compliant (R1–R8 of the delta).
- **Scenarios**: 15/15 — 13 COMPLIANT at verify time, 1 N/A (R1 "Raw SQL fallback preserves contract" — fallback not exercised; the primary bulk-upsert CSV path succeeded and the fallback is documented in the README), 1 previously PARTIAL (**R5S3 — resolved post-verify**, see below).
- **Post-verify fix (R5S3, already applied)**: the WARNING was a documentation gap — the production-load section of `scripts/import-ejercicios/README.md` did not list the 4 original→stripped Cyrillic pairs. Fixed by adding the section **"Nombres cirílicos saneados (desviación aprobada de la capability `ejercicios-import` R6)"** (README L150–162): the 4 pairs table (`sled 45в° …` → `sled 45° …`) referencing `report.flags_cirilicos`. **At close: 0 CRITICAL, 0 WARNING, 0 SUGGESTION pendientes.**
- **DB final (verified)**: 1,324 rows; 1,324 DISTINCT `nombre`; 0 Cyrillic (`LIKE '%в%'`); 0 nulls (`imagen_url`/`instrucciones`); CHECK constraint now accepts 9 groups incl. `brazo`/`core`/`cuello` (David-approved ALTER `ejercicios_muscular_check`, required to unblock run 1); `site_stats.total_exercises` = 1,324 (recomputed by trigger `tr_update_stats_ejercicios` AFTER INSERT OR DELETE); UNIQUE index `ejercicios_nombre_unique`; RLS public SELECT on `ejercicios` ok; bucket `ejercicios` = 0 objects (R7 boundary, media pending a later change); `imagen_url` 1,324/1,324 = raw dataset GIF URLs (hasaneyldrm repo).
- **Tests**: `npx vitest run` → 14 files / 89 tests PASS, exit 0 (independent re-run at verify, unchanged by the doc-only fix).
- **R8 — No push/deploy**: respected. Repo HEAD = `8f2507a` (pre-apply commit); no new commits were created by the apply phase; `scripts/import-ejercicios/README.md` + this change folder remain uncommitted local changes. **Push/deploy pending David's explicit approval — NOT performed, and this archive performed NO VCS operations.**
- **Non-Goals respected**: no media upload / `imagen_url` swap; no app/runtime code changes (doc-only change: README); no payload contract changes; no deploy.

## Executed Load (summary)

8 group iterations in ascending-risk order (cuello→cardio→hombros→pecho→core→espalda→piernas→brazo) via `insforge_bulk-upsert` with `upsertKey: nombre` (CSV RFC4180 input; the JSON path is rejected by the MCP — documented deviation, same contract, md5 byte-exact gates). Cumulative counts 2/31/174/337/506/709/995/1,324 all confirmed. Cyrillic strip applied at slice generation (`SANITIZE_CYRILLIC=true`, 4 names, 0 collisions). The load ran twice (run 1 blocked by the legacy CHECK, run 2 completed after the approved ALTER) with no duplicates — idempotency confirmed.

## Artifacts (traceability)

| Artifact | Engram observation | File (now archived) |
|----------|--------------------|---------------------|
| exploration | #368 | `exploration.md` |
| proposal | #369 | `proposal.md` |
| spec | #370 | `spec.md` |
| design | #371 | `design.md` |
| tasks | #372 | `tasks.md` |
| apply-progress | #373 | `apply-progress.md` |
| verify-report | #376 | `verify-report.md` |
| archive-report | this topic (`sdd/ejercicios-import-carga/archive-report`) | `archive-report.md` |

Context-only (NOT edited): Engram #374 (discovery — legacy CHECK blocker) and #375 (session summary) are historical context for this change.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `ejercicios-import` | Updated | `openspec/specs/ejercicios-import/spec.md` — merged the load-execution delta as requirements **R8–R15** (delta R1–R8, renumbered for global uniqueness; mapping delta R1→R8, R2→R9, R3→R10, R4→R11, R5→R12, R6→R13, R7→R14, R8→R15; scenario text preserved verbatim). Header note updated; the script-only "Executing inserts" Non-Goal marked superseded; merge-time accuracy note added to R13 (incoming FK `rutinas_ejercicios_ejercicio_id_fkey` exists — full rollback safe today only while `rutinas_ejercicios` holds 0 rows, per verify SUGGESTION 1). The Cyrillic load deviation was already documented in the main spec header (2026-08-02 note); R12 now carries the requirement text. |

## Worktree Restos (pre-existing, NOT this change — untouched)

- `.atl/.skill-registry.cache.json`, `.atl/skill-registry.md` — modified (skill-registry tooling auto-update)
- `coverage/` — untracked (previous vitest --coverage run)
- `openspec/changes/ejercicios-schema-dataset/verify-report.md` — untracked (another change)
- `openspec/changes/ejercicios-import-script/` — deleted-from-tracked + re-added under `openspec/changes/archive/2026-08-02-ejercicios-import-script/` (pre-existing move from the previous archive, uncommitted)
- `openspec/specs/ejercicios-import/` — untracked (main spec created by the previous archive; now updated by this archive)

## Next Recommended

1. **David's explicit approval** of the smoke test + assumptions (iteration order, Cyrillic strip) → then commit/push/deploy of `scripts/import-ejercicios/README.md` and the openspec archive (R8 gate).
2. **Media upload change** (R7/R14 boundary): upload GIFs to bucket `ejercicios` and swap `imagen_url` from dataset URLs to InsForge storage — separate change consuming `media-manifest.json`.
3. **US-082** (Motor de Recomendación de Rutinas) — the in-progress story that depends on the now-populated `ejercicios` catalog.

## Risks

- **R8 gate open**: push/deploy are pending David's approval; the README doc change and this archive are uncommitted local changes until then.
- **Rollback FK nuance**: full `DELETE FROM ejercicios` is safe today (0 referencing rows in `rutinas_ejercicios`); if routines reference these exercises before a rollback, the FK would block deletion (noted in merged R13).
- **Ephemeral gates**: `/tmp` slices and md5 checksums are gone (disposable by design) — md5 gates are not re-runnable; the DB is the source of truth.
- **MCP uploader quirk**: `insforge_bulk-upsert` rejects JSON arrays (`INSERT has more expressions than target`); the canonical input is CSV RFC4180 — documented in the README.

## Skill Resolution

`none` — no skill registry lookup needed; the orchestrator launched this phase with the explicit `sdd-archive` skill.
