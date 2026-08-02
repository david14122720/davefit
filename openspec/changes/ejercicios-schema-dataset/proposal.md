# Proposal: Ejercicios Schema & Dataset Alignment

## Intent

Align the `ejercicios` catalog schema with the exercise dataset (1,324 items) to unblock the US-082 recommendation engine and the future bulk import. `nivel`/`tipo_lugar` are per-routine concepts (routines keep theirs) — wrong on a pure catalog. The catalog lacks the muscle-group columns the dataset provides. Table has 0 rows → lossless ALTER.

## Scope

**In**: DB ALTER — drop `nivel`, `tipo_lugar` (idx `idx_ejercicios_nivel` drops with column); add `musculo_objetivo` text, `musculos_primarios` text[], `musculos_secundarios` text[] (nullable, no form UI yet). Frontend: remove `nivel`/`tipo_lugar` from `Ejercicio` interface, admin form fields/table columns/mobile badges/filter/`nivelOptions`; fix `AdminRutinasPage.tsx:574`; add `cuello` to vocabulary (fitness.ts + admin options); remove orphan `tipoLugarOptions`. Optional: delete dead `Ejercicio` interface in `types/index.ts`.

**Out**: Bulk import script (schema stays ready for it); form UI for the 3 new columns; WorkoutPracticePage player changes; `rutinas` table; server API (`[...slug].ts` passthrough).

## Capabilities

- **New**: `ejercicios-catalog` — exercise catalog schema contract: columns, muscle-group vocabulary (incl. `cuello`), media fields (`imagen_url`/`video_url`), compatibility with dataset mapping
- **Modified**: None (no existing spec; `nutrition` untouched)

## Approach

One coordinated change (single PR + deploy window): SQL ALTER via InsForge MCP + frontend edits together. RLS and triggers don't reference dropped columns (verified) → immune. Media mapping A (validated): `gif_url → imagen_url` — `<img>` animates GIFs, WorkoutPracticePage untouched; `video_url` stays for real videos; admin form already edits both (FileUpload + free URL). Dataset `muscle_group` (string) → `musculos_primarios` as 1-element text[]. `full_body` kept for manual exercises only. Safety net = TS compiler (`astro check`); verify `npx vitest run` baseline first (pre-existing Vitest config issue).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| DB `ejercicios` (InsForge) | Modified | ALTER: −nivel/−tipo_lugar (+idx), +3 columns |
| `src/app/lib/ejerciciosApi.ts` | Modified | Interface: −2 fields, +3 |
| `src/app/pages/AdminEjerciciosPage.tsx` | Modified | Form/table/badges/filter, +`cuello` option |
| `src/app/pages/AdminRutinasPage.tsx` | Modified | :574 `{ejercicio.nivel}` → grupo_muscular only |
| `src/constants/fitness.ts` | Modified | +`cuello` in grupoIcons; −tipoLugarOptions |
| `src/types/index.ts` | Modified (optional) | Remove dead `Ejercicio` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Deploy coupling: frontend sends dropped columns → 400 PostgREST | Med | Same change + deploy window (Dokploy app + MCP migration) |
| TS break at AdminRutinasPage:574 | Med | Fixed in same change; build catches it |
| Dataset/DB naming drift (target, muscle_group) | Low | Column names locked now; mapping documented in spec |
| Pre-existing Vitest config issue masks failures | Low | Baseline run before change; compiler as safety net |

## Rollback Plan

0 rows → fully lossless. Frontend: revert PR (`git revert`). DB: `ALTER TABLE ejercicios ADD COLUMN nivel text NOT NULL, ADD COLUMN tipo_lugar text NOT NULL; CREATE INDEX idx_ejercicios_nivel ...;` then drop the 3 new columns. Revert both together if the coordinated deploy partially fails.

## Dependencies

- InsForge MCP (admin) for migration execution
- US-082 spec as consumer of the new muscle columns

## Success Criteria

- [ ] Schema verified: 2 columns gone, 3 added, idx dropped
- [ ] `npm run build` passes
- [ ] Admin POST/PUT ejercicio returns 200
- [ ] `cuello` selectable in admin form; icon renders
- [ ] WorkoutPracticePage renders dataset GIF via `imagen_url`
- [ ] Baseline vitest still green
