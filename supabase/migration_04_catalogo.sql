-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 04: Catálogo (insumos extendido + cultivos)
--
--  1) Agrega a catalogo_insumos: familia, equivalencias (jsonb), activo
--  2) Crea catalogo_cultivos (precios y rindes de referencia) con RLS
--
--  ✔ IDEMPOTENTE. No borra datos. catalogo_insumos ya existe de antes.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- ─── catalogo_insumos: columnas nuevas ────────────────────────────
ALTER TABLE catalogo_insumos
  ADD COLUMN IF NOT EXISTS familia       text,
  ADD COLUMN IF NOT EXISTS equivalencias jsonb,
  ADD COLUMN IF NOT EXISTS activo        boolean DEFAULT true;

-- ─── catalogo_cultivos (nueva) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogo_cultivos (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre                      text        NOT NULL DEFAULT '',
  tipo                        text        DEFAULT 'estival' CHECK (tipo IN ('estival','invernal')),
  precio_usd_tn               numeric     DEFAULT 0,
  rendimiento_estimado_qq     numeric     DEFAULT 0,
  cosecha_porc                numeric     DEFAULT 0,
  comercializacion_porc       numeric     DEFAULT 0,
  comercializacion_fija_usd_tn numeric    DEFAULT 0,
  flete_usd_tn                numeric     DEFAULT 0,
  seguro_usd_ha               numeric     DEFAULT 0,
  rendimiento_asegurado_qq    numeric     DEFAULT 0,
  alquiler_qq_soja            numeric     DEFAULT 0,
  notas                       text        DEFAULT '',
  created_at                  timestamptz DEFAULT now(),
  UNIQUE (user_id, nombre)
);
CREATE INDEX IF NOT EXISTS catalogo_cultivos_user_idx ON catalogo_cultivos (user_id);

ALTER TABLE catalogo_cultivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cc_select" ON catalogo_cultivos;
DROP POLICY IF EXISTS "cc_insert" ON catalogo_cultivos;
DROP POLICY IF EXISTS "cc_update" ON catalogo_cultivos;
DROP POLICY IF EXISTS "cc_delete" ON catalogo_cultivos;
CREATE POLICY "cc_select" ON catalogo_cultivos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cc_insert" ON catalogo_cultivos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cc_update" ON catalogo_cultivos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cc_delete" ON catalogo_cultivos FOR DELETE USING (auth.uid() = user_id);
