-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 09: Permiso de CAMPAÑAS por miembro — PARTE 2 (extensión)
--
--  Requiere migraciones 07 y 08 ya corridas.
--
--  Crea:
--    • granja_permisos_campanas → a qué campañas tiene acceso cada miembro
--      (whitelist: sin fila = SIN acceso, igual que granja_permisos_lotes).
--
--  Y ajusta el RLS de `campanas`: un miembro sólo VE las campañas habilitadas
--  (antes veía todas las del dueño). Las políticas del dueño NO se tocan
--  ⇒ el dueño sigue viendo y eligiendo TODAS sus campañas, sin cambios.
--
--  ⚠️ Whitelist: los miembros ya aceptados que todavía no tengan campañas
--     asignadas dejarán de ver campañas hasta que el dueño les habilite alguna
--     desde el panel "Permisos".
--
--  ✔ IDEMPOTENTE.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- ─── TABLA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS granja_permisos_campanas (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id  uuid    NOT NULL REFERENCES granja_miembros(id) ON DELETE CASCADE,
  campana_id  uuid    NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
  acceso      boolean NOT NULL DEFAULT true,
  UNIQUE (miembro_id, campana_id)
);
CREATE INDEX IF NOT EXISTS granja_permisos_campanas_miembro_idx ON granja_permisos_campanas (miembro_id);

-- ─── Helper (SECURITY DEFINER) ────────────────────────────────────
-- ¿El miembro actual tiene acceso a la campaña _campana (whitelist) en la granja de _owner?
CREATE OR REPLACE FUNCTION public.granja_acceso_campana(_owner uuid, _campana uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas g
    JOIN public.granja_miembros m ON m.granja_id = g.id
    JOIN public.granja_permisos_campanas pc ON pc.miembro_id = m.id
    WHERE g.propietario_id = _owner AND m.user_id = auth.uid() AND m.estado = 'aceptado'
      AND pc.campana_id = _campana AND pc.acceso = true
  );
$$;

-- ─── RLS de la tabla de permisos (igual que las otras) ────────────
ALTER TABLE granja_permisos_campanas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gpc_select" ON granja_permisos_campanas;
DROP POLICY IF EXISTS "gpc_write"  ON granja_permisos_campanas;
-- El dueño ve/gestiona; el miembro lee SOLO los suyos.
CREATE POLICY "gpc_select" ON granja_permisos_campanas FOR SELECT
  USING (public.es_propietario_por_miembro(miembro_id) OR public.es_miembro_propio(miembro_id));
CREATE POLICY "gpc_write" ON granja_permisos_campanas FOR ALL
  USING (public.es_propietario_por_miembro(miembro_id))
  WITH CHECK (public.es_propietario_por_miembro(miembro_id));

-- ─── Ajuste del RLS de `campanas` para miembros ───────────────────
-- Antes: cualquier miembro aceptado veía TODAS las campañas del dueño.
-- Ahora: el miembro sólo ve las campañas que tiene habilitadas (whitelist).
-- (La política del dueño no se toca → el dueño sigue viendo todas.)
DROP POLICY IF EXISTS "gm_camp_select" ON campanas;
CREATE POLICY "gm_camp_select" ON campanas FOR SELECT
  USING (public.granja_acceso_campana(user_id, id));
