-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 06: tabla "costos_fijos"
--
--  Costos fijos de estructura de la empresa, POR CAMPAÑA (no por lote):
--  administración, ingeniero agrónomo, almacenaje, etc.
--  Se usan para calcular el Resultado Neto = Resultado Bruto − Costos Fijos.
--
--  IDEMPOTENTE: se puede correr varias veces sin perder datos.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS costos_fijos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campana_id   uuid        REFERENCES campanas(id) ON DELETE CASCADE,
  concepto     text        NOT NULL DEFAULT '',
  monto        numeric     NOT NULL DEFAULT 0,
  moneda       text        NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD','ARS')),
  periodicidad text        NOT NULL DEFAULT 'anual' CHECK (periodicidad IN ('mensual','anual')),
  notas        text        DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS costos_fijos_user_idx    ON costos_fijos (user_id);
CREATE INDEX IF NOT EXISTS costos_fijos_campana_idx ON costos_fijos (user_id, campana_id);

ALTER TABLE costos_fijos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "costos_fijos_select" ON costos_fijos;
DROP POLICY IF EXISTS "costos_fijos_insert" ON costos_fijos;
DROP POLICY IF EXISTS "costos_fijos_update" ON costos_fijos;
DROP POLICY IF EXISTS "costos_fijos_delete" ON costos_fijos;
CREATE POLICY "costos_fijos_select" ON costos_fijos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "costos_fijos_insert" ON costos_fijos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "costos_fijos_update" ON costos_fijos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "costos_fijos_delete" ON costos_fijos FOR DELETE USING (auth.uid() = user_id);
