# Exploration: ejercicios-import-script

> Change: create the import script (transform + dry-run validation) for the hasaneyldrm exercises-dataset (1,324 exercises) targeting the `ejercicios` table. NO inserts, NO media upload in this change — the script produces the bulk-upsert payload and prepares the media structure for a later migration iteration.

## Current State (verified, not assumed)

### Target table `ejercicios` (verified via InsForge MCP `get-table-schema`)
- 13 columns exactly: `id` uuid PK default gen_random_uuid(), `nombre` text NOT NULL UNIQUE (`ejercicios_nombre_unique`), `descripcion` text NULL, `grupo_muscular` text NOT NULL, `musculo_objetivo` text NULL, `musculos_primarios` text[] DEFAULT '{}', `musculos_secundarios` text[] DEFAULT '{}', `imagen_url` text NOT NULL, `video_url` text NULL, `instrucciones` text[] NULL, `creado_por` uuid NULL, `created_at`/`updated_at` default now().
- Indexes: `ejercicios_pkey`, `ejercicios_nombre_unique`, `idx_ejercicios_grupo` (btree on grupo_muscular).
- RLS: public SELECT + admin ALL (via perfiles.rol='admin'); project_admin ALL. **0 rows.**
- Frontend contract (`src/app/lib/ejerciciosApi.ts`): `descripcion?: string`, `instrucciones?: string[]` — matches text/text[] mapping.

### Buckets (verified via `insforge_list-buckets`)
- `ejercicios` exists, **public: true**. Others: avatares, profiles, videos, yoga public; progreso private.
- `FileUpload.tsx` already defaults `bucket='ejercicios'`, `folder='uploads'` — future upload code must not collide with admin-uploaded keys (`uploads/*`).

### Dataset `data/exercises.json` (verified: fetched 17.4 MB to /tmp/opencode/davefit-dataset/, 1,324 records, list)
Fields per record: `id` (str, e.g. "0001"), `name`, `category`, `body_part`, `equipment`, `instructions` {10 langs incl. es}, `instruction_steps` {es: string[]}, `muscle_group`, `secondary_muscles` (list, 1324/1324), `target`, `image` ("images/0001-2gPfomN.jpg"), `gif_url` ("videos/0001-2gPfomN.gif"), `media_id` ("2gPfomN"), `created_at`, `attribution`.

Cardinalities:

| field | unique | values (count) |
|---|---|---|
| category (= body_part) | 10 | upper arms 292, upper legs 227, back 203, waist 169, chest 163, shoulders 143, lower legs 59, lower arms 37, cardio 29, neck 2 |
| target | 19 | abs 169, pectorals 158, biceps 151, glutes 144, delts 143, triceps 141, upper back 88, lats 81, calves 59, quads 44, forearms 37, cardiovascular system 29, hamstrings 28, spine 19, traps 15, adductors 6, serratus anterior 5, abductors 5, levator scapulae 2 |
| muscle_group | 29 | shoulders 191, forearms 165, biceps 164, triceps 161, hamstrings 127, quadriceps 110, glutes 71, obliques 67, hip flexors 66, chest 53, trapezius 36, traps 32, deltoids 24, calves 11, ankles 11, core 7, lower back 6, rotator cuff 4, soleus 4, rhomboids 2, wrist flexors 2, latissimus dorsi 2, abdominals 2, + 6×1 |
| equipment | 28 | body weight 325, dumbbell 294, cable 157, barbell 154, leverage machine 81, band 54, smith machine 48, kettlebell 41, weighted 36, stability ball 28, ez barbell 23, assisted 15, sled machine 15, medicine ball 13, rope 10, roller 8, resistance band 7, bosu ball 3, olympic barbell 2, wheel roller 2, + 8×1 |
| secondary_muscles | 40 terms | union with target+muscle_group = **50 unique terms** |

