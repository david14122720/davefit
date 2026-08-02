# Ejercicios Import Specification

> New capability spec for change `ejercicios-import-script`. All requirements ADDED (no prior spec). Implements the `ejercicios-catalog` import contract (R4/R6) without duplicating it.

## Purpose

Deterministic dataset→`ejercicios` transform contract for a zero-dependency Node ESM script: maps the 1,324-record hasaneyldrm dataset to the 13-column `ejercicios` schema and emits a bulk-upsert payload, media manifest, and dry-run report.

## Non-Goals

- Executing inserts (run + probe → execution iteration)
- Media upload or `imagen_url` swap to InsForge storage
- Deploy; schema changes (13 columns fixed)
- Correcting the 5 Cyrillic-corrupted names (flagged only)
- `equipment` mapping (no schema column — dropped by design)
- UI, API, or product code

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
- THEN the report shows 1,324 records, 0 unmapped, 0 untranslated, 6 renames, 5 Cyrillic flags, per-category counts

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
