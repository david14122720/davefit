-- ============================================================
-- Hardening: process_workout_completion — cortar el vector anónimo
-- ============================================================
--
-- Hallazgo (sesión identidad-extraviada, 2026-10-12):
--   public.process_workout_completion(req_user_id uuid, duracion_minutos integer)
--   es SECURITY DEFINER y `anon` (la clave pública, sin login) tenía EXECUTE.
--   El FK de user_stats solo rechaza uuid inexistentes, así que cualquiera con
--   la anon key podía inflar XP/rachas de un usuario REAL pasando su uuid.
--
-- Esta migración corta el vector anónimo. La guarda `req_user_id = auth.uid()`
-- (vector autenticado: un usuario logueado inflando a otro) se implementó con
-- el patrón rename + wrapper en `hardening_workout_rpc_wrapper.sql` (aplicada
-- el mismo día). Ver odd/tasks/cierre-pendientes-main.md.
--
-- Por qué es seguro para la app: `invokeRpc` (src/lib/insforge.ts) envía
-- `Authorization: Bearer <accessToken>` cuando hay sesión, y las rutas que
-- llaman al RPC (WorkoutPracticePage / YogaPracticePage) están protegidas →
-- el rol efectivo es `authenticated`, que conserva EXECUTE.
--
-- Verificación previa (read-only, en el editor SQL del panel):
--   SELECT proacl FROM pg_proc WHERE proname = 'process_workout_completion';
--
-- Rollback: db/migrations/hardening_workout_rpc_grants_rollback.sql
--
-- APLICADO en producción: 2026-10-13 (InsForge, vía MCP run-raw-sql).
-- Verificación: has_function_privilege('anon', …) = false;
-- has_function_privilege('authenticated', …) = true; y una llamada HTTP
-- con la anon key devolvió 401 "permission denied for function …" (42501).

BEGIN;

-- 1. Sin ejecución para anónimos: se revoca de `anon` y de PUBLIC (en Postgres
--    EXECUTE se otorga a PUBLIC por defecto, y anon lo hereda de ahí).
REVOKE EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) FROM PUBLIC;

-- 2. El usuario logueado conserva la capacidad de registrar SU entrenamiento.
GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) TO authenticated;

COMMIT;
