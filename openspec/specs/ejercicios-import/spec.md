# Ejercicios Import Specification

> Main capability spec for `ejercicios-import` (source of truth), merged from change `ejercicios-import-script` at archive (2026-08-02). All requirements ADDED (no prior spec). Implements the `ejercicios-catalog` import contract (R4/R6) without duplicating it.
>
> **Merged from change `ejercicios-import-carga` (2026-08-03)**: the load-execution contract was ADDED as requirements R8–R15 (delta R1–R8 of that change, renumbered for global uniqueness — mapping: delta R1→R8, R2→R9, R3→R10, R4→R11, R5→R12, R6→R13, R7→R14, R8→R15; scenario text preserved verbatim). The "Executing inserts" Non-Goal of the script-only spec is superseded by R8–R15. The change executed the load on 2026-08-02: 1,324 rows live (verified at close: 0 Cyrillic, 0 nulls, CHECK 9 groups, `site_stats.total_exercises`=1,324).

## Purpose

Deterministic dataset→`ejercicios` transform contract for a zero-dependency Node ESM script: maps the 1,324-record hasaneyldrm dataset to the 13-column `ejercicios` schema and emits a bulk-upsert payload, media manifest, and dry-run report.

## Non-Goals

- Executing inserts — **superseded**: load execution is now specified in R8–R15 (change `ejercicios-import-carga`, merged 2026-08-03); this Non-Goal applied while the spec covered the transform script alone
- Media upload or `imagen_url` swap to InsForge storage
- Deploy; schema changes (13 columns fixed)
- Correcting the 4 Cyrillic-corrupted names (flagged only)
- `equipment` mapping (no schema column — dropped by design)
- UI, API, or product code

> **Verified deviation (2026-08-02, per verify W1 and first scan `[\u0400-\u04FF]`)**: the real dataset contains **4** names with Cyrillic U+0432 `в` (`sled 45в° calf press`, `sled 45в° leg press`, `sled 45в° leg press (back pov)`, `sled 45в° leg wide press`), not 5. The other two degree-marked names (`45° side bend`, `sled 45° leg press (side pov)`) use U+00B0 degree sign — not Cyrillic. The script reports the dataset reality (4 flags) and never corrects names (R6).
>
> **Load-phase deviation (2026-08-02, change `ejercicios-import-carga` R5)**: the load execution strips U+0432 `в` from those 4 names at insert time (verified collision-free vs the other 1,320), superseding the "as-is, never corrected" behavior for the load phase only. The transform script (this capability) still flags-as-is; the capability Non-Goal above refers to the script scope. Traceability stays in `report.flags_cirilicos`.

## Requirements

### Requirement: R1 — Dataset Ingest

The script MUST read a local `exercises.json` from a CLI-configurable path, defaulting to `/tmp/opencode/davefit-dataset/exercises.json`; a missing or unreadable file MUST exit non-zero with a clear error naming the path.

#### Scenario: Default path loads

- GIVEN the default path holds 1,324 records
- WHEN run without a path flag
- THEN all records load and the run continues

#### Scenario: Missing file

- GIVEN the configured path does not exist
- WHEN run
- THEN a clear error names the path and the run exits non-zero

### Requirement: R2 — Transform to `ejercicios` Shape

The script MUST map `category`→`grupo_muscular` via the 10→8 map (chest→pecho, back→espalda, upper legs/lower legs→piernas, upper arms/lower arms→brazo, shoulders→hombros, waist→core, cardio→cardio, neck→cuello; never `full_body`); translate `target`→`musculo_objetivo`, `muscle_group`→`musculos_primarios` (1-element array), `secondary_muscles`→`musculos_secundarios` EN→ES via the 50-entry dictionary with synonym normalization (traps/trapezius, quads/quadriceps, delts/deltoids); set `descripcion`=`instructions.es`, `instrucciones`=`instruction_steps.es`; drop `equipment`.

#### Scenario: Full mapping

- GIVEN a record with category `chest`, target `pectorals`, muscle_group `chest`
- WHEN transformed
- THEN `grupo_muscular=pecho`, `musculo_objetivo=pectorales`, `musculos_primarios=[pecho]`, `descripcion`/`instrucciones` from the `es` fields

#### Scenario: Synonym normalization

- GIVEN terms such as `traps` or `quads`
- WHEN translated
- THEN one canonical ES term per cluster is emitted

#### Scenario: Unknown category is non-fatal

- GIVEN a category absent from the 10-entry map
- WHEN transformed
- THEN the record is emitted with the raw category plus a WARN with count; the run completes

### Requirement: R3 — Duplicate Name Dedupe

Identical `nombre` values MUST be deterministically suffixed `- 2` (then `- 3`, …); renames MUST appear in the report.

#### Scenario: Duplicate pair renamed

