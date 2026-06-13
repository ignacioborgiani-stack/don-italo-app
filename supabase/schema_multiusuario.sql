-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Schema Multi-Usuario
--  INSTRUCCIONES:
--  1. Este script reemplaza el schema anterior (single-usuario).
--  2. Ejecutarlo en: Supabase → SQL Editor → New query → Run
--  3. ⚠️  BORRA Y RECREA TODAS LAS TABLAS — perdés los datos existentes.
--     Si tenés datos que querés conservar, exportalos primero desde
--     Supabase → Table Editor antes de ejecutar este script.
--  4. Los IDs de lotes y stocks cambian de bigint → uuid para evitar
--     colisiones entre usuarios concurrentes.
--  5. Después de crear las tablas, ir a Supabase → Auth → Settings
--     y desactivar "Email Confirmations" si querés registro instantáneo
--     (recomendado para prototipo).
-- ══════════════════════════════════════════════════════════════════

-- ─── LIMPIAR SCHEMA ANTERIOR ──────────────────────────────────────
DROP TABLE IF EXISTS movimientos   CASCADE;
DROP TABLE IF EXISTS stocks        CASCADE;
DROP TABLE IF EXISTS lotes         CASCADE;
DROP TABLE IF EXISTS proyecciones  CASCADE;
DROP TABLE IF EXISTS configuracion CASCADE;
DROP TABLE IF EXISTS campanas      CASCADE;

-- ─── CAMPAÑAS ─────────────────────────────────────────────────────
CREATE TABLE campanas (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nombre)
);

-- ─── LOTES ────────────────────────────────────────────────────────
CREATE TABLE lotes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre            text        NOT NULL DEFAULT '',
  campana           text        NOT NULL DEFAULT '2024/25',
  ha                numeric     DEFAULT 0,
  tipo_siembra      text        DEFAULT 'simple'
                                CHECK (tipo_siembra IN ('simple','doble')),
  cultivo           jsonb,
  cultivo_invernal  jsonb,
  cultivo_estival   jsonb,
  notas             text        DEFAULT '',
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX lotes_user_campana_idx ON lotes (user_id, campana);

-- ─── STOCKS ───────────────────────────────────────────────────────
CREATE TABLE stocks (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre               text        NOT NULL DEFAULT '',
  tipo                 text        DEFAULT '',
  cantidad             numeric     DEFAULT 0,
  unidad               text        DEFAULT 'kg',
  precio_valor         numeric     DEFAULT 0,
  precio_moneda        text        DEFAULT 'ARS'
                                   CHECK (precio_moneda IN ('ARS','USD')),
  precio_unidad_precio text        DEFAULT '',
  proveedor            text        DEFAULT '',
  ubicacion            text        DEFAULT 'insumera',
  lote_asignado        text,
  campana              text        DEFAULT '2024/25',
  fecha                date,
  remito               text        DEFAULT '',
  notas                text        DEFAULT '',
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX stocks_user_idx      ON stocks (user_id);
CREATE INDEX stocks_ubicacion_idx ON stocks (user_id, ubicacion);

-- ─── MOVIMIENTOS ──────────────────────────────────────────────────
CREATE TABLE movimientos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha            date        NOT NULL DEFAULT CURRENT_DATE,
  tipo             text        NOT NULL,
  stock_id         uuid        REFERENCES stocks(id) ON DELETE SET NULL,
  insumo_nombre    text        NOT NULL DEFAULT '',
  cantidad         numeric     DEFAULT 0,
  unidad           text        DEFAULT 'kg',
  lote_id          uuid,
  lote_nombre      text,
  costo_total_ars  numeric     DEFAULT 0,
  costo_ha_usd     numeric     DEFAULT 0,
  tipo_aplicacion  text,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX mov_user_idx  ON movimientos (user_id);
CREATE INDEX mov_fecha_idx ON movimientos (user_id, fecha DESC);

-- ─── PROYECCIONES ─────────────────────────────────────────────────
CREATE TABLE proyecciones (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cultivo     text        NOT NULL,
  datos       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  campana     text        NOT NULL DEFAULT '2024/25',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, cultivo, campana)
);
CREATE INDEX proy_user_campana_idx ON proyecciones (user_id, campana);

-- ─── CONFIGURACION ────────────────────────────────────────────────
CREATE TABLE configuracion (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clave       text        NOT NULL,
  valor       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, clave)
);

-- ══════════════════════════════════════════════════════════════════
--  RLS — Row Level Security por usuario
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE campanas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- ─── campanas ─────────────────────────────────────────────────────
CREATE POLICY "campanas_select" ON campanas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "campanas_insert" ON campanas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campanas_update" ON campanas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "campanas_delete" ON campanas FOR DELETE USING (auth.uid() = user_id);

-- ─── lotes ────────────────────────────────────────────────────────
CREATE POLICY "lotes_select" ON lotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lotes_insert" ON lotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lotes_update" ON lotes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lotes_delete" ON lotes FOR DELETE USING (auth.uid() = user_id);

-- ─── stocks ───────────────────────────────────────────────────────
CREATE POLICY "stocks_select" ON stocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stocks_insert" ON stocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stocks_update" ON stocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stocks_delete" ON stocks FOR DELETE USING (auth.uid() = user_id);

-- ─── movimientos ──────────────────────────────────────────────────
CREATE POLICY "mov_select" ON movimientos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mov_insert" ON movimientos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mov_delete" ON movimientos FOR DELETE USING (auth.uid() = user_id);

-- ─── proyecciones ─────────────────────────────────────────────────
CREATE POLICY "proy_select" ON proyecciones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "proy_insert" ON proyecciones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proy_update" ON proyecciones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "proy_delete" ON proyecciones FOR DELETE USING (auth.uid() = user_id);

-- ─── configuracion ────────────────────────────────────────────────
CREATE POLICY "config_select" ON configuracion FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "config_insert" ON configuracion FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "config_update" ON configuracion FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "config_delete" ON configuracion FOR DELETE USING (auth.uid() = user_id);
