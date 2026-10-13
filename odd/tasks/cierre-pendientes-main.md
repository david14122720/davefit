# Feature: cierre-pendientes-main — arreglar lo pendiente y commitear a main

**Estado**: en progreso · **Repo**: davefit · **Rama**: `main` (pedido explícito del usuario)
**Creada**: 2026-10-13

## Objetivo

Cerrar los pendientes reales que quedaron del working tree (fixes de código +
higiene) y consolidar los ~81 paths sin commitear en unidades de trabajo
coherentes, commiteadas a `main`. Sin tocar deploy.

## Specs

- **S1** (pedido del turno, verbatim): "no toques para nada el deploy solo
  arregla lo que falte arreglar y has comit a main dale"
- **S2** (vigente, autorización puntual): cambios de DDL/datos en la DB de
  **producción** requieren OK explícito del usuario. Preparar migración ≠
  aplicarla.
- **S3** (superada por S1 para este repo): la regla previa "PROHIBIDO git (ni
  commit/push/branch)" queda **revocada solo para commits locales**; `push`,
  PR y deploy siguen sin autorizar.
- **S4**: no tocar `Dockerfile` ni `.env.production` (son deploy) — quedan
  fuera de los commits y a decisión del usuario.

## Pendientes detectados (turno anterior)

1. **XFF spoofeable** en `src/pages/api/suggestions.ts` (`sender_ip` sale del
   primer valor de `X-Forwarded-For` sin validar) → rate-limit eludible y
   texto arbitrario persistido.
2. **RPC `process_workout_completion`**: `SECURITY DEFINER` + `EXECUTE` para
   `anon` → cualquiera con la anon key puede inflar XP/rachas de un usuario
   real pasando su `req_user_id`. Falta migración (REVOKE + guard `auth.uid()`).
3. **eslint con 1 error** (script scratch en `odd/evidence/`).
4. **`YogaPracticePage` TDZ**: `handleFinalizar` referenciado en el array de
   dependencias de `handleTimerComplete`/`handleSiguiente` **antes** de su
   `const` → `ReferenceError` al renderizar `/yoga/practicar/:rutinaId`
   (4 errores tsc pre-existentes, TS2448/TS2454). **Bug real, no cosmético.**
5. **`src/pages/api/stats.ts`**: 4 errores tsc TS7006 (implicit any) en la
   lógica de rating.
6. Higiene: `.atl/` (estado local de Pi) trackeado de más; `odd/evidence/`
   (3.6 MB de capturas) y `.playwright-cli/` (logs locales) sin ignorar.

## Tareas

- [x] **T1** Feature doc + espejo en Engram.
- [x] **T2** eslint: ignorar `odd/**` (artefactos ODD, no fuente) → 0 errores.
- [x] **T3** TDD: test de render de `YogaPracticePage` (RED:
      `ReferenceError: Cannot access 'handleFinalizar' before initialization`)
      → declarar `handleFinalizar` antes de sus consumidores (GREEN); tsc 13→9.
- [x] **T4** TDD: `resolveClientIp` en `/api/suggestions` con validación estricta
      de IP (7 tests, RED→GREEN).
- [x] **T5** Tipar la extracción de ratings en `/api/stats` (TS7006 → 0).
- [x] **T6** Migración `db/migrations/hardening_workout_rpc_grants.sql`
      (+ rollback) con REVOKE a `anon`/`PUBLIC` y GRANT a `authenticated`.
      **Aplicada en prod el 2026-10-13 vía MCP + verificada (ver L13).**

## Blindaje del RPC — qué queda y cómo

**ESTADO: APLICADO en prod el 2026-10-13.** La migración de grants cortó el
vector anónimo y `hardening_workout_rpc_wrapper.sql` implementó la guarda
`auth.uid()` (rename + wrapper). Lo de abajo queda como registro del
diagnóstico y el patrón usado.

La migración `hardening_workout_rpc_grants.sql` corta el vector **anónimo**.
El vector **autenticado** (un usuario logueado inflando a otro pasando su
`req_user_id`) necesita agregar la guarda dentro de la función, y eso exige su
cuerpo actual. No fue posible leerlo: no hay InsForge MCP en esta sesión, no hay
`psql`/credenciales Postgres locales y el backend no expone introspección
OpenAPI (`/api/database/` → 404).

