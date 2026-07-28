-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 12: el alquiler pasa a ser info del LOTE
--
--  El contrato de alquiler deja de estar atado a UNA campaña y pasa a abarcar
--  un RANGO de campañas (campana_inicio .. campana_fin). Un solo contrato por
--  lote (UNIQUE por lote).
--
--  ✔ ALTER TABLE (no recrea) — no se pierden datos.
--  ✔ IDEMPOTENTE. Requiere la migración 11 (tabla contratos_alquiler).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- 1) Nuevas columnas de rango de campañas
ALTER TABLE contratos_alquiler ADD COLUMN IF NOT EXISTS campana_inicio text DEFAULT '';
ALTER TABLE contratos_alquiler ADD COLUMN IF NOT EXISTS campana_fin    text DEFAULT '';

-- 2) Migrar datos de la vieja columna `campana` (si todavía existe) y quitarla.
--    El contrato de una sola campaña pasa a inicio = fin = esa campaña.
--    Antes de imponer UNIQUE por lote, dejamos 1 contrato por lote (el más nuevo).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contratos_alquiler' AND column_name = 'campana'
  ) THEN
    UPDATE contratos_alquiler SET campana_inicio = campana WHERE COALESCE(campana_inicio, '') = '';
    UPDATE contratos_alquiler SET campana_fin    = campana WHERE COALESCE(campana_fin, '')    = '';

    -- Dedup: si un lote tuviera varios contratos (uno por campaña), conservar el más reciente.
    DELETE FROM contratos_alquiler c
    USING contratos_alquiler c2
    WHERE c.user_id = c2.user_id
      AND c.lote_id = c2.lote_id
      AND (c.created_at < c2.created_at
           OR (c.created_at = c2.created_at AND c.id < c2.id));

    -- Al dropear `campana` se elimina también el UNIQUE viejo (user_id, lote_id, campana)
    -- y el índice que la usaba.
    ALTER TABLE contratos_alquiler DROP COLUMN campana;
  END IF;
END $$;

-- 3) Un solo contrato por lote (índice único = restricción de unicidad, idempotente).
CREATE UNIQUE INDEX IF NOT EXISTS contratos_alquiler_user_lote_uidx
  ON contratos_alquiler (user_id, lote_id);
