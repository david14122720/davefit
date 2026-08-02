# Exploration: ejercicios-schema-dataset

> Change: `ejercicios-schema-dataset` | Phase: explore | Date: 2026-08-02

## Current State

La tabla `ejercicios` (InsForge/Postgres, verificada vía get-table-schema) tiene 12 columnas:
`id` (uuid PK), `nombre` (text NOT NULL, UNIQUE `ejercicios_nombre_unique`), `descripcion`, `grupo_muscular` (text NOT NULL), `nivel` (text NOT NULL, índice `idx_ejercicios_nivel`), `tipo_lugar` (text NOT NULL), `imagen_url` (text NOT NULL), `video_url` (text NULL), `instrucciones` (ARRAY NULL), `creado_por` (uuid NULL), `created_at`, `updated_at`. RLS: lectura pública + admin ALL. Triggers: `handle_updated_at` + `update_site_stats` (INSERT/DELETE). **0 filas**. Sin FK.

Frontend consumidor:
- `src/app/lib/ejerciciosApi.ts` — interfaz `Ejercicio` (con `nivel`, `tipo_lugar`) + CRUD genérico sobre `/api/admin/ejercicios`.
- `src/app/pages/AdminEjerciciosPage.tsx` — CRUD completo: form (nivel/tipo_lugar selects), tabla desktop (columnas "Lugar"/"Nivel"), cards mobile (badge nivel), filtro de búsqueda por `e.nivel`, `nivelOptions` local, `grupoMuscularOptions` local (8 grupos).
- `src/app/pages/AdminRutinasPage.tsx` — picker de ejercicios muestra `{grupo_muscular} • {nivel}` (línea 574).
- `src/app/pages/WorkoutPracticePage.tsx` — player `<video src={video_url}>` con fallback `<img src={imagen_url}>`; usa solo nombre/grupo_muscular/imagen/video/descripcion/instrucciones.
- `src/app/pages/RoutinesPage.tsx` — consulta `ejercicios` con selección explícita `select('id, nombre, grupo_muscular, imagen_url')`; usa `nivel` solo de RUTINA.
- `src/app/pages/BibliotecaPage.tsx` — solo rutinas + yoga_rutinas; no toca `ejercicios`.
- `src/constants/fitness.ts` — `grupoIcons` (8 grupos), `nivelColors`, `tipoLugarOptions`.
- `src/types/index.ts` — interfaz `Ejercicio` (con `nivel`, `tipo` — no `tipo_lugar`!, `animacion_url`) **sin imports: código muerto**, ya divergida de la DB.

Tabla `rutinas` (verificada): SÍ tiene `nivel` (NULL) y `tipo_lugar` (NULL) — **se conservan intactos**; el cambio es solo sobre `ejercicios`.

API servidor: `src/pages/api/admin/[...slug].ts` — POST/PUT de ejercicios hace `insert([body])` / `update(body)` pasando el body tal cual. **No enumera columnas**: cero cambios de código servidor necesarios; el payload lo controla el frontend.

## Affected Areas

| Archivo | Por qué |
|---|---|
| `src/app/lib/ejerciciosApi.ts` | Quitar `nivel`/`tipo_lugar` de `Ejercicio`; agregar `musculo_objetivo`, `musculos_primarios`, `musculos_secundarios` |
| `src/app/pages/AdminEjerciciosPage.tsx` | Quitar form fields nivel/tipo_lugar (~35 líneas), columnas de tabla "Lugar"/"Nivel", badge mobile, filtro `e.nivel`, `nivelOptions`; agregar `cuello` a `grupoMuscularOptions` |
| `src/app/pages/AdminRutinasPage.tsx` | Línea 574 `{ejercicio.nivel}` — rompe compilación TS al quitar el campo; reemplazar por grupo_muscular solo |
| `src/constants/fitness.ts` | Agregar `cuello` a `grupoIcons`; `nivelColors` SE MANTIENE (lo usan AdminYogaRutinasPage/AdminYogaPosicionesPage); `tipoLugarOptions` queda huérfano (solo lo importa AdminEjerciciosPage) |
| `src/types/index.ts` | `Ejercicio` muerto (ya divergido: `tipo` vs `tipo_lugar`, sin video_url/instrucciones) — limpieza opcional |
| DB (vía InsForge MCP, no hay archivos .sql en repo) | `ALTER TABLE ejercicios DROP COLUMN nivel, DROP COLUMN tipo_lugar` (índice `idx_ejercicios_nivel` se cae solo con la columna); `ADD COLUMN musculo_objetivo text, ADD COLUMN musculos_primarios text[], ADD COLUMN musculos_secundarios text[]` |
| `src/pages/api/admin/[...slug].ts` | SIN cambios (passthrough). Ojo: `src/pages/api/stats.ts` cuenta filas — no afectado |

