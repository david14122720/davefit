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
      Guarda `auth.uid()` documentada abajo (requiere el cuerpo de la función).
      **Aplicación en prod pendiente de OK explícito (S2).**

## Blindaje del RPC — qué queda y cómo

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

- [ ] **T7** Checks: vitest + tsc + eslint + build.
- [ ] **T8** Commits por unidad de trabajo a `main` (Conventional Commits).
- [ ] **T9** Pedir OK explícito para el DDL de T6 (+ backfill opcional de
      `user_stats`).
- [ ] **T10** Reporte final con `Risk:` y pendientes.

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
