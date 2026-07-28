-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 11: Contratos de alquiler por lote (CONSOLIDADA)
--
--  Combina la creación de la tabla + el esquema final (rango de campañas):
--  el alquiler es info del LOTE (no de la campaña), abarca un rango
--  campana_inicio..campana_fin, y hay UN solo contrato por lote.
--
--  (Reemplaza a las viejas migraciones 11 + 12; se puede correr DESDE CERO.)
--
--  El alquiler depende del PRECIO del cultivo de referencia (no es un monto
--  fijo en USD). Si el lote es doble cultivo en una campaña, se reparte.
--
--  RLS:
--    • Dueño: lo suyo (auth.uid() = user_id).
--    • Miembro de granja con Costos Contables + acceso al lote (políticas gm_,
--      reusan helpers de la migración 08). El dueño no cambia.
--
--  ✔ IDEMPOTENTE. Requiere migración 02 (lotes_maestro) y 08 (helpers granja_*).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contratos_alquiler (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id            uuid        NOT NULL REFERENCES lotes_maestro(id) ON DELETE CASCADE,
  campana_inicio     text        DEFAULT '',
  campana_fin        text        DEFAULT '',
  tipo_contrato      text        NOT NULL DEFAULT 'quintales_fijos'
                                 CHECK (tipo_contrato IN ('quintales_fijos','porcentaje_cosecha')),
  cultivo_referencia text        DEFAULT '',
  cantidad           numeric     DEFAULT 0,
  reparto_estival    numeric     DEFAULT 100,
  reparto_invernal   numeric     DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (user_id, lote_id)          -- un contrato por lote
);
CREATE INDEX IF NOT EXISTS contratos_alquiler_user_idx ON contratos_alquiler (user_id);

ALTER TABLE contratos_alquiler ENABLE ROW LEVEL SECURITY;

-- ── Dueño ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ca_select" ON contratos_alquiler;
DROP POLICY IF EXISTS "ca_insert" ON contratos_alquiler;
DROP POLICY IF EXISTS "ca_update" ON contratos_alquiler;
DROP POLICY IF EXISTS "ca_delete" ON contratos_alquiler;
CREATE POLICY "ca_select" ON contratos_alquiler FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ca_insert" ON contratos_alquiler FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ca_update" ON contratos_alquiler FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ca_delete" ON contratos_alquiler FOR DELETE USING (auth.uid() = user_id);

-- ── Miembro de granja (Costos Contables + acceso al lote) ─────────
-- (reusa los helpers SECURITY DEFINER de la migración 08; no toca al dueño)
DROP POLICY IF EXISTS "gm_ca_select" ON contratos_alquiler;
DROP POLICY IF EXISTS "gm_ca_insert" ON contratos_alquiler;
DROP POLICY IF EXISTS "gm_ca_update" ON contratos_alquiler;
DROP POLICY IF EXISTS "gm_ca_delete" ON contratos_alquiler;
CREATE POLICY "gm_ca_select" ON contratos_alquiler FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));
CREATE POLICY "gm_ca_insert" ON contratos_alquiler FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));
CREATE POLICY "gm_ca_update" ON contratos_alquiler FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));
CREATE POLICY "gm_ca_delete" ON contratos_alquiler FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));