Patrón seguro sin reescribir el cuerpo (rename + wrapper), una vez se conozca el
`RETURNS` real (`jsonb`/`json`) desde el panel:

```sql
ALTER FUNCTION public.process_workout_completion(uuid, integer)
  RENAME TO process_workout_completion_unsafe;
REVOKE EXECUTE ON FUNCTION public.process_workout_completion_unsafe(uuid, integer)
  FROM anon, authenticated, PUBLIC;

CREATE FUNCTION public.process_workout_completion(req_user_id uuid, duracion_minutos integer)
RETURNS jsonb  -- ← ajustar al tipo real de la original
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF req_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden: req_user_id debe ser auth.uid()' USING ERRCODE = '42501';
  END IF;
  RETURN public.process_workout_completion_unsafe(req_user_id, duracion_minutos);
END; $$;

GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) TO authenticated;
```

Verificación previa (panel SQL, read-only):
`SELECT proacl, pg_get_function_result(oid) FROM pg_proc WHERE proname = 'process_workout_completion';`

## Otras limitaciones reportadas

- **`X-Forwarded-For`**: `resolveClientIp` valida el formato, pero en prod el
  último hop lo elige el cliente mientras nginx no agregue la cabecera. Fix de
  una línea (deploy, NO aplicado): `proxy_set_header X-Forwarded-For
  $proxy_add_x_forwarded_for;` en el `location /` de `nginx.conf`.

- [x] **T7** Checks: vitest 112/112 (24 archivos), tsc 5 (13 → 5: se
      resolvieron los 4 TS2448/TS2454 de yoga, los 4 TS7006 de stats y el error
      de eslint), eslint 0 errores, `npm run build` verde.
- [x] **T8** 16 commits por unidad de trabajo a `main` (Conventional Commits),
      sin `push` (no autorizado).
- [x] **T9** Pedir OK explícito para el DDL de T6 (+ backfill opcional de
      `user_stats`). Decisión: **no aplicar por ahora**.
- [x] **T10** Reporte final con `Risk:` y pendientes + `push` a `origin/main`
      autorizado y ejecutado.
- [x] **T11** (2026-10-13 sesión 2) Migración de grants APLICADA en prod vía
      InsForge MCP; verificada (anon false / authenticated true / 401 HTTP).
- [x] **T12** Wrapper `auth.uid()` (`hardening_workout_rpc_wrapper.sql`)
      aplicado en prod; verificado: not_authenticated / forbidden / happy path
      (70 XP) + fila restaurada + `_unsafe` solo owner.
- [x] **T13** Backfill de `user_stats` para "juana de arco"
      (`9700cf6c-4ff2-4e98-a10c-2b677e2fe80b`): fila en ceros creada.
- [x] **T14** Rating unificado: `recalc_site_rating` cuenta aprobadas con
      rating (fallback 0, search_path) + `site_stats` recomputado a 3.50/2.
- [x] **T15** Fix `invokeRpc`: leía el token con `auth.getSession()` (método
      INEXISTENTE en el SDK → todo RPC fallaba). Ahora usa `readAccessToken`.
      TDD: test nuevo RED→GREEN.
- [x] **T16** OAuth: la vuelta por fragmento (`#access_token`) ahora registra
      la sesión en el singleton (tokenManager + setAuthToken) y la restauración
      no depende solo de la cookie csrf (gate `insforge_code`). TDD: 3 tests
      RED→GREEN + `decodeAccessTokenClaims` con tests.
- [x] **T17** nginx: XFF también en las locations backend (`/api/auth`,
      `/api/database`, `/api/storage`); comentario stale de `suggestions.ts`
      corregido (nginx YA mandaba XFF desde marzo).

## Log

- **L1** (2026-10-13): "no toques para nada el deploy solo arregla lo que falte
  arreglar y has comit a main dale"
