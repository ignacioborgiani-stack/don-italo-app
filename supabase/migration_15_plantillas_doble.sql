-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 15: plantillas de costos para DOBLE CULTIVO
--
--  Agrega dos columnas a plantillas_costos. Las filas existentes quedan
--  como 'simple' por el DEFAULT y su contenido NO se toca.
--    • tipo_siembra → discrimina simple vs doble
--    • datos        → payload del doble (los 2 cultivos + el reparto)
--
--  Una plantilla SIMPLE sigue usando cultivo/items_costo/etapas igual que
--  antes, con datos = {}. Una de DOBLE deja items_costo/etapas vacíos,
--  guarda el nombre combinado ("Trigo / Soja") en `cultivo` y en `datos`:
--    { cultivoInvernal: { nombre, itemsCosto, etapas, ordenarCat },
--      cultivoEstival:  { nombre, itemsCosto, etapas, ordenarCat },
--      repartoInvernal, repartoEstival }
--
--  No hace falta tocar RLS: no hay tabla nueva, las políticas de la
--  migración 10 ya cubren estas columnas.
--
--  ✔ IDEMPOTENTE.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE plantillas_costos
  ADD COLUMN IF NOT EXISTS tipo_siembra text NOT NULL DEFAULT 'simple';

ALTER TABLE plantillas_costos
  ADD COLUMN IF NOT EXISTS datos jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Solo 'simple' o 'doble' (idempotente: se recrea si ya existía)
ALTER TABLE plantillas_costos DROP CONSTRAINT IF EXISTS plantillas_costos_tipo_siembra_chk;
ALTER TABLE plantillas_costos
  ADD CONSTRAINT plantillas_costos_tipo_siembra_chk
  CHECK (tipo_siembra IN ('simple','doble'));

-- El filtrado del selector es por (dueño, cultivo, tipo)
DROP INDEX IF EXISTS plantillas_costos_user_cultivo_idx;
CREATE INDEX IF NOT EXISTS plantillas_costos_user_cultivo_tipo_idx
  ON plantillas_costos (user_id, cultivo, tipo_siembra);
