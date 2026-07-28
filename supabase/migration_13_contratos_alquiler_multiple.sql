-- ══════════════════════════════════════════════════════════════════
--  Don Italo — Migración 13: múltiples contratos de alquiler por lote
--
--  Un lote puede tener VARIOS contratos históricos (uno por período), siempre
--  que sus rangos de campañas NO se superpongan (no puede haber dos contratos
--  vigentes en la misma campaña para el mismo lote).
--
--  • Quita el UNIQUE (user_id, lote_id).
--  • Agrega un trigger que rechaza rangos superpuestos por lote.
--
--  ✔ IDEMPOTENTE. Requiere la tabla contratos_alquiler (migración 11).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- 1) Quitar la unicidad por lote (permitir varios contratos por lote)
ALTER TABLE contratos_alquiler DROP CONSTRAINT IF EXISTS contratos_alquiler_user_id_lote_id_key;
DROP INDEX IF EXISTS contratos_alquiler_user_lote_uidx;
CREATE INDEX IF NOT EXISTS contratos_alquiler_user_lote_idx ON contratos_alquiler (user_id, lote_id);

-- 2) Año de la campaña por los primeros 4 caracteres del string ("2024/25" → 2024).
CREATE OR REPLACE FUNCTION public.campana_anio(_txt text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN left(coalesce(_txt, ''), 4) ~ '^[0-9]{4}$' THEN left(_txt, 4)::int ELSE NULL END;
$$;

-- 3) Trigger: rechazar rangos de campañas superpuestos para el mismo lote.
CREATE OR REPLACE FUNCTION public.contratos_alquiler_sin_solape()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ni int; nf int;
BEGIN
  ni := public.campana_anio(NEW.campana_inicio);
  nf := public.campana_anio(NEW.campana_fin);
  IF ni IS NULL OR nf IS NULL THEN
    RETURN NEW;   -- rango incompleto: no se valida acá
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.contratos_alquiler c
    WHERE c.user_id = NEW.user_id
      AND c.lote_id = NEW.lote_id
      AND c.id <> NEW.id
      AND public.campana_anio(c.campana_inicio) IS NOT NULL
      AND public.campana_anio(c.campana_fin)    IS NOT NULL
      AND ni <= public.campana_anio(c.campana_fin)
      AND nf >= public.campana_anio(c.campana_inicio)
  ) THEN
    RAISE EXCEPTION 'contrato_alquiler_solapado: el rango de campañas se superpone con otro contrato del mismo lote';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contratos_alquiler_sin_solape_trg ON contratos_alquiler;
CREATE TRIGGER contratos_alquiler_sin_solape_trg
  BEFORE INSERT OR UPDATE ON contratos_alquiler
  FOR EACH ROW EXECUTE FUNCTION public.contratos_alquiler_sin_solape();
