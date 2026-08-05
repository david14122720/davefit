# Proposal: ejercicios-import-carga — Load the 1,324-exercise catalog in 8 group-based iterations

## Intent

Populate the InsForge `ejercicios` table (currently **0 rows**, verified) with the 1,324 real exercises from the already-transformed/validated hasaneyldrm payload (`/tmp/opencode/davefit-dataset/output/payload.json`). David explicitly rejected a single mega-bulk-insert: the load MUST run as **multiple idempotent iterations split by `grupo_muscular`**, verifying real DB counters after every iteration. Decision: no media upload (later change), no deploy, **no git push until David approves after the final smoke test**.

## Scope

### In Scope
- **Mechanism**: `insforge_bulk-upsert` MCP, `upsertKey: nombre`, one JSON file per group (8 slices). Fallback documented: raw SQL `INSERT … ON CONFLICT (nombre) DO UPDATE`.
- **8 iterations** in ascending-risk order with a per-iteration cumulative-count gate:

  | # | Grupo | Rows | Role |
  |---|-------|-----:|------|
  | 1 | cuello | 2 | format probe (smallest) |
  | 2 | cardio | 29 | 2nd smallest |
  | 3 | hombros | 143 | ascending |
  | 4 | pecho | 163 | ascending |
  | 5 | core | 169 | ascending |
  | 6 | espalda | 203 | ascending |
  | 7 | piernas | 286 | ascending |
  | 8 | brazo | 329 | largest last (→ 1,324) |

- **Cyrillic sanitization at load:** strip U+0432 `в` from the 4 names (`sled 45° calf press`, `sled 45° leg press`, `sled 45° leg press (back pov)`, `sled 45° leg wide press`) — verified collision-free vs the other 1,320 names. Keep `report.flags_cirilicos` for traceability.
- **Verification per iteration:** `SELECT grupo_muscular, count(*) FROM ejercicios GROUP BY 1` + sample rows; cumulative totals must match `report.json`. **Final gate: total = 1,324** and `site_stats.total_exercises = 1,324` (trigger).
- Document procedure in `scripts/import-ejercicios/README.md` (load, verification SQL, rollback).

### Out of Scope
- Media upload / `imagen_url` swap to bucket `ejercicios` (later change; admin replaces GIFs with MP4).
- Frontend/API changes (payload contract is already spec-conformant).
- US-082 recommendation engine; extra translation read/normalization.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `ejercicios-import`: load phase applies the R5 payload verbatim **except** stripping the Cyrillic glyph in the 4 names (deviates from "imported as-is" in R6 scenario *Cyrillic flag only*; verified collision-free). Everything else executes the existing contract.

## Approach

1. Add optional `--group <g>` mode to `import-ejercicios.mjs` (or small slice helper) → emit `payload-<grupo>.json` files ad hoc in `/tmp/opencode/davefit-dataset/output/` (never committed).
2. Iterate 1→8; each iteration = one `bulk-upsert` call on its slice (2–329 rows ≪ bulk limits); cuello (2) doubles as format probe.
3. Post-iteration verification SQL (covered by `idx_ejercicios_grupo`); abort next iteration if counts mismatch; re-running a slice is idempotent (upsert on unique `nombre`; `updated_at` always bumps → verify counts, not timestamps).
4. Sanitize Cyrillic names at load. 5. Smoke test after iteration 8 → await David's approval → push/deploy separately.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/import-ejercicios/import-ejercicios.mjs` | Modified | optional `--group` slice mode (additive) |
| `scripts/import-ejercicios/README.md` | Modified | load procedure + verification + rollback docs |
| InsForge DB `ejercicios` | Modified (data) | 1,324 rows, upsert-by-nombre; no schema/FK changes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `bulk-upsert` file/format + upsertKey semantics undocumented | Med | cuello=2 probe first; raw-SQL fallback documented |
| Cyrillic strip decision unconfirmed by user | Med | proposal question below; strip is collision-free & reversible |
| `updated_at` bump on every re-run (false-idempotency) | Low | gate on counts, never timestamps |
| `site_stats` recompute per batch | Low | harmless; verify 1,324 at end |
| Media remains external GIFs | High (by design) | functional immediately; bucket swap is the deferred media change |

## Rollback Plan

Pre-data table had 0 rows and no FKs → trivial. Full: `DELETE FROM ejercicios` (re-run slices idempotently after). Per-slice: `DELETE FROM ejercicios WHERE nombre IN (SELECT nombre FROM <slice>)`. Then re-run that slice.

## Dependencies

- MCP `insforge_bulk-upsert` available during apply (fallback: `insforge_run-raw-sql`).
- Existing payload + `report.json` in `/tmp/opencode/davefit-dataset/output/`.

## Success Criteria

- [ ] 8 iterations complete in order; running cumulative totals match report.json after each.
- [ ] `SELECT count(*) = 1324`; `site_stats.total_exercises = 1324`.
- [ ] 0 Cyrillic glyphs remain in `ejercicios.nombre`; no collisions introduced.
- [ ] PROCEDURE documented in README; smoke test passed; wait for user green-light before push/deploy.

## Proposal Question Round

Assumptions needing David's review (else defaults apply): (1) strip Cyrillic `в` at load — OK? (2) iteration order cuello→brazo — OK? (3) nothing pushed/deployed until after-smoke approval — OK?