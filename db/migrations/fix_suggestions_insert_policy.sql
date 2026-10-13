-- ============================================================
-- fix_suggestions_insert_policy.sql
-- Change:   fix-suggestions-rls (formulario de sugerencias de /acerca-de)
--
-- Bug: la policy de INSERT público exigía WITH CHECK (is_approved = false)
-- mientras la columna tiene DEFAULT true → todo insert público violaba RLS
-- (error 42501) → 500 en POST /api/suggestions y 0 filas históricas.
--
-- Semántica restaurada (la del comentario original de recalc_site_rating):
-- las sugerencias se publican al instante (is_approved = true por default)
-- y el admin desactiva manualmente (is_approved = false) desde el panel.
--
-- Idempotente: ALTER POLICY re-aplica el mismo WITH CHECK en cada ejecución.
-- Requiere que la policy exista (creada fuera de este repo).
-- Rollback:   db/migrations/fix_suggestions_insert_policy_rollback.sql
-- ============================================================

BEGIN;

ALTER POLICY "Insercion publica sugerencias" ON public.suggestions
  WITH CHECK (true);

COMMIT;
