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

// ── Agrupación y orden ────────────────────────────────────────────
const ORDEN_CAT = ['semilla', 'inoculante', 'fertilizante', 'fitosanitario', 'labor', 'seguro', 'flete', 'cosecha', 'arrendamiento', 'otros']
const ordenCat = c => { const i = ORDEN_CAT.indexOf((c || '').toLowerCase()); return i === -1 ? ORDEN_CAT.length : i }
const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100

// Agrupa por insumo (dentro de un lote/cultivo): suma cantidades y costos totales,
// recalcula Costo/ha = costo total / ha, y ordena por categoría.
export function agrupar(filas, ha, { conLote = false } = {}) {
  const haNum = parseFloat(ha) || 0
  const m = new Map()
  for (const f of filas) {
    const key = `${conLote ? (f.lote || '') : ''}||${f.cultivo || ''}||${f.insumo}`
    if (!m.has(key)) m.set(key, { lote: f.lote || '', cultivo: f.cultivo || '', insumo: f.insumo, categoria: f.categoria, unidad: f.unidad, ha: conLote ? (parseFloat(f.ha) || 0) : haNum, cant: 0, hayCant: false, costoTotal: 0 })
    const g = m.get(key)
    const c = parseFloat(f.cantidad)
    if (Number.isFinite(c)) { g.cant += c; g.hayCant = true }
    g.costoTotal += parseFloat(f.costoTotal) || 0
  }
  const out = [...m.values()].map(g => ({
    lote: g.lote, cultivo: g.cultivo, insumo: g.insumo, categoria: g.categoria, unidad: g.unidad,
    cantidad: g.hayCant ? r2(g.cant) : '',
    costoHa: g.ha > 0 ? r2(g.costoTotal / g.ha) : 0,   // Costo/ha = total / hectáreas
    costoTotal: r2(g.costoTotal),
  }))
  out.sort((a, b) =>
    (conLote ? String(a.lote).localeCompare(String(b.lote)) : 0) ||
    ordenCat(a.categoria) - ordenCat(b.categoria) ||
    String(a.insumo).localeCompare(String(b.insumo)))
  return out
}

// Etiquetas de categoría para los encabezados de la UI.
export const LABEL_CATEGORIA = {
  semilla: 'Semillas', inoculante: 'Inoculantes', fertilizante: 'Fertilizantes',
  fitosanitario: 'Fitosanitarios', labor: 'Labores', seguro: 'Seguro',
  flete: 'Flete', cosecha: 'Cosecha', arrendamiento: 'Arrendamiento', otros: 'Otros',
}

// Agrupa (con agrupar) y arma secciones por categoría para mostrar en pantalla.
// Devuelve { secciones: [{ categoria, label, filas }], total, totalHa }.
export function agruparEnSecciones(filas, ha) {
  const planas = agrupar(filas, ha)
  const secciones = []
  for (const f of planas) {
    let sec = secciones[secciones.length - 1]
    if (!sec || sec.categoria !== f.categoria) {
      sec = { categoria: f.categoria, label: LABEL_CATEGORIA[f.categoria] || f.categoria || 'Otros', filas: [] }
      secciones.push(sec)
    }
    sec.filas.push(f)
  }
  const total = planas.reduce((s, f) => s + (parseFloat(f.costoTotal) || 0), 0)
  return { secciones, total: r2(total), totalHa: parseFloat(ha) > 0 ? r2(total / parseFloat(ha)) : 0 }
}

// Genera el .xlsx: hoja 1 = detalle del lote/cultivo (agrupado), hoja 2 = resumen de la campaña.
export function exportarExcel({ archivo, hojaDetalle, filasDetalle, haDetalle, filasResumen, campania }) {
  const wb = XLSX.utils.book_new()

  // Hoja detalle: agrupada por insumo + fila TOTAL al final
  const det = agrupar(filasDetalle, haDetalle)
  const totalDet = det.reduce((s, f) => s + (parseFloat(f.costoTotal) || 0), 0)
  det.push({ cultivo: '', insumo: 'TOTAL', categoria: '', cantidad: '', unidad: '', costoHa: haDetalle > 0 ? r2(totalDet / haDetalle) : '', costoTotal: r2(totalDet) })
  const wsDet = XLSX.utils.json_to_sheet(det.map(f => filaExcel(f)))
  XLSX.utils.book_append_sheet(wb, wsDet, (hojaDetalle || 'Detalle').slice(0, 31).replace(/[/\\?*[\]]/g, '-'))

  // Hoja resumen: agrupada por lote+insumo + TOTAL general
  const res = agrupar(filasResumen, null, { conLote: true })
  const totalRes = res.reduce((s, f) => s + (parseFloat(f.costoTotal) || 0), 0)
  res.push({ lote: 'TOTAL', cultivo: '', insumo: '', categoria: '', cantidad: '', unidad: '', costoHa: '', costoTotal: r2(totalRes) })
  const wsRes = XLSX.utils.json_to_sheet(res.map(f => filaExcel(f, { conLote: true })))
  XLSX.utils.book_append_sheet(wb, wsRes, `Resumen ${campania || ''}`.trim().slice(0, 31).replace(/[/\\?*[\]]/g, '-'))

  XLSX.writeFile(wb, archivo)
}
