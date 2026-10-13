-- ============================================================
-- hardening_seguridad_rollback.sql
-- Change:   hardening-seguridad (Slice 1 - SQL/BD)
--
-- Reverts hardening_seguridad.sql: restores the 4 broad policies,
-- removes the user_stats_owner policy, revokes view grants and
-- drops the public views. Recreates the pre-migration state.
--
-- Idempotent: safe to re-run (DROP IF EXISTS guards).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Restore the 4 broad policies (pre-migration state)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS anon_read_leaderboard_perfiles ON public.perfiles;
CREATE POLICY anon_read_leaderboard_perfiles ON public.perfiles
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS perfiles_read_authenticated ON public.perfiles;
CREATE POLICY perfiles_read_authenticated ON public.perfiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS anon_read_leaderboard_stats ON public.user_stats;
CREATE POLICY anon_read_leaderboard_stats ON public.user_stats
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Users can read all stats" ON public.user_stats;
CREATE POLICY "Users can read all stats" ON public.user_stats
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------
-- 2. Remove the owner policy
-- ------------------------------------------------------------
DROP POLICY IF EXISTS user_stats_owner ON public.user_stats;

-- ------------------------------------------------------------
-- 3. Revoke grants and drop views
-- ------------------------------------------------------------
REVOKE SELECT ON public.perfiles_public FROM anon, authenticated;
REVOKE SELECT ON public.user_stats_public FROM anon, authenticated;
DROP VIEW IF EXISTS public.perfiles_public;
DROP VIEW IF EXISTS public.user_stats_public;

COMMIT;
