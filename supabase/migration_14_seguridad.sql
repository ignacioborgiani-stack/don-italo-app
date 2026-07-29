-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 14: correcciones de seguridad (C2, A2, A3, M3)
--
--  Requiere migraciones 07, 08 y 09 ya corridas (usa sus helpers).
--
--  C2 · granja_miembros: el invitado ya NO puede hacer UPDATE directo
--       (podía reescribir granja_id y user_id → mudarse de granja con sus
--       permisos, o regalar su acceso a otra cuenta). Ahora acepta/rechaza
--       por la función aceptar_invitacion(), que sólo toca estado/user_id/
--       aceptado_en y valida que la invitación sea suya.
--
--  A2 · El permiso de CAMPAÑAS ahora se aplica a los DATOS (antes sólo
--       filtraba la tabla `campanas`): asignaciones_campana, proyecciones
--       y costos_fijos.
--
--  A3 · stocks pasa a respetar la whitelist de LOTES.
--
--  M3 · movimientos: se agregan políticas de miembro para que el rastro de
--       auditoría quede bajo el user_id del DUEÑO y el dueño pueda verlo.
--       ⚠️ Va junto con el cambio de front que escribe con el uid del dueño.
--
--  ✔ IDEMPOTENTE.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════
--  C2 — Blindar granja_miembros
-- ══════════════════════════════════════════════════════════════════

-- Acepta (o rechaza) una invitación propia. SECURITY DEFINER para poder
-- escribir sin darle UPDATE directo al invitado sobre la tabla.
-- Sólo modifica estado / user_id / aceptado_en: granja_id queda intacto.
CREATE OR REPLACE FUNCTION public.aceptar_invitacion(_miembro_id uuid, _aceptar boolean)
RETURNS public.granja_miembros
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fila     public.granja_miembros;
  mi_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  SELECT * INTO fila FROM public.granja_miembros WHERE id = _miembro_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitacion_inexistente';
  END IF;

  -- La invitación es mía si ya está vinculada a mi uid, o si me invitaron por mi email.
  IF NOT (
    fila.user_id = auth.uid()
    OR (mi_email <> '' AND lower(fila.email_invitado) = mi_email)
  ) THEN
    RAISE EXCEPTION 'invitacion_ajena';
  END IF;

  IF _aceptar THEN
    UPDATE public.granja_miembros
       SET estado = 'aceptado', user_id = auth.uid(), aceptado_en = now()
     WHERE id = _miembro_id
     RETURNING * INTO fila;
  ELSE
    UPDATE public.granja_miembros
       SET estado = 'rechazado'
     WHERE id = _miembro_id
     RETURNING * INTO fila;
  END IF;

  RETURN fila;
END;
$$;

REVOKE ALL     ON FUNCTION public.aceptar_invitacion(uuid, boolean) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.aceptar_invitacion(uuid, boolean) TO authenticated;

-- El UPDATE directo queda SÓLO para el propietario de la granja.
-- (El WITH CHECK sobre la fila nueva impide además que el dueño mueva una
--  fila a otra granja: no sería propietario del destino.)
DROP POLICY IF EXISTS "gm_update" ON granja_miembros;
CREATE POLICY "gm_update" ON granja_miembros FOR UPDATE
  USING (public.es_propietario_de_granja(granja_id))
  WITH CHECK (public.es_propietario_de_granja(granja_id));

-- ══════════════════════════════════════════════════════════════════
--  A2 / A3 — Helpers para resolver whitelists por NOMBRE
--  (asignaciones/proyecciones guardan `campana` como texto y stocks
--   guarda `lote_asignado` como nombre, no como id)
-- ══════════════════════════════════════════════════════════════════

-- ¿El miembro actual tiene acceso a la campaña llamada _campana del dueño _owner?
CREATE OR REPLACE FUNCTION public.granja_acceso_campana_nombre(_owner uuid, _campana text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campanas c
    JOIN public.granjas g                       ON g.propietario_id = _owner
    JOIN public.granja_miembros m               ON m.granja_id = g.id
    JOIN public.granja_permisos_campanas pc     ON pc.miembro_id = m.id AND pc.campana_id = c.id
    WHERE c.user_id = _owner
      AND c.nombre  = _campana
      AND m.user_id = auth.uid()
      AND m.estado  = 'aceptado'
      AND pc.acceso = true
  );
$$;

-- ¿El miembro actual tiene acceso al lote llamado _lote del dueño _owner?
-- Un stock SIN lote asignado (null o '') es inventario general → visible.
CREATE OR REPLACE FUNCTION public.granja_acceso_lote_nombre(_owner uuid, _lote text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT _lote IS NULL OR _lote = '' OR EXISTS (
    SELECT 1
    FROM public.lotes_maestro lm
    JOIN public.granjas g                   ON g.propietario_id = _owner
    JOIN public.granja_miembros m           ON m.granja_id = g.id
    JOIN public.granja_permisos_lotes pl    ON pl.miembro_id = m.id AND pl.lote_id = lm.id
    WHERE lm.user_id = _owner
      AND lm.nombre  = _lote
      AND m.user_id  = auth.uid()
      AND m.estado   = 'aceptado'
      AND pl.acceso  = true
  );
$$;

-- ══════════════════════════════════════════════════════════════════
--  A2 — Gate de campaña en los datos
-- ══════════════════════════════════════════════════════════════════

-- ── asignaciones_campana: módulo + lote + CAMPAÑA ──
DROP POLICY IF EXISTS "gm_asig_select" ON asignaciones_campana;
DROP POLICY IF EXISTS "gm_asig_insert" ON asignaciones_campana;
DROP POLICY IF EXISTS "gm_asig_update" ON asignaciones_campana;
DROP POLICY IF EXISTS "gm_asig_delete" ON asignaciones_campana;
CREATE POLICY "gm_asig_select" ON asignaciones_campana FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_contables')
     AND public.granja_acceso_lote(user_id, lote_id)
     AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_asig_insert" ON asignaciones_campana FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_contables')
          AND public.granja_acceso_lote(user_id, lote_id)
          AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_asig_update" ON asignaciones_campana FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_contables')
     AND public.granja_acceso_lote(user_id, lote_id)
     AND public.granja_acceso_campana_nombre(user_id, campana))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_contables')
          AND public.granja_acceso_lote(user_id, lote_id)
          AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_asig_delete" ON asignaciones_campana FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_contables')
     AND public.granja_acceso_lote(user_id, lote_id)
     AND public.granja_acceso_campana_nombre(user_id, campana));

