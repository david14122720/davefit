# Proposal: Ejercicios Dataset Import Script (Transform + Dry-Run)

## Intent

Create a deterministic one-shot tool that transforms the hasaneyldrm exercises-dataset (1,324 records) into a validated `ejercicios`-shaped bulk-upsert payload plus a media manifest, ready for a later migration iteration. This is developer tooling, not product code: **no inserts, no media upload, no deploy** in this change.

## Scope

### In Scope
- `scripts/import-ejercicios/import-ejercicios.mjs` — pure Node ESM, zero deps
- `scripts/import-ejercicios/muscle-translations.json` — 50-entry EN→ES dictionary (target 19 ∪ muscle_group 29 ∪ secondary 40) with synonym normalization (traps/trapezius, quads/quadriceps, delts/deltoids…)
- Dry-run validation against the 13-column `ejercicios` schema contract
- 3 outputs: `output/ejercicios-import.json` (bulk-upsert, `upsertKey: nombre`), `output/media-manifest.json`, `output/dry-run-report.txt`

### Out of Scope
- Executing inserts (incl. the 3-row probe → execution iteration)
- Media upload / `imagen_url` swap
- Deploy (DB/API/frontend untouched)
- Fixing 5 Cyrillic `в`-corrupted names (flag in report only)
- `equipment` (no schema column — dropped by design, noted in report)

## Capabilities

### New Capabilities
- `ejercicios-import`: dataset→`ejercicios` transform contract — R6 category map (never emits `full_body`), ES dictionary, dedupe (`- 2` suffix, deterministic), `descripcion` = `instructions.es`, `instrucciones` = `instruction_steps.es`, `imagen_url` = raw GIF URL; dry-run assertions (NOT NULL, uniqueness, R6 coverage, translation coverage, text[] shape, URL format); artifact shapes; re-run semantics (upsert by `nombre`)

### Modified Capabilities
- None (`ejercicios-catalog` R4/R6 unchanged — this script implements them)

## Approach

Pipeline, deterministic and sorted:
0. **Ingest** — local JSON path or fetch raw URL (17.4 MB; cache outside git)
1. **Transform** — per record: category→`grupo_muscular` (R6); name dedupe; muscle translations (`target`→`musculo_objetivo`, `muscle_group`→`musculos_primarios` [1 element], `secondary_muscles`→`musculos_secundarios`); `descripcion`/`instrucciones`; `imagen_url` = raw GIF; omit `video_url`/`creado_por`/dataset `id`
2. **Dry-run validate** — schema contract checks; fail on untranslated term or unmapped category
3. **Emit** — 3 artifacts; report includes counts, category breakdown, renames, Cyrillic flags, attribution

Media structure (no upload): object keys `{media_id}.jpg|.gif` at bucket root (media_id unique 1324/1324, no collision with admin `uploads/*`); future InsForge URL `https://insforge.tesh.online/api/storage/buckets/ejercicios/objects/{media_id}.gif` carried in manifest; © Gym visual attribution preserved per record.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/import-ejercicios/` | New | script + dictionary + `output/` (gitignored) |
| `openspec/changes/ejercicios-import-script/` | Modified | proposal.md, future specs/design |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `insforge_bulk-upsert` format contract undocumented | Med | 3-row probe in execution iteration, not this change |
| External raw.githubusercontent media dependency | Med | R4 delete-safety handles external URLs; manifest enables future swap |
| ~300–360 authored lines vs 400 review budget | Med | Tight script; translation JSON counts as data, not logic |
| Re-run drift | Low | Deterministic transform + upsert by `nombre` |

## Rollback Plan

No DB writes → nothing to roll back. Delete `output/` + `git revert` the script commit.

## Dependencies

- Node ≥18 (env: v24.17.0); dataset raw URL (MIT data; media © Gym visual)
- InsForge storage URL pattern (manifest only, no API calls)

## Success Criteria

- [ ] Dry-run: 1,324 records, 0 unmapped categories, 0 untranslated terms, 6 renames + 5 Cyrillic flags reported
- [ ] Payload keys match the 13-column contract exactly; dataset `id` omitted (uuid default)
- [ ] Re-run produces byte-identical outputs
- [ ] media-manifest covers 1,324 jpg + gif with attribution
- [ ] Zero inserts, zero media uploads, zero DB/API/frontend changes
