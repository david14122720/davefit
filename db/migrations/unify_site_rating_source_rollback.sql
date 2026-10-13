-- ============================================================
-- Rollback: unify_site_rating_source.sql
-- ============================================================
-- Restaura la definición previa: total_reviews = TODAS las aprobadas,
-- fallback del promedio 4.9 y sin search_path fijo.

BEGIN;

CREATE OR REPLACE FUNCTION public.recalc_site_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  UPDATE site_stats
  SET
    -- Solo contamos las que David no haya desactivado manualmente (is_approved = true)
    avg_rating = COALESCE((SELECT avg(rating) FROM suggestions WHERE is_approved = true AND rating > 0), 4.9),
    total_reviews = (SELECT count(*) FROM suggestions WHERE is_approved = true)
  WHERE id = 1;
  RETURN NULL;
END;
$fn$;

COMMIT;
