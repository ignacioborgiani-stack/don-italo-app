// Suma de costos por ha. Soporta el formato nuevo (costoHaCalculado) y el viejo (costoHaUsd).
export const calcCostoHa   = c => (c?.itemsCosto || []).reduce((s, i) => s + (parseFloat(i.costoHaCalculado ?? i.costoHaUsd) || 0), 0)
export const calcIngresoHa = c => ((parseFloat(c?.rendimientoQq) || 0) / 10) * (parseFloat(c?.precioVentaTn) || 0)

// ── Vínculo ítem de costo ↔ catálogo de insumos ───────────────────

// Categoría del ítem → familias del catálogo que se ofrecen en el selector.
export const CATEGORIA_A_FAMILIAS = {
  semilla:       ['Semillas'],
  inoculante:    ['Inoculantes'],
  fertilizante:  ['Fertilizantes'],
  fitosanitario: ['Herbicidas', 'Insecticidas', 'Fungicidas', 'Curasemillas', 'Biológicos', 'Coadyuvantes'],
  labor:         ['Labores'],
  otros:         null,   // null = todas las familias
}
// Categorías que NO usan catálogo (se calculan por rendimiento/valor).
export const CATEGORIAS_ESPECIALES = ['cosecha', 'flete', 'arrendamiento']

// Unidad de dosis que corresponde a un insumo del catálogo.
export function unidadDosisInsumo(insumo) {
  if (!insumo) return ''
  switch (insumo.unidadPrecio) {
    case 'tn':     return 'kg/ha'                                  // fertilizante: precio/tn, dosis en kg
    case 'kg':     return 'kg/ha'
    case 'litro':  return 'litros/ha'
    case 'bolsa':  return insumo.kgPorBolsa ? 'kg/ha' : 'bolsas/ha'
    case 'ha':     return 'ha (pasadas)'
    case 'unidad': return 'unidades/ha'
    default:       return ''
  }
}

// Costo USD/ha de un ítem de costo. Resuelve por insumo del catálogo o por modo especial.
// item: { categoria, insumoId, dosis, modoEspecial, parametroEspecial, costoHaUsd? }
// catalogo: array de insumos; cultivosPrecio: { [nombre]: precioUsdTn } (para soja en alquiler).
export function calcularCostoItemHa(item, catalogo = [], cultivosPrecio = {}, tipoCambio = 1, rendimientoQq = 0, precioVentaTn = 0) {
  const rendTn = (parseFloat(rendimientoQq) || 0) / 10
  const precioVenta = parseFloat(precioVentaTn) || 0

  // ── Ítems especiales (cosecha / flete / arrendamiento) ──
  // Especial por flag explícito o por categoría. Si falta el parámetro,
  // cae al valor viejo (costoHaUsd) para no perder datos existentes.
  const esEspecial = item.modoEspecial || CATEGORIAS_ESPECIALES.includes(item.categoria)
  if (esEspecial) {
    const p = item.parametroEspecial || {}
    const legacy = parseFloat(item.costoHaUsd ?? item.costoHaCalculado) || 0
    const tiene = k => p[k] != null && p[k] !== ''
    if (item.categoria === 'cosecha') {
      return tiene('porcentaje') ? (parseFloat(p.porcentaje) || 0) / 100 * rendTn * precioVenta : legacy
    }
    if (item.categoria === 'flete') {
      return tiene('tarifaUsdTn') ? (parseFloat(p.tarifaUsdTn) || 0) * rendTn : legacy
    }
    if (item.categoria === 'arrendamiento') {
      if (p.modalidad === 'qq_soja') {
        const precioSoja = parseFloat(cultivosPrecio['Soja']) || 0
        return tiene('valor') ? (parseFloat(p.valor) || 0) * precioSoja / 10 : legacy
      }
      if (p.modalidad === 'porc_grano') {
        return tiene('porcentaje') ? (parseFloat(p.porcentaje) || 0) / 100 * rendTn * precioVenta : legacy
      }
      return tiene('valor') ? (parseFloat(p.valor) || 0) : legacy   // usd_ha (default)
    }
    return legacy
  }

  // ── Ítems vinculados al catálogo ──
  if (item.insumoId) {
    const insumo = catalogo.find(i => i.id === item.insumoId)
    if (!insumo) return parseFloat(item.costoHaUsd) || 0   // referencia rota: usa fallback
    const precio = parseFloat(insumo.precio) || 0
    const dosis = parseFloat(item.dosis) || 0
    let costo = 0
    switch (insumo.unidadPrecio) {
      case 'tn':     costo = (precio / 1000) * dosis; break                 // dosis kg/ha
      case 'kg':
      case 'litro':  costo = precio * dosis; break
      case 'bolsa':  costo = insumo.kgPorBolsa ? precio * (dosis / insumo.kgPorBolsa) : precio * dosis; break
      case 'ha':
      case 'unidad': costo = precio * dosis; break
      default:       costo = precio * dosis
    }
    if (insumo.moneda === 'ARS') costo = costo / (parseFloat(tipoCambio) || 1)
    return costo
  }

  // ── Legacy / sin vincular: valor manual ──
  return parseFloat(item.costoHaUsd ?? item.costoHaCalculado) || 0
}

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
