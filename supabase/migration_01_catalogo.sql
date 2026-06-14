-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 01: Catálogo de Insumos
--
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Esta migración NO borra tablas existentes.
--  Si ya corriste schema_multiusuario.sql y tenés datos, usar este
--  archivo en lugar de volver a correr el schema completo.
-- ══════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS catalogo_insumos CASCADE;

CREATE TABLE catalogo_insumos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        text        NOT NULL DEFAULT '',
  categoria     text        NOT NULL DEFAULT 'otro',
  precio        numeric     DEFAULT 0,
  moneda        text        DEFAULT 'USD' CHECK (moneda IN ('USD','ARS')),
  unidad_precio text        DEFAULT 'kg',
  kg_por_bolsa  numeric,
  notas         text        DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX catalogo_user_idx      ON catalogo_insumos (user_id);
CREATE INDEX catalogo_categoria_idx ON catalogo_insumos (user_id, categoria);

ALTER TABLE catalogo_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo_select" ON catalogo_insumos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "catalogo_insert" ON catalogo_insumos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "catalogo_update" ON catalogo_insumos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "catalogo_delete" ON catalogo_insumos FOR DELETE USING (auth.uid() = user_id);
