# Tasks: Ejercicios Import Script (Transform + Dry-Run)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~325-365 (script 230-260 + diccionario ~60 + README ~35-45) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (3 work-unit commits) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | diccionario.json + import-ejercicios.mjs (pipeline 0-5) | PR 1 | `node -e "import('./scripts/import-ejercicios/diccionario.json',{with:{type:'json'}}).then(m=>{if(Object.keys(m.default).length!==50)process.exit(1)})"` | `node scripts/import-ejercicios/import-ejercicios.mjs` (real dataset, default path, exit 0) | `git revert` WU1; delete output dir |
| 2 | README.md (uso + verificación + no-inserts) | PR 1 | N/A — docs only; no executable behavior to test | N/A — no runtime boundary; read-and-follow doc | `git revert` WU2 |
| 3 | Golden-run verification (report/payload/manifest assertions + determinism + exit codes) | PR 1 (evidence, no commit) | double run: `diff -r /tmp/opencode/davefit-dataset/output{1,2}` + `sha256sum` per file; report asserts via `node -e` | real dataset run; exit-code matrix on synthetic fixtures in /tmp | N/A — only /tmp artifacts, no repo changes |

## Phase 1: Foundation (Dictionary + Ingest)

- [x] T1 Create `scripts/import-ejercicios/diccionario.json` — flat 50-entry EN→ES map, exact terms/UTF-8 accents from design; synonyms collapse to one canonical ES value. Done: 50 unique keys, union of dataset terms ⊆ keys.
- [x] T2 Create `scripts/import-ejercicios/import-ejercicios.mjs` — ESM, `node:fs`/`node:path` only; parse `--dataset`/`--output` → `DAVEFIT_DATASET`/`DAVEFIT_OUTPUT` → defaults (`/tmp/opencode/davefit-dataset/exercises.json`, `.../output/`). Stage 0: missing/unreadable file → error naming exact path, exit 1 (R1).
- [x] T3 Stage 1 ingest — `readFileSync` + `JSON.parse` in try/catch; invalid JSON → error naming path + parse message, exit 1; non-array payload → exit 1.

## Phase 2: Core Pipeline (Transform → Emit → Validate)

- [x] T4 Stage 2 transform (R2) — inline 10→8 category map (unknown → raw value + WARN count, non-fatal); diccionario lookup for `target`→`musculo_objetivo`, `muscle_group`→`musculos_primarios:[es]`, `secondary_muscles`→`musculos_secundarios` or `[]` (R5 empty-array); untranslated term → WARN non-fatal; `descripcion`/`instrucciones` from `instructions.es`/`instruction_steps.es` (missing → null); `imagen_url` = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/` + `gif_url`; `video_url`/`creado_por` null (D4); drop `equipment`/`id`.
- [x] T5 Stage 3 dedupe (R3) — file-order scan; repeated `nombre` → ` - 2`, ` - 3`…; collect `{nombre_original, nombre_final}` renames.
- [x] T6 Stage 4 emit (R4/R5, D7) — `mkdir -p` output; write `payload.json` (1324 × exactly-10-key objects), `media-manifest.json` (media_id, nombre, imagen_url, `url_futura_insforge` `https://insforge.tesh.online/api/storage/buckets/ejercicios/objects/{media_id}.gif`, attribution `© Gym visual — https://gymvisual.com/`; NO video_url), `report.json` (full shape, `por_grupo_muscular` keys sorted); all `JSON.stringify(x, null, 2) + "\n"`.
- [x] T7 Stage 5 validation + exit (R6) — assert NOT NULL coverage `nombre`/`grupo_muscular`/`imagen_url` = 1324/1324/1324, post-dedupe uniqueness, `imagen_url` `https://` prefix, text[] shape, count 1,324 → structural violation exit 1; WARNs (untranslated/unknown categories, Cyrillic `в` flags only, never corrected) → exit 0. No timestamps/random (R7).

## Phase 3: Verification (Golden-Run, no vitest — D8)

- [x] T8 Golden run — `node scripts/import-ejercicios/import-ejercicios.mjs` on real dataset; assert report `total:1324`, `renombres:6`, `flags_cirilicos:5`, `terminos_sin_traducir:[]`, `categorias_desconocidas:[]`, `checks_not_null` all 1324, `exit_code:0` (R6 scenario).
- [x] T9 Shape + determinism — payload: 1324 objects, each exactly the 10 keys (R5); manifest: 1324 entries × 5 keys; run twice into separate dirs → `diff -r` empty + identical `sha256sum` per file (R7 byte-identity).
- [x] T10 Exit-code matrix (R1) — missing dataset path → exit 1 naming path; truncated/invalid JSON → exit 1; WARN-only run → exit 0.

## Phase 4: Documentation + Cleanup

- [x] T11 Create `scripts/import-ejercicios/README.md` — run commands (flags/env/defaults), outputs described, verification procedure, no-inserts warning (non-goals).
- [x] T12 Add `.gitignore` line `scripts/import-ejercicios/output/` (optional safeguard, non-blocking per design Open Questions).

### Implementation Order

T1→T3 (foundation), then T4→T7 (pipeline in stage order), then T8→T10 (verification), then T11→T12 (docs/cleanup). WU1 = T1-T7 (+T12); WU2 = T11; WU3 = T8-T10 (evidence only). Commits: `feat: ejercicios — script de import (transform + dry-run) con diccionario ES` (T1-T7, T12), `docs: ejercicios — README de verificación de import-ejercicios` (T11), golden-run evidence reported in apply (no commit — outputs live in /tmp).
