-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 08: Permisos de granja por módulo y por lote — PARTE 2
--
--  Requiere migración 07 (granjas + granja_miembros) ya corrida.
--
--  Crea:
--    • granja_permisos        → qué módulos puede ver/editar cada miembro
--                               (+ ver_precios para los módulos de costos)
--    • granja_permisos_lotes  → a qué lotes tiene acceso (whitelist: sin fila = SIN acceso)
--
--  Y AMPLÍA el RLS de las tablas de datos para que un MIEMBRO ACEPTADO pueda
--  ver/operar los datos del DUEÑO según sus permisos. Importante:
--    • NO se tocan las políticas existentes del dueño (auth.uid() = user_id).
--      Se AGREGAN políticas nuevas (prefijo gm_) que se combinan con OR.
--      ⇒ el dueño sigue viendo y editando TODO, sin cambios.
--    • Los precios (ver_precios) se ocultan en el FRONT (RLS es por fila, no por
--      columna); acá ver_precios queda guardado para que la UI lo use.
--
--  ✔ IDEMPOTENTE.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- ─── TABLAS DE PERMISOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS granja_permisos (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id  uuid    NOT NULL REFERENCES granja_miembros(id) ON DELETE CASCADE,
  modulo      text    NOT NULL,   -- dashboard|lotes|catalogo|costos_contables|costos_proyectados|stocks|costos_fijos
  puede_ver    boolean NOT NULL DEFAULT false,
  puede_editar boolean NOT NULL DEFAULT false,
  ver_precios  boolean NOT NULL DEFAULT false,   -- solo aplica a módulos de costos
  UNIQUE (miembro_id, modulo)
);
CREATE INDEX IF NOT EXISTS granja_permisos_miembro_idx ON granja_permisos (miembro_id);

CREATE TABLE IF NOT EXISTS granja_permisos_lotes (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id  uuid    NOT NULL REFERENCES granja_miembros(id) ON DELETE CASCADE,
  lote_id     uuid    NOT NULL REFERENCES lotes_maestro(id) ON DELETE CASCADE,
  acceso      boolean NOT NULL DEFAULT true,
  UNIQUE (miembro_id, lote_id)
);
CREATE INDEX IF NOT EXISTS granja_permisos_lotes_miembro_idx ON granja_permisos_lotes (miembro_id);

-- ══════════════════════════════════════════════════════════════════
--  Funciones helper (SECURITY DEFINER) — evitan recursión de RLS.
--  Todas reciben el user_id del DUEÑO (= user_id de la fila de datos).
-- ══════════════════════════════════════════════════════════════════

-- ¿El usuario actual es miembro ACEPTADO de la granja de _owner?
CREATE OR REPLACE FUNCTION public.granja_es_miembro_aceptado(_owner uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas g
    JOIN public.granja_miembros m ON m.granja_id = g.id
    WHERE g.propietario_id = _owner AND m.user_id = auth.uid() AND m.estado = 'aceptado'
  );
$$;

-- ¿El miembro actual puede VER el módulo _modulo en la granja de _owner?
CREATE OR REPLACE FUNCTION public.granja_puede_ver(_owner uuid, _modulo text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas g
    JOIN public.granja_miembros m ON m.granja_id = g.id
    JOIN public.granja_permisos p ON p.miembro_id = m.id
    WHERE g.propietario_id = _owner AND m.user_id = auth.uid() AND m.estado = 'aceptado'
      AND p.modulo = _modulo AND p.puede_ver = true
  );
$$;

-- ¿El miembro actual puede EDITAR el módulo _modulo en la granja de _owner?
CREATE OR REPLACE FUNCTION public.granja_puede_editar(_owner uuid, _modulo text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas g
    JOIN public.granja_miembros m ON m.granja_id = g.id
    JOIN public.granja_permisos p ON p.miembro_id = m.id
    WHERE g.propietario_id = _owner AND m.user_id = auth.uid() AND m.estado = 'aceptado'
      AND p.modulo = _modulo AND p.puede_editar = true
  );
$$;

-- ¿El miembro actual tiene acceso al lote _lote (whitelist) en la granja de _owner?
CREATE OR REPLACE FUNCTION public.granja_acceso_lote(_owner uuid, _lote uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas g
    JOIN public.granja_miembros m ON m.granja_id = g.id
    JOIN public.granja_permisos_lotes pl ON pl.miembro_id = m.id
    WHERE g.propietario_id = _owner AND m.user_id = auth.uid() AND m.estado = 'aceptado'
      AND pl.lote_id = _lote AND pl.acceso = true
  );
