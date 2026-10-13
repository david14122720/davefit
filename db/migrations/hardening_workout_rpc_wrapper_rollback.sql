-- ============================================================
-- Rollback: hardening_workout_rpc_wrapper.sql
-- ============================================================
-- Vuelve a la función única original (SIN guarda auth.uid()).
--
-- ATENCIÓN: este rollback restaura el vector autenticado (un usuario
-- logueado puede inflar el XP/racha de otro pasando su uuid). Usarlo solo
-- si el wrapper rompe la app, y preferir el rollback de
-- hardening_workout_rpc_grants.sql también si se quiere el estado original.

BEGIN;

DROP FUNCTION public.process_workout_completion(uuid, integer);

ALTER FUNCTION public.process_workout_completion_unsafe(uuid, integer)
  RENAME TO process_workout_completion;
ALTER FUNCTION public.process_workout_completion(uuid, integer)
  RESET search_path;

GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.process_workout_completion(uuid, integer) TO PUBLIC;

NOTIFY pgrst, 'reload schema';

COMMIT;
