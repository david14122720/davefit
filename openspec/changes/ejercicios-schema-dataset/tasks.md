# Tasks: Ejercicios Schema & Dataset Alignment

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60–75 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (DB ALTER + frontend, one deploy window) |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | ALTER + frontend removal shipped together (R5) | PR 1 (single) | `npm run build` && `npx vitest run` | InsForge MCP `run-raw-sql` + `get-table-schema`; post-deploy admin POST/PUT smoke | Revert PR + rollback SQL together (re-ADD nivel/tipo_lugar + `idx_ejercicios_nivel`) |

## Phase 1: Database Migration (R1)

- [x] 1.1 Baseline: run `npx vitest run`, record pre-existing failures (design step 1) — files: none
- [x] 1.2 Run ALTER via InsForge MCP `run-raw-sql`: `DROP INDEX IF EXISTS idx_ejercicios_nivel; ALTER TABLE ejercicios DROP COLUMN nivel, DROP COLUMN tipo_lugar, ADD COLUMN musculo_objetivo text, ADD COLUMN musculos_primarios text[] DEFAULT '{}', ADD COLUMN musculos_secundarios text[] DEFAULT '{}'` — acceptance: executes clean, 0 rows (table empty)
- [x] 1.3 Verify via MCP `get-table-schema`: exactly 13 columns; no `nivel`/`tipo_lugar`/`idx_ejercicios_nivel`; `nombre` UNIQUE NOT NULL + `grupo_muscular` NOT NULL intact; RLS/triggers unchanged (R1 scenarios)

## Phase 2: Frontend Contract (R2)

- [x] 2.1 `src/app/lib/ejerciciosApi.ts`: drop `nivel`/`tipo_lugar` from `Ejercicio`; add `musculo_objetivo?: string | null`, `musculos_primarios?: string[] | null`, `musculos_secundarios?: string[] | null`
- [x] 2.2 `src/app/pages/AdminEjerciciosPage.tsx`: remove `nivelOptions` (18), local form fields (25–26), defaults (36–37), `e.nivel` filter (73), payload keys (84–85, 111–112), thead "Lugar"/"Nivel" (193–194), tbody cells (221–228), mobile badge (269–271), form selects nivel (350–361) + tipo_lugar (363–375); import only `{ grupoIcons }` (19)
- [x] 2.3 `src/app/pages/AdminRutinasPage.tsx`:574: `{grupo_muscular} • {nivel}` → `{grupo_muscular}` — acceptance: no `ejercicio.nivel` refs remain (grep)

## Phase 3: Vocabulary & Cleanup (R3)

- [x] 3.1 `src/constants/fitness.ts`: add `cuello: '🦒'` to `grupoIcons` (1); delete orphan `tipoLugarOptions` (18 — verified: only AdminEjerciciosPage imported it); keep `nivelColors`
- [x] 3.2 `src/app/pages/AdminEjerciciosPage.tsx`:17: append `'cuello'` to `grupoMuscularOptions` — acceptance: select offers cuello (R3)
- [x] 3.3 `src/types/index.ts`: delete dead `Ejercicio` (59–70, divergent `tipo`/`animacion_url`) after grep confirms zero imports — extended to the full dead block (`Rutina`, `RutinaEjercicio`, `RutinaConEjercicios`, 57–96): all unimported, and `RutinaEjercicio` references `Ejercicio` so partial removal would break compilation

## Phase 4: Verification (R2/R4/R5)

- [x] 4.1 `npm run typecheck` + `npm run build` — compile gate (R2) — 16 pre-existing TS errors in HEAD, identical count after change (0 new); Astro build passes
- [x] 4.2 `npx vitest run` — result identical to baseline (no regression; no test touches these fields) — 79/79 baseline → 89/89 after (+10 new)
- [x] 4.3 Evidence summary: 13-col schema, POST/PUT payload without `nivel` keys, cuello selectable, picker grupo-only (R4/R5 smoke checklist for sdd-verify)
