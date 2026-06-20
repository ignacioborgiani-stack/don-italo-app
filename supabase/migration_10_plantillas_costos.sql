-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 10: Plantillas de costos (Proyectados)
--
--  Plantillas reutilizables de presupuesto por cultivo, independientes de la
--  campaña. Se guardan los ítems de costo (etapas, insumos, labores, cantidades)
--  y se pueden cargar al armar un presupuesto nuevo.
--
--  Tabla:
--    • plantillas_costos → id, user_id, cultivo, nombre, items_costo (jsonb),
--                          etapas (jsonb), created_at
--
--  RLS:
--    • Dueño: ve/gestiona lo suyo (auth.uid() = user_id) — igual que las demás.
--    • Miembro de granja con acceso a Costos Proyectados: puede usarlas
--      (políticas gm_, reusan los helpers de la migración 08). El dueño no cambia.
--
--  ✔ IDEMPOTENTE. Requiere migración 08 (helpers granja_puede_ver/editar).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS plantillas_costos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cultivo     text        NOT NULL DEFAULT '',
  nombre      text        NOT NULL DEFAULT '',
  items_costo jsonb       NOT NULL DEFAULT '[]'::jsonb,
  etapas      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plantillas_costos_user_cultivo_idx ON plantillas_costos (user_id, cultivo);

ALTER TABLE plantillas_costos ENABLE ROW LEVEL SECURITY;

-- ── Dueño (igual que las demás tablas) ────────────────────────────
DROP POLICY IF EXISTS "pc_select" ON plantillas_costos;
DROP POLICY IF EXISTS "pc_insert" ON plantillas_costos;
DROP POLICY IF EXISTS "pc_update" ON plantillas_costos;
DROP POLICY IF EXISTS "pc_delete" ON plantillas_costos;
CREATE POLICY "pc_select" ON plantillas_costos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pc_insert" ON plantillas_costos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pc_update" ON plantillas_costos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pc_delete" ON plantillas_costos FOR DELETE USING (auth.uid() = user_id);

-- ── Miembro de granja con acceso a Costos Proyectados ─────────────
-- (políticas gm_; reusan los helpers de la migración 08; no tocan al dueño)
DROP POLICY IF EXISTS "gm_pc_select" ON plantillas_costos;
DROP POLICY IF EXISTS "gm_pc_insert" ON plantillas_costos;
DROP POLICY IF EXISTS "gm_pc_update" ON plantillas_costos;
DROP POLICY IF EXISTS "gm_pc_delete" ON plantillas_costos;
CREATE POLICY "gm_pc_select" ON plantillas_costos FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_proyectados'));
CREATE POLICY "gm_pc_insert" ON plantillas_costos FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_proyectados'));
CREATE POLICY "gm_pc_update" ON plantillas_costos FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_proyectados'))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_proyectados'));
CREATE POLICY "gm_pc_delete" ON plantillas_costos FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_proyectados'));