$$;

-- ¿El usuario actual es el propietario de la granja del miembro _miembro_id?
CREATE OR REPLACE FUNCTION public.es_propietario_por_miembro(_miembro_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granja_miembros m
    JOIN public.granjas g ON g.id = m.granja_id
    WHERE m.id = _miembro_id AND g.propietario_id = auth.uid()
  );
$$;

-- ¿La fila de miembro _miembro_id es del usuario actual?
CREATE OR REPLACE FUNCTION public.es_miembro_propio(_miembro_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granja_miembros m WHERE m.id = _miembro_id AND m.user_id = auth.uid()
  );
$$;

-- ══════════════════════════════════════════════════════════════════
--  RLS — TABLAS DE PERMISOS
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE granja_permisos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gp_select" ON granja_permisos;
DROP POLICY IF EXISTS "gp_write"  ON granja_permisos;
-- El dueño ve/gestiona; el miembro lee SOLO los suyos.
CREATE POLICY "gp_select" ON granja_permisos FOR SELECT
  USING (public.es_propietario_por_miembro(miembro_id) OR public.es_miembro_propio(miembro_id));
CREATE POLICY "gp_write" ON granja_permisos FOR ALL
  USING (public.es_propietario_por_miembro(miembro_id))
  WITH CHECK (public.es_propietario_por_miembro(miembro_id));

ALTER TABLE granja_permisos_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gpl_select" ON granja_permisos_lotes;
DROP POLICY IF EXISTS "gpl_write"  ON granja_permisos_lotes;
CREATE POLICY "gpl_select" ON granja_permisos_lotes FOR SELECT
  USING (public.es_propietario_por_miembro(miembro_id) OR public.es_miembro_propio(miembro_id));
CREATE POLICY "gpl_write" ON granja_permisos_lotes FOR ALL
  USING (public.es_propietario_por_miembro(miembro_id))
  WITH CHECK (public.es_propietario_por_miembro(miembro_id));

-- ══════════════════════════════════════════════════════════════════
--  RLS de DATOS — se AGREGAN políticas de miembro (prefijo gm_).
--  Las políticas del dueño NO se tocan: el dueño sigue viendo TODO.
-- ══════════════════════════════════════════════════════════════════

-- ── lotes_maestro (gate por lote; el módulo 'lotes' gobierna sólo el menú) ──
DROP POLICY IF EXISTS "gm_lm_select" ON lotes_maestro;
DROP POLICY IF EXISTS "gm_lm_insert" ON lotes_maestro;
DROP POLICY IF EXISTS "gm_lm_update" ON lotes_maestro;
DROP POLICY IF EXISTS "gm_lm_delete" ON lotes_maestro;
CREATE POLICY "gm_lm_select" ON lotes_maestro FOR SELECT
  USING (public.granja_acceso_lote(user_id, id));
CREATE POLICY "gm_lm_insert" ON lotes_maestro FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'lotes'));
CREATE POLICY "gm_lm_update" ON lotes_maestro FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'lotes') AND public.granja_acceso_lote(user_id, id))
  WITH CHECK (public.granja_puede_editar(user_id, 'lotes'));
CREATE POLICY "gm_lm_delete" ON lotes_maestro FOR DELETE
  USING (public.granja_puede_editar(user_id, 'lotes') AND public.granja_acceso_lote(user_id, id));

-- ── asignaciones_campana (módulo costos_contables + acceso al lote) ──
DROP POLICY IF EXISTS "gm_asig_select" ON asignaciones_campana;
DROP POLICY IF EXISTS "gm_asig_insert" ON asignaciones_campana;
DROP POLICY IF EXISTS "gm_asig_update" ON asignaciones_campana;
DROP POLICY IF EXISTS "gm_asig_delete" ON asignaciones_campana;
CREATE POLICY "gm_asig_select" ON asignaciones_campana FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));
CREATE POLICY "gm_asig_insert" ON asignaciones_campana FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));
CREATE POLICY "gm_asig_update" ON asignaciones_campana FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));
CREATE POLICY "gm_asig_delete" ON asignaciones_campana FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_contables') AND public.granja_acceso_lote(user_id, lote_id));

