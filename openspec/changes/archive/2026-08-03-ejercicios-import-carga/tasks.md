# Tasks: ejercicios-import-carga — Load 1,324 exercises in 8 group-based iterations

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~40–60 (README doc only; 0 runtime code) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | No PR chain: data execution (MCP) + 1 doc change |
| Delivery strategy | auto-chain |
| Chain strategy | pending (N/A — data-only, no chain) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 (T0) | Slice prep + sanitize | N/A — /tmp only | `node …/davefit-dataset/slice-gen.mjs` → 8 counts | Real `payload.json` → slices | /tmp disposable |
| 2 (T1–T9) | 8-iteration load + smoke | N/A — DB data | Cumulative `SELECT count(*)` per iteration | Real `insforge_bulk-upsert` on `ejercicios` | `DELETE FROM ejercicios` / per-slice |
| 3 (T10) | README doc | N/A — minor doc | `git diff --stat` ~40–60 lines | Manual review | README revert |

## Phase 1: Preparation

- [x] T0 — Verify payload intact (1,324; groups match `report.json` 2/29/143/163/169/203/286/329); confirm `ejercicios` = 0 rows, `site_stats.total_exercises` = 0. Create `/tmp/davefit-dataset/output/slices/`; write ad-hoc `slice-gen.mjs` (design source, `SANITIZE_CYRILLIC=true`, 10 keys, never committed). **Done** only when 8 slices exist with counts 2/29/143/163/169/203/286/329; 4 Cyrillic names stripped (`sled 45в°…`→`sled 45°…`), 0 collisions (1,324 unique).

## Phase 2: Load — one task per iteration (gate blocks advance)

Each: `insforge_bulk-upsert(table:"ejercicios", filePath:"…/slices/<g>.json", upsertKey:"nombre")`; fallback = `fallback-<g>.sql` (`INSERT … ON CONFLICT (nombre) DO UPDATE`) if MCP rejects. Verify after each: `SELECT grupo_muscular, count(*)::int FROM ejercicios GROUP BY 1` + 2-row sample. Gate: group + cumulative equal Cumulative col → next; mismatch blocks (idempotent re-run; counts only, never `updated_at`). Skip-done without verification.

- [x] T1 — cuello (2): probe; cum 2.
- [x] T2 — cardio (29): cum 31.
- [x] T3 — hombros (143): cum 174.
- [x] T4 — pecho (163): cum 337.
- [x] T5 — core (169): cum 506.
- [x] T6 — espalda (203): cum 709.
- [x] T7 — piernas (286, holds 4 sanitized): cum 995; sample shows `sled 45° …`, no Cyrillic.
- [x] T8 — brazo (329): cum 1,324.

## Phase 3: Final Smoke — T9 (R8 gate; NO push/deploy)

- [x] T9 — Final gate SQL: `count(*)`=1,324; `site_stats.total_exercises`=1,324; per-group matrix intact; Cyrillic `LIKE '%в%'`=0; `count(DISTINCT nombre)`=1,324. Sample: non-null `instrucciones` (len>0) + `imagen_url` = dataset GIF. RLS: public SELECT on `ejercicios` ok. Bucket `ejercicios` = 0 objects (R7). Threat Push-state: assert clean worktree + `git log` unchanged (apply ran no VCS). STOP — present smoke + 3 assumptions to David; push/deploy only after explicit approval.

## Phase 4: Documentation — T10

- [x] T10 — Update `scripts/import-ejercicios/README.md`: load procedure (slice-gen command, 8-iteration table + cumulative gates, verification SQL, SQL fallback, rollback full/slice, Cyrillic deviation: 4 original→stripped names ref. `report.flags_cirilicos`, idempotency note). Doc-only; helper stays in /tmp; no repo code edits.