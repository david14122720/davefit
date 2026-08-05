# Design: ejercicios-import-carga — Load 1,324 exercises in 8 group-based iterations

> Load execution only. Reads the verified payload (`/tmp/opencode/davefit-dataset/output/payload.json`, 1,324 records × 10 keys) and loads the `ejercicios` table (currently 0 rows) via 8 idempotent group slices. No media upload, no schema change, no push/deploy without David's post-smoke approval (R8). Implements spec R1–R8.

## Technical Approach

Progressive 8-iteration loader: **slice → upsert → verify → gate** per group. Each slice is a standalone JSON file (one per `grupo_muscular`, 2→329 rows) consumed by `insforge_bulk-upsert` with `upsertKey: nombre` (UNIQUE index `ejercicios_nombre_unique` = idempotent upsert). Correctness is judged by **DB counts, never `updated_at`** (trigger always bumps it). Fallback: raw SQL `INSERT … ON CONFLICT (nombre) DO UPDATE` generated from the same slices. The 4 Cyrillic-corrupted names are sanitized at slice time (single point, R5 deviation). Slices live in `/tmp` — nothing is committed.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Slice mechanism: ad-hoc Node helper in `/tmp` vs adding `--slice` mode to `import-ejercicios.mjs` | Touching the golden-run script risks breaking archived transform behavior; helper in `/tmp` is zero-repo-delta, deterministic, disposable | **Ad-hoc helper** `/tmp/opencode/davefit-dataset/slice-gen.mjs` emitted with a 1-line node command; repo script untested toward. README.md documents the procedure (apply-phase doc task). |
| Upsert path: `insforge_bulk-upsert` MCP (file + `upsertKey`) | Purpose-built, idempotent, ~450 KB max slice ≪ limits | **Primary**. Fallback: generated SQL (below). |
| Cyrillic sanitization (R5) | Where? transform (out of slot), load (needs single-point), or SQL (fragile) | **At slice generation** in the helper (`SANITIZE_CYRILLIC=true`); keep `report.flags_cirilicos` for trace. Reversible by regenerating slices with flag=false. |
| Verification | counts vs timestamps | **Counts only.** Cumulative gate per Section 3; final gate `count(*)=1,324` AND `site_stats.total_exercises=1,324`. |
| Iteration order | risk ascending, smallest first | cuello→cardio→hombros→pecho→core→espalda→piernas→brazo (matches spec R1/R2). |

All remaining payload columns map 1:1 onto the table's 10 reusable columns; `id`/`created_at`/`updated_at` are DB-managed and omitted — no leftover "slice" column problem (the "1-2 extra keys" question: **not applicable**, the 10 keys fill every insertable column exactly).

## Data Flow

```
payload.json (1,324 × 10 keys)
   │  slice-gen.mjs (+ Cyrillic strip, 8 group filters)
   ▼
output/slices/{cuello,cardio,hombros,pecho,core,espalda,piernas,brazo}.json
   │  iteration i: insforge_bulk-upsert (upsertKey: nombre)
   ▼
ejercicios (UNIQUE nombre) ── count-gate ──► next slice
   │  final: SELECT count(*)=1324;  site_stats.total_exercises=1324 (trigger)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/import-ejercicios/README.md` | Modify | Append load procedure: slice gen command, 8-iteration table, verification SQL, fallback, rollback (in apply, after approval; doc-only). |
| `/tmp/opencode/davefit-dataset/slice-gen.mjs` | Create (outside repo) | Ad-hoc ESM slice helper (exact source below). Never committed. |
| `/tmp/opencode/davefit-dataset/output/slices/*.json` | Create (outside repo) | 8 slice files; never committed. |

Repo code changes: **none** (transform script untouched; its archive flagged "imports as-is" behavior stays — correction is documented at load).

## Interfaces / Contracts

### Slice helper (write exactly this to `/tmp`, run once)