-- ── proyecciones (módulo costos_proyectados) ──
DROP POLICY IF EXISTS "gm_proy_select" ON proyecciones;
DROP POLICY IF EXISTS "gm_proy_insert" ON proyecciones;
DROP POLICY IF EXISTS "gm_proy_update" ON proyecciones;
DROP POLICY IF EXISTS "gm_proy_delete" ON proyecciones;
CREATE POLICY "gm_proy_select" ON proyecciones FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_proyectados'));
CREATE POLICY "gm_proy_insert" ON proyecciones FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_proyectados'));
CREATE POLICY "gm_proy_update" ON proyecciones FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_proyectados'))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_proyectados'));
CREATE POLICY "gm_proy_delete" ON proyecciones FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_proyectados'));

-- ── stocks (módulo stocks) ──
DROP POLICY IF EXISTS "gm_st_select" ON stocks;
DROP POLICY IF EXISTS "gm_st_insert" ON stocks;
DROP POLICY IF EXISTS "gm_st_update" ON stocks;
DROP POLICY IF EXISTS "gm_st_delete" ON stocks;
CREATE POLICY "gm_st_select" ON stocks FOR SELECT
  USING (public.granja_puede_ver(user_id, 'stocks'));
CREATE POLICY "gm_st_insert" ON stocks FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'stocks'));
CREATE POLICY "gm_st_update" ON stocks FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'stocks'))
  WITH CHECK (public.granja_puede_editar(user_id, 'stocks'));
CREATE POLICY "gm_st_delete" ON stocks FOR DELETE
  USING (public.granja_puede_editar(user_id, 'stocks'));

-- ── costos_fijos (módulo costos_fijos) ──
DROP POLICY IF EXISTS "gm_cf_select" ON costos_fijos;
DROP POLICY IF EXISTS "gm_cf_insert" ON costos_fijos;
DROP POLICY IF EXISTS "gm_cf_update" ON costos_fijos;
DROP POLICY IF EXISTS "gm_cf_delete" ON costos_fijos;
CREATE POLICY "gm_cf_select" ON costos_fijos FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_fijos'));
CREATE POLICY "gm_cf_insert" ON costos_fijos FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_fijos'));
CREATE POLICY "gm_cf_update" ON costos_fijos FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_fijos'))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_fijos'));
CREATE POLICY "gm_cf_delete" ON costos_fijos FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_fijos'));

-- ── catálogo (referencia: lo lee cualquier miembro aceptado; edita con módulo 'catalogo') ──
-- catalogo_insumos
DROP POLICY IF EXISTS "gm_cat_select" ON catalogo_insumos;
DROP POLICY IF EXISTS "gm_cat_write"  ON catalogo_insumos;
CREATE POLICY "gm_cat_select" ON catalogo_insumos FOR SELECT
  USING (public.granja_es_miembro_aceptado(user_id));
CREATE POLICY "gm_cat_write" ON catalogo_insumos FOR ALL
  USING (public.granja_puede_editar(user_id, 'catalogo'))
  WITH CHECK (public.granja_puede_editar(user_id, 'catalogo'));
-- catalogo_labores
DROP POLICY IF EXISTS "gm_lab_select" ON catalogo_labores;
DROP POLICY IF EXISTS "gm_lab_write"  ON catalogo_labores;
CREATE POLICY "gm_lab_select" ON catalogo_labores FOR SELECT
  USING (public.granja_es_miembro_aceptado(user_id));
CREATE POLICY "gm_lab_write" ON catalogo_labores FOR ALL
  USING (public.granja_puede_editar(user_id, 'catalogo'))
  WITH CHECK (public.granja_puede_editar(user_id, 'catalogo'));
-- catalogo_cultivos
DROP POLICY IF EXISTS "gm_cul_select" ON catalogo_cultivos;
DROP POLICY IF EXISTS "gm_cul_write"  ON catalogo_cultivos;
CREATE POLICY "gm_cul_select" ON catalogo_cultivos FOR SELECT
  USING (public.granja_es_miembro_aceptado(user_id));
CREATE POLICY "gm_cul_write" ON catalogo_cultivos FOR ALL
  USING (public.granja_puede_editar(user_id, 'catalogo'))
  WITH CHECK (public.granja_puede_editar(user_id, 'catalogo'));

-- ── campanas (las lee cualquier miembro aceptado; las gestiona sólo el dueño) ──
DROP POLICY IF EXISTS "gm_camp_select" ON campanas;
CREATE POLICY "gm_camp_select" ON campanas FOR SELECT
  USING (public.granja_es_miembro_aceptado(user_id));
