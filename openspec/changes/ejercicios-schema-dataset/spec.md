# Ejercicios Catalog Specification

> New capability spec for change `ejercicios-schema-dataset`. All requirements are ADDED (no prior spec exists).

## Purpose

Defines the `ejercicios` catalog contract: final table columns, frontend typing/UI, muscle-group vocabulary (incl. `cuello`), media behavior, and the dataset→vocabulary mapping the future 1,324-item import must honor. Unblocks the US-082 recommendation engine.

## Non-Goals

- Bulk import script and data migration (table has 0 rows; schema stays ready)
- Form UI for `musculo_objetivo` / `musculos_primarios` / `musculos_secundarios`
- Changes to `rutinas` (`nivel`/`tipo_lugar` remain there), server API passthrough (`[...slug].ts`), WorkoutPracticePage player, recommendation engine

## Requirements

### Requirement: R1 — Final Schema Columns

The `ejercicios` table MUST have exactly 13 columns: `id`, `nombre`, `descripcion`, `grupo_muscular`, `musculo_objetivo`, `musculos_primarios`, `musculos_secundarios`, `imagen_url`, `video_url`, `instrucciones`, `creado_por`, `created_at`, `updated_at`.

- Removed: `nivel` (with index `idx_ejercicios_nivel`), `tipo_lugar` (both NOT NULL)
- Added (all nullable): `musculo_objetivo` text, `musculos_primarios` text[], `musculos_secundarios` text[]
- Preserved: `nombre` text NOT NULL UNIQUE (`ejercicios_nombre_unique`); `grupo_muscular` text NOT NULL; `imagen_url` text NOT NULL

#### Scenario: ALTER applied cleanly

- GIVEN the migration runs via InsForge MCP
- THEN `nivel`/`tipo_lugar` and `idx_ejercicios_nivel` no longer exist
- AND the 3 muscle columns exist as nullable
- AND RLS policies and triggers remain unchanged (they reference no dropped column)

#### Scenario: Lossless on empty table

- GIVEN the table has 0 rows
- WHEN the ALTER executes
- THEN no data is lost and rollback is a plain re-ADD of both columns

#### Scenario: Constraints survive

- GIVEN the ALTER has been applied
- THEN `nombre` is still UNIQUE NOT NULL and `grupo_muscular` still NOT NULL

### Requirement: R2 — Frontend Contract

- The `Ejercicio` interface in `src/app/lib/ejerciciosApi.ts` MUST drop `nivel`/`tipo_lugar` and MUST include optional `musculo_objetivo?: string | null`, `musculos_primarios?: string[] | null`, `musculos_secundarios?: string[] | null`.
- `AdminEjerciciosPage` MUST remove the nivel/tipo_lugar form fields, table columns "Lugar"/"Nivel", mobile nivel badge, `e.nivel` search filter, and `nivelOptions`.
- The exercise picker in `AdminRutinasPage` (~line 574) MUST render `{grupo_muscular}` only; the project MUST compile (`npm run build`).
- `tipoLugarOptions` MAY be removed from `src/constants/fitness.ts`; `nivelColors` MUST remain (used by yoga admin).

#### Scenario: Admin creates catalog-only exercise

- GIVEN an admin opens the new-exercise form
- WHEN they submit with only catalog fields (nombre, grupo_muscular, imagen_url)
- THEN the POST payload contains no `nivel`/`tipo_lugar` keys and returns 200

#### Scenario: Compile gate

- GIVEN the interface loses `nivel`
- WHEN `npm run build` runs
- THEN no reference to `ejercicio.nivel` remains (AdminRutinasPage included) and the build passes

### Requirement: R3 — Muscle-Group Vocabulary

The vocabulary MUST be: pecho, espalda, piernas, brazo, hombros, core, cardio, full_body (manual only), and NEW `cuello`. `grupoIcons` in `src/constants/fitness.ts` MUST include `cuello`; admin `grupoMuscularOptions` MUST offer it.

#### Scenario: cuello selectable

- GIVEN an admin edits an exercise
- WHEN opening the `grupo_muscular` select
- THEN `cuello` appears and saving persists `grupo_muscular = 'cuello'`

#### Scenario: Icon renders

- GIVEN an exercise with `grupo_muscular = 'cuello'`
- THEN the UI renders the cuello icon in badges/lists

#### Scenario: full_body is manual-only

- GIVEN the dataset contains no full_body category
- THEN `full_body` remains selectable only via admin form, never via import

### Requirement: R4 — Media Behavior

`imagen_url` (NOT NULL) MUST render animated GIFs via `<img>` (dataset `gif_url` maps here). `video_url` (NULL) MUST remain optional and admin-editable; the player MUST keep current behavior: `<video src={video_url}>` with `<img src={imagen_url}>` fallback when `video_url` is empty.

#### Scenario: Dataset GIF animates

- GIVEN an exercise whose `imagen_url` ends in `.gif`
- THEN the player/biblioteca `<img>` renders it animated — no black screen

#### Scenario: Admin swaps GIF for video

- GIVEN an exercise has an animated `imagen_url` (GIF)
- WHEN the admin sets `video_url`
- THEN the player renders `<video>`; if `video_url` is cleared, it falls back to the `<img>`

#### Scenario: Delete is safe for external GIFs

- GIVEN an `imagen_url` pointing outside storage (dataset URL)
- WHEN the admin deletes the exercise
- THEN the delete endpoint skips storage deletion (safe no-op) and succeeds

### Requirement: R5 — Coordinated Deployment

The DB ALTER and the frontend removal MUST ship in the same change and deploy window (same PR + MCP migration).

#### Scenario: No schema/frontend skew

- GIVEN both deploy together
- THEN admin POST/PUT returns 200 — PostgREST never receives `nivel`/`tipo_lugar` keys after the columns are gone

### Requirement: R6 — Dataset→Vocabulary Mapping (Import Contract)

Future import MUST map: chest→pecho, back→espalda, upper legs/lower legs→piernas, upper arms/lower arms→brazo, shoulders→hombros, waist→core, cardio→cardio, neck→cuello. `full_body` MUST NOT be produced by import. Dataset `muscle_group` → `musculos_primarios` (1-element text[]), `secondary_muscles` → `musculos_secundarios`, `target` → `musculo_objetivo`.

#### Scenario: All dataset categories mapped

- GIVEN the 10 dataset categories
- THEN each maps to an existing vocabulary value (`cuello` included), with no unmapped category

#### Scenario: Import never emits full_body

- GIVEN a category such as chest
- WHEN the importer runs
- THEN it writes `pecho`, never `full_body`