```js
// slice-gen.mjs — ad-hoc; NOT part of the repo
import fs from 'node:fs';
const OUT = '/tmp/opencode/davefit-dataset/output';
const payload = JSON.parse(fs.readFileSync(`${OUT}/payload.json`, 'utf8'));
const GROUPS = ['cuello','cardio','hombros','pecho','core','espalda','piernas','brazo'];
const SANITIZE_CYRILLIC = true; // R5: strip U+0432 at slice time (deviation declared)
const KEYS = 'nombre,descripcion,grupo_muscular,musculo_objetivo,musculos_primarios,musculos_secundarios,imagen_url,video_url,instrucciones,creado_por';
fs.mkdirSync(`${OUT}/slices`, { recursive: true });
for (const g of GROUPS) {
  let rows = payload.filter(r => r.grupo_muscular === g);
  if (SANITIZE_CYRILLIC) rows = rows.map(r => ({ ...r, nombre: r.nombre.replace(/\u0432/g, '') }));
  const fn = `${OUT}/slices/${g}.json`;
  fs.writeFileSync(fn, JSON.stringify(rows, null, 2) + '\n', 'utf8'); // deterministic, matches script
  const bad = rows.filter(r => Object.keys(r).join(',') !== KEYS)
    || new Set(rows.map(r=>r.nombre)).size !== rows.length
    || rows.some(r => /[\u0400-\u04FF]/.test(r.nombre));
  console.log(g, rows.length, bad ? 'FAIL' : 'ok', '->', fn);
}
```

Contract: slice = JSON array of objects, **exactly 10 keys**, `nombre` edited only when the 4 flagged names appear (all in `piernas`), `video_url`/`creado_por` null, no `id`/`created_at`/`updated_at`. Sanitize = strip U+0432 only (verified: the 4 result `sled 45° …` collide with 0 of the other 1,320 names; full set stays 1,324 unique; degree U+00B0 survives).

### Raw-SQL fallback (generated, not hand-written)

Generate from the slices (deterministic, handles the **4 records containing single quotes**):

```bash
node -e '
import("node:fs").then(fs=>{for(const g of ["cuello","cardio","hombros","pecho","core","espalda","piernas","brazo"]){
const rows=JSON.parse(fs.readFileSync(`/tmp/opencode/davefit-dataset/output/slices/${g}.json`,"utf8"));
const q=s=>`\u0027${String(s).replace(/\u0027/g,"\u0027\u0027")}\u0027`; // double single quotes
const arr=a=>Array.isArray(a)?(`ARRAY[${a.map(q).join(", ")}]::text[]`):"NULL";
const vals=rows.map(r=>`(${q(r.nombre)},${q(r.descripcion)},${q(r.grupo_muscular)},${q(r.musculo_objetivo)},${arr(r.musculos_primarios)},${arr(r.musculos_secundarios)},${q(r.imagen_url)},NULL,${arr(r.instrucciones)},NULL)`).join(",\n  ");
fs.writeFileSync(`/tmp/opencode/davefit-dataset/fallback-${g}.sql`,
`INSERT INTO ejercicios (nombre,descripcion,grupo_muscular,musculo_objetivo,musculos_primarios,musculos_secundarios,imagen_url,video_url,instrucciones,creado_por) VALUES\n${vals}\nON CONFLICT (nombre) DO UPDATE SET descripcion=EXCLUDED.descripcion,grupo_muscular=EXCLUDED.grupo_muscular,musculo_objetivo=EXCLUDED.musculo_objetivo,musculos_primarios=EXCLUDED.musculos_primarios,musculos_secundarios=EXCLUDED.musculos_secundarios,imagen_url=EXCLUDED.imagen_url,video_url=EXCLUDED.video_url,instrucciones=EXCLUDED.instrucciones;\n`);
}})'
```

Run whole file via `insforge_run-raw-sql` (paste `fallback-<g>.sql`); alternate fallback if the MCP POSTGRES path is blocked.

## Execution Runbook (use by sdd-apply, iteration by iteration)

1. Generate slices once: `node /tmp/opencode/davefit-dataset/slice-gen.mjs` → assert 8 files with counts 2,29,143,163,169,203,286,329.
2. Per iteration run in order, gating per row 4:

| # | Slice file | MCP call | Order | Cum. exp. | Fail → next |
|---|---|---|---|---|---|
| 1 | `cuello.json` (2) | `insforge_bulk-upsert(table:"ejercicios", filePath:".../slices/cuello.json", upsertKey:"nombre")` | probe | 2 | block if ≠2 |
| 2 | `cardio.json` (29) | same with `cardio.json` | 2nd smallest | 31 | block if ≠31 |
| 3 | `hombros.json` (143) | …hombros… | ascending | 174 | block if ≠174 |
| 4 | `pecho.json` (163) | …pecho… | ascending | 337 | block if ≠337 |
| 5 | `core.json` (169) | …core… | ascending | 506 | block if ≠506 |
| 6 | `espalda.json` (203) | …espalda… | ascending | 709 | block if ≠709 |
| 7 | `piernas.json` (286, holds the 4 sanitized names after slice gen) | …piernas… | ascending | 995 | block if ≠995 |
| 8 | `brazo.json` (329) | …brazo… | largest last | 1,324 | block if ≠1,324 |

3. Per-iteration verification (after every step):

```sql
SELECT grupo_muscular, count(*)::int AS n FROM ejercicios GROUP BY 1 ORDER BY 2 DESC;
-- matches expected interval; cumulative must equal the row above
SELECT nombre, grupo_muscular, musculo_objetivo, musculos_primarios[1],
       array_length(instrucciones,1) AS pasos, left(descripcion,60)
FROM ejercicios WHERE grupo_muscular='<grupo>' LIMIT 3; -- Spanish content + dataset gif URL
```

Gate: equality with the Cum. exp. column, run re-normalized if mismatch (idempotent — re-running a superset never duplicates; counts are the truth).

4- Final gate (after iteration 8):

```sql
SELECT count(*) FROM ejercicios;              -- 1324
SELECT total_exercises FROM site_stats;       -- 1324 (statement trigger recomputed)
SELECT count(*) FROM ejemplos WHERE nombre LIKE '%в%'; -- 0 Cyrillic left (U+0432 literal)
SELECT count(DISTINCT nombre) FROM ejercicios;-- 1324 (no collisions)
```

## Smoke Test / Gates (before David's approval — R8)

| Gate | Expected | Evidence |
|---|---|---|
| Total rows | 1,324 | `count(*)` |
| Per-group 1–8 | matrix | `GROUP BY 1` |
| Cyrillic | 4 stripped, 0 remaining | `flags_cirilicos` map + `LIKE '%в%'` = 0 |
| Content | Spanish, translated muscle, dataset GIF | sample query |
| Bucket `ejercicios` | 0 objects (media untouched, R7) | `insforge_list-buckets` |
| Deviation trace | 4 original→stripped listed with `report.flags_cirilicos` | load log / README record |

After smoke: **stop**; present results + the 3 assumptions (strip, order, no-push) to David; only on explicit approval push/deploy as separate steps.

## Rollback

- Full: `DELETE FROM ejercicios;` (no FKs; pre-state was 0 rows) → `site_stats` recomputes to 0; restart from iteration 1 idempotently.
- Single slice: `DELETE FROM ejercicios WHERE grupo_muscular='<grupo>';` (equivalent to the slice set; for the exact-name semantics, `DELETE … WHERE nombre IN ((SELECT slice))` via the slice helper's names). Then re-run that slice only.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Data prep | slice counts, 10 keys, no Cyrillic, 1,324 unique | slice-gen self-checks (fail loud) |
| Load | idempotent re-run, cum. gates, resume-after-failure | probe cuello (2) then each gate; re-run a slice twice → count unchanged |
| Final state | count/site_stats/unique/bucket | final gate SQL |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Push state | **Applicable (R8)** | The change ships **no VCS commands**; push/deploy are post-approval steps outside apply; approval recorded in the verify-report before any publish | verify-report asserts `clean` worktree + `git log` unchanged by apply |
| Other rows (docs paths, git selection, commits, PR) | N/A | No routing/shell/subprocess/VCS automation introduced | none |

## Migration / Rollout

No schema migration. Data-only rollout via the runbook above; single slice env, fully resumable; no feature flag.

## Open Questions

- [ ] David's confirmation of the 3 proposal assumptions (strip, order cuello→brazo, no push before approval) — defaults in force until answered (defaults are what this design implements).