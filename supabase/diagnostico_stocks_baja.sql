-- ============================================================================
-- DIAGNÓSTICO — baja temporal del módulo Stocks (C1 de la auditoría)
--
-- SOLO LECTURA. Las dos consultas son SELECT puros: no crean, no modifican y no
-- borran nada. Se pueden correr en el SQL Editor de Supabase las veces que haga
-- falta.
--
-- Contexto: "Aplicar en campo" guardaba el ítem de costo en la tabla legacy
-- `lotes`, pero Costos Contables lee `asignaciones_campana`. Estas consultas
-- dicen cuánto costo quedó varado ahí y qué alcanzó a registrar `movimientos`.
-- ============================================================================


-- ── 1. Ítems de costo varados en la tabla legacy `lotes` ────────────────────
--
-- Un ítem escrito por aplicarEnLote se reconoce por el campo `origenStock`.
-- Columnas de salida:
--   items_varados_total        · el total, repetido en cada fila (el "cuántos")
--   bloque                     · en qué cultivo del lote cayó (simple / doble)
--   costo_total_usd            · costo_ha_usd × hectáreas del lote
--   hay_asignacion_en_contables· true = ese lote/campaña SÍ existe hoy en
--                                Contables, así que ese costo le está faltando.
--                                false = el lote no está asignado en esa
--                                campaña y el ítem no le falta a nadie.
--
-- Si devuelve 0 filas, no hay nada varado y no perdiste costos por esta vía.

SELECT
  count(*) OVER ()                              AS items_varados_total,
  l.campana,
  l.nombre                                      AS lote,
  b.bloque,
  it ->> 'nombre'                               AS item,
  it ->> 'categoria'                            AS categoria,
  round(v.costo_ha, 2)                          AS costo_ha_usd,
  round(v.costo_ha * coalesce(l.ha, 0), 2)      AS costo_total_usd,
  EXISTS (
    SELECT 1
    FROM asignaciones_campana a
    JOIN lotes_maestro lm ON lm.id = a.lote_id
    WHERE lm.nombre = l.nombre
      AND a.campana = l.campana
      AND a.user_id = l.user_id
  )                                             AS hay_asignacion_en_contables,
  l.user_id
FROM lotes l
CROSS JOIN LATERAL (VALUES
  ('cultivo',          l.cultivo),
  ('cultivo_invernal', l.cultivo_invernal),
  ('cultivo_estival',  l.cultivo_estival)
) AS b(bloque, obj)
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(b.obj -> 'itemsCosto') = 'array'
       THEN b.obj -> 'itemsCosto'
       ELSE '[]'::jsonb END
) AS it
CROSS JOIN LATERAL (
  -- Cast defensivo: si costoHaUsd viniera vacío o no numérico, cuenta como 0
  -- en vez de romper la consulta entera.
  SELECT CASE
    WHEN (it ->> 'costoHaUsd') ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN (it ->> 'costoHaUsd')::numeric
    ELSE 0
  END AS costo_ha
) AS v
WHERE it ->> 'origenStock' IS NOT NULL
ORDER BY l.campana DESC, l.nombre, b.bloque;


-- ── 2. Qué registró `movimientos` ───────────────────────────────────────────
--
-- Resumen por tipo de movimiento. `movimientos` es el rastro de auditoría del
-- módulo: hoy se escribe pero ninguna pantalla lo lee (M7 de la auditoría), así
-- que es la única fuente que queda de lo que pasó con los stocks.
--
-- Si hay filas con tipo 'aplicado', esas son las aplicaciones en campo cuyo
-- costo hay que buscar en la consulta 1.

SELECT
  tipo,
  count(*)                                                          AS movimientos,
  min(fecha)                                                        AS desde,
  max(fecha)                                                        AS hasta,
  count(*) FILTER (WHERE coalesce(lote_nombre, '') <> '')           AS con_lote,
  count(DISTINCT lote_nombre)                                       AS lotes_distintos,
  round(sum(coalesce(costo_ha_usd, 0)), 2)                          AS suma_costo_ha_usd,
  round(sum(coalesce(costo_total_ars, 0)), 2)                       AS suma_costo_total_ars
FROM movimientos
GROUP BY tipo
ORDER BY movimientos DESC;


-- Detalle crudo, por si el resumen muestra algo raro:
-- SELECT * FROM movimientos ORDER BY fecha DESC, created_at DESC LIMIT 200;
