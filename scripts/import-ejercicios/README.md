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
