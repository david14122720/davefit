-- ============================================================
-- Endurecimiento de la policy pública de INSERT en suggestions
-- ============================================================
-- Auditoría F4 (2026-10-18):
--
-- La migración anterior (fix_suggestions_insert_policy.sql) relajó el
-- WITH CHECK a TRUE porque el default de `is_approved` era TRUE y la
-- policy original exigía FALSE: todo INSERT público (que no envía la
-- columna explícita) chocaba con el check y fallaba. El "fix" abrió la
-- puerta a inserciones directas vía PostgREST (con la anon key y el
-- proxy de nginx a /api/database/) sin ninguna validación: rating
-- int4 ilimitado, mensaje sin límite, saltándose la sanitización y el
-- rate-limit del endpoint.
--
-- Remediación aplicada (conservadora: no existe UI de aprobación en el
-- panel admin, el flujo actual es auto-aprobado por default):
--   1. CHECK de columna rating BETWEEN 0 AND 5: el endpoint clampea con
--      Math.min(5, Math.max(0, rating)); la DB ahora lo garantiza igual
--      para inserciones vía PostgREST directo.
--   2. Policy INSERT pública que exige las mismas invariantes que
--      valida /api/suggestions: rating en rango, mensaje acotado a
--      2000 caracteres útiles, y solo filas públicas (is_approved true
--      o ausente).
--   3. Ventana residual declarada: el spam por volumen sigue siendo
--      posible (sin límite por IP a nivel DB); mitigarlo requiere un
--      rate limit server-side/SECURITY DEFINER — follow-up que no
--      corrige elvalor de integridad violado hoy (rating/length
--      arbitrarios).
--
-- Idempotente: DROP + CREATE re-aplican el mismo estado en cada
-- ejecución (mismo patrón que fix_suggestions_insert_policy.sql).
-- ============================================================

-- 1. CHECK de rating (auditoría F4)
ALTER TABLE public.suggestions DROP CONSTRAINT IF EXISTS suggestions_rating_range;
ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_rating_range CHECK (rating BETWEEN 0 AND 5);

-- 2. Policy INSERT pública con las invariantes del endpoint (auditoría F4)
DROP POLICY IF EXISTS "Insercion publica sugerencias" ON public.suggestions;
CREATE POLICY "Insercion publica sugerencias" ON public.suggestions
  FOR INSERT TO public
  WITH CHECK (
    COALESCE(is_approved, true) = true
    AND rating BETWEEN 0 AND 5
    AND char_length(btrim(message)) BETWEEN 1 AND 2000
  );
