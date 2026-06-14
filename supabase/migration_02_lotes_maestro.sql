-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 02: separar Lotes (catastro) de Costos
--
--  Crea:
--    • lotes_maestro        → catastro de campos (nombre, ha, geo, notas)
--    • asignaciones_campana → asignación lote ↔ campaña ↔ cultivo + costos
--  y MIGRA los datos de la tabla actual "lotes" a las dos nuevas.
--
--  ✔ IDEMPOTENTE: se puede correr varias veces sin duplicar ni perder datos.
--  ✔ NO borra la tabla "lotes" actual — queda como respaldo.
--
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- ─── LOTES MAESTRO (catastro) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS lotes_maestro (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     text        NOT NULL DEFAULT '',
  ha         numeric     DEFAULT 0,
  ubicacion  text        DEFAULT '',
  lat        numeric,
  lng        numeric,
  notas      text        DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nombre)
);
CREATE INDEX IF NOT EXISTS lotes_maestro_user_idx ON lotes_maestro (user_id);

ALTER TABLE lotes_maestro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lm_select" ON lotes_maestro;
DROP POLICY IF EXISTS "lm_insert" ON lotes_maestro;
DROP POLICY IF EXISTS "lm_update" ON lotes_maestro;
DROP POLICY IF EXISTS "lm_delete" ON lotes_maestro;
CREATE POLICY "lm_select" ON lotes_maestro FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lm_insert" ON lotes_maestro FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lm_update" ON lotes_maestro FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lm_delete" ON lotes_maestro FOR DELETE USING (auth.uid() = user_id);

-- ─── ASIGNACIONES POR CAMPAÑA (lote + campaña + cultivo + costos) ──
CREATE TABLE IF NOT EXISTS asignaciones_campana (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lote_id          uuid        NOT NULL REFERENCES lotes_maestro(id) ON DELETE CASCADE,
  campana          text        NOT NULL DEFAULT '2024/25',
  tipo_siembra     text        DEFAULT 'simple' CHECK (tipo_siembra IN ('simple','doble')),
  cultivo          jsonb,
  cultivo_invernal jsonb,
  cultivo_estival  jsonb,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (user_id, lote_id, campana)
);
CREATE INDEX IF NOT EXISTS asig_user_campana_idx ON asignaciones_campana (user_id, campana);

ALTER TABLE asignaciones_campana ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asig_select" ON asignaciones_campana;
DROP POLICY IF EXISTS "asig_insert" ON asignaciones_campana;
DROP POLICY IF EXISTS "asig_update" ON asignaciones_campana;
DROP POLICY IF EXISTS "asig_delete" ON asignaciones_campana;
CREATE POLICY "asig_select" ON asignaciones_campana FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "asig_insert" ON asignaciones_campana FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "asig_update" ON asignaciones_campana FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "asig_delete" ON asignaciones_campana FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
--  MIGRACIÓN DE DATOS  (lotes  →  lotes_maestro + asignaciones_campana)
-- ══════════════════════════════════════════════════════════════════

-- 1) Un registro en lotes_maestro por cada nombre de lote distinto.
--    Si el mismo nombre aparece en varias campañas, toma el más antiguo.
INSERT INTO lotes_maestro (user_id, nombre, ha, notas)
SELECT DISTINCT ON (user_id, nombre)
       user_id, nombre, ha, COALESCE(notas, '')
FROM lotes
WHERE nombre IS NOT NULL AND nombre <> ''
ORDER BY user_id, nombre, created_at
ON CONFLICT (user_id, nombre) DO NOTHING;

-- 2) Una asignación por cada fila original de "lotes", apuntando al maestro.
INSERT INTO asignaciones_campana
  (user_id, lote_id, campana, tipo_siembra, cultivo, cultivo_invernal, cultivo_estival)
SELECT l.user_id, m.id, l.campana, l.tipo_siembra, l.cultivo, l.cultivo_invernal, l.cultivo_estival
FROM lotes l
JOIN lotes_maestro m ON m.user_id = l.user_id AND m.nombre = l.nombre
ON CONFLICT (user_id, lote_id, campana) DO NOTHING;