Verified data quality:
- `instructions.es` present 1324/1324, min length 50+ chars (max 990). `instruction_steps.es` present 1324/1324 (list of sentences).
- **6 duplicate names** (each a pair → 6 records need suffix): `barbell seated calf raise`, `ez barbell spider curl`, `lever chest press`, `push-up (on stability ball)`, `self assisted inverse leg curl`, `smith reverse calf raises`.
- **6 names with non-ASCII chars**: `45° side bend`; 5 "sled 45в° …" names with Cyrillic `в` corruption (`sled 45в° calf press`, `sled 45в° leg press`, `sled 45в° leg press (back pov)`, `sled 45° leg press (side pov)`, `sled 45в° leg wide press`).
- `id` unique 1324/1324; `media_id` unique 1324/1324 → safe object-key namespace.
- Media: 1324 jpg (`images/…`), 1324 gif (`videos/…`), both served raw with HTTP 200 (`https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/{image|gif_url}`), content-type image/jpeg + image/gif. License: data/text MIT; **media © Gym visual 180×180, attribution `© Gym visual — https://gymvisual.com/` must be kept** (per-record `attribution` field).
- R6 category map covers all 10 categories; dataset has no `full_body` → R6 satisfied (never emitted).

### Scripting environment
- Node v24.17.0 (global fetch), repo `"type": "module"`. No `tsx`/`ts-node` in devDeps. Existing script `scripts/create-admin.ts` is plain TS run ad hoc (npx tsx) — but adding zero dependencies is possible with plain Node ESM.
- InsForge storage URL pattern (from storage-sdk docs, NOT Supabase's `/storage/v1/object/public/`): `https://insforge.tesh.online/api/storage/buckets/{bucket}/objects/{key}`. `upload()` returns `{url, key}` and **auto-renames on key collision** — upload code must use the returned key.
- `insforge_bulk-upsert` MCP: `{table, filePath, upsertKey?}` — JSON or CSV file. Format contract not documented in fetched docs; assume JSON array of objects, verify at execution time with a tiny probe or doc check.

## Affected Areas
- `scripts/import-ejercicios/` — new directory (script + dictionaries + outputs). No existing code touched.
- `openspec/changes/ejercicios-import-script/` — this change's artifacts.
- DB/API/frontend: **not touched** (import JSON is consumed later via MCP; media upload is a future iteration).

## Approaches

1. **Runtime: pure Node ESM script (`.mjs`, zero new deps)** vs `.ts` via npx tsx vs python3 script
   - Node: Pros: zero deps, global fetch + node:fs, repo already `type: module`; Cons: none material (Node ≥18 required — env has 24)
   - tsx: Pros: typed; Cons: new devDependency, npx download at run time
   - python3: Pros: stdlib json; Cons: second language in a TS repo, team context mismatch
   - **Effort: Low** — recommend Node `.mjs`.

2. **Dictionary location: separate JSON files** vs inline constants in the script
   - Separate `muscle-translations.json` (50 entries) + inline category map (10 entries, R6 contract constant): Pros: reviewable diff, reusable by the media iteration, dry-run can diff keys; Cons: one more file
   - All inline: Pros: single file; Cons: 80+ lines of data pollute the logic
   - **Effort: Low** — recommend separate JSON for translations, inline for the category map.

3. **`imagen_url` value in the emitted payload** (media NOT uploaded this iteration)
   - A) raw.githubusercontent GIF URL (external, verified 200, works immediately; R4 delete-safety scenario explicitly anticipates dataset URLs): Pros: functional catalog on day one, zero media work; Cons: external dependency (raw serving is stable but not contractual), attribution must be preserved
   - B) computed future InsForge URL (`…/api/storage/buckets/ejercicios/objects/{media_id}.gif`): Pros: final state; Cons: broken images until the upload iteration runs
   - **Effort: Low** — recommend A + emit `media-manifest.json` carrying B (paths + future URLs) for the upload iteration to swap via UPDATE.

## Recommendation

- `scripts/import-ejercicios/`:
  - `import-ejercicios.mjs` — pure Node ESM, zero deps, run via `node scripts/import-ejercicios/import-ejercicios.mjs [--dataset path|url]`; also writes outputs.
  - `muscle-translations.json` — 50-entry ES dictionary (see below).
  - category map inline (R6 constant: chest→pecho, back→espalda, upper legs/lower legs→piernas, upper arms/lower arms→brazo, shoulders→hombros, waist→core, cardio→cardio, neck→cuello; full_body never emitted).
