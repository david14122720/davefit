# Apply Progress: Ejercicios Schema & Dataset Alignment

Status: COMPLETED — all tasks done, RED→GREEN cycle closed.

## Phase 1: Database Migration (R1) — DONE

- 1.1 Baseline: `npx vitest run` = **79/79 pass** (11 files), zero pre-existing failures.
- 1.2 ALTER executed via InsForge MCP `run-raw-sql` (clean, 0 rows):
  ```sql
  DROP INDEX IF EXISTS idx_ejercicios_nivel;
  ALTER TABLE ejercicios
    DROP COLUMN IF EXISTS nivel,
    DROP COLUMN IF EXISTS tipo_lugar,
    ADD COLUMN IF NOT EXISTS musculo_objetivo text,
    ADD COLUMN IF NOT EXISTS musculos_primarios text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS musculos_secundarios text[] DEFAULT '{}';
  ```
  (Adapted from design with `IF EXISTS`/`IF NOT EXISTS` for idempotency.)
- 1.3 `get-table-schema('ejercicios')`: exactly **13 columns** — id (uuid PK, default gen_random_uuid), nombre (NOT NULL, UNIQUE), descripcion, grupo_muscular (NOT NULL), musculo_objetivo, musculos_primarios (text[]), musculos_secundarios (text[]), imagen_url (NOT NULL), video_url, instrucciones (array), creado_por, created_at, updated_at. No `nivel`/`tipo_lugar`/`idx_ejercicios_nivel`. RLS (3 policies) + triggers (`handle_updated_at`, `update_site_stats`) unchanged. 0 rows.

## Phase 2: Frontend Contract (R2) — DONE

- 2.1 `src/app/lib/ejerciciosApi.ts`: `Ejercicio` drops `nivel`/`tipo_lugar`; adds `musculo_objetivo?: string | null`, `musculos_primarios?: string[] | null`, `musculos_secundarios?: string[] | null`.
- 2.2 `src/app/pages/AdminEjerciciosPage.tsx`: removed `nivelOptions`, form fields/defaults, `e.nivel` search filter, payload keys, thead "Lugar"/"Nivel", tbody cells, mobile nivel badge, both form selects; import narrowed to `{ grupoIcons }`. `grupoMuscularOptions` now ends with `'cuello'`.
- 2.3 `src/app/pages/AdminRutinasPage.tsx:574`: picker subtitle now `{grupo_muscular}` only. Grep confirms zero `ejercicio.nivel`/`ejercicios.nivel` references in `src/` (remaining `nivel` refs are rutinas/yoga/profile — out of scope).

## Phase 3: Vocabulary & Cleanup (R3) — DONE

- 3.1 `src/constants/fitness.ts`: `grupoIcons` gains `cuello: '🦒'`; orphan `tipoLugarOptions` deleted (only consumer was AdminEjerciciosPage); `nivelColors` kept (yoga admin pages use it).
- 3.2 AdminEjerciciosPage group select offers `cuello` (test-verified).
- 3.3 `src/types/index.ts`: grep confirmed zero imports of `Ejercicio`/`Rutina`/`RutinaEjercicio`/`RutinaConEjercicios` (app uses rutinasApi's own interfaces). **Extended beyond task scope**: deleted the entire dead block (Rutina/RutinaEjercicio/RutinaConEjercicios included) because `RutinaEjercicio` references `Ejercicio` — partial removal would break compilation. All surviving types/imports verified (`Perfil`, `XpCalculation`, `UserStats`, `HistorialEntrenamiento`, `FormField`, `AdminFormData`, `AdminCrudTableProps`, `InsforgeClient`).

## Phase 4: Verification — DONE

- 4.1 Compile gate: `npm run typecheck` = 16 TS errors — **identical to HEAD baseline (16), zero new** (all pre-existing: AuthContext/InsforgeAuthShape, admin-auth.ts, stats.ts, YogaPracticePage, AcercaDePage, test files). `npm run build` = **Complete** (Astro SSR, sitemap OK).
- 4.2 `npx vitest run` = **89/89 pass** (14 files) — 79 baseline + 10 new tests, no regression.
- 4.3 Evidence (R4/R5 checklist for sdd-verify):
  - 13-col schema confirmed via MCP.
  - POST/PUT payload asserted in test: `'nivel' in payload === false`; no `tipo_lugar` key.
  - `cuello` option present in group select (test-verified), `grupoIcons.cuello === '🦒'`.
  - AdminRutinasPage picker shows group only — test asserts no 'intermedio'/'•'.
  - Search by "intermedio" now returns empty (nivel filter gone); search by group still works.

## TDD evidence

- RED: 10 new tests across 3 files → 8 failed / 2 passed (failures exactly the spec'd behavior gaps).
- GREEN: same 10 tests → 10/10 pass after production edits.
- New test files: `src/constants/fitness.test.ts` (3), `src/app/pages/AdminEjerciciosPage.test.tsx` (6), `src/app/pages/AdminRutinasPage.test.tsx` (1).

## Notes / deviations

- Design SQL made idempotent with `IF EXISTS`/`IF NOT EXISTS` (per apply instructions).
- 3.3 extended to full dead Rutina block — see above; flagged in design open-questions, verified zero imports.
- Post-deploy smoke (admin POST/PUT with muscle fields) left to sdd-verify against the deployed environment.
