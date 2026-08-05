---
change: ejercicios-import-carga
domain: ejercicios-import
phase: spec
---

# Delta for Ejercicios Import — DB Load Execution

> Thin delta over capability `ejercicios-import` (R1–R7: transform, payload, dry-run). This change ADDS the load-execution phase only; capability R5 (bulk-upsert payload), R6 (dry-run report), R7 (idempotent upsert) remain the boundary. All requirements ADDED. One point deviation from capability R6 (*Cyrillic flag only*) declared in R5 below.

## Non-Goals

- No media upload / `imagen_url` swap to bucket `ejercicios` (later change).
- No schema, app code, or payload contract changes (payload is spec-conformant, verified).
- No deploy or git push until explicit user approval after the smoke test (R8).

## ADDED Requirements

### Requirement: R1 — Bulk Load Mechanism

The load MUST populate `ejercicios` via `insforge_bulk-upsert` with `upsertKey: nombre`, one JSON slice per `grupo_muscular`, across 8 iterations in ascending-risk order (cuello→cardio→hombros→pecho→core→espalda→piernas→brazo). Slices MUST be generated ad hoc in `/tmp/opencode/davefit-dataset/output/` and never committed. If bulk-upsert is unavailable or rejects a slice, the operator MUST fall back to documented raw SQL `INSERT … ON CONFLICT (nombre) DO UPDATE` per group.

#### Scenario: Slice upsert loads exact group

- GIVEN `payload-hombros.json` containing 143 records
- WHEN bulk-upsert runs with `upsertKey: nombre`
- THEN `SELECT count(*) … WHERE grupo_muscular='hombros'` returns 143 (or, on fallback, the raw-SQL path yields the same set)

#### Scenario: Raw SQL fallback preserves contract

- GIVEN the MCP uploader is unavailable
- WHEN the documented `INSERT … ON CONFLICT` fallback runs per group
- THEN each resulting row matches its payload object (same columns, unique `nombre`)

### Requirement: R2 — Progressive Iteration Gate

Each iteration MUST report a cumulative count that matches `report.json` per-group expected totals (cuello 2, cardio 29, hombros 143, pecho 163, core 169, espalda 203, piernas 286, brazo 329 → total 1,324). Execution MUST NOT advance to the next iteration until the running cumulative count equals the expected value.

#### Scenario: Probe iteration (cuello)

- GIVEN iteration 1, slice `cuello` with 2 records
- WHEN the upsert completes
- THEN `cuello` count = 2, cumulative = 2, and the sequence proceeds to cardio (31)

#### Scenario: Count mismatch blocks next iteration

- GIVEN after iteration 5 the tallied `core` count is 168 (expected 169)
- WHEN the cumulative gate is evaluated
- THEN the next iteration MUST NOT start; the slice is re-run/fixed until counts match

### Requirement: R3 — Post-Iteration and Final Verification

After each iteration the operator MUST verify `SELECT grupo_muscular, count(*) FROM ejercicios GROUP BY 1` plus a sample of rows (`SELECT nombre, grupo_muscular, musculo_objetivo, musculos_primarios[1] … LIMIT 3`). After iteration 8 the final gate MUST be `SELECT count(*) = 1,324` AND `site_stats.total_exercises = 1,324` (recomputed by the statement trigger).

#### Scenario: Sample shows real content

- GIVEN a group slice was just loaded
- THEN the sample rows return Spanish `descripcion`/`instrucciones`, a translated `musculo_objetivo`, and the dataset `imagen_url`

#### Scenario: Final gate passes

- GIVEN all 8 iterations completed
- THEN `count(*)` equals 1,324 and `site_stats.total_exercises` equals 1,324

### Requirement: R4 — Idempotent Re-run / Resume

Re-running any slice MUST NOT create duplicates: upsert keys on UNIQUE `nombre`. Correctness MUST be judged by counts, never by `updated_at` (the trigger bumps it on every UPDATE even if content is unchanged).

#### Scenario: Re-run does not duplicate

- GIVEN slice `brazo` already upserted (329 rows present)
- WHEN the same slice is bulk-upserted again
- THEN total `brazo` count stays 329 — no duplicates; timestamps may change

#### Scenario: Mid-iteration failure resumes

- GIVEN iteration 6 failed after `espalda` partially wrote
- WHEN the slice file is re-run
- THEN upsert completes the remaining rows and the cumulative count matches expected (709), with no orphan rows

### Requirement: R5 — Cyrillic-Corrupted Name Sanitization

The load MUST strip U+0432 `в` from exactly the 4 flagged names (`sled 45в° leg press`, `sled 45в° leg press (back pov)`, `sled 45в° leg wide press`, `sled 45в° calf press`), producing valid names (`sled 45° …`) verified collision-free against the other 1,320 names; the strip is stored in the report trace (`report.flags_cirilicos` kept). This is a declared one-time deviation from capability `ejercicios-import` R6 (*Cyrillic flag only* / import as-is) — the transform script still flags-as-is; correction happens at load.

#### Scenario: No collisions after strip

- GIVEN the 4 flagged names have `в` removed
- WHEN compared (`Set`) against the other 1,320 payload names
- THEN the full 1,324-name set stays unique (0 new collisions) and loads cleanly

#### Scenario: No Cyrillic remains in DB

- GIVEN the full load completed
- WHEN scanning `ejercicios.nombre` for `[\u0400-\u04FF]`
- THEN 0 rows match; the 4 rows carry the stripped names

#### Scenario: Deviation is traced

- GIVEN the load applies the strip
- THEN the load record/log lists the 4 original + stripped names and references `report.flags_cirilicos`

### Requirement: R6 — Rollback

Rollback MUST be safe at any stage: per-slice `DELETE FROM ejercicios WHERE nombre IN (SELECT nombre FROM slice)` (slice JSON), or full `DELETE FROM ejercicios` (no FKs; the table held 0 rows pre-change). Re-running a slice after rollback MUST restore the expected count — a wipe is never forced when the operator wants to keep finished slices.

#### Scenario: Full rollback restores pre-state

- GIVEN the table has 1,324 loaded rows
- WHEN `DELETE FROM ejercicios` executes
- THEN count = 0 and `site_stats.total_exercises` recomputes to 0 (harmless; load can restart)

#### Scenario: Single-slice rollback

- GIVEN only `hombros` should be re-done
- WHEN the slice delete runs on its 143 names
- THEN only those rows vanish and the other 7 groups remain intact

### Requirement: R7 — No Media Upload

The load MUST NOT upload GIFs to the public `ejercicios` bucket (0 objects stays) and MUST keep `imagen_url` pointing at the raw dataset URL (`https://…/exercises-dataset/main/videos/*.gif`). Media swap is a later, separate change.

#### Scenario: Bucket untouched

- GIVEN the 8 iterations complete
- THEN bucket `ejercicios` still lists 0 objects, and loaded rows all carry dataset URLs in `imagen_url`

### Requirement: R8 — No Push/Deploy Without Approval

Nothing MUST be pushed or deployed until the smoke test passes AND the user (David) explicitly approves (iteration order + Cyrillic strip assumptions confirmed in proposal question round). After approval, push/deploy proceed separately.

#### Scenario: Gate before publish

- GIVEN all gates passed after the smoke test
- WHEN no explicit user approval has been given
- THEN `git push`/deploy do not run; the load doc stays local and traceable