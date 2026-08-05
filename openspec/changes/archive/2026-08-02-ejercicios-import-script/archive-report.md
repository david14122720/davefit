# Archive Report: ejercicios-import-script

**Date**: 2026-08-02
**Change**: `ejercicios-import-script`
**Status**: COMPLETE — archived (intentional full archive, no warnings)
**Mode**: both (Engram + OpenSpec)
**Review gate**: `disabled/unmanaged` — no native review topics exist for this change (`sdd/ejercicios-import-script/review/*` absent from Engram); the verify phase validated its report via `gentle-ai sdd-verify-validate` (valid: true, `pass_with_warnings`, per Engram #365).

## Final State (at close)

- **Tasks**: 12/12 complete (T1–T12; `tasks.md` all `[x]` — Task Completion Gate passed, no stale checkboxes, no reconciliation needed).
- **Requirements**: 7/7 compliant (R1–R7).
- **Scenarios**: 14/14 compliant (2 with note: R6 — report asserts the real dataset count (4), which differed from the spec assumption (5), corrected during this archive; R7 — DB-level idempotency test deferred to the execution iteration by Non-Goals, per verify S1).
- **Golden run**: exit 0 — 1,324 records, 6 renames, 4 Cyrillic flags, 0 untranslated terms, 0 unmapped categories, NOT NULL coverage 1,324×3 (`nombre`, `grupo_muscular`, `imagen_url`).
- **Determinism (R7)**: 3 independent runs byte-identical — sha256 payload `9f262b62…`, manifest `f010e442…`, report `a038a324…` (`diff -r` empty).
- **Suite**: `npx vitest run` 89/89 passed (14 files); `npm run build` exit 0 (pre-existing Vite warnings only).
- **Commits**: `409082e` (feat, 9 files) + `8f2507a` (docs, 1 file) — verified intact via `git log --oneline`; this archive created NO new commits and performed NO push/PR.
- **Non-Goals respected**: no inserts (incl. 3-row probe), no media upload, no `imagen_url` swap, no deploy, no Cyrillic name fixes, no `equipment` mapping, no UI/API/product code.

## Cyrillic Count Correction (5 → 4) — archive-time reconciliation

The planning artifacts assumed 5 names with Cyrillic `в`; a byte-level scan (`[\u0400-\u04FF]`) of the real dataset shows **exactly 4** names with U+0432 `в`: `sled 45в° calf press`, `sled 45в° leg press`, `sled 45в° leg press (back pov)`, `sled 45в° leg wide press`. The other two degree-marked names (`45° side bend`, `sled 45° leg press (side pov)`) use U+00B0 degree sign — not Cyrillic.

Corrected 5 → 4 (with deviation note) in:
- `spec.md` — Non-Goals + R6 "Report on real dataset" scenario (filesystem + Engram #361 updated)
- `design.md` — Cyrillic Handling section + `cyrillic_flags` report example + golden-run test assertion (filesystem + Engram #362 updated)
- `tasks.md` — T8 assertion (filesystem + Engram #363 updated)
- `verify-report.md` — already asserted 4 at verify time (W1); no change needed

The script itself was correct and faithful to the dataset (reports `cyrillic_flags: 4`, never corrects names — R6). Names were never modified. `proposal.md` (#360) and `exploration.md` (#359) retain the original "5" as historical phase snapshots — the orchestrator's correction scope was spec/design/tasks only.

## Artifacts (traceability)

| Artifact | Engram observation | File (now archived) |
|----------|--------------------|---------------------|
| exploration | #359 | `exploration.md` |
| proposal | #360 | `proposal.md` |
| spec | #361 (updated at archive) | `spec.md` |
| design | #362 (updated at archive) | `design.md` |
| tasks | #363 (updated at archive) | `tasks.md` |
| apply-progress | #364 | `apply-progress.md` |
| verify-report | #365 | `verify-report.md` |
| archive-report | this topic (`sdd/ejercicios-import-script/archive-report`) | `archive-report.md` |

Context-only (NOT edited): `sdd/ejercicios-schema-dataset/spec` Engram #353 — the `ejercicios-catalog` capability this change implements (R4/R6).

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `ejercicios-import` | Created | `openspec/specs/ejercicios-import/spec.md` — full capability spec (no prior main spec existed), requirements R1–R7 with corrected Cyrillic count and deviation note. |

## Worktree Restos (pre-existing, NOT this change — untouched)

- `.atl/.skill-registry.cache.json`, `.atl/skill-registry.md` — modified (skill-registry tooling auto-update)
- `coverage/` — untracked (previous vitest --coverage run)
- `openspec/changes/ejercicios-schema-dataset/verify-report.md` — untracked (another change)
- `openspec/changes/ejercicios-import-script/verify-report.md` — untracked at archive time (created by verify after the commits); it is part of this change and was carried into the archive folder by the move.

## Next Recommended

Execution iteration as a **separate change** consuming these artifacts: 3-row probe of `insforge_bulk-upsert` (file-format contract still undocumented), full bulk-upsert with `upsertKey: nombre`, media upload + `imagen_url` swap, and closing R7 idempotency with runtime evidence (verify S1). Inputs: `payload.json`, `media-manifest.json` from `/tmp/opencode/davefit-dataset/output/`.

## Risks

- None blocking at close. The InsForge `bulk-upsert` file-format contract remains undocumented — resolved by the probe in the execution iteration (unchanged since proposal).
