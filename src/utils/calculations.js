export const calcCostoHa   = c => (c?.itemsCosto || []).reduce((s, i) => s + (parseFloat(i.costoHaUsd) || 0), 0)
export const calcIngresoHa = c => ((parseFloat(c?.rendimientoQq) || 0) / 10) * (parseFloat(c?.precioVentaTn) || 0)

export function calcLote(lote) {
  if (lote.tipoSiembra === 'doble') {
    const ci = calcCostoHa(lote.cultivoInvernal),  ii = calcIngresoHa(lote.cultivoInvernal)
    const ce = calcCostoHa(lote.cultivoEstival),   ie = calcIngresoHa(lote.cultivoEstival)
    return {
      costoHa: ci + ce, ingresoHa: ii + ie, margenHa: (ii + ie) - (ci + ce),
      inv: { costoHa: ci, ingresoHa: ii, margenHa: ii - ci },
      est: { costoHa: ce, ingresoHa: ie, margenHa: ie - ce },
    }
  }
  const c = calcCostoHa(lote.cultivo), i = calcIngresoHa(lote.cultivo)
  return { costoHa: c, ingresoHa: i, margenHa: i - c }
}

export const getLoteName    = l => l.nombre || l.lote || '—'
export const getCultivoLabel = l =>
  l.tipoSiembra === 'doble'
    ? `${l.cultivoInvernal?.nombre} / ${l.cultivoEstival?.nombre}`
    : l.cultivo?.nombre || '—'

export const totalVal = i => (parseFloat(i.cantidad) || 0) * (parseFloat(i.precioUnitario) || 0)
