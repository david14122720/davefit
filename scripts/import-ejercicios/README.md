# import-ejercicios — Transform + Dry-Run del dataset de ejercicios

Script Node ESM **cero dependencias** que transforma el dataset de ejercicios
(hasaneyldrm, 1,324 registros) al contrato de la tabla `ejercicios` y emite
3 artefactos deterministas para la iteración de ejecución posterior.

> ⚠️ **Este script NO escribe en la base de datos.** No ejecuta inserts, no sube
> media a InsForge, no hace deploy. Es una fase de transformación y validación
> en seco (dry-run). La carga real (bulk-upsert + subida de GIFs) es una
> iteración posterior que consume estos artefactos.

## Requisitos

- Node.js ≥ 18 (probado con Node v24)
- Sin dependencias externas: solo `node:fs` y `node:path`

## Uso

```bash
# Run con valores por defecto
node scripts/import-ejercicios/import-ejercicios.mjs

# Rutas explícitas (flag o variable de entorno)
node scripts/import-ejercicios/import-ejercicios.mjs \
  --dataset /tmp/opencode/davefit-dataset/exercises.json \
  --output /tmp/opencode/davefit-dataset/output/

DAVEFIT_DATASET=/ruta/dataset.json DAVEFIT_OUTPUT=/ruta/salida/ \
  node scripts/import-ejercicios/import-ejercicios.mjs
```

| Parámetro | Flag | Env | Default |
|-----------|------|-----|---------|
| Dataset de entrada (JSON array) | `--dataset` | `DAVEFIT_DATASET` | `/tmp/opencode/davefit-dataset/exercises.json` |
| Directorio de salida (auto-creado) | `--output` | `DAVEFIT_OUTPUT` | `/tmp/opencode/davefit-dataset/output/` |

## Salidas

| Archivo | Contenido |
|---------|-----------|
| `payload.json` | Array de 1,324 objetos con **exactamente 10 claves** (`nombre`, `descripcion`, `grupo_muscular`, `musculo_objetivo`, `musculos_primarios`, `musculos_secundarios`, `imagen_url`, `video_url`, `instrucciones`, `creado_por`), listo para `insforge_bulk-upsert` con `upsertKey: nombre`. `id`/`created_at`/`updated_at` se omiten (defaults de DB); `video_url`/`creado_por` en `null`. |
| `media-manifest.json` | Array de 1,324 entradas: `media_id`, `nombre`, `imagen_url` (GIF raw), `url_futura_insforge` (URL futura del bucket `ejercicios`), `attribution` (`© Gym visual — https://gymvisual.com/`). |
| `report.json` | Validación dry-run: `total`, `por_grupo_muscular` (claves ordenadas), `renombres`, `terminos_sin_traducir`, `categorias_desconocidas`, `flags_cirilicos`, `checks_not_null`, conteos resumidos y `exit_code`. |

## Comportamiento

- **Categorías**: mapa 10→8 (`chest→pecho`, `back→espalda`, `upper legs`/`lower legs→piernas`, `upper arms`/`lower arms→brazo`, `shoulders→hombros`, `waist→core`, `cardio→cardio`, `neck→cuello`). Categoría desconocida → se conserva el valor crudo + WARN (no fatal).
- **Traducción ES**: `target`, `muscle_group` y `secondary_muscles` se traducen con `diccionario.json` (50 entradas, sinónimos normalizados: traps/trapezius→trapecios, quads/quadriceps→cuádriceps, etc.). Término sin traducir → WARN con conteo (no fatal).
- **Nombres duplicados**: el segundo (y siguientes) reciben sufijo determinista ` - 2`, ` - 3`… en orden de archivo; cada renombre queda en `report.renombres`.
- **Nombres cirílicos** (ej. `sled 45в° leg press`): se importan tal cual y se listan en `report.flags_cirilicos`. **Nunca se corrigen.** La detección usa el rango Unicode cirílico (U+0400–U+04FF); el signo de grado `°` (U+00B0) no dispara el flag.
- **Códigos de salida**: `0` en éxito (WARNs permitidos); `1` solo ante fallo estructural (dataset ausente/ilegible, JSON inválido, payload no-array, NOT NULL incompleto, duplicados post-dedupe, claves inesperadas, `imagen_url` sin `https://`).

## Determinismo (R7)

Sin `Date.now`, `Math.random` ni `crypto.*`. Serialización fija
(`JSON.stringify(x, null, 2) + "\n"`), claves de `por_grupo_muscular` ordenadas,
orden derivado del input. Mismo dataset → salidas byte-idénticas.

## Procedimiento de verificación (golden-run)

```bash
# 1. Golden run sobre el dataset real
node scripts/import-ejercicios/import-ejercicios.mjs

# 2. Re-run a un segundo directorio y comparar byte a byte
node scripts/import-ejercicios/import-ejercicios.mjs --output /tmp/opencode/davefit-dataset/output2/
diff -r /tmp/opencode/davefit-dataset/output /tmp/opencode/davefit-dataset/output2   # sin diferencias
sha256sum /tmp/opencode/davefit-dataset/output/*.json                                 # hashes idénticos

# 3. Aserciones del report (conteos duros del dataset real)
node -e "const r=require('/tmp/opencode/davefit-dataset/output/report.json');
if(r.total!==1324||r.renames_count!==6||r.unmapped_categories!==0||r.untranslated_terms!==0||r.exit_code!==0)process.exit(1);
if(r.checks_not_null.nombre!==1324||r.checks_not_null.grupo_muscular!==1324||r.checks_not_null.imagen_url!==1324)process.exit(1);
console.log('report OK')"

# 4. Matriz de códigos de salida (fixtures sintéticos)
node scripts/import-ejercicios/import-ejercicios.mjs --dataset /ruta/inexistente.json   # exit 1, error nombra la ruta
node scripts/import-ejercicios/import-ejercicios.mjs --dataset /ruta/truncado.json      # exit 1, error de parse
node scripts/import-ejercicios/import-ejercicios.mjs --dataset /ruta/objeto.json        # exit 1, no es array
```

