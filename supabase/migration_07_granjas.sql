-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 07: Granjas (multi-usuario tipo "clan") — PARTE 1
--
--  Estructura base para que un PROPIETARIO invite a otras personas a su
--  granja. Los permisos diferenciados por módulo/lote son la PARTE 2 y
--  NO se tocan acá (tampoco el RLS de lotes_maestro, asignaciones, etc.).
--
--  Crea:
--    • granjas          → una por propietario (id, propietario_id, nombre)
--    • granja_miembros  → invitaciones/miembros (estado pendiente/aceptado/rechazado)
--
--  RLS:
--    • El propietario ve y edita TODO de su granja (granja + miembros).
--    • Un miembro ve su propia fila en granja_miembros (para saber su estado)
--      y puede aceptar/rechazar su invitación.
--    • Un invitado puede ver el nombre de la granja a la que lo invitaron.
--
--  ✔ IDEMPOTENTE: se puede correr varias veces sin romper nada.
--
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- ─── GRANJAS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS granjas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  propietario_id uuid       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        text        NOT NULL DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  UNIQUE (propietario_id)          -- una granja por propietario
);
CREATE INDEX IF NOT EXISTS granjas_propietario_idx ON granjas (propietario_id);

-- ─── MIEMBROS / INVITACIONES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS granja_miembros (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  granja_id     uuid        NOT NULL REFERENCES granjas(id) ON DELETE CASCADE,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE,  -- null hasta que acepta
  email_invitado text       NOT NULL,
  estado        text        NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','aceptado','rechazado')),
  invitado_en   timestamptz DEFAULT now(),
  aceptado_en   timestamptz,
  UNIQUE (granja_id, email_invitado)
);
CREATE INDEX IF NOT EXISTS granja_miembros_granja_idx ON granja_miembros (granja_id);
CREATE INDEX IF NOT EXISTS granja_miembros_user_idx   ON granja_miembros (user_id);
CREATE INDEX IF NOT EXISTS granja_miembros_email_idx  ON granja_miembros (email_invitado);

-- ══════════════════════════════════════════════════════════════════
--  Funciones helper (SECURITY DEFINER) para cruzar entre las dos
--  tablas sin disparar recursión infinita de políticas RLS.
-- ══════════════════════════════════════════════════════════════════

-- ¿El usuario actual es propietario de la granja indicada?
CREATE OR REPLACE FUNCTION public.es_propietario_de_granja(_granja_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granjas g
    WHERE g.id = _granja_id AND g.propietario_id = auth.uid()
  );
$$;

-- ¿El usuario actual es miembro/invitado de la granja indicada?
CREATE OR REPLACE FUNCTION public.es_miembro_de_granja(_granja_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.granja_miembros m
    WHERE m.granja_id = _granja_id
      AND (m.user_id = auth.uid() OR m.email_invitado = (auth.jwt() ->> 'email'))
  );
$$;

-- ══════════════════════════════════════════════════════════════════
--  RLS — GRANJAS
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE granjas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "granjas_select" ON granjas;
DROP POLICY IF EXISTS "granjas_insert" ON granjas;
DROP POLICY IF EXISTS "granjas_update" ON granjas;
DROP POLICY IF EXISTS "granjas_delete" ON granjas;

-- Propietario ve su granja; un miembro/invitado también puede verla (para el nombre).
CREATE POLICY "granjas_select" ON granjas FOR SELECT
  USING (propietario_id = auth.uid() OR public.es_miembro_de_granja(id));
-- Solo el propio usuario puede crear su granja (y como es UNIQUE, una sola).
CREATE POLICY "granjas_insert" ON granjas FOR INSERT
  WITH CHECK (propietario_id = auth.uid());
CREATE POLICY "granjas_update" ON granjas FOR UPDATE
  USING (propietario_id = auth.uid()) WITH CHECK (propietario_id = auth.uid());
CREATE POLICY "granjas_delete" ON granjas FOR DELETE
  USING (propietario_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════
--  RLS — GRANJA_MIEMBROS
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE granja_miembros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_select" ON granja_miembros;
DROP POLICY IF EXISTS "gm_insert" ON granja_miembros;
DROP POLICY IF EXISTS "gm_update" ON granja_miembros;
DROP POLICY IF EXISTS "gm_delete" ON granja_miembros;

-- El propietario ve a todos sus miembros; cada invitado ve su propia fila.
CREATE POLICY "gm_select" ON granja_miembros FOR SELECT
  USING (
    public.es_propietario_de_granja(granja_id)
    OR user_id = auth.uid()
    OR email_invitado = (auth.jwt() ->> 'email')
  );
-- Solo el propietario invita (crea filas) en su granja.
CREATE POLICY "gm_insert" ON granja_miembros FOR INSERT
  WITH CHECK (public.es_propietario_de_granja(granja_id));
-- El propietario gestiona; el invitado puede aceptar/rechazar su propia fila.
CREATE POLICY "gm_update" ON granja_miembros FOR UPDATE
  USING (
    public.es_propietario_de_granja(granja_id)
    OR user_id = auth.uid()
    OR email_invitado = (auth.jwt() ->> 'email')
  )
  WITH CHECK (
    public.es_propietario_de_granja(granja_id)
    OR user_id = auth.uid()
    OR email_invitado = (auth.jwt() ->> 'email')
  );
-- Solo el propietario elimina/cancela miembros o invitaciones.
CREATE POLICY "gm_delete" ON granja_miembros FOR DELETE
  USING (public.es_propietario_de_granja(granja_id));
