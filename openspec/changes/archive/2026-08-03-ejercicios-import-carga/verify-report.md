```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:d53d191a78fe4ae2abaad2c6803bbacca9daa01e59b0877d8cf9b4e0c76505df
verdict: fail
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 13/15
test_command: npx vitest run
test_exit_code: 0
test_output_hash: sha256:d53d191a78fe4ae2abaad2c6803bbacca9daa01e59b0877d8cf9b4e0c76505df
build_command: N/A (doc-only change, no runtime code)
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: ejercicios-import-carga
**Version**: spec delta v1 (R1–R8)
**Mode**: Strict TDD (runner `npx vitest run`)

> **Nota de veredicto**: el envelope es `fail` porque el validador admite `pass` solo con
> evidencia completa (15/15); 1 escenario queda PARTIAL por gap documental (R5S3) y 1 es
> N/A (fallback no ejercitado). Veredicto cualitativo del verificador: **PASS WITH WARNINGS**
> (0 CRITICAL, 1 WARNING documental). Fail canónico = persistible, no archive-ready.

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 11 (T0–T10) |
| Tasks complete | 11 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ➖ N/A — change is data-load + doc only; zero runtime code in repo (only `scripts/import-ejercicios/README.md` modified).

**Tests**: ✅ 89 passed (14 files), 0 failed, exit 0
```text
npx vitest run
Test Files  14 passed (14)
     Tests  89 passed (89)
