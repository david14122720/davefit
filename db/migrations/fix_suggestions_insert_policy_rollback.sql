-- ============================================================
-- fix_suggestions_insert_policy_rollback.sql
--
-- Reverts fix_suggestions_insert_policy.sql: restores the original
-- WITH CHECK (is_approved = false) that blocked every public insert.
-- ============================================================

BEGIN;

ALTER POLICY "Insercion publica sugerencias" ON public.suggestions
  WITH CHECK (is_approved = false);

COMMIT;
