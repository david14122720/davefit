# Apply Progress: Ejercicios Import Script (Transform + Dry-Run)

**Change**: ejercicios-import-script
**Status**: ✅ Completo — 12/12 tareas (T1-T12), 3 work units
**Mode**: Strict TDD (golden-run sobre dataset real, D8 — sin vitest para el script)
**Fecha**: 2026-08-02

## Resumen

Script Node ESM cero dependencias (`scripts/import-ejercicios/`) que transforma el
dataset real (1,324 registros) al contrato `ejercicios` (10 keys) y emite 3
artefactos deterministas en `/tmp/opencode/davefit-dataset/output/`:
`payload.json`, `media-manifest.json`, `report.json`. Sin inserts, sin media,
sin deploy, sin push, sin PR (decisiones fijadas).

## Tareas completadas

| Task | Descripción | Estado |
|------|-------------|--------|
| T1 | diccionario.json — 50 entradas, cobertura 100% (50 términos del dataset ⊆ keys) | ✅ |
| T2 | import-ejercicios.mjs — CLI/env/defaults + Stage 0 (R1) | ✅ |
| T3 | Stage 1 ingest — JSON.parse try/catch, no-array exit 1 | ✅ |
| T4 | Stage 2 transform (R2) — mapa 10→8, diccionario, descripcion/instrucciones, imagen_url | ✅ |
| T5 | Stage 3 dedupe (R3) — "- 2", "- 3"…, 6 renombres | ✅ |
| T6 | Stage 4 emit (R4/R5, D7) — payload/manifest/report, `JSON.stringify(x,null,2)+"\n"` | ✅ |
| T7 | Stage 5 validación + exit (R6/R7) — NOT NULL, unicidad, https://, exit 0 WARNs / 1 estructural | ✅ |
| T8 | Golden run dataset real — total 1324, renames 6, flags 4, 0 untranslated, 0 unmapped, checks 1324×3, exit 0 | ✅ |
| T9 | Shape + determinismo (R7) — 1324×10 keys payload, 1324×5 keys manifest, diff -r vacío, sha256 idénticos | ✅ |
| T10 | Exit-code matrix (R1) — missing→1, truncated→1, non-array→1, WARN-only→0 | ✅ |
| T11 | README.md — uso, salidas, verificación, no-inserts | ✅ |
| T12 | .gitignore — safeguard `scripts/import-ejercicios/output/` | ✅ |

## Desviaciones del design

1. **Conteo cirílico: 4, no 5.** El spec/design/tasks asumían 5 nombres con `в`
   (U+0432). El dataset real (verificado byte a byte con `[\u0400-\u04FF]`) tiene
   **exactamente 4**: `sled 45в° calf press`, `sled 45в° leg press`,
   `sled 45в° leg press (back pov)`, `sled 45в° leg wide press`. Los otros dos con
   `°` (`45° side bend`, `sled 45° leg press (side pov)`) usan U+00B0 degree sign —
   **no** son cirílicos. El script reporta la realidad del dataset
   (`cyrillic_flags: 4`); el verify.mjs aserta 4 con comentario explicando la
   discrepancia. Verificación: `[...r.name].map(c=>c.codePointAt(0).toString(16))`
   → `432 b0` (в°), `b0` solo (grado). Comportamiento fiel a R6: flag, nunca corregir.
2. **T10d fixture**: para probar WARN-only→exit 0 sin romper el check estructural de
   conteo (1,324), el fixture se construyó clonando el dataset real e inyectando
   categoría/target desconocidos en 1 registro (1324 totales, exit 0 esperado y
   obtenido).

## TDD Cycle Evidence (golden-run, D8)

| Task | Test | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|------|-------|------------|-----|-------|-------------|----------|
| T1 | focused test diccionario (node -e, 50 keys + unión ⊆ keys) | Unit (data) | N/A (nuevo) | ✅ Written (ERR_MODULE_NOT_FOUND) | ✅ Passed (50/50, 0 faltantes) | ✅ 2 casos (keys + cobertura dataset) | ➖ None needed |
| T2-T7 | golden run real dataset | Integration (runtime) | ✅ 89/89 suite | ✅ verify.mjs escrito antes del script (ENOENT) | ✅ Passed (exit 0, verify OK) | ✅ T10 matriz exit codes (4 fixtures) | ✅ Stage 5 extraído a `structuralErrors()` |
| T8 | verify.mjs aserciones report | Integration | N/A | ✅ Written | ✅ Passed | ➖ Single (1 dataset) | ➖ None needed |
| T9 | re-run output2 + diff/sha256 | Integration | N/A | ✅ Written | ✅ Passed (idénticos) | ✅ cmp 3 archivos | ➖ None needed |
| T10 | matriz exit codes fixtures | Integration | N/A | ✅ Written | ✅ Passed (1/1/1/0) | ✅ 4 fixtures distintos | ➖ None needed |
| T11-T12 | README + .gitignore | Docs/Config | N/A | ➖ No code (docs) | ✅ | ➖ | ➖ |

## Test Summary

- **Tests escritos (golden-run)**: verify.mjs — 30+ aserciones; focused diccionario; matriz exit codes
- **Tests pasando**: todos (verify OK, suite baseline 89/89, build OK)
- **Pure functions creadas**: `transform()`, `dedupe()`, `structuralErrors()` (sin side effects)
- **Approval tests**: None — no refactoring

## Evidencia de verificación

- Golden run: exit 0, report `total:1324, renames_count:6, cyrillic_flags:4, unmapped_categories:0, untranslated_terms:0, exit_code:0`, `checks_not_null {1324,1324,1324}`
- Determinismo: `diff -r output output2` vacío; sha256 idénticos:
  - payload.json `9f262b62e4c47398d993478f4b4e52cc89eca29b618366807e8ec6f2ab6b8450`
  - media-manifest.json `f010e4427484fa1f5381cd77519cf175a6eed8d25db295c9e8e7cc71152ab7cf`
  - report.json `a038a324a6b60a0b7fb4e206579aca0a7780b3a9f1314e51219636d34e81cf6b`
- Exit codes: missing→1 (nombra ruta), truncated→1 (mensaje parse), non-array→1, WARN-only→0
- Suite: `npx vitest run` → 14 files, **89/89 passed**
- Build: `npm run build` → exit 0 (solo warnings pre-existentes de Vite)

## Commits (sin push, sin PR)

| Work Unit | Commit | Archivos |
|-----------|--------|----------|
| WU1 (T1-T7, T12) | `feat: ejercicios — script de import (transform + dry-run) con diccionario ES` | `scripts/import-ejercicios/import-ejercicios.mjs`, `diccionario.json`, `.gitignore`, `openspec/changes/ejercicios-import-script/*` |
| WU2 (T11) | `docs: ejercicios — README de verificación de import-ejercicios` | `scripts/import-ejercicios/README.md` |
| WU3 (T8-T10) | evidencia — sin commit (outputs en /tmp) | — |

## Next recommended

- `sdd-verify` — verificar change contra spec/design/tasks
- Luego `sdd-archive`
- La iteración de ejecución (probe 3 filas, bulk-upsert, subida media) es un change separado

## Riesgos

- El conteo cirílico documentado en spec/design (5) difiere del dataset real (4) —
  el script es fiel al dataset; si el verify espera 5, fallará (comportamiento correcto).
- `bulk-upsert` file-format de InsForge aún sin documentar — se resuelve con probe en la iteración de ejecución.
