-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 03: perímetro del lote (KMZ/KML)
--
--  Agrega la columna "poligono" (JSONB, nullable) a lotes_maestro.
--  Guarda el perímetro como array GeoJSON de pares [lng, lat].
--
--  ✔ IDEMPOTENTE (ADD COLUMN IF NOT EXISTS). No borra ni toca datos.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--  Requiere haber corrido antes migration_02_lotes_maestro.sql.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE lotes_maestro
  ADD COLUMN IF NOT EXISTS poligono jsonb;