**NO tocar** (usan nivel/tipo_lugar de RUTINAS, no de ejercicios): `AdminRutinasPage.tsx` (form de rutina), `rutinasApi.ts`, `RoutinesPage.tsx`, `BibliotecaPage.tsx`, `fitness.ts rutinaDisponibilidadOptions`, yoga (tabla `yoga_posiciones`/`yoga_rutinas` y sus admin pages).

## Approaches

1. **Aplicación mínima coordinada (recomendada)** — quitar columnas+nivel del frontend y del schema en un solo cambio; agregar las 3 columnas nuevas SIN UI de form (las llena el script de importación futuro + US-082).
   - Pros: alcance acotado al catálogo; sin superficie UI nueva que mantener; bajo riesgo.
   - Cons: el admin no puede editar musculos a mano hasta una iteración futura.
   - Effort: Bajo.

2. **Aplicación + form admin extendido** — lo anterior más inputs para `musculo_objetivo`/`musculos_primarios`/`musculos_secundarios` en el modal de AdminEjerciciosPage.
   - Pros: data semántica editable desde hoy.
   - Cons: más líneas, validación de arrays (chips) innecesaria hasta que exista el import; duplica superficie de test.
   - Effort: Medio.

3. **Aplicación + player multimedia** — lo anterior más cambiar `WorkoutPracticePage` para detectar `.gif` y renderizar `<img>` (solo si se decide mapear `gif_url → video_url`).
   - Pros: respeta el mapeo literal "gif → video_url" decidido por el usuario.
   - Cons: `<video>` no renderiza GIFs → sin este cambio el player muestra pantalla negra; código extra en player.
   - Effort: Bajo-Medio (solo si se elige ese mapeo).

## Dataset Compatibility (hasaneyldrm/exercises-dataset, 1,324 ejercicios)

Columnas del dataset verificadas: `id`, `name`, `category`, `body_part`, `equipment`, `instructions.{10 lang}`, `instruction_steps.{lang}` (array — mapea directo a `instrucciones`), `muscle_group` (string), `secondary_muscles` (array), `target` (string), `media_id`, `image`, `gif_url`, `attribution`, `created_at`.

Mapeo de las 10 categorías → grupos frontend:

| Dataset | Frontend | Estado |
|---|---|---|
| chest | pecho | ✅ existe |
| back | espalda | ✅ existe |
| upper legs | piernas | ✅ existe |
| lower legs | piernas | ✅ existe |
| upper arms | brazo | ✅ existe |
| lower arms | brazo | ✅ existe |
| shoulders | hombros | ✅ existe |
| waist | core | ✅ existe |
| cardio | cardio | ✅ existe |
| neck | **cuello** | 🆕 nuevo vocabulario |

- `full_body`: **no existe en el dataset** — ninguna categoría lo produce. Se mantiene como opción solo para ejercicios creados manualmente por admin. No requiere cambio de DB.
- `muscle_group` del dataset es un string (p. ej. "hip flexors") — almacenarlo en `musculos_primarios` como text[] de 1 elemento cumple la decisión y deja flexibilidad.
- **Caveats para la iteración de import (fuera de alcance pero registrados)**: (a) en la versión actual del repo `image`/`gif_url` pueden ser `null` o rutas RELATIVAS (`videos/0001-xxx.gif`) — el import debe resolver URLs absolutas y suplir placeholder para `imagen_url` (NOT NULL en DB); (b) el media puede no estar bundled en el repo (licencia Gymvisual); (c) `instructions.es` + `instruction_steps.es` disponibles → instrucciones en español gratis.

