-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración: tablas "campanas" y "catalogo_insumos"
--
--  IDEMPOTENTE: se puede correr varias veces sin perder datos.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Crea (si no existen):
--    • campanas         → gestión de campañas pasadas/futuras (Cambio 2)
--    • catalogo_insumos → catálogo global de insumos (Paso 1)
--  y asegura sus políticas RLS por usuario.
-- ══════════════════════════════════════════════════════════════════

-- ─── CAMPAÑAS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanas (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nombre)
);

ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campanas_select" ON campanas;
DROP POLICY IF EXISTS "campanas_insert" ON campanas;
DROP POLICY IF EXISTS "campanas_update" ON campanas;
DROP POLICY IF EXISTS "campanas_delete" ON campanas;
CREATE POLICY "campanas_select" ON campanas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "campanas_insert" ON campanas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campanas_update" ON campanas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "campanas_delete" ON campanas FOR DELETE USING (auth.uid() = user_id);

-- ─── CATÁLOGO DE INSUMOS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogo_insumos (
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
CREATE INDEX IF NOT EXISTS catalogo_user_idx      ON catalogo_insumos (user_id);
CREATE INDEX IF NOT EXISTS catalogo_categoria_idx ON catalogo_insumos (user_id, categoria);

ALTER TABLE catalogo_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogo_select" ON catalogo_insumos;
DROP POLICY IF EXISTS "catalogo_insert" ON catalogo_insumos;
DROP POLICY IF EXISTS "catalogo_update" ON catalogo_insumos;
DROP POLICY IF EXISTS "catalogo_delete" ON catalogo_insumos;
CREATE POLICY "catalogo_select" ON catalogo_insumos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "catalogo_insert" ON catalogo_insumos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "catalogo_update" ON catalogo_insumos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "catalogo_delete" ON catalogo_insumos FOR DELETE USING (auth.uid() = user_id);