- **Pipeline stages**:
  0. **Ingest**: read local JSON or fetch raw URL (17.4 MB — stream/load into memory, do not commit to repo); optional cached copy in `output/dataset-cache.json`.
  1. **Transform** (per record): category→grupo_muscular (R6); name dedupe (6 pairs → append `- 2`, deterministic, sorted); muscle translations: target→musculo_objetivo, muscle_group→musculos_primarios [1 element], secondary_muscles→musculos_secundarios (each translated; synonyms normalized); descripcion = instructions.es full; instrucciones = instruction_steps.es; imagen_url = raw GIF URL; video_url omitted (NULL); creado_por omitted.
  2. **Dry-run validate** against the 13-column schema contract: NOT NULL coverage (nombre, grupo_muscular, imagen_url), name uniqueness after suffixing, every category mapped (R6), every muscle term translated (report missing keys), text[] shape, URL format; counts + per-category breakdown.
  3. **Emit**: `output/ejercicios-import.json` (~1.8 MB, JSON array, keys = column names, ready for `insforge_bulk-upsert` with `upsertKey: nombre`), `output/media-manifest.json` (id, media_id, sourceJpgUrl, sourceGifUrl, targetKey `{media_id}.jpg|.gif`, futureInsforgeUrl, attribution), `output/dry-run-report.txt`.
- **Media structure (no upload)**: object keys `{media_id}.jpg` / `{media_id}.gif` at bucket root (media_id unique 1324/1324; no collision with `uploads/*` admin keys). Future public URL: `https://insforge.tesh.online/api/storage/buckets/ejercicios/objects/{media_id}.gif`. Upload iteration (out of scope) = fetch source → `storage.from('ejercicios').upload(key, blob)` → UPDATE imagen_url with returned `url`.
- **upsertKey: `nombre`** — matches the UNIQUE index; re-runs update instead of duplicating. Dataset `id` is NOT the DB id (uuid default applies; omit from payload).
- `equipment` is **not stored** (schema has no column) — dropped by design; note in dry-run report.

### Translation dictionary structure (design input)
- 50 unique terms (19 target + 29 muscle_group + 40 secondary, union). Synonym clusters to normalize per term (design decides final Spanish): abs/abdominals/lower abs; delts/deltoids/rear deltoids; traps/trapezius; lats/latissimus dorsi; quads/quadriceps; pectorals/chest/upper chest; calves/soleus; forearms/wrist flexors/wrist extensors/wrists/grip muscles; ankles/ankle stabilizers/feet/shins.
- Recommend flat JSON `{ "english term": "español" }`, lowercase keys, one entry per unique term (50), with a `_synonyms` optional section — dry-run fails on any untranslated term.

## Risks
- **Payload/format contract of `insforge_bulk-upsert`**: JSON array shape, upsertKey semantics, and per-call size limits are undocumented in fetched docs. Mitigate: emit file per MCP convention; verify with a 3-row probe before the real run (execution iteration, not this change); ~1.8 MB single file is likely fine (file-based, not HTTP body).
- **Cyrillic-corrupted names** (5 "sled 45в° …"): stored as-is (valid text); flagged in dry-run. Auto-fixing is out of scope (would create `sled 45° leg press` — currently unique, so safe later if wanted).
- **External media dependency**: raw.githubusercontent URLs are stable but not contractual; acceptable per R4 (external-GIF delete safety already handled by the API). Media iteration must keep the © Gym visual attribution.
- **NOT NULL columns**: nombre/grupo_muscular/imagen_url always populated by construction (verified present 1324/1324) — dry-run asserts it.
- **Re-run semantics**: upsert by nombre; renamed duplicates keep `- 2` suffix — stable across runs as long as transform is deterministic (sort order fixed).
- **Dataset 17.4 MB fetch**: one-time; keep cache out of git (`.gitignore` output/ or cache dir).
- **Line budget**: estimated ~300–360 authored lines (script ~220–260, translations JSON ~70–90, category map inline ~10) → **Medium** risk vs the 400-line review budget; tests (+80–100) could push it over. Recommend sdd-tasks plan a tight script (helpers, no over-engineering) or split JSON data file out of the diff count if needed.

## Line Estimate (forecast input)
| file | lines |
|---|---|
| import-ejercicios.mjs | 220–260 |
| muscle-translations.json | 70–90 |
| (category map inline) | ~10 |
| **total authored** | **~300–360** (+ optional unit tests 80–100 → ~380–460) |

## Ready for Proposal
Yes — decisions needed by proposal/design: (1) final Spanish terms + synonym normalization in the 50-entry dictionary, (2) confirm `imagen_url` = raw GitHub GIF URL in the payload (recommend A), (3) confirm upsertKey `nombre`, (4) whether to fix the 5 Cyrillic names (recommend: no, flag only).
