-- ============================================================
-- IA Coach MVP: cuota de mensajes por usuario (10 mensajes / 5 horas)
-- ============================================================
--
-- Aplicado en producción: 2026-10-13 (InsForge, vía MCP run-raw-sql).
--
-- Modelo:
--   - Tabla `coach_usage`: una fila por usuario con contador + inicio de
--     ventana. La ventana es FIJA: arranca con el primer mensaje del ciclo
--     y se restablece sola a las 5 horas (interpretación literal de la
--     especificación del MVP).
--   - Dos RPCs SECURITY DEFINER que resuelven al usuario con auth.uid()
--     (mismo patrón que hardening_workout_rpc_wrapper.sql): el cliente NO
--     pasa user_id, así que no hay vector de "inflar a otro usuario".
--   - La tabla queda SIN acceso directo (RLS + REVOKE ALL): todo pasa por
--     las funciones.
--
-- Consumo atómico y race-safe: INSERT … ON CONFLICT … CASE window_start.
-- El mensaje N° 11 devuelve allowed=false sin llamar a la IA (no gasta
-- tokens); el endpoint responde 429 con reset_at.
--
-- SIN reembolso (Judgment Day ronda 1, CRITICAL reproducido): la primera
-- versión exponía `coach_reembolsar_mensaje` a `authenticated`, así que
-- cualquier usuario podía decrementar su propio contador vía
-- /api/database/rpc/... y evadir la cuota. La función fue ELIMINADA
-- (DROP aplicado en prod el mismo día). Si el gateway falla tras consumir
-- cuota, el endpoint responde 502 y el mensaje se pierde (fallo raro; la
-- cuota se renueva sola a las 5 h). El consumo sigue siendo user-callable
-- A PROPÓSITO: es el mismo camino que usa el endpoint, y consumir de más
-- no otorga ningún beneficio.
--
-- Rollback: db/migrations/coach_mvp_rollback.sql

BEGIN;

CREATE TABLE public.coach_usage (
  user_id uuid PRIMARY KEY REFERENCES public.perfiles(id) ON DELETE CASCADE,
  message_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.coach_usage FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 1) Consumir un mensaje. Devuelve el estado POST-consumo.
-- ------------------------------------------------------------
CREATE FUNCTION public.coach_consumir_mensaje()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_limit constant integer := 10;
  v_window constant interval := interval '5 hours';
  v_count integer;
  v_start timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.coach_usage (user_id, message_count, window_start)
  VALUES (v_uid, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    message_count = CASE
      WHEN public.coach_usage.window_start <= now() - v_window THEN 1
      ELSE public.coach_usage.message_count + 1
    END,
    window_start = CASE
      WHEN public.coach_usage.window_start <= now() - v_window THEN now()
      ELSE public.coach_usage.window_start
    END,
    updated_at = now()
  RETURNING message_count, window_start INTO v_count, v_start;

  RETURN json_build_object(
    'allowed',   v_count <= v_limit,
    'used',      v_count,
    'limit',     v_limit,
    'remaining', GREATEST(v_limit - v_count, 0),
    'reset_at',  v_start + v_window
  );
END;
$fn$;

-- ------------------------------------------------------------
-- 2) Estado actual SIN consumir (GET /api/coach).
-- ------------------------------------------------------------
CREATE FUNCTION public.coach_estado()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_limit constant integer := 10;
  v_window constant interval := interval '5 hours';
  v_count integer := 0;
  v_start timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT message_count, window_start INTO v_count, v_start
  FROM public.coach_usage
  WHERE user_id = v_uid;

  IF NOT FOUND OR v_start <= now() - v_window THEN
    RETURN json_build_object(
      'used', 0, 'limit', v_limit, 'remaining', v_limit, 'reset_at', NULL
    );
  END IF;

  RETURN json_build_object(
    'used',      v_count,
    'limit',     v_limit,
    'remaining', GREATEST(v_limit - v_count, 0),
    'reset_at',  v_start + v_window
  );
END;
$fn$;

-- ------------------------------------------------------------
-- Grants: solo `authenticated`; nada para anon/PUBLIC.
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.coach_consumir_mensaje() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.coach_estado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_consumir_mensaje() TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_estado() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
