# Design: Ejercicios Dataset Import Script (Transform + Dry-Run)

## Technical Approach

Zero-dependency Node ESM script (`scripts/import-ejercicios/`) that reads the hasaneyldrm dataset (1,324 records, default `/tmp/opencode/davefit-dataset/exercises.json`), transforms each record to the 13-column `ejercicios` shape (R2), dedupes names (R3), validates (R6), and emits 3 deterministic artifacts (R7) for a later execution iteration: `payload.json` (bulk-upsert, `upsertKey: nombre`), `media-manifest.json` (future InsForge URLs + attribution, R4), `report.json`. No inserts, no media upload, no DB/API/frontend changes. Implements R1–R7 of `spec.md`.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| D1 | Runtime | Node `.mjs` (zero deps) vs `npx tsx` TS vs python3 | Node `.mjs` | Repo is `"type": "module"`, Node v24 present, `node:fs` covers everything; no new devDependency; matches explore recommendation |
| D2 | Dictionary file | separate `diccionario.json` vs inline constants | Separate JSON, flat `{en: es}`, 50 entries | Reviewable diff, reusable by media iteration, dry-run diffs coverage; no `_synonyms` section — the flat map IS the normalization (several EN terms → same ES value) |
| D3 | `imagen_url` value | A) raw.githubusercontent GIF URL vs B) computed future InsForge URL | A in payload + B in manifest | Raw URL works on day one (verified HTTP 200); R4 delete-safety anticipates dataset URLs; manifest carries the future URL for the upload iteration to swap via UPDATE |
| D4 | `video_url`/`creado_por` | omit keys vs emit `null` | Emit keys with `null` | R5 "Exact key set" scenario lists all 10 keys — "omitido" means unmapped (NULL), not absent |
| D5 | Payload record order | dataset file order vs sorted | Dataset file order | R7 guarantees byte-identity for identical input; order is stable for a given file; simplest |
| D6 | Dedupe suffixing | by file order vs sorted-by-name | File order (first occurrence keeps name, next get `- 2`, `- 3`…) | Deterministic for identical input (R7); the 6 known pairs resolve identically every run |
| D7 | JSON output format | `JSON.stringify(obj, null, 2) + "\n"` | Fixed indent, trailing newline | Deterministic byte-identity; human-reviewable |
| D8 | Unit tests | vitest test of transform vs documented manual golden-run validation | Manual golden-run | Vitest discovers only `src/**/*.{test,spec}.{ts,tsx}`; script lives in `scripts/` outside the pattern — adding tests would break repo convention or inflate the 400-line budget. Validation = real-dataset run + assertion checks + double-run byte-diff (see Testing) |
| D9 | Cyrillic names | fix vs flag only | Flag only, never correct | Spec R6 "Cyrillic flag only"; auto-fix is out of scope per Non-Goals |

## Data Flow

```
exercises.json (1,324) ──► Stage 0/1: exists? + JSON.parse
        │
        ▼
Stage 2: transform per record (category→grupo_muscular, ES translate, descripcion/instrucciones, imagen_url=raw GIF)
        │
        ▼
Stage 3: dedupe (suffix "- 2"…, rename list)
        │
        ▼
Stage 4: emit  ──► payload.json  (10-key objects, upsertKey: nombre)
        │        ├── media-manifest.json (media_id, raw GIF, future URL, attribution)
        │        └── report.json (counts, renames, WARNs, Cyrillic flags, NOT NULL checks)
        ▼
Stage 5: dry-run validations ──► exit 0 (WARNs ok) | exit 1 (structural failure only)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/import-ejercicios/import-ejercicios.mjs` | Create | Main script: CLI parsing, pipeline stages 0–5, all output writers. Zero deps (`node:fs`, `node:path`) |
| `scripts/import-ejercicios/diccionario.json` | Create | 50-entry flat EN→ES dictionary (exact terms from the real dataset, see Dictionary) |
| `scripts/import-ejercicios/README.md` | Create | How to run, what it produces, verification procedure, no-inserts warning |
| `openspec/changes/ejercicios-import-script/design.md` | Create | This document |
| `.gitignore` | Modify (optional) | Add `scripts/import-ejercicios/output/` safeguard if output is ever pointed inside the repo (default output is outside git) |