- GIVEN two records named `push-up (on stability ball)`
- WHEN transformed
- THEN the second becomes `push-up (on stability ball) - 2`

### Requirement: R4 — Media Manifest

Each record MUST produce a manifest entry with `media_id`, source GIF URL, `imagen_url`, future InsForge URL `…/api/storage/buckets/ejercicios/objects/{media_id}.gif`, and preserved `© Gym visual — https://gymvisual.com/` attribution. `video_url` MUST be omitted (NULL).

#### Scenario: Entry with attribution

- GIVEN a record with `media_id=2gPfomN`, `gif_url=videos/0001-2gPfomN.gif`
- WHEN the manifest is written
- THEN the entry carries media_id, source GIF URL, imagen_url, future InsForge URL, attribution, and no `video_url` key

### Requirement: R5 — Bulk-Upsert Payload

The payload MUST be a JSON array ready for `insforge_bulk-upsert` (`upsertKey: nombre`), conforming to the 13-column contract: `id`/`created_at`/`updated_at` omitted (DB defaults), `creado_por`/`video_url` NULL, muscle fields translated, empty arrays as `[]`, `imagen_url` = raw GIF URL.

#### Scenario: Exact key set

- GIVEN a transformed record
- THEN its object contains exactly `nombre`, `descripcion`, `grupo_muscular`, `musculo_objetivo`, `musculos_primarios`, `musculos_secundarios`, `imagen_url`, `video_url`, `instrucciones`, `creado_por`

#### Scenario: Empty array shape

- GIVEN a record with no secondary muscles
- THEN `musculos_secundarios` is `[]`, not null

### Requirement: R6 — Dry-Run Validation

The script MUST validate 1,324 records; NOT NULL coverage (`nombre`, `grupo_muscular`, `imagen_url`); 100% category mapping; untranslated terms as WARN with counts; Cyrillic names flagged, not corrected; per-category summary. The report MUST include counts, renames, category breakdown, `equipment` note, and attribution.

#### Scenario: Report on real dataset

- GIVEN the full dataset with all 50 terms translated and 10 categories mapped
- THEN the report shows 1,324 records, 0 unmapped, 0 untranslated, 6 renames, 4 Cyrillic flags (verified dataset count — see deviation note above), per-category counts

#### Scenario: Untranslated term WARN

- GIVEN a term missing from the dictionary
- WHEN validation runs
- THEN the report lists the term with its count as a WARN and the run completes

#### Scenario: Cyrillic flag only

- GIVEN a name containing `в` (e.g., `sled 45в° leg press`)
- THEN the name is imported as-is, flagged, and never corrected

### Requirement: R7 — Determinism and Idempotency

Same input MUST produce byte-identical outputs (no timestamps or random hashes). Re-running MUST be safe: upsert by `nombre` updates instead of duplicating.

#### Scenario: Re-run identical

- GIVEN the same dataset file
- WHEN run twice
- THEN payload, manifest, and report are byte-identical

#### Scenario: Idempotent upsert

- GIVEN rows already upserted by `nombre`
- WHEN the payload is applied again
- THEN no duplicate rows are created; existing rows update

---

## Load Execution Requirements

> Added at archive of change `ejercicios-import-carga` (2026-08-03). Delta numbering R1–R8 → canonical R8–R15 here.

### Requirement: R8 — Bulk Load Mechanism

The load MUST populate `ejercicios` via `insforge_bulk-upsert` with `upsertKey: nombre`, one JSON slice per `grupo_muscular`, across 8 iterations in ascending-risk order (cuello→cardio→hombros→pecho→core→espalda→piernas→brazo). Slices MUST be generated ad hoc in `/tmp/opencode/davefit-dataset/output/` and never committed. If bulk-upsert is unavailable or rejects a slice, the operator MUST fall back to documented raw SQL `INSERT … ON CONFLICT (nombre) DO UPDATE` per group.

#### Scenario: Slice upsert loads exact group

- GIVEN `payload-hombros.json` containing 143 records
- WHEN bulk-upsert runs with `upsertKey: nombre`
- THEN `SELECT count(*) … WHERE grupo_muscular='hombros'` returns 143 (or, on fallback, the raw-SQL path yields the same set)

#### Scenario: Raw SQL fallback preserves contract

- GIVEN the MCP uploader is unavailable
- WHEN the documented `INSERT … ON CONFLICT` fallback runs per group
- THEN each resulting row matches its payload object (same columns, unique `nombre`)

### Requirement: R9 — Progressive Iteration Gate

Each iteration MUST report a cumulative count that matches `report.json` per-group expected totals (cuello 2, cardio 29, hombros 143, pecho 163, core 169, espalda 203, piernas 286, brazo 329 → total 1,324). Execution MUST NOT advance to the next iteration until the running cumulative count equals the expected value.