EXIT=0
```
Output hash: `sha256:d53d191a78fe4ae2abaad2c6803bbacca9daa01e59b0877d8cf9b4e0c76505df`

**Coverage**: ➖ Not applicable — no code files changed by this change.

### Spec Compliance Matrix
| Requirement | Scenario | Evidence (real execution) | Result |
|-------------|----------|---------------------------|--------|
| R1 Bulk Load | Slice upsert loads exact group | `SELECT grupo_muscular, count(*) GROUP BY 1` → hombros=143 (real DB); all 8 groups match report 2/29/143/163/169/203/286/329; `count(*)=1324` | ✅ COMPLIANT |
| R1 Bulk Load | Raw SQL fallback preserves contract | Fallback **not used** (uploader available); apply-progress + README L150-152 document why and the CSV path that replaced it | ➖ N/A (not exercised) |
| R2 Iteration Gate | Probe iteration (cuello) | DB: cuello=2, cardio=29 → cumulative 31 matches spec | ✅ COMPLIANT |
| R2 Iteration Gate | Count mismatch blocks next iteration | Gate procedure documented (tasks.md "mismatch blocks"); apply ran with zero mismatches (md5 byte-exact gates per group) | ✅ COMPLIANT (procedure + no-mismatch outcome) |
| R3 Verification | Sample shows real content | 5-row random sample: Spanish descripcion, translated musculo_objetivo (glúteos/abdominales/bíceps), instrucciones array ≥5 steps, `imagen_url` = dataset GIF | ✅ COMPLIANT |
| R3 Verification | Final gate passes | `count(*)=1324` AND `site_stats.total_exercises=1324` (real DB; trigger `tr_update_stats_ejercicios` AFTER INSERT OR DELETE present) | ✅ COMPLIANT |
| R4 Idempotent | Re-run does not duplicate | UNIQUE index `ejercicios_nombre_unique` (real DB); `count(*)=count(DISTINCT nombre)=1324`; load ran twice (run 1 blocked by CHECK, run 2 completed) with no duplicates | ✅ COMPLIANT |
| R4 Idempotent | Mid-iteration failure resumes | Resume-by-re-run guaranteed by UNIQUE nombre + ON CONFLICT upsert; documented in README | ✅ COMPLIANT (design + static evidence) |
| R5 Sanitization | No collisions after strip | `count(DISTINCT nombre)=1324`; 4 stripped names present: `sled 45° leg press`, `sled 45° leg press (back pov)`, `sled 45° leg wide press`, `sled 45° calf press` | ✅ COMPLIANT |
| R5 Sanitization | No Cyrillic remains in DB | `SELECT count(*) WHERE nombre LIKE '%в%'` → 0 (real DB) | ✅ COMPLIANT |
| R5 Sanitization | Deviation is traced | BD shows stripped names; README L50 refs `report.flags_cirilicos` + example; BUT load section (L96-152) does not list the 4 original→stripped pairs as T10 requires | ⚠️ PARTIAL |
| R6 Rollback | Full rollback restores pre-state | Not executed (verify = read-only). Static: trigger recomputes `site_stats`; incoming FK `rutinas_ejercicios_ejercicio_id_fkey` exists but table has 0 rows → DELETE safe today; procedure documented | ✅ COMPLIANT (static) |
| R6 Rollback | Single-slice rollback | Not executed. Per-name/per-group delete documented; idempotent re-run restores counts | ✅ COMPLIANT (static) |
| R7 No Media | Bucket untouched | `get-backend-metadata` → bucket `ejercicios` **objectCount: 0** (direct evidence); `imagen_url`: 1,324/1,324 = raw.githubusercontent.com/hasaneyldrm dataset URLs | ✅ COMPLIANT |
| R8 No Push | Gate before publish | `git log -1` = 8f2507a (pre-apply commit); apply made no commits — README + change dir are uncommitted local changes; nothing pushed/deployed | ✅ COMPLIANT |

**Compliance summary**: 13/15 compliant, 1 N/A (fallback not exercised), 1 partial (R5S3 trace detail)

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| R1 Bulk Load Mechanism | ✅ Implemented | 1,324 rows via bulk-upsert upsertKey nombre; CSV path (RFC4180) documented as canonical; JSON slices per design in /tmp (ephemeral, cleaned) |
| R2 Progressive Gate | ✅ Implemented | Cumulative 2/31/174/337/506/709/995/1324 all confirmed in DB |
| R3 Final Verification | ✅ Implemented | count=1324, uniq=1324, site_stats=1324, 0 nulls, RLS public SELECT present ("Lectura pública de ejercicios") |
| R4 Idempotency | ✅ Implemented | UNIQUE index on nombre; judged by counts |
| R5 Cyrillic Sanitization | ✅ Implemented | 4 names stripped, 0 Cyrillic in DB, 0 collisions |
| R6 Rollback | ✅ Implemented | Documented full/slice; safe today (0 FK-referencing rows) |
| R7 No Media Upload | ✅ Implemented | 0 objects in bucket; imagen_url = dataset |
| R8 No Push/Deploy | ✅ Implemented | No VCS ops; awaiting David's approval |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Slice via ad-hoc /tmp helper, zero repo delta | ✅ Yes | slice-gen.mjs in /tmp (ephemeral); repo untouched |
| Primary upsert path `insforge_bulk-upsert` upsertKey nombre | ✅ Yes | Used; input format CSV instead of JSON (documented deviation, same contract, md5 byte-exact) |
| Cyrillic sanitization at slice time | ✅ Yes | Stripped at slice generation (SANITIZE_CYRILLIC=true) |
| Verification by counts only | ✅ Yes | Count gates; md5 byte-exact checks as extra rigor |
| Iteration order risk-ascending | ✅ Yes | cuello→cardio→hombros→pecho→core→espalda→piernas→brazo |
| CHECK constraint legacy | ⚠️ Deviation (David-approved) | Design said "no schema change"; approved ALTER extended CHECK to 9 groups — required for 500 rows (37.8%); documented in README + apply-progress |

### Issues Found
**CRITICAL**: None

**WARNING**:
1. R5S3 — Deviation trace incomplete in README: the production-load section (T10) does not list the 4 original→stripped pairs (`sled 45в° …` → `sled 45° …`) with reference to `report.flags_cirilicos` as tasks.md T10 requires. Stripped names verified in DB, but the documented mapping is missing (README L50 documents only the script's as-is behavior).

**SUGGESTION**:
1. Design/spec claim "no FKs" on `ejercicios` is inaccurate: incoming FK `rutinas_ejercicios_ejercicio_id_fkey` exists. Today `rutinas_ejercicios` = 0 rows so full rollback is safe; if routines reference these exercises before a rollback, `DELETE FROM ejercicios` would violate the FK. Consider noting this in the rollback section.
2. `/tmp` slices and checksums are gone (ephemeral), so md5 gate re-execution is not reproducible; DB state is the source of truth — acceptable.
3. Pipeline input was CSV rather than the JSON slices named in spec R1; contract preserved (md5 byte-exact), but spec wording and README could be aligned.

### TDD Compliance (Strict TDD)
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | apply-progress has "TDD Evidence (Strict TDD)" table |
| All tasks have tests | ✅ | Data-load change: tests = per-iteration count gates + md5 byte-exact checks + regression suite; 0 runtime code in repo |
| RED confirmed (tests exist) | ✅ | Gates executed pre-load per iteration (apply-progress T1–T8) |
| GREEN confirmed (tests pass) | ✅ | `npx vitest run` → 14 files / 89 tests / exit 0 (independently re-run) |
| Triangulation adequate | ➖ N/A | No new unit tests created by this change |
| Safety Net for modified files | ✅ | 89-test suite green pre- and post-load (reported + re-run) |

**TDD Compliance**: 5/5 checks passed

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 89 | 14 | vitest (pre-existing suite; unchanged) |
| Integration | 0 | 0 | — |
| E2E | 0 | 0 | — |
| **Total** | **89** | **14** | |

### Changed File Coverage
Coverage analysis skipped — no code files changed (doc-only change).

### Assertion Quality
✅ All assertions verify real behavior — no test files created/modified by this change (N/A).

### Quality Metrics
**Linter**: ➖ Not applicable (no code changed)
**Type Checker**: ➖ Not applicable (no code changed)

### Verdict
**Envelope: FAIL (canonical, not archive-ready — validator requires 15/15 for pass; R5S3 partial).**
**Qualitative: PASS WITH WARNINGS** — load is real and complete (1,324/1,324 rows, exact group matrix, 0 Cyrillic, 0 nulls, site_stats synced, RLS ok, bucket 0 objects, tests 89/89); one documentation gap (R5S3 Cyrillic trace) and one unexercised path (R1 fallback N/A). next_recommended: add the 4 original→stripped pairs to README (T10 fix), then sdd-archive.