- **L2** (2026-10-13, recon): baseline verificado — vitest 104/104 (22 files),
  tsc 13 errores (paridad con la sesión anterior), eslint 94 problemas con
  **1 error** (`odd/evidence/.../measure-prod-resources.js`), `npm run build`
  verde. Cambio de autorización respecto de sesiones previas: se permite
  commitear a `main`.
- **L3** (2026-10-13): `git remote` = `github.com:david14122720/davefit` con
  upstream `origin/main`; **no se hace push** (no autorizado).
- **L4** (2026-10-13): `.env.production` y `Dockerfile` tienen la URL del
  backend cambiada a `http://192.168.50.121:7130` (deploy) → **excluidos** de
  los commits, a decisión del usuario (S4).
- **L5** (2026-10-13): `odd/evidence/` (3.6 MB, 17 PNG + logs) se ignora en
  git; se commitean los docs de tarea (`odd/tasks/*.md`), que son el
  conocimiento reutilizable. Decisión reversible y reportada.
- **L6** (2026-10-13, TDD): dos RED observados de verdad —
  `ReferenceError: Cannot access 'handleFinalizar' before initialization` en el
  test de render de `YogaPracticePage` (bug productivo: `/yoga/practicar/:id`
  no renderizaba) y 7/7 fallos en `suggestions.test.ts` antes de exportar
  `resolveClientIp`.
- **L7** (2026-10-13, commits): 16 unidades — `refactor(admin)`, dead code,
  calorías con peso real, `fix(yoga)` TDZ, `fix(profile)`, `feat(dashboard)`,
  `test(e2e)`, `fix(suggestions)`, `fix(security)` vistas, `feat(security)` CSP,
  `fix(insforge)`, `chore(assets)`, `fix(suggestions)` IP, `chore(db)` grants,
  `docs` + higiene, `refactor(ui)` densidad. Tres archivos con dos temas
  (`astro.config.mjs`, `yogaApi.ts`, `api/stats.ts`) se partieron a nivel de
  archivo reconstruyendo el estado intermedio, no con `git add -p`.
- **L8** (2026-10-13): `.env.production` y `Dockerfile` quedan **sin commitear**
  (cambian la URL del backend a la IP LAN) → decisión del usuario.

- **L9** (2026-10-13, decisiones del usuario): (1) **NO** aplicar la migración
  en prod por ahora; (2) `.env.production` y `Dockerfile` quedan **sin
  commitear**; (3) **push a `origin/main` autorizado**.
- **L10** (2026-10-13, cierre): `git push origin main` → `6bbac23..ca25ae2`;
  `main` y `origin/main` en `ca25ae2` (20 commits). Sesión cerrada con el
  handoff de arriba.

## Sesión 2 (2026-10-13, misma fecha)

- **L11** (verbatim): "si arranca con lo que falte usa tu mcp de insforge para
  que tengas 100% acceso a la base de datos, no pares hasta que termines todos
  los pendientes"
- **L12** (recon, MCP): función `RETURNS json`, owner `postgres`, sin
  `search_path` y `proacl = null` (EXECUTE heredado de PUBLIC → anon podía).
  `auth.uid()` existe (lee `request.jwt.claim.sub`/`claims`). "juana de arco" =
  `9700cf6c-4ff2-4e98-a10c-2b677e2fe80b` sin fila en `user_stats`. `recalc_site_rating`
  contaba todas las aprobadas (3) vs `/api/stats` (2). **Hallazgo: `nginx.conf`
  YA tenía el XFF en `location /` desde `fea51cd` (marzo)** — la nota previa era
  incorrecta; el dummy de spoofing de anon tampoco mostró tráfico real (3 filas,
  todas de tests). Topología real: puerto host 8083 → nginx → Astro (sin Traefik).
- **L13** (DDL en prod, autorizado por L11): migración de grants aplicada
  (`REVOKE anon` + `REVOKE PUBLIC` + `GRANT authenticated`) → verificado
  `has_function_privilege`: anon=false, authenticated=true. Wrapper aplicado
  (rename `_unsafe` + `SET search_path` + REVOKE ALL + CREATE con guarda
  `auth.uid()` + GRANT authenticated + `NOTIFY pgrst`). Tests de comportamiento:
  sin claims → `not_authenticated`; claims de A pidiendo B → `forbidden`;
  claims de A pidiendo A → JSON `xp_ganado: 70` (10 min + racha) y fila mutada.
  Fila de juana restaurada a ceros. E2E HTTP con anon key → **401
  `permission denied for function process_workout_completion` (42501)**.
