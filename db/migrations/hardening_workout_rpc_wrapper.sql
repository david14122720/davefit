-- ============================================================
-- Hardening: process_workout_completion — guarda auth.uid() (wrapper)
-- ============================================================
--
-- Complementa hardening_workout_rpc_grants.sql (corte del vector anónimo).
-- Esta migración cierra el vector AUTENTICADO: un usuario logueado podía
-- pasar el `req_user_id` de OTRO usuario y inflar su XP/racha.
--
-- Patrón rename + wrapper (aplicado en prod el 2026-10-13):
--   original (SECURITY DEFINER) → process_workout_completion_unsafe, sin
--   EXECUTE para nadie salvo el owner; el nuevo `process_workout_completion`
--   valida `auth.uid()` y delega. `RETURNS json` (tipo real verificado con
--   pg_get_function_result).
--
-- Aplicado en producción: 2026-10-13 (InsForge, vía MCP run-raw-sql).
-- Verificación ejecutada contra prod:
--   - proacl del wrapper: {postgres, authenticated}; _unsafe: {postgres}
--   - llamada sin claims            → ERROR 'not_authenticated' (28000)
--   - claims de A pidiendo B (uuid) → ERROR 'forbidden…' (42501)
--   - claims de A pidiendo A        → ejecuta y devuelve el JSON de siempre
--   - HTTP con anon key             → 401 permission denied (42501)
--
-- Rollback: hardening_workout_rpc_wrapper_rollback.sql

BEGIN;

ALTER FUNCTION public.process_workout_completion(uuid, integer)
  RENAME TO process_workout_completion_unsafe;
ALTER FUNCTION public.process_workout_completion_unsafe(uuid, integer)
  SET search_path = public;
REVOKE ALL ON FUNCTION public.process_workout_completion_unsafe(uuid, integer)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.process_workout_completion(req_user_id uuid, duracion_minutos integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF req_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden: req_user_id must match the authenticated user' USING ERRCODE = '42501';
  END IF;

  RETURN public.process_workout_completion_unsafe(req_user_id, duracion_minutos);
END;
$fn$;

REVOKE ALL ON FUNCTION public.process_workout_completion(uuid, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
