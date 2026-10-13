-- ============================================================
-- Rollback: hardening_workout_rpc_grants.sql
-- ============================================================
-- Restaura los privilegios previos: EXECUTE para anon y PUBLIC.
-- (Vuelve a dejar la función expuesta: usar solo si la app se rompe.)

BEGIN;

GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) TO PUBLIC;

COMMIT;