-- ── proyecciones: módulo + CAMPAÑA ──
DROP POLICY IF EXISTS "gm_proy_select" ON proyecciones;
DROP POLICY IF EXISTS "gm_proy_insert" ON proyecciones;
DROP POLICY IF EXISTS "gm_proy_update" ON proyecciones;
DROP POLICY IF EXISTS "gm_proy_delete" ON proyecciones;
CREATE POLICY "gm_proy_select" ON proyecciones FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_proyectados')
     AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_proy_insert" ON proyecciones FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_proyectados')
          AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_proy_update" ON proyecciones FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_proyectados')
     AND public.granja_acceso_campana_nombre(user_id, campana))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_proyectados')
          AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_proy_delete" ON proyecciones FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_proyectados')
     AND public.granja_acceso_campana_nombre(user_id, campana));

-- ── costos_fijos: módulo + CAMPAÑA (por campana_id; null = sin campaña) ──
DROP POLICY IF EXISTS "gm_cf_select" ON costos_fijos;
DROP POLICY IF EXISTS "gm_cf_insert" ON costos_fijos;
DROP POLICY IF EXISTS "gm_cf_update" ON costos_fijos;
DROP POLICY IF EXISTS "gm_cf_delete" ON costos_fijos;
CREATE POLICY "gm_cf_select" ON costos_fijos FOR SELECT
  USING (public.granja_puede_ver(user_id, 'costos_fijos')
     AND (campana_id IS NULL OR public.granja_acceso_campana(user_id, campana_id)));
CREATE POLICY "gm_cf_insert" ON costos_fijos FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_fijos')
          AND (campana_id IS NULL OR public.granja_acceso_campana(user_id, campana_id)));
CREATE POLICY "gm_cf_update" ON costos_fijos FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'costos_fijos')
     AND (campana_id IS NULL OR public.granja_acceso_campana(user_id, campana_id)))
  WITH CHECK (public.granja_puede_editar(user_id, 'costos_fijos')
          AND (campana_id IS NULL OR public.granja_acceso_campana(user_id, campana_id)));
CREATE POLICY "gm_cf_delete" ON costos_fijos FOR DELETE
  USING (public.granja_puede_editar(user_id, 'costos_fijos')
     AND (campana_id IS NULL OR public.granja_acceso_campana(user_id, campana_id)));

-- ══════════════════════════════════════════════════════════════════
--  A3 — stocks con whitelist de lotes
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "gm_st_select" ON stocks;
DROP POLICY IF EXISTS "gm_st_insert" ON stocks;
DROP POLICY IF EXISTS "gm_st_update" ON stocks;
DROP POLICY IF EXISTS "gm_st_delete" ON stocks;
CREATE POLICY "gm_st_select" ON stocks FOR SELECT
  USING (public.granja_puede_ver(user_id, 'stocks')
     AND public.granja_acceso_lote_nombre(user_id, lote_asignado));
CREATE POLICY "gm_st_insert" ON stocks FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'stocks')
          AND public.granja_acceso_lote_nombre(user_id, lote_asignado));
CREATE POLICY "gm_st_update" ON stocks FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'stocks')
     AND public.granja_acceso_lote_nombre(user_id, lote_asignado))
  WITH CHECK (public.granja_puede_editar(user_id, 'stocks')
          AND public.granja_acceso_lote_nombre(user_id, lote_asignado));
CREATE POLICY "gm_st_delete" ON stocks FOR DELETE
  USING (public.granja_puede_editar(user_id, 'stocks')
     AND public.granja_acceso_lote_nombre(user_id, lote_asignado));

-- ══════════════════════════════════════════════════════════════════
--  M3 — Auditoría de movimientos visible para el dueño
--  El front pasa a escribir movimientos con el user_id del DUEÑO; estas
--  políticas permiten que un miembro con edición de stocks los inserte
--  y que el dueño (política propia, sin cambios) los lea todos.
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "gm_mov_select" ON movimientos;
DROP POLICY IF EXISTS "gm_mov_insert" ON movimientos;
CREATE POLICY "gm_mov_select" ON movimientos FOR SELECT
  USING (public.granja_puede_ver(user_id, 'stocks'));
CREATE POLICY "gm_mov_insert" ON movimientos FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'stocks'));

-- ══════════════════════════════════════════════════════════════════
--  B1 — Fijar search_path en las funciones de la migración 13
--  (no son SECURITY DEFINER, así que no había escalación, pero el linter
--   de Supabase lo marca como search_path mutable)
-- ══════════════════════════════════════════════════════════════════
ALTER FUNCTION public.campana_anio(text) SET search_path = public;
ALTER FUNCTION public.contratos_alquiler_sin_solape() SET search_path = public;