#### Scenario: Probe iteration (cuello)

- GIVEN iteration 1, slice `cuello` with 2 records
- WHEN the upsert completes
- THEN `cuello` count = 2, cumulative = 2, and the sequence proceeds to cardio (31)

#### Scenario: Count mismatch blocks next iteration

- GIVEN after iteration 5 the tallied `core` count is 168 (expected 169)
- WHEN the cumulative gate is evaluated
- THEN the next iteration MUST NOT start; the slice is re-run/fixed until counts match

### Requirement: R10 — Post-Iteration and Final Verification

After each iteration the operator MUST verify `SELECT grupo_muscular, count(*) FROM ejercicios GROUP BY 1` plus a sample of rows (`SELECT nombre, grupo_muscular, musculo_objetivo, musculos_primarios[1] … LIMIT 3`). After iteration 8 the final gate MUST be `SELECT count(*) = 1,324` AND `site_stats.total_exercises = 1,324` (recomputed by the statement trigger).

#### Scenario: Sample shows real content

- GIVEN a group slice was just loaded
- THEN the sample rows return Spanish `descripcion`/`instrucciones`, a translated `musculo_objetivo`, and the dataset `imagen_url`

#### Scenario: Final gate passes

- GIVEN all 8 iterations completed
- THEN `count(*)` equals 1,324 and `site_stats.total_exercises` equals 1,324

### Requirement: R11 — Idempotent Re-run / Resume

Re-running any slice MUST NOT create duplicates: upsert keys on UNIQUE `nombre`. Correctness MUST be judged by counts, never by `updated_at` (the trigger bumps it on every UPDATE even if content is unchanged).

#### Scenario: Re-run does not duplicate

- GIVEN slice `brazo` already upserted (329 rows present)
- WHEN the same slice is bulk-upserted again
- THEN total `brazo` count stays 329 — no duplicates; timestamps may change

#### Scenario: Mid-iteration failure resumes

- GIVEN iteration 6 failed after `espalda` partially wrote
- WHEN the slice file is re-run
- THEN upsert completes the remaining rows and the cumulative count matches expected (709), with no orphan rows

### Requirement: R12 — Cyrillic-Corrupted Name Sanitization

The load MUST strip U+0432 `в` from exactly the 4 flagged names (`sled 45в° leg press`, `sled 45в° leg press (back pov)`, `sled 45в° leg wide press`, `sled 45в° calf press`), producing valid names (`sled 45° …`) verified collision-free against the other 1,320 names; the strip is stored in the report trace (`report.flags_cirilicos` kept). This is a declared one-time deviation from capability `ejercicios-import` R6 (*Cyrillic flag only* / import as-is) — the transform script still flags-as-is; correction happens at load. (See the verified deviation note in the header of this spec.)

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

### Requirement: R13 — Rollback

Rollback MUST be safe at any stage: per-slice `DELETE FROM ejercicios WHERE nombre IN (SELECT nombre FROM slice)` (slice JSON), or full `DELETE FROM ejercicios`. Re-running a slice after rollback MUST restore the expected count — a wipe is never forced when the operator wants to keep finished slices.

> **Merge-time accuracy note (2026-08-03, per verify SUGGESTION 1)**: the delta's "(no FKs)" claim is imprecise — an incoming FK `rutinas_ejercicios_ejercicio_id_fkey` exists, but `rutinas_ejercicios` holds 0 rows, so full rollback is safe today only while no routine references these exercises.

#### Scenario: Full rollback restores pre-state

- GIVEN the table has 1,324 loaded rows
- WHEN `DELETE FROM ejercicios` executes
- THEN count = 0 and `site_stats.total_exercises` recomputes to 0 (harmless; load can restart)

#### Scenario: Single-slice rollback

- GIVEN only `hombros` should be re-done
- WHEN the slice delete runs on its 143 names
- THEN only those rows vanish and the other 7 groups remain intact

### Requirement: R14 — No Media Upload

The load MUST NOT upload GIFs to the public `ejercicios` bucket (0 objects stays) and MUST keep `imagen_url` pointing at the raw dataset URL (`https://…/exercises-dataset/main/videos/*.gif`). Media swap is a later, separate change.

#### Scenario: Bucket untouched

- GIVEN the 8 iterations complete
- THEN bucket `ejercicios` still lists 0 objects, and loaded rows all carry dataset URLs in `imagen_url`

### Requirement: R15 — No Push/Deploy Without Approval

Nothing MUST be pushed or deployed until the smoke test passes AND the user (David) explicitly approves (iteration order + Cyrillic strip assumptions confirmed in proposal question round). After approval, push/deploy proceed separately.

#### Scenario: Gate before publish

- GIVEN all gates passed after the smoke test
- WHEN no explicit user approval has been given
- THEN `git push`/deploy do not run; the load doc stays local and traceable