## Interfaces / Contracts

### CLI

```
node scripts/import-ejercicios/import-ejercicios.mjs [--dataset <path>] [--output <dir>]
```

- `--dataset` (or env `DAVEFIT_DATASET`): input JSON path. Default `/tmp/opencode/davefit-dataset/exercises.json`.
- `--output` (or env `DAVEFIT_OUTPUT`): output dir. Default `/tmp/opencode/davefit-dataset/output/` (auto-created).
- Exit codes: `0` on success (WARNs allowed), `1` on structural failure only (missing/unreadable dataset, invalid JSON, non-array payload, record missing `nombre`/`grupo_muscular`/`imagen_url` after transform).

### Payload record (R5 — exactly these 10 keys, DB defaults for `id`/`created_at`/`updated_at`)

```json
{
  "nombre": "push-up (on stability ball) - 2",
  "descripcion": "<instructions.es full text>",
  "grupo_muscular": "pecho",
  "musculo_objetivo": "pectorales",
  "musculos_primarios": ["pecho"],
  "musculos_secundarios": [],
  "imagen_url": "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0001-2gPfomN.gif",
  "video_url": null,
  "instrucciones": ["<instruction_steps.es sentence>", "…"],
  "creado_por": null
}
```

### Media manifest entry (R4)

```json
{
  "media_id": "2gPfomN",
  "nombre": "<transformed nombre>",
  "imagen_url": "<raw GIF URL, same as payload>",
  "url_futura_insforge": "https://insforge.tesh.online/api/storage/buckets/ejercicios/objects/2gPfomN.gif",
  "attribution": "© Gym visual — https://gymvisual.com/"
}
```

### report.json shape

```json
{
  "total": 1324,
  "por_grupo_muscular": { "pecho": 163, "…": "…" },
  "renombres": [{ "nombre_original": "barbell seated calf raise", "nombre_final": "barbell seated calf raise - 2" }],
  "terminos_sin_traducir": [{ "termino": "…", "conteo": 3 }],
  "categorias_desconocidas": ["…"],
  "flags_cirilicos": ["sled 45в° leg press", "…"],
  "checks_not_null": { "nombre": 1324, "grupo_muscular": 1324, "imagen_url": 1324 },
  "unmapped_categories": 0,
  "untranslated_terms": 0,
  "renames_count": 6,
  "cyrillic_flags": 4,
  "nota_equipment": "campo equipment descartado: la tabla ejercicios no tiene columna",
  "attribution": "© Gym visual — https://gymvisual.com/",
  "exit_code": 0
}
```

`por_grupo_muscular` keys sorted alphabetically; WARN arrays empty when clean.

## Pipeline Stages

