import * as XLSX from 'xlsx'
import { calcularCostoItemHa, unidadDosisInsumo, unidadDosisLabor } from './calculations'

// ── Resolución de nombre / cantidad / unidad de un ítem de costo ──
export function nombreItem(it, ctx) {
  if (it.insumoId) return ctx.catalogo.find(i => i.id === it.insumoId)?.nombre || it.nombreManual || '—'
  if (it.laborId)  return ctx.labores.find(l => l.id === it.laborId)?.nombre  || it.nombreManual || '—'
  return it.nombreManual || it.nombre || '—'
}

export function unidadItem(it, ctx) {
  if (it.insumoId) return unidadDosisInsumo(ctx.catalogo.find(i => i.id === it.insumoId))
  if (it.laborId) {
    const l = ctx.labores.find(x => x.id === it.laborId)
    return l?.esPorcentaje ? '% valor' : unidadDosisLabor(l)
  }
  if (it.modoEspecial) {
    const p = it.parametroEspecial || {}
    return p.modalidad === 'usd_ha' ? 'USD/ha' : p.modalidad === 'qq_soja' ? 'qq soja/ha' : '% grano'
  }
  return ''
}

export function cantidadItem(it, ctx) {
  if (it.laborId) {
    const l = ctx.labores.find(x => x.id === it.laborId)
    if (l?.esPorcentaje) return Number(it.dosis ?? l.porcentaje ?? 0)
    if (l && (l.unidadPrecio === 'tn' || l.unidadPrecio === 'qq')) return ''   // se calcula por rinde
  }
  if (it.modoEspecial) {
    const p = it.parametroEspecial || {}
    return Number((p.modalidad === 'porc_grano' ? p.porcentaje : p.valor) ?? 0)
  }
  if (it.insumoId || it.laborId) return Number(it.dosis ?? 0)
  return it.dosis != null && it.dosis !== '' ? Number(it.dosis) : ''
}

// Filas (formato UI) de un cultivoObj con sus costos
export function filasCultivo(cultivoObj, ha, ctx, cultivoLabel = '') {
  if (!cultivoObj) return []
  const rend = cultivoObj.rendimientoQq, precio = cultivoObj.precioVentaTn
  return (cultivoObj.itemsCosto || []).map(it => {
    const costoHa = calcularCostoItemHa(it, ctx.catalogo, ctx.cultivosPrecio, ctx.tipoCambio, rend, precio, ctx.labores)
    return {
      cultivo:    cultivoLabel || cultivoObj.nombre || '',
      insumo:     nombreItem(it, ctx),
      categoria:  it.categoria || '',
      cantidad:   cantidadItem(it, ctx),
      unidad:     unidadItem(it, ctx),
      costoHa:    Math.round(costoHa * 100) / 100,
      costoTotal: Math.round(costoHa * (parseFloat(ha) || 0) * 100) / 100,
    }
  })
}

// Filas de una asignación (simple o doble cultivo)
export function filasAsignacion(asig, ha, ctx) {
  if (!asig) return []
  if (asig.tipoSiembra === 'doble') {
    return [
      ...filasCultivo(asig.cultivoInvernal, ha, ctx, asig.cultivoInvernal?.nombre),
      ...filasCultivo(asig.cultivoEstival,  ha, ctx, asig.cultivoEstival?.nombre),
    ]
  }
  return filasCultivo(asig.cultivo, ha, ctx, asig.cultivo?.nombre)
}

// ── Exportación a Excel ───────────────────────────────────────────
const num = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : n)

// Convierte filas UI → filas con encabezados en español para la planilla
function filaExcel(f, { conLote = false } = {}) {
  const base = conLote ? { Lote: f.lote || '' } : {}
  return {
    ...base,
    Cultivo: f.cultivo,
    Insumo: f.insumo,
    Categoría: f.categoria,
    Cantidad: f.cantidad,
    Unidad: f.unidad,
    'Costo/ha (USD)': num(f.costoHa),
    'Costo total (USD)': num(f.costoTotal),
  }
}

// Genera el .xlsx: hoja 1 = detalle del lote/cultivo, hoja 2 = resumen de la campaña.
export function exportarExcel({ archivo, hojaDetalle, filasDetalle, filasResumen, campania }) {
  const wb = XLSX.utils.book_new()

  const wsDet = XLSX.utils.json_to_sheet(filasDetalle.map(f => filaExcel(f)))
  XLSX.utils.book_append_sheet(wb, wsDet, (hojaDetalle || 'Detalle').slice(0, 31))

  const wsRes = XLSX.utils.json_to_sheet(filasResumen.map(f => filaExcel(f, { conLote: true })))
  XLSX.utils.book_append_sheet(wb, wsRes, `Resumen ${campania || ''}`.trim().slice(0, 31).replace(/[/\\?*[\]]/g, '-'))

  XLSX.writeFile(wb, archivo)
}