Conteos esperados sobre el dataset real (1,324 registros): 6 renombres, 0
categorías sin mapear, 0 términos sin traducir, 4 flags cirílicos,
`checks_not_null` 1324/1324/1324.

## No-Goals (no incluido en este script)

- Ejecutar inserts o el probe de 3 filas contra InsForge
- Subir media o reemplazar `imagen_url` por URLs del bucket `ejercicios`
- Deploy o cambios de esquema
- Corregir nombres cirílicos
- Mapeo de `equipment` (la tabla `ejercicios` no tiene columna; se descarta y se anota en el report)

---

## Carga en producción (8 iteraciones)

> Ejecutada en la fase **sdd-apply** (change `ejercicios-import-carga`). No es código del
> repo: es un procedimiento operativo que consume los artefactos generados por este script.

### Requisitos previos — schema (ALTER aprobado)

La tabla `ejercicios` heredada tenía un CHECK `ejercicios_grupo_muscular_check` con vocabulario
legacy (`brazos`/`abdomen`, sin `cuello`) que rechazaba 500 de 1.324 registros
(37.8%: `brazo` 329 + `core` 169 + `cuello` 2). Se corrigió una sola vez (schema change
aprobado por David):

```sql
ALTER TABLE ejercicios DROP CONSTRAINT ejercicios_grupo_muscular_check;
ALTER TABLE ejercicios ADD CONSTRAINT ejercicios_grupo_muscular_check
  CHECK (grupo_muscular IN ('pecho','espalda','piernas','brazo','hombros',
         'core','cardio','full_body','cuello'));
```

Verificado con `SELECT pg_get_constraintdef(...)` → vocab de 9 grupos alineado con el
spec `ejercicios-schema-dataset` R3 y el vocabulario que ya usa la app.

### Pipeline (arrancado riguroso, idempotente)

1. **Slices** por grupo: `/tmp/opencode/davefit-dataset/output/slices/<grupo>.json`
   (8 files, conteos exactos del report).
2. **CSV** (RFC4180 + campos comillas dobles; arrays `text[]` como literales
   Postgres `{a,b}`; `null` → campo vacío): `/tmp/opencode/davefit-dataset/csv/<grupo>.csv`.
3. **Carga** con `insforge_bulk-upsert` (tabla `ejercicios`, `upsertKey=nombre` —
   `ON CONFLICT (nombre) DO UPDATE`); verificado **byte-exacto** por gate md5 del
   canonical `json_build_array(...)::text` vs checksums locales generados fuera de banda
   (probado: `astride jumps (male)` 1:1 y muestras por grupo).
4. **Gates SQL** por grupo: `SELECT count(*)` → conteo acumulado del report;
   `md5(json_build_array(...)::text)` de muestras (first/mid/last) + registros con
   apóstrofes = checksum local. 0 mismatches.

### Resultado (aplicado el 2026-08-02)

| Grupo | Slice | DB | Gate md5 |
|-------|------|-----|----------|
| cuello | 2 | 2 | ✅ |
| cardio | 29 | 29 | ✅ 29/29 |
| hombros | 143 | 143 | ✅ muestras |
| pecho | 163 | 163 | ✅ muestras |
| core | 169 | 169 | ✅ muestras |
| espalda | 203 | 203 | ✅ muestras |
| piernas | 286 | 286 | ✅ muestras |
| brazo | 329 | 329 | ✅ muestras |
| **Total** | **1.324** | **1.324** | ✅ |

Totales: `count(DISTINCT nombre)=1.324`, 0 filas con cirílico en nombre/descripción,
trigger `update_site_stats` actualizó `site_stats.total_exercises=1.324`. Suite de
unidad (14 files / 89 tests) en verde tras la carga.

### Nombres cirílicos saneados (desviación aprobada de la capability `ejercicios-import` R6)

En la carga se quitó el glifo cirílico U+0432 (`в`) de los 4 nombres de `report.flags_cirilicos`
(desviación puntual del "se importan tal cual", aprobada por David; verificada sin
colisiones contra los otros 1.320 nombres):

| Original (dataset) | Cargado en BD |
|--------------------|---------------|
| `sled 45в° calf press` | `sled 45° calf press` |
| `sled 45в° leg press` | `sled 45° leg press` |
| `sled 45в° leg press (back pov)` | `sled 45° leg press (back pov)` |
| `sled 45в° leg wide press` | `sled 45° leg wide press` |

Verificado: `SELECT count(*) FROM ejercicios WHERE nombre LIKE '%в%';` → 0.

> ⚠️ El generador de SQL manual (`fallback-<grupo>.sql`) se descartó por riesgo de
> derives en transcripción; el CSV genera los mismos literales exactamente. Si se
> re-corre, hacerlo con el CSV (idempotente por upsert).