- **Stage 0 — Validate input**: resolve path (argv flag → env var → default). If missing/unreadable: `console.error` naming the exact path, exit 1 (R1).
- **Stage 1 — Ingest**: `fs.readFileSync` (17.4 MB in memory is fine) + `JSON.parse` in try/catch; invalid JSON → error naming path + parse message, exit 1. Non-array → exit 1.
- **Stage 2 — Transform per record** (R2):
  - `category` → `grupo_muscular` via inline R6 map: `chest→pecho`, `back→espalda`, `upper legs→piernas`, `lower legs→piernas`, `upper arms→brazo`, `lower arms→brazo`, `shoulders→hombros`, `waist→core`, `cardio→cardio`, `neck→cuello`. Unknown category → keep raw value + WARN with count, non-fatal (R2 scenario).
  - `target` → `musculo_objetivo`, `muscle_group` → `musculos_primarios: [es]` (1-element), `secondary_muscles` → `musculos_secundarios: [es…]` or `[]` (R5 empty-array shape). All via `diccionario.json`; untranslated term → WARN, non-fatal.
  - `descripcion` = `instructions.es`; `instrucciones` = `instruction_steps.es`; missing es fields → `null` (defensive; dataset verified 1324/1324).
  - `imagen_url` = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/` + `gif_url` (D3).
  - `video_url: null`, `creado_por: null` (D4); dataset `id` dropped (uuid default); `equipment` dropped (no column, noted in report).
- **Stage 3 — Dedupe** (R3): scan in file order; on repeated `nombre`, append ` - 2`, ` - 3`…; record every rename `{nombre_original, nombre_final}`.
- **Stage 4 — Emit** (R4/R5): `mkdir -p` output dir; write `payload.json`, `media-manifest.json`, `report.json` — all `JSON.stringify(x, null, 2) + "\n"` (D7).
- **Stage 5 — Dry-run + exit** (R6): assert NOT NULL coverage (`nombre`, `grupo_muscular`, `imagen_url` — must be 1324/1324/1324), post-dedupe name uniqueness, `imagen_url` URL format (`https://` prefix), text[] shape, counts vs expected 1,324. Structural violation → exit 1. WARNs (untranslated terms, unknown categories, Cyrillic flags) → exit 0 with report entries.

## Dictionary (`diccionario.json` — 50 entries, exact terms from the real dataset)

```json
{
  "abdominals": "abdominales",
  "abductors": "abductores",
  "abs": "abdominales",
  "adductors": "aductores",
  "ankle stabilizers": "tobillos",
  "ankles": "tobillos",
  "back": "espalda",
  "biceps": "bíceps",
  "brachialis": "braquial",
  "calves": "gemelos",
  "cardiovascular system": "sistema cardiovascular",
  "chest": "pectorales",
  "core": "core",
  "deltoids": "deltoides",
  "delts": "deltoides",
  "feet": "pies",
  "forearms": "antebrazos",
  "glutes": "glúteos",
  "grip muscles": "antebrazos",
  "groin": "ingle",
  "hamstrings": "isquiotibiales",
  "hands": "manos",
  "hip flexors": "flexores de cadera",
  "inner thighs": "parte interna de los muslos",
  "latissimus dorsi": "dorsales",
  "lats": "dorsales",
  "levator scapulae": "elevador de la escápula",
  "lower abs": "abdominales",
  "lower back": "zona lumbar",
  "obliques": "oblicuos",
  "pectorals": "pectorales",
  "quadriceps": "cuádriceps",
  "quads": "cuádriceps",
  "rear deltoids": "deltoides posteriores",
  "rhomboids": "romboides",
  "rotator cuff": "manguito rotador",
  "serratus anterior": "serrato anterior",
  "shins": "espinillas",
  "shoulders": "hombros",
  "soleus": "gemelos",
  "spine": "columna vertebral",
  "sternocleidomastoid": "esternocleidomastoideo",
  "trapezius": "trapecios",
  "traps": "trapecios",
  "triceps": "tríceps",
  "upper back": "espalda alta",
  "upper chest": "pectorales",
  "wrist extensors": "antebrazos",
  "wrist flexors": "antebrazos",
  "wrists": "antebrazos"
}
```

Synonym clusters normalized to one canonical ES term: abs/abdominals/lower abs→abdominales; delts/deltoids→deltoides; traps/trapezius→trapecios; quads/quadriceps→cuádriceps; pectorals/chest/upper chest→pectorales; calves/soleus→gemelos; forearms/grip muscles/wrist flexors/wrist extensors/wrists→antebrazos; lats/latissimus dorsi→dorsales; ankles/ankle stabilizers→tobillos. Deliberate exceptions for anatomical fidelity: `rear deltoids→deltoides posteriores`, `feet→pies`, `shins→espinillas` (avoids misleading "tobillos"/"deltoides" grouping). Keys lowercase, values UTF-8 (accents preserved — `bíceps` etc. are valid text).

## Determinism (R7)

- No `Date.now`, no `Math.random`, no `crypto.*` — outputs contain no timestamps/hashes.
- Fixed serialization (`JSON.stringify(…, null, 2) + "\n"`), object keys written in literal order, `por_grupo_muscular` keys sorted.
- Dedupe and payload order derive solely from input order → identical input yields byte-identical outputs.
- Re-run safety: upsert by `nombre` (UNIQUE index) updates instead of duplicating; renamed rows keep stable `- 2` suffixes.

## Cyrillic Handling

Names containing `в` (U+0432) are imported as-is, listed in `report.json.flags_cirilicos`, never modified (D9, R6 scenario). **Verified deviation (2026-08-02, byte-level scan `[\u0400-\u04FF]`)**: the real dataset has exactly **4** such names (`sled 45в° calf press`, `sled 45в° leg press`, `sled 45в° leg press (back pov)`, `sled 45в° leg wide press`) — the report emits `cyrillic_flags: 4`. `45° side bend` and `sled 45° leg press (side pov)` use U+00B0 degree sign — valid UTF-8, NOT Cyrillic, never flagged. The script reports the dataset reality and never corrects names.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Golden run | Full pipeline on real dataset | `node scripts/import-ejercicios/import-ejercicios.mjs` → assert report: `total:1324`, `renombres:6`, `flags_cirilicos:4`, `terminos_sin_traducir:[]`, `categorias_desconocidas:[]`, `checks_not_null` all 1324; payload has 1324 objects each with exactly 10 keys; manifest has 1,324 entries |
| Determinism | R7 byte-identity | Run twice; `diff -r` both output dirs → no differences; also `sha256sum` per file |
| Exit codes | R1 structural failures | Missing dataset path → exit 1 + error names path; truncated/invalid JSON file → exit 1; WARN-only run → exit 0 |
| Translation coverage | Dictionary vs dataset | Report's `terminos_sin_traducir` empty proves 50/50 coverage (script self-reports) |
| Dictionary sanity | 50 unique keys | `node -e` assert `Object.keys(diccionario).length === 50` and union of dataset terms ⊆ keys (script does this at runtime) |

No vitest unit tests (D8): script lives outside vitest's `src/**` discovery pattern; manual golden-run validation against the real dataset is the documented procedure (also in README.md). No DB contact: all checks run on emitted files only.

## Line Estimate (vs 400-line review budget)

| file | lines |
|---|---|
| import-ejercicios.mjs | 230–260 |
| diccionario.json | ~60 (data) |
| README.md | ~35–45 |
| **total authored** | **~325–365** |

Budget risk: **Low–Medium** — within 400; dictionary counts as data.

## Threat Matrix

N/A — no routing, shell-command composition, subprocess, VCS/PR automation, or executable-file classification boundary. The script runs standalone under Node, reads two local paths via argv/env, spawns no child processes, and never invokes git.

| Boundary | Applicability |
|----------|---------------|
| Documentation-like paths | N/A — no markdown/README execution; only `.mjs` + `.json` data files |
| Git repository selection | N/A — no git invocation |
| Commit state | N/A — no git invocation |
| Push state | N/A — no git invocation |
| PR commands | N/A — no git/gh invocation |

## Migration / Rollout

No migration and no DB writes in this change — nothing to roll back. Deletion of `output/` + `git revert` of the script commit is the full rollback. Insert/upload happens in the execution iteration consuming these artifacts.

## No-Goals (reiterated)

No inserts (incl. 3-row probe), no media upload, no `imagen_url` swap, no deploy, no schema change, no Cyrillic fixes, no `equipment` mapping, no UI/API/product code.

## Open Questions

- [ ] InsForge `bulk-upsert` file-format contract still undocumented — resolved by a 3-row probe in the execution iteration (not this change).
- [ ] `.gitignore` safeguard line for `scripts/import-ejercicios/output/` — recommended, non-blocking.