## Video Replaceable (punto 4 del brief)

- **Hoy `video_url` ya es mostrado y editable en el form admin**: FileUpload (`bucket="videos"`, `accept="video/*"`, máx 10MB) + input de URL libre ("o pega un enlace de video"). El admin YA puede reemplazar un gif por un video real editando el ejercicio — **no hace falta ningún cambio de schema/UI para esto**.
- **Restricción detectada**: `WorkoutPracticePage` renderiza `<video src={video_url}>`. **`<video>` no puede reproducir GIFs**. Si el import mapea `gif_url → video_url` literalmente, el player queda en negro. Dos salidas (decisión para design):
  - **A (menor esfuerzo)**: `gif_url → imagen_url` (el `<img>` anima GIFs; el player actual funciona sin cambios; el admin reemplaza a futuro con `video_url` y el player conmuta solo a `<video>`).
  - **B (mapeo literal)**: `gif_url → video_url` + detectar extensión `.gif` en el player y renderizar `<img>`.
- El DELETE del endpoint solo borra archivos con URLs de storage público (`/storage/v1/object/public/`); los gifs externos del dataset no matchean → no-op seguro.

## Risks

1. **Acoplamiento de despliegue**: si la DB pierde `nivel`/`tipo_lugar` mientras el frontend aún los envía, POST/PUT admin falla ("column ... does not exist" de PostgREST). Mitigación: frontend + migración en el mismo cambio/ventana de deploy (una app en Dokploy + migración vía MCP).
2. **Ruptura TS en AdminRutinasPage:574** (`ejercicio.nivel`) al quitar el campo de la interfaz — el build (`astro check`/tsc) lo atrapa; debe corregirse en el mismo cambio.
3. **Nulls/relativos del dataset** (`image`/`gif_url` null; `imagen_url` NOT NULL) — para la iteración de import; documentado aquí para que design no asuma media garantizado.
4. **`tipoLugarOptions` huérfano** en fitness.ts tras la remoción (solo lo importaba AdminEjerciciosPage) — decidir remover o conservar.
5. **`Ejercicio` muerto en types/index.ts** — ya divergido; dejarlo confunde, pero no rompe nada (sin imports). Limpieza opcional.
6. **Cero tests** cubren `ejercicio.nivel` (App.test/DashboardPage.test mockean páginas; admin-form.test usa TestItem genérico; e2e/home.spec sin ejercicios) — no se esperan roturas de test; la red de seguridad es el compilador. Nota: sdd-init registró un issue preexistente de config Vitest (@preact/preset-vite) — verificar baseline `npx vitest run` antes del cambio.
7. **RLS/triggers**: no referencian `nivel`/`tipo_lugar` (verificado en schema) — inmunes al ALTER.

## Line Estimate (review budget 400)

- `ejerciciosApi.ts`: ~5
- `AdminEjerciciosPage.tsx`: ~45-60 (form + tabla + badges + filtro + opciones; +cuello)
- `AdminRutinasPage.tsx`: ~2
- `fitness.ts`: ~2 (+cuello; -tipoLugarOptions opcional)
- `types/index.ts` (opcional): ~10
- SQL migración: ~8 (MCP, no cuenta como líneas de código)

**Total estimado: 60-120 líneas → riesgo de presupuesto: BAJO** (sin chained PRs; un solo PR cómodo).

## Recommendation

Proceder con el enfoque 1 (aplicación mínima coordinada): remover `nivel`/`tipo_lugar` de schema + frontend, agregar las 3 columnas nuevas (nullable, sin UI de form aún), agregar `cuello` al vocabulario. En design, resolver el mapeo de media (A vs B) — recomiendo A (`gif_url → imagen_url`) por cero cambios de player y porque el admin ya puede reemplazar con video real vía `video_url` sin tocar nada más. El form admin de video YA soporta el reemplazo futuro; no se necesita ajuste.

## Ready for Proposal

**Yes** — alcance claro, riesgos acotados y mitigables, 1 decisión de diseño abierta (mapeo media A/B) para la fase design.
