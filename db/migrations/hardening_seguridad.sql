-- ============================================================
-- hardening_seguridad.sql
-- Change:   hardening-seguridad (Slice 1 - SQL/BD)
-- Spec:     openspec/changes/hardening-seguridad/specs/data-access-security/spec.md
--
-- Fixes the verified PII leak: broad RLS policies (qual=true) on
-- perfiles/user_stats exposed ALL columns (email, fecha_nacimiento,
-- peso_actual, weekly_score, monthly_score, ultimo_entreno,
-- longest_streak, racha_bonus, nivel) to anon and any authenticated user.
--
-- Strategy (Approach A): restricted public views (column-level control,
-- since RLS is row-level only) + owner policy for user_stats.
--
-- Idempotent: safe to re-run (DROP IF EXISTS / DROP VIEW IF EXISTS).
-- Rollback:   db/migrations/hardening_seguridad_rollback.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Public views (DAS-1) - leaderboard columns only, no PII
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.perfiles_public;
CREATE VIEW public.perfiles_public AS
  SELECT id, nombre_completo, avatar_url
  FROM public.perfiles;

DROP VIEW IF EXISTS public.user_stats_public;
CREATE VIEW public.user_stats_public AS
  SELECT user_id, xp_total, total_workouts, dias_racha
  FROM public.user_stats;

-- ------------------------------------------------------------
-- 2. GRANT SELECT to public roles (DAS-1)
--    Views run with the owner's (postgres) privileges: anon/authenticated
--    only need SELECT on the view, base tables stay locked down.
-- ------------------------------------------------------------
GRANT SELECT ON public.perfiles_public TO anon, authenticated;
GRANT SELECT ON public.user_stats_public TO anon, authenticated;

-- Views must be read-only for public roles. InsForge grants ALL by default
-- on new schema objects, so explicitly strip DML privileges.
REVOKE INSERT, UPDATE, DELETE ON public.perfiles_public FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_stats_public FROM anon, authenticated;

-- ------------------------------------------------------------
-- 3. Drop the 4 broad policies (DAS-2)
--    perfiles_owner_all_v3 (own row) and project_admin_policy stay.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS anon_read_leaderboard_perfiles ON public.perfiles;
DROP POLICY IF EXISTS perfiles_read_authenticated ON public.perfiles;
DROP POLICY IF EXISTS anon_read_leaderboard_stats ON public.user_stats;
DROP POLICY IF EXISTS "Users can read all stats" ON public.user_stats;

-- ------------------------------------------------------------
-- 4. Owner policy for user_stats (DAS-2/DAS-4) - ATOMIC with 3
--    getUserStats (Dashboard) reads the own row through this policy.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS user_stats_owner ON public.user_stats;
CREATE POLICY user_stats_owner ON public.user_stats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