- **L14** (backfill + rating): fila `user_stats` de juana creada en ceros.
  `recalc_site_rating` unificado (reviews solo con rating, fallback 0,
  search_path) + `site_stats` recomputado → 3.50 / 2 (== `/api/stats`).
- **L15** (código, TDD): RED real observado (8/8 tests nuevos fallando) →
  GREEN 8/8. Bug productivo extra: `invokeRpc` llamaba a `auth.getSession()`
  (no existe en el SDK) → TODO RPC fallaba; el path OAuth legacy nunca
  registraba la sesión en el singleton. Fixes en `src/lib/insforge.ts`,
  `src/lib/insforge-types.ts`, `src/app/context/AuthContext.tsx`.
- **L16** (infra/docs): XFF agregado a las locations backend de `nginx.conf`;
  comentario stale de `suggestions.ts` corregido. Migraciones espejo en
  `db/migrations/` (+ rollbacks) con el estado aplicado documentado.
- **L17** (cierre, checks): vitest **123/123** (28 archivos: +8 tests nuevos);
  tsc **4** errores (bajó de 5; paridad con baseline, ninguno de archivos
  tocados); eslint **0 errores** (92 warnings = baseline); `npm run build`
  verde; Playwright **6/6** (chromium + firefox; webkit bloqueado por
  librerías del sistema, no por código). Se corrigió el spec stale de login
  (`/Entrar/i` → `/Iniciar Sesión/i`). RDD: assess del slice
  `142d815..HEAD` → `risk: medium, review_due: false, reason: under_budget`
  (queda pendiente en el slice; la rama acumulada completa sigue marcada
  `high_risk` de sesiones previas — decisión del usuario si quiere revisarla).
  **8 commits** nuevos en `main` (39374ad..HEAD), sin push.

## Decisiones del usuario (2026-10-13)

1. **DDL en prod**: no aplicar por ahora. `hardening_workout_rpc_grants.sql`
   queda en el repo sin ejecutar (se corre desde el panel de InsForge cuando se
   decida). El backfill de `user_stats` de "juana de arco" sigue pendiente y la
   guarda `auth.uid()` sigue necesitando el cuerpo actual de la función.
2. **`.env.production` y `Dockerfile`**: se dejan sin commitear (cambio local);
   el repo mantiene `https://insforge.tesh.online`.
3. **`push` a `origin/main`**: autorizado y ejecutado.

## Handoff — próxima sesión

Estado al cerrar la sesión 2 (2026-10-13):

- **DB de prod endurecida y verificada**: RPC con grants cerrados + guarda
  `auth.uid()` (ver L13); `user_stats` de juana con fila; rating unificado.
- **Código**: fixes TDD del RPC/OAuth en disco; checks y commits al final de
  esta sesión (ver L17+).
- **`.env.production` y `Dockerfile`** siguen modificados sin commitear (S4).

Pendientes que quedan (requieren al usuario):

1. **Aceptación en navegador** (no hay dev server corriendo): `npx astro dev` →
   login email + F5 (sesión vive) → completar un entrenamiento (el RPC debe
   guardar XP — antes fallaba SIEMPRE por el bug de `getSession`) → `/perfil`
   con la cuenta sin fila de stats (ceros, no "Identidad Extraviada").
2. **OAuth Google**: probar login con Google; el flujo PKCE (`insforge_code`)
   lo maneja el SDK y ahora la restauración también entra sin cookie csrf. Si
   el backend devolviera el formato legacy (`#access_token`), la app ahora
   registra la sesión en el singleton.
3. **Deploy** (cuando el usuario quiera): código + `nginx.conf` viajan juntos.
4. **Push** de los commits de esta sesión (si el usuario lo autoriza).
