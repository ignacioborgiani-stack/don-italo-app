-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 05: Catálogo de Labores y Servicios
--
--  Crea catalogo_labores (cosecha, aplicación, labranza, flete, seguro…)
--  con RLS por usuario.
--
--  ✔ IDEMPOTENTE. No borra datos.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS catalogo_labores (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        text        NOT NULL DEFAULT '',
  categoria     text        NOT NULL DEFAULT 'Otro',
  precio        numeric     DEFAULT 0,
  moneda        text        DEFAULT 'USD' CHECK (moneda IN ('USD','ARS')),
  unidad_precio text        DEFAULT 'ha',
  es_porcentaje boolean     DEFAULT false,
  porcentaje    numeric,
  notas         text        DEFAULT '',
  activo        boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalogo_labores_user_idx      ON catalogo_labores (user_id);
CREATE INDEX IF NOT EXISTS catalogo_labores_categoria_idx ON catalogo_labores (user_id, categoria);

ALTER TABLE catalogo_labores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cl_select" ON catalogo_labores;
DROP POLICY IF EXISTS "cl_insert" ON catalogo_labores;
DROP POLICY IF EXISTS "cl_update" ON catalogo_labores;
DROP POLICY IF EXISTS "cl_delete" ON catalogo_labores;
CREATE POLICY "cl_select" ON catalogo_labores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cl_insert" ON catalogo_labores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cl_update" ON catalogo_labores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cl_delete" ON catalogo_labores FOR DELETE USING (auth.uid() = user_id);
