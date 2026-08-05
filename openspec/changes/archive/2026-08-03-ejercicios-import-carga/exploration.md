# Exploration: ejercicios-import-carga

> Change: execute the real data load of the 1,324-exercise catalog into the InsForge `ejercicios` table, spread across multiple iterations. NO media upload in this change (later). Read-only exploration — verified against live DB and payload artifacts.

**Date**: 2026-08-02
**Artifact store**: both (Engram `sdd/ejercicios-import-carga/explore` + `openspec/changes/ejercicios-import-carga/exploration.md`)

## Current State (verified live, not assumed)

- **Table `ejercicios`** (`insforge_get-table-schema`, verified): 13 columns matching the payload contract exactly — `id uuid PK default gen_random_uuid()`, `nombre text NOT NULL UNIQUE` (`ejercicios_nombre_unique`), `descripcion text`, `grupo_muscular text NOT NULL`, `imagen_url text NOT NULL`, `video_url text`, `instrucciones text[]`, `creado_por uuid`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `musculo_objetivo text`, `musculos_primarios text[] default '{}'`, `musculos_secundarios text[] default '{}'`.
- **Row count today**: **0** (confirmed twice: `get-backend-metadata` recordCount 0 AND `SELECT count(*) FROM public.ejercicios` → `0`). No data present; full table wipe is trivially safe.
- **Indexes**: `ejercicios_pkey`, `ejercicios_nombre_unique` (UNIQUE on nombre — the upsert key), `idx_ejercicios_grupo` (btree on grupo_muscular — iteration criterion is index-backed).
- **RLS**: public SELECT, admin ALL (per `perfiles.rol='admin'`), project_admin ALL. Admin MCP path bypasses RLS.
- **Triggers**: `handle_updated_at()` (BEFORE UPDATE → bumps `updated_at`); `update_site_stats()` (AFTER INSERT/DELETE, statement-level → recomputes `site_stats.total_experancs`). So each batch insert recomputes totals — fine.
- **FKs**: none on `ejercicios` → deleting rows has no referential blockers.
- **Payload** (`/tmp/opencode/davefit-dataset/output/payload.json`, verified): 1,324 records × exactly 10 keys (`nombre`, `descripcion`, `grupo_muscular`, `musculo_objetivo`, `musculos_primarios`, `musculos_secundarios`, `imagen_url`, `video_url:null`, `instrucciones`, `creado_por:null`); `id`/`created_at`/`updated_at` omitted (DB defaults). `imagen_url` = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/*.gif` (HTTP-verified earlier). **1,324 unique `nombre`** (post-dedupe). **Spanish content confirmed** on sample (descripcion 149 chars, instrucciones 5 steps).
- **Report** (`report.json`, verified): total 1,324; per-group → brazo 329, piernas 286, espalda 203, core 169, pecho 163, hombros 143, cardio 29, cuello 2; 6 renames; 0 untranslated; 0 unknown categories; **4 Cyrillic flags**; checks_not_null 1324/1324/1324; exit_code 0.
- **Group slice sizes** (computed from payload, ~KB per group JSON): brazo 329 (451 KB), piernas 286 (401 KB), espalda 203 (284 KB), core 169 (225 KB), pecho 163 (220 KB), hombros 143 (192 KB), cardio 29 (39 KB), cuello 2 (2 KB).
- **Bucket `ejercicios`**: exists, public, **0 objects** (media upload deferred by explicit user requirement).

## Affected Areas

- `scripts/import-ejercicios/import-ejercicios.mjs` — MAY add an optional `--slice <grupo>` mode (or a small companion slice helper) to emit per-group JSON from the existing payload. Small, additive change.
- `scripts/import-ejercicios/README.md` — document the load procedure (iterations, verification SQL, rollback) if the slice mode lands.
- InsForge DB `ejercicios` — data-only change (INSERT/UPDATE via upsert).
- No app/frontend/API code changes anticipated.

## Approaches

1. **`insforge_bulk-upsert` MCP with `upsertKey: nombre`, per-group JSON slice files** — split payload into 8 files (one per grupo_muscular), call once per iteration.
   - Pros: purpose-built tool (filePath + upsertKey), idempotent upsert by UNIQUE nombre; file-based so payload size (max ~450 KB/slice) is trivial; each slice 2–329 rows ≪ common 1,000-row bulk limits; bité-compatible with the payload the transform script already emits.
   - Cons: MCP file format contract undocumented in fetched docs (assumed JSON array of objects — verify with the cuello=2 probe first); depends on MCP availability during apply.
   - Effort: Low.

2. **Raw SQL via `insforge_run-raw-sql` — `INSERT ... ON CONFLICT (nombre) DO UPDATE`** — per-group statement using a JSON `::jsonb` or VALUES list.
   - Pros: full control; upsert in one statement per group; verifiable counts in the same call.
   - Cons: 1,324 large text payloads inline → huge SQL strings; escaping risk (4 descripciones contain single quotes; arrays need `::text[]` casts); admin SQL is "use with caution"; harder to read/verify than file-based.
   - Effort: Medium. Fallback only.

3. **SDK-based Node runner with client-side upsert (`.upsert()`/`.insert on_conflict`)** — Pros: scriptable, re-runnable, can slice in-process.
   - Cons: SDK docs do NOT document an `upsert`/`onConflict` API for this InsForge SDK; undoc'd path = risk; adds a repo script + tests where none are strictly needed.
   - Effort: Medium-High. Not recommended unless MCP proves unusable.

## Recommendation

**Mechanism: `insforge_bulk-upsert` (MCP) with `upsertKey: nombre`, one JSON file per group** (Approach 1). Fall back to raw SQL `INSERT ... ON CONFLICT (nombre) DO UPDATE` only if the MCP tool has a file-format surprise. Before the first real batch, run the tiniest possible probe: cuello's 2 records — it IS the first iteration.

**Iteration structure (8 iterations, group-based, risk-ascending):**

| # | Grupo | Rows | Cumulative | Criterion |
|---|-------|-----:|-----------:|-----------|
| 1 | cuello | 2 | 2 | provable probe; smallest group |
| 2 | cardio | 29 | 31 | 2nd smallest |
| 3 | hombros | 143 | 174 | ascending |
| 4 | pecho | 163 | 337 | ascending |
| 5 | core | 169 | 506 | ascending |
| 6 | espalda | 203 | 709 | ascending |
| 7 | piernas | 286 | 995 | ascending |
| 8 | brazo | 329 | 1,324 | largest last |

Criterion is **group muscular**: the payload report already provides per-group expected counts (verifiable against `report.json`), the DB has `idx_ejercicios_grupo`, each slice stays ≪1000 rows, and verification per iteration is a single `SELECT grupo_muscular, count(*) ... GROUP BY 1` tally. Idempotent: upsert on unique `nombre` means re-running a slice never duplicates.

**Cyrillic names** — 4 names carry a Cyrillic `в` (U+0432): `sled 45в° calf press`, `sled 45в° leg press`, `sled 45в° leg press (back pov)`, `sled 45в° leg wide press`. RECOMMENDATION: **strip the Cyrillic glyph at load time** — verified: removing `в` leaves valid names (`sled 45° leg press`, …) that are **collision-free** against the other 1,320 names (checked `Set`). Alterative: keep as-is (report flags them). Since this is the load change (not the transform change), correcting the user-visible name is in scope; keep `report.flags_cirilicos` for traceability.

**creado_por → NULL (all rows)**: correct — dataset-sourced catalog, no user creator. Frontend type allows null. `video_url → NULL`, `id/created_at/updated_at` → DB defaults. Re-run bumps `updated_at` via trigger — acceptable.

**Payload → files**: no repo change to payload names/location. Slices generated ad hoc in `/tmp/opencode/davefit-dataset/output/` (e.g. `payload-cuello.json`); media/ outputs never committed to git (same convention as transform change).

## Risks

- **MCP bulk-upsert file/format + upsertKey semantics undocumented** — mitigated by the 2-row cuello probe first; fallback raw SQL approach documented.
- **Cyrillic names user-visible** if not stripped — decision needed from user? (Recommended: strip at load; low risk, verified collision-free.)
- **`site_stats` recompute on every batch** (statement trigger) — harmless recompute; verify `total_exercises` reaches 1324 after iteration 8.
- **Idempotency false-positive**: upsert always bumps `updated_at` even when content unchanged — verify counts, not timestamps.
- **Media stays external**: `imagen_url` points to raw.githubusercontent GIF (functional immediately); swapping to the bucket is explicitly a later media change. `media-manifest.json` (486 KB) stays untouched for that phase.
- **No rollback friction**: pre-data (0 rows), `DELETE FROM ejercicios` (or per-slice `WHERE nombre IN (...)`) is the rollback; then re-run slice(s) idempotently.

## Verification / Rollback

- After each iteration: `SELECT grupo_muscular, count(*) AS n FROM ejercicios GROUP BY 1 ORDER BY 2 DESC;` → totals must equal the running expected (report.json per-group counts). Sample 2–3 rows (`SELECT nombre, grupo_muscular, musculo_objetivo, musculos_primarios[1], array_length(instrucciones,1), left(descripcion,60) ... LIMIT 3`).
- After iteration 8: full count 1,324; `site_stats.total_exercises` = 1,324 (trigger).
- Resume: re-run the failed slice file (upsert idempotent).
- Rollback (user unhappy): `DELETE FROM ejercicios WHERE nombre IN (SELECT nombre FROM payload-slice)` for one slice, or full `DELETE FROM ejercicios` (no FKs, table had 0 rows pre-change).

## Testing (unit)

Repo vitest config only includes `src/**/*.{test,spec}.{ts,tsx}` — the previous transform change (D8 in its design) already established that `scripts/` runs outside vitest discovery, validated by golden-run + SQL assertions instead. For this change: **no new vitest unit tests required** if we only add an optional `--group` slice mode to the existing `.mjs` (self-check: re-run golden + per-slice determinism diff). If a separate slice helper lands in `src/` later, then vitest; not needed here. Effort: Low.