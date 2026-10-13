-- ============================================================
-- Unificar la fuente del rating: recalc_site_rating ↔ /api/stats
-- ============================================================
--
-- Problema: /api/stats (lo que ve /acerca-de) cuenta solo sugerencias
-- APROBADAS con rating > 0, mientras recalc_site_rating() contaba TODAS
-- las aprobadas y usaba 4.9 como fallback → dos fuentes del mismo dato
-- con números distintos (reviews: 2 vs 3).
--
-- Cambios:
--   1. total_reviews cuenta solo aprobadas CON rating (> 0), igual que
--      el promedio → "reviews" = cantidad de estrellas que promedian.
--   2. Fallback del promedio: 0 en vez de 4.9 (sin ratings no hay 4.9).
--   3. Hardening: SET search_path = public (era SECURITY DEFINER sin
--      search_path fijo, misma clase que el RPC del workout).
--
-- El trigger existente `tr_recalc_rating` (AFTER INSERT/DELETE/UPDATE ON
-- suggestions) no cambia: sigue disparando esta función.
--
-- Aplicado en producción: 2026-10-13. Verificación: site_stats quedó en
-- avg_rating 3.50 / total_reviews 2 — idéntico a lo que responde /api/stats.
--
-- Rollback: unify_site_rating_source_rollback.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.recalc_site_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE site_stats
  SET
    avg_rating = COALESCE((SELECT avg(rating) FROM suggestions WHERE is_approved = true AND rating > 0), 0),
    total_reviews = (SELECT count(*) FROM suggestions WHERE is_approved = true AND rating > 0)
  WHERE id = 1;
  RETURN NULL;
END;
$fn$;

-- Recomputar los valores actuales con la nueva regla.
UPDATE site_stats
SET
  avg_rating = COALESCE((SELECT avg(rating) FROM suggestions WHERE is_approved = true AND rating > 0), 0),
  total_reviews = (SELECT count(*) FROM suggestions WHERE is_approved = true AND rating > 0)
WHERE id = 1;

COMMIT;
