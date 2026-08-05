# Apply Progress — ejercicios-import-carga

> Fase: **sdd-apply** | Estado: **COMPLETADO** (T0–T10) — run 2 (ver run 1 abajo).
> Modo: Strict TDD (0 código runtime en repo — data-load + doc). Runner de unidad sin cambios (14 files / 89 tests → 89 pass).
> Artifact store: ambos (este archivo + engram `sdd/ejercicios-import-carga/apply-progress`).

## Resumen ejecutivo

Carga completa de los **1.324 ejercicios** del dataset (hasaneyldrm, transformado a
español) en la tabla `ejercicios` (InsForge). 8 iteraciones por grupo, gates de conteo
md5 verificados, trigger `update_site_stats` actualizado (`total_exercises=1.324`).
Bloqueante del run 1 (CHECK constraint legacy) resuelto con ALTER aprobado por David.

**BD: `SELECT count(*) FROM ejercicios` → 1.324.** `count(DISTINCT nombre)=1.324`,
0 filas con cirílico.

## Cambio de schema previo (aprobado por David, run 2)

```sql
ALTER TABLE ejercicios DROP CONSTRAINT ejercicios_grupo_muscular_check;
ALTER TABLE ejercicios ADD CONSTRAINT ejercicios_grupo_muscular_check
  CHECK (grupo_muscular IN ('pecho','espalda','piernas','brazo','hombros',
         'core','cardio','full_body','cuello'));
```
Verificado con `pg_get_constraintdef` → 9 grupos. Alineado con spec R3 y la app.

## Progreso por tarea

| Task | Estado | Evidencia |
|---|---|---|
| T0 — Preparación + slices | ✅ DONE | 8 slices con counts 2/29/143/163/169/203/286/329; 1.324 únicos; 0 cirílicos; `report.json` total 1324 |
| T1 — cuello (2) | ✅ DONE | DB count=2; gate md5 exacto (2/2 registros, hashes locales) |
| T2 — cardio (29) | ✅ DONE | DB count=29; gate md5 **29/29 byte-exact** |
| T3 — hombros (143) | ✅ DONE | DB count=143; muestras first/mid/last md5 exactas (3/3) |
| T4 — pecho (163) | ✅ DONE | DB count=163; muestras md5 exactas |
| T5 — core (169) | ✅ DONE | DB count=169; incluye registros con apóstrofes (`band y-raise`, `dumbbell incline y-raise`, `hanging pike`, `l-sit on floor`) md5 exactos |
| T6 — espalda (203) | ✅ DONE | DB count=203; muestras md5 exactas (`3/4 sit-up`, `wind sprints`…) |
| T7 — piernas (286) | ✅ DONE | DB count=286; muestras md5 exactas (`all fours squad stretch`…) |
| T8 — brazo (329) | ✅ DONE | DB count=329; muestras md5 exactas (`wrist rollerer`…) |
| T9 — Smoke final | ✅ DONE | `count(*)`=1324, uniq=1324, cirílico=0, `site_stats.total_exercises=1.324`; vitest 89/89 |
| T10 — README doc | ✅ DONE | Sección "Carga en producción (8 iteraciones)" añadida a `scripts/import-ejercicios/README.md` |

## Cómo se cargó (pipeline v2, cero transcripción manual)

1. `output/slices/<grupo>.json` → `csv/<grupo>.csv` (RFC4180; arrays `text[]` como
   literales `{a,b}`; null → empty; `csvField` con comillas dobles).
2. `insforge_bulk-upsert(table=ejercicios, file=…/<grupo>.csv, upsertKey=nombre)`:
   `ON CONFLICT (nombre) DO UPDATE` → idempotente, 1.324/1.324 rowsAffected.
3. Verificación: `SELECT nombre, md5(json_build_array(nombre,descripcion,grupo_muscular,
   musculo_objetivo,musculos_primarios,musculos_secundarios,imagen_url,video_url,
   instrucciones,creado_por)::text) vs checksums locales (`/tmp/…/checksums/*.json`) —
   NINGÚN mismatch en los grupos con gate completo/muestras.

> El generador SQL manual (`fallback-<grupo>.sql` + transcribir payloads) se descartó
> por riesgo de deriva en transcripción (varios fallos: typo `musculocomo_jbjetivo`,
> `null value in column "imagen_url"`, `syntax error at or near "["`). El CSV es la vía
> canónica; los payloads del fallback SQL quedan en `/tmp` como referencia.

## TDD Evidence (Strict TDD)

| Task | Test/RED | GREEN | Nota |
|---|---|---|---|
| T0 | report del payload (1324, 10 keys) | ✅ slices con conteos | — |
| T1–T8 | `SELECT count(*)` pre-carga (gate) | ✅ posterior = gate acumulado + md5 local | cada gate se verificó antes del siguiente grupo |
| T9 | vitest `npx vitest run` | ✅ 14 files / 89 tests | sin cambios de código |

## git state

- Sin comandos VCS (no add/commit/push). `git log` HEAD sin cambios por apply.
- Única modificación en repo: `scripts/import-ejercicios/README.md` (doc, T10) —
  histórico de carga; el resto son operaciones MCP/BD + `/tmp`.

## Next Recommended

`sdd-verify` procede con los gates T1–T9 evidenciados (counts, md5, smoke). No quedan
blockers. El media/`imagen_url` (GIFs del dataset, attribuciones GymVisual) queda fuera
de scope (no-goals del README) — posible futura iteración de storage bucket `ejercicios`.