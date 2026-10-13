-- ============================================================
-- Rollback: IA Coach MVP (cuota de mensajes)
-- ============================================================
-- Revierte db/migrations/coach_mvp.sql.
-- Seguro: la tabla solo guarda contadores de cuota; borrarla no pierde
-- datos de negocio (el peor efecto es resetear cuotas en curso).

BEGIN;

DROP FUNCTION IF EXISTS public.coach_estado();
DROP FUNCTION IF EXISTS public.coach_consumir_mensaje();
DROP TABLE IF EXISTS public.coach_usage;

NOTIFY pgrst, 'reload schema';

COMMIT;
