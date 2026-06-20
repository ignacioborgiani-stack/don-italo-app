-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 11: Contratos de alquiler por lote
--
--  El alquiler es un concepto aparte del editor de ítems: depende del PRECIO
--  del cultivo de referencia (no es un monto fijo en USD). Se asocia a un lote
--  y una campaña; si el lote es doble cultivo, se reparte entre los dos.
--
--  Tabla:
--    • contratos_alquiler → (user_id, lote_id, campana) único.
--        tipo_contrato:    'quintales_fijos' | 'porcentaje_cosecha'
--        cultivo_referencia: nombre del cultivo con cuyo precio se valúa
--        cantidad:          qq/ha (fijos) o % (porcentaje)
--        reparto_estival / reparto_invernal: % del alquiler a cada cultivo (doble)
--
--  RLS:
--    • Dueño: lo suyo (auth.uid() = user_id).
--    • Miembro de granja con Costos Contables + acceso al lote (políticas gm_,
--      reusan helpers de la migración 08). El dueño no cambia.
--
--  ✔ IDEMPOTENTE. Requiere migraciones 02 (lotes_maestro) y 08 (helpers).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contratos_alquiler (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id            uuid        NOT NULL REFERENCES lotes_maestro(id) ON DELETE CASCADE,
  campana            text        NOT NULL DEFAULT '2024/25',
  tipo_contrato      text        NOT NULL DEFAULT 'quintales_fijos'
                                 CHECK (tipo_contrato IN ('quintales_fijos','porcentaje_cosecha')),
  cultivo_referencia text        DEFAULT '',
  cantidad           numeric     DEFAULT 0,
  reparto_estival    numeric     DEFAULT 100,
  reparto_invernal   numeric     DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (user_id, lote_id, campana)
);
CREATE INDEX IF NOT EXISTS contratos_alquiler_user_campana_idx ON contratos_alquiler (user_id, campana);

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
