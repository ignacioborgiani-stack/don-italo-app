import * as XLSX from 'xlsx'
import { calcularCostoItemHa, unidadDosisInsumo, unidadDosisLabor } from './calculations'

// ── Resolución de nombre / cantidad / unidad de un ítem de costo ──
export function nombreItem(it, ctx) {
  if (it.insumoId) return ctx.catalogo.find(i => i.id === it.insumoId)?.nombre || it.nombreManual || '—'
  if (it.laborId)  return ctx.labores.find(l => l.id === it.laborId)?.nombre  || it.nombreManual || '—'
  return it.nombreManual || it.nombre || '—'
}

export function unidadItem(it, ctx) {
  // El canon de HT no tiene "cantidad" acumulable: se informa el parámetro del
  // contrato (tn que cubre una HT) como unidad, y la cantidad queda vacía.
  if (it.modoHT) return `canon HT (${Number(it.tnPorHT) || 3} tn/HT)`
  if (it.insumoId) return unidadDosisInsumo(ctx.catalogo.find(i => i.id === it.insumoId))
  if (it.laborId) {
    const l = ctx.labores.find(x => x.id === it.laborId)
    return l?.esPorcentaje ? '% valor' : unidadDosisLabor(l)
  }
  if (it.modoEspecial) {
    const p = it.parametroEspecial || {}
    if (it.categoria === 'seguro') return p.modalidad === 'porcentaje' ? '% + rinde aseg.' : 'USD/ha'
    if (it.categoria === 'comercializacion') return '% s/venta + ARS/tn'
    return p.modalidad === 'usd_ha' ? 'USD/ha' : p.modalidad === 'qq_soja' ? 'qq soja/ha' : '% grano'
  }
  return ''
}

export function cantidadItem(it, ctx) {
  // HT: `tnPorHT` es un factor de conversión, NO una cantidad — si se devolviera
  // acá, `agrupar()` sumaría los factores de dos ítems de HT (3 + 3 = 6).
  if (it.modoHT) return ''
  if (it.laborId) {
    const l = ctx.labores.find(x => x.id === it.laborId)
    if (l?.esPorcentaje) return Number(it.dosis ?? l.porcentaje ?? 0)
    if (l && (l.unidadPrecio === 'tn' || l.unidadPrecio === 'qq')) return ''   // se calcula por rinde
  }
  if (it.modoEspecial) {
    const p = it.parametroEspecial || {}
    if (it.categoria === 'seguro') return Number((p.modalidad === 'porcentaje' ? p.porcentaje : p.valor) ?? 0)
    // Comercialización se compone de 3 parámetros: se informa el % total sobre
    // la venta (el ARS/tn del representante no es comparable en la columna).
    if (it.categoria === 'comercializacion') {
      return Number(((parseFloat(p.porcCorredor) || 0) + (parseFloat(p.porcSellado) || 0)).toFixed(4))
    }
    return Number((p.modalidad === 'porc_grano' ? p.porcentaje : p.valor) ?? 0)
  }
  if (it.insumoId || it.laborId) return Number(it.dosis ?? 0)
  return it.dosis != null && it.dosis !== '' ? Number(it.dosis) : ''
}

// Filas (formato UI) de un cultivoObj con sus costos.
// `congelado`: Costos Contables → usa el precio guardado (costoHaCalculado del
// JSONB), no relee el catálogo. Proyectados (default) → recalcula en vivo.
export function filasCultivo(cultivoObj, ha, ctx, cultivoLabel = '', { congelado = false } = {}) {
  if (!cultivoObj) return []
  const rend = cultivoObj.rendimientoQq, precio = cultivoObj.precioVentaTn
  return (cultivoObj.itemsCosto || []).map(it => {
    const costoHa = congelado
      ? (parseFloat(it.costoHaCalculado ?? it.costoHaUsd) || 0)
      : calcularCostoItemHa(it, ctx.catalogo, ctx.cultivosPrecio, ctx.tipoCambio, rend, precio, ctx.labores)
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

// Filas de una asignación (simple o doble cultivo). Propaga `opts` (ej: {congelado:true}).
export function filasAsignacion(asig, ha, ctx, opts = {}) {
  if (!asig) return []
  if (asig.tipoSiembra === 'doble') {
    return [
      ...filasCultivo(asig.cultivoInvernal, ha, ctx, asig.cultivoInvernal?.nombre, opts),
      ...filasCultivo(asig.cultivoEstival,  ha, ctx, asig.cultivoEstival?.nombre, opts),
    ]
  }
  return filasCultivo(asig.cultivo, ha, ctx, asig.cultivo?.nombre, opts)
}

// ── Exportación a Excel ───────────────────────────────────────────
const num = n => (typeof n === 'number' ? Math.round(n * 100) / 100 : n)

// Unidades que expresan una dosis POR HECTÁREA: son las únicas donde el consumo
// total en unidades físicas tiene sentido (cantidad × hectáreas). Quedan afuera
// 'ha (pasadas)' de las labores, 'tn por HT' del canon, y todo lo que se calcula
// por rinde o por porcentaje del valor.
const UNIDADES_POR_HA = ['kg/ha', 'litros/ha', 'bolsas/ha', 'unidades/ha']
export const esUnidadPorHa = u => UNIDADES_POR_HA.includes(String(u || '').trim().toLowerCase())

// Consumo total en unidades físicas. Devuelve '' (NO 0) cuando no aplica, para
// que la celda quede vacía y no se confunda con un consumo nulo.
export function consumoTotal(cantidad, ha, unidad) {
  if (!esUnidadPorHa(unidad)) return ''
  const c = parseFloat(cantidad), h = parseFloat(ha)
  if (!Number.isFinite(c) || !Number.isFinite(h)) return ''
  return r2(c * h)
}

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
    Hectáreas: num(f.ha),
    'Consumo total (unidades)': f.consumo === '' || f.consumo == null ? '' : num(f.consumo),
    'Costo/ha (USD)': num(f.costoHa),
    'Costo total (USD)': num(f.costoTotal),
  }
}

// ── Agrupación y orden ────────────────────────────────────────────
const ORDEN_CAT = ['semilla', 'inoculante', 'fertilizante', 'fitosanitario', 'labor', 'seguro', 'flete', 'cosecha', 'comercializacion', 'arrendamiento', 'otros']
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
  const out = [...m.values()].map(g => {
    const cantidad = g.hayCant ? r2(g.cant) : ''
    return {
      lote: g.lote, cultivo: g.cultivo, insumo: g.insumo, categoria: g.categoria, unidad: g.unidad,
      cantidad,
      // Las hectáreas SALEN DEL DATO (catastro), no de dividir costo total por
      // costo/ha; por eso se propagan hasta acá en vez de descartarse.
      ha: g.ha,
      consumo: consumoTotal(cantidad, g.ha, g.unidad),
      costoHa: g.ha > 0 ? r2(g.costoTotal / g.ha) : 0,   // Costo/ha = total / hectáreas
      costoTotal: r2(g.costoTotal),
    }
  })
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
  flete: 'Flete', cosecha: 'Cosecha', comercializacion: 'Comercialización',
  arrendamiento: 'Arrendamiento', otros: 'Otros',
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

// ── Hoja "Consumo campaña" ────────────────────────────────────────
// Referencias de columna en la hoja Resumen (ver filaExcel con conLote:true):
//   A Lote · B Cultivo · C Insumo · D Categoría · E Cantidad · F Unidad
//   G Hectáreas · H Consumo total · I Costo/ha · J Costo total
const RES_COL = { insumo: 'C', unidad: 'F', consumo: 'H', costoTotal: 'J' }

// Excel usa * ? como comodines en los criterios de SUMIFS/COUNTIFS y ~ para
// escaparlos. Sin esto, un insumo llamado "Fungicida *plus*" sumaría de más EN
// SILENCIO. El ~ va primero para no re-escapar los que agrega este mismo paso.
const escaparComodines = s => String(s ?? '').replace(/~/g, '~~').replace(/([*?])/g, '~$1')
const tieneComodines = s => /[*?~]/.test(String(s ?? ''))
// Criterio del SUMIFS: por defecto apunta a la celda (clickeable y legible); si
// el texto trae comodines, se usa el literal escapado para que no sobre-sume.
const criterio = (valor, celda) => tieneComodines(valor)
  ? `"${escaparComodines(valor).replace(/"/g, '""')}"`
  : celda

// Agrupa IGNORANDO mayúsculas/minúsculas: SUMIFS tampoco distingue, así que si
// "DIFLUFENICAN" y "diflufenican" fueran dos filas, cada una sumaría las dos y
// el total saldría duplicado. Una sola fila por grupo, con la primera grafía.
export function agruparConsumoCampania(filasResumen) {
  const m = new Map()
  for (const f of filasResumen) {
    if (!f.insumo) continue
    const key = `${String(f.insumo).toLowerCase()}||${String(f.unidad || '').toLowerCase()}`
    if (!m.has(key)) m.set(key, { insumo: f.insumo, unidad: f.unidad || '', lotes: new Set(), variantes: new Set() })
    const g = m.get(key)
    g.variantes.add(f.insumo)
    if (f.lote) g.lotes.add(f.lote)
  }
  return [...m.values()]
    .map(g => ({ insumo: g.insumo, unidad: g.unidad, lotesDistintos: g.lotes.size, variantes: g.variantes.size }))
    .sort((a, b) => String(a.insumo).localeCompare(String(b.insumo), 'es', { sensitivity: 'base' }))
}

// Arma la hoja con los totales como FÓRMULAS que apuntan al Resumen.
function hojaConsumoCampania(filasRes, nombreHojaResumen) {
  const grupos = agruparConsumoCampania(filasRes)
  // El nombre de hoja lleva espacio → va entre comillas simples en la fórmula.
  const R = `'${String(nombreHojaResumen).replace(/'/g, "''")}'`
  const col = c => `${R}!$${c}:$${c}`

  const encabezado = ['Insumo', 'Unidad', 'Consumo total', 'Filas en Resumen', 'Lotes (dato calculado)', 'Costo total (USD)']
  const filas = grupos.map(g => [g.insumo, g.unidad, null, null, g.lotesDistintos, null])
  const ws = XLSX.utils.aoa_to_sheet([encabezado, ...filas])

  grupos.forEach((g, i) => {
    const r = i + 2                                   // fila 1 = encabezado
    const cI = criterio(g.insumo, `$A${r}`)
    const cU = criterio(g.unidad, `$B${r}`)
    const filtro = `${col(RES_COL.insumo)},${cI},${col(RES_COL.unidad)},${cU}`
    ws[`C${r}`] = { t: 'n', f: `SUMIFS(${col(RES_COL.consumo)},${filtro})` }
    ws[`D${r}`] = { t: 'n', f: `COUNTIFS(${filtro})` }
    ws[`F${r}`] = { t: 'n', f: `SUMIFS(${col(RES_COL.costoTotal)},${filtro})` }
  })

  // ── Bloque de control ──
  const ultima = grupos.length + 1
  const fCtrl = ultima + 2
  const set = (ref, cell) => { ws[ref] = cell }
  set(`A${fCtrl}`,     { t: 's', v: 'CONTROL' })
  set(`A${fCtrl + 1}`, { t: 's', v: 'Suma de esta hoja' })
  set(`C${fCtrl + 1}`, { t: 'n', f: grupos.length ? `SUM(C2:C${ultima})` : '0' })
  set(`A${fCtrl + 2}`, { t: 's', v: 'Suma del Resumen (consumo)' })
  set(`C${fCtrl + 2}`, { t: 'n', f: `SUM(${col(RES_COL.consumo)})` })
  set(`A${fCtrl + 3}`, { t: 's', v: 'Diferencia (debe ser 0)' })
  set(`C${fCtrl + 3}`, { t: 'n', f: `C${fCtrl + 1}-C${fCtrl + 2}` })

  const fNota = fCtrl + 5
  set(`A${fNota}`,     { t: 's', v: 'Cómo se arma: Hectáreas (del catastro) → Consumo por fila (Cantidad × Hectáreas, sólo unidades por ha) → esta hoja (SUMIFS sobre el Resumen).' })
  set(`A${fNota + 1}`, { t: 's', v: 'La fila CONTROL es un control de integridad, no una cifra de negocio: suma unidades distintas (kg con litros) y sólo sirve para verificar que no se perdió ni se duplicó ninguna fila.' })
  set(`A${fNota + 2}`, { t: 's', v: 'Los insumos se agrupan ignorando mayúsculas y minúsculas, porque SUMIFS tampoco las distingue.' })

  // Sin ampliar el rango, writeFile DESCARTA en silencio todo lo que quedó
  // fuera del !ref que dejó aoa_to_sheet.
  ws['!ref'] = `A1:F${fNota + 2}`
  ws['!cols'] = [{ wch: 34 }, { wch: 14 }, { wch: 15 }, { wch: 17 }, { wch: 21 }, { wch: 17 }]
  return ws
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
  // La fila TOTAL deja el consumo VACÍO a propósito: sumar kg con litros no
  // significa nada. (Además, con insumo vacío ningún SUMIFS la levanta.)
  res.push({ lote: 'TOTAL', cultivo: '', insumo: '', categoria: '', cantidad: '', unidad: '', ha: '', consumo: '', costoHa: '', costoTotal: r2(totalRes) })
  const wsRes = XLSX.utils.json_to_sheet(res.map(f => filaExcel(f, { conLote: true })))
  const nombreRes = `Resumen ${campania || ''}`.trim().slice(0, 31).replace(/[/\\?*[\]]/g, '-')
  XLSX.utils.book_append_sheet(wb, wsRes, nombreRes)

  // Hoja 3: consumo por insumo de toda la campaña, con fórmulas al Resumen.
  // Se arma con las filas SIN la fila TOTAL (que no es un insumo).
  XLSX.utils.book_append_sheet(wb, hojaConsumoCampania(res.slice(0, -1), nombreRes), 'Consumo campaña')

  XLSX.writeFile(wb, archivo)
}
