-- ══════════════════════════════════════════════════════════════════
--  MIGRACIÓN 16 — Precio de cultivo POR CAMPAÑA + mapeo de pizarra
--
--  POR QUÉ
--  `catalogo_cultivos` tiene un solo precio por cultivo, global para toda
--  la historia. Y el alquiler se calcula EN VIVO con ese precio
--  (calculations.js:413): las dos modalidades de contrato multiplican por
--  `precioRef = cultivosPrecio[contrato.cultivoReferencia]`.
--
--  Resultado: hoy, cambiar el precio de la Soja en el Catálogo cambia el
--  alquiler —y por lo tanto el margen— de TODAS las campañas, incluidas
--  las cerradas. No se nota porque ese precio se toca a mano una o dos
--  veces por campaña. Con precios de pizarra diarios, cada campaña vieja
--  se movería todas las mañanas.
--
--  Esta migración corta esa deriva: el precio pasa a estar atado a la
--  campaña. El catálogo queda como "precio de hoy / semilla para campañas
--  nuevas".
--
--  ✔ IDEMPOTENTE. No borra datos.
--  ✔ El backfill copia el precio actual del catálogo a TODAS las campañas
--    que ya tengan datos, así que después de correrla NINGÚN número se
--    mueve. Eso es a propósito y es lo que hay que verificar.
--
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
--  0 — Requisitos previos
-- ══════════════════════════════════════════════════════════════════
-- Las políticas de miembro reusan helpers de las migraciones 08 y 14. Si
-- alguna no se corrió, mejor un mensaje claro acá que un error críptico
-- cincuenta líneas más abajo (la 14 figura como "sin confirmar" en el
-- CLAUDE.md, así que esto también sirve para saberlo).
DO $$
BEGIN
  IF to_regprocedure('public.granja_es_miembro_aceptado(uuid)') IS NULL
     OR to_regprocedure('public.granja_puede_editar(uuid, text)') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 08 (granja_es_miembro_aceptado / granja_puede_editar). Corré migration_08_granja_permisos.sql antes que esta.';
  END IF;
  IF to_regprocedure('public.granja_acceso_campana_nombre(uuid, text)') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 14 (granja_acceso_campana_nombre). Corré migration_14_seguridad.sql antes que esta.';
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════
--  1 — catalogo_cultivos: mapeo al producto de pizarra
-- ══════════════════════════════════════════════════════════════════
-- La CAC publica cinco: trigo, maiz, girasol, soja, sorgo. El resto de los
-- cultivos (Arveja, Carinata, Cebada…) quedan con pizarra_producto NULL y
-- siguen siendo 100 % manuales.
ALTER TABLE catalogo_cultivos
  ADD COLUMN IF NOT EXISTS pizarra_producto text;

COMMENT ON COLUMN catalogo_cultivos.pizarra_producto IS
  'Producto de la pizarra CAC: trigo|maiz|girasol|soja|sorgo. NULL = sin pizarra, precio manual.';

-- Mapeo inicial por nombre. Tolera variantes ("Soja", "Soja 1ra", "Soja 2da")
-- porque compara por prefijo. Sólo toca las filas que todavía están en NULL,
-- así que volver a correr la migración no pisa lo que hayas elegido a mano.
-- Sin extensión unaccent: el único nombre con tilde es "Maíz", así que se
-- contemplan las dos escrituras a mano.
UPDATE catalogo_cultivos SET pizarra_producto = 'trigo'
 WHERE pizarra_producto IS NULL AND lower(nombre) LIKE 'trigo%';
UPDATE catalogo_cultivos SET pizarra_producto = 'maiz'
 WHERE pizarra_producto IS NULL AND (lower(nombre) LIKE 'maiz%' OR lower(nombre) LIKE 'maíz%');
UPDATE catalogo_cultivos SET pizarra_producto = 'girasol'
 WHERE pizarra_producto IS NULL AND lower(nombre) LIKE 'girasol%';
UPDATE catalogo_cultivos SET pizarra_producto = 'soja'
 WHERE pizarra_producto IS NULL AND lower(nombre) LIKE 'soja%';
UPDATE catalogo_cultivos SET pizarra_producto = 'sorgo'
 WHERE pizarra_producto IS NULL AND lower(nombre) LIKE 'sorgo%';


-- ══════════════════════════════════════════════════════════════════
--  2 — precios_cultivo_campana
-- ══════════════════════════════════════════════════════════════════
-- Un precio por (dueño, cultivo, campaña). `campana` es TEXTO ("2024/25"),
-- igual que en asignaciones_campana y proyecciones, no un FK a campanas.
CREATE TABLE IF NOT EXISTS precios_cultivo_campana (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cultivo       text        NOT NULL,
  campana       text        NOT NULL,
  precio_usd_tn numeric     NOT NULL DEFAULT 0,
  -- 'manual' = lo puso el usuario · 'pizarra' = vino de la CAC.
  -- Sólo se pisan automáticamente los que están en 'pizarra'.
  origen        text        DEFAULT 'manual' CHECK (origen IN ('manual','pizarra')),
  -- Fecha de la pizarra ("2026-09-08") o de la edición manual. Un precio sin
  -- fecha no sirve para decidir, por eso viaja con el dato.
  fecha         text        DEFAULT '',
  actualizado   timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, cultivo, campana)
);

CREATE INDEX IF NOT EXISTS pcc_user_campana_idx
  ON precios_cultivo_campana (user_id, campana);

COMMENT ON TABLE precios_cultivo_campana IS
  'Precio USD/tn de cada cultivo POR CAMPAÑA. Evita que cambiar el precio de hoy mueva los márgenes de campañas cerradas.';


-- ══════════════════════════════════════════════════════════════════
--  3 — Backfill: que NADA se mueva al activar esto
-- ══════════════════════════════════════════════════════════════════
-- Copia el precio actual del catálogo a cada campaña que YA tenga datos.
-- Se toman las campañas de las tres fuentes (la tabla campanas, las
-- asignaciones y las proyecciones) porque puede haber campañas con datos
-- que no tengan fila propia en `campanas`; si alguna quedara afuera, su
-- alquiler pasaría a 0 y se movería un número.
INSERT INTO precios_cultivo_campana (user_id, cultivo, campana, precio_usd_tn, origen, fecha)
SELECT k.user_id, k.nombre, c.campana, k.precio_usd_tn, 'manual', ''
  FROM catalogo_cultivos k
  JOIN (
    SELECT user_id, nombre  AS campana FROM campanas             WHERE coalesce(nombre, '')  <> ''
    UNION
    SELECT user_id, campana            FROM asignaciones_campana WHERE coalesce(campana, '') <> ''
    UNION
    SELECT user_id, campana            FROM proyecciones         WHERE coalesce(campana, '') <> ''
    UNION
    SELECT user_id, campana_inicio     FROM contratos_alquiler   WHERE coalesce(campana_inicio, '') <> ''
    UNION
    SELECT user_id, campana_fin        FROM contratos_alquiler   WHERE coalesce(campana_fin, '')    <> ''
  ) c ON c.user_id = k.user_id
 WHERE k.precio_usd_tn > 0
ON CONFLICT (user_id, cultivo, campana) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════
--  4 — RLS
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE precios_cultivo_campana ENABLE ROW LEVEL SECURITY;

-- ── Dueño ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pcc_select" ON precios_cultivo_campana;
DROP POLICY IF EXISTS "pcc_insert" ON precios_cultivo_campana;
DROP POLICY IF EXISTS "pcc_update" ON precios_cultivo_campana;
DROP POLICY IF EXISTS "pcc_delete" ON precios_cultivo_campana;
CREATE POLICY "pcc_select" ON precios_cultivo_campana FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pcc_insert" ON precios_cultivo_campana FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pcc_update" ON precios_cultivo_campana FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pcc_delete" ON precios_cultivo_campana FOR DELETE USING (auth.uid() = user_id);

-- ── Miembro de granja ─────────────────────────────────────────────
-- LECTURA: cualquier miembro aceptado, igual que el resto del catálogo —
-- el precio hace falta para calcular costos en Contables y Proyectados —
-- pero acotado a las campañas que tenga habilitadas (mismo criterio que
-- asignaciones_campana en la migración 14).
-- ESCRITURA: módulo 'catalogo', que es donde se editan los precios.
-- (Reusa los helpers SECURITY DEFINER de las migraciones 08 y 14.)
DROP POLICY IF EXISTS "gm_pcc_select" ON precios_cultivo_campana;
DROP POLICY IF EXISTS "gm_pcc_insert" ON precios_cultivo_campana;
DROP POLICY IF EXISTS "gm_pcc_update" ON precios_cultivo_campana;
DROP POLICY IF EXISTS "gm_pcc_delete" ON precios_cultivo_campana;
CREATE POLICY "gm_pcc_select" ON precios_cultivo_campana FOR SELECT
  USING (public.granja_es_miembro_aceptado(user_id)
     AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_pcc_insert" ON precios_cultivo_campana FOR INSERT
  WITH CHECK (public.granja_puede_editar(user_id, 'catalogo')
          AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_pcc_update" ON precios_cultivo_campana FOR UPDATE
  USING (public.granja_puede_editar(user_id, 'catalogo')
     AND public.granja_acceso_campana_nombre(user_id, campana))
  WITH CHECK (public.granja_puede_editar(user_id, 'catalogo')
          AND public.granja_acceso_campana_nombre(user_id, campana));
CREATE POLICY "gm_pcc_delete" ON precios_cultivo_campana FOR DELETE
  USING (public.granja_puede_editar(user_id, 'catalogo')
     AND public.granja_acceso_campana_nombre(user_id, campana));


-- ══════════════════════════════════════════════════════════════════
--  5 — Verificación (SOLO LECTURA)
-- ══════════════════════════════════════════════════════════════════
-- 5a. Qué quedó cargado, por campaña.
SELECT campana,
       count(*)                                    AS precios,
       count(*) FILTER (WHERE precio_usd_tn > 0)   AS con_valor
  FROM precios_cultivo_campana
 GROUP BY campana
 ORDER BY campana DESC;

-- 5b. LA IMPORTANTE: contratos de alquiler cuyo cultivo de referencia NO
--     tiene precio en una campaña que sí tiene asignaciones. Tiene que
--     devolver CERO filas. Si devuelve alguna, ese alquiler pasaría de un
--     número a 0 al activar la etapa 3, o sea que ahí SÍ se movería algo.
SELECT DISTINCT a.campana, ca.cultivo_referencia, lm.nombre AS lote
  FROM asignaciones_campana a
  JOIN lotes_maestro      lm ON lm.id = a.lote_id
  JOIN contratos_alquiler ca ON ca.user_id = a.user_id AND ca.lote_id = a.lote_id
 WHERE coalesce(ca.cultivo_referencia, '') <> ''
   AND NOT EXISTS (
     SELECT 1 FROM precios_cultivo_campana p
      WHERE p.user_id = a.user_id
        AND p.campana = a.campana
        AND p.cultivo = ca.cultivo_referencia)
 ORDER BY a.campana DESC;
