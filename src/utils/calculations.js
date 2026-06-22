import { CATEGORIAS } from './constants'

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
// Categoría del ítem → categorías del catálogo de LABORES que se ofrecen.
export const LABOR_CATEGORIA_MAP = {
  cosecha: ['Cosecha'],
  flete:   ['Flete'],
  labor:   ['Aplicación', 'Labranza'],
  seguro:  ['Seguro'],
}
// Categorías que se resuelven como ítem especial manual (no catálogo).
export const CATEGORIAS_ESPECIALES = ['arrendamiento']

// ── Orden y agrupación de ítems de costo ──────────────────────────

// Orden agronómico de las categorías: define cómo se ordenan los ítems en el
// editor y el orden de las porciones en el gráfico de torta.
export const ORDEN_CATEGORIA = [
  'semilla', 'inoculante', 'fertilizante', 'fitosanitario',
  'labor', 'seguro', 'flete', 'cosecha', 'arrendamiento', 'otros',
]
const ordenCatIdx = cat => {
  const i = ORDEN_CATEGORIA.indexOf(cat)
  return i === -1 ? ORDEN_CATEGORIA.length : i
}
const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS.map(c => [c.key, c.label]))

// Color por categoría para el gráfico de torta agrupado por familia.
export const CATEGORIA_COLOR = {
  semilla: '#4a7c59', inoculante: '#82b366', fertilizante: '#e8a838',
  fitosanitario: '#5b8dd9', labor: '#c4893a', cosecha: '#d4a017',
  flete: '#8b5cf6', seguro: '#14b8a6', arrendamiento: '#d44f8e', otros: '#9ca3af',
}

// Ordena los ítems de costo por categoría (orden agronómico fijo). Es un orden
// ESTABLE: dentro de cada categoría se respeta el orden del array, que es el
// orden manual que el usuario define arrastrando. No muta el array original.
export function ordenarItemsCosto(items = []) {
  return [...items].sort((a, b) => ordenCatIdx(a.categoria) - ordenCatIdx(b.categoria))
}

// Agrupa los ítems de costo por categoría/familia para el gráfico de torta.
// Devuelve [{ name, value, color }] ordenado y sin categorías en cero.
export function pieCostosPorCategoria(items = []) {
  const acc = {}
  for (const it of items) {
    const val = parseFloat(it.costoHaCalculado ?? it.costoHaUsd) || 0
    if (val <= 0) continue
    const cat = it.categoria || 'otros'
    acc[cat] = (acc[cat] || 0) + val
  }
  return Object.keys(acc)
    .sort((a, b) => ordenCatIdx(a) - ordenCatIdx(b))
    .map(cat => ({ name: CATEGORIA_LABEL[cat] || cat, value: acc[cat], color: CATEGORIA_COLOR[cat] || '#9ca3af' }))
}

// ── Costos fijos de estructura ────────────────────────────────────
// Costo fijo llevado a USD/año: mensual ×12; ARS → USD por tipo de cambio.
export function costoFijoAnualUsd(cf, tipoCambio = 1) {
  const monto = parseFloat(cf?.monto) || 0
  const usd = cf?.moneda === 'ARS' ? monto / (parseFloat(tipoCambio) || 1) : monto
  return usd * (cf?.periodicidad === 'mensual' ? 12 : 1)
}

// Etiqueta de la cantidad para una labor del catálogo.
export function unidadDosisLabor(labor) {
  if (!labor) return ''
  if (labor.esPorcentaje) return '% del valor'
  switch (labor.unidadPrecio) {
    case 'tn':     return '× rinde (tn)'
    case 'qq':     return '× rinde (qq)'
    case 'ha':     return 'pasadas'
    case 'viaje':  return 'viajes'
    case 'unidad': return 'unidades'
    default:       return ''
  }
}

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
export function calcularCostoItemHa(item, catalogo = [], cultivosPrecio = {}, tipoCambio = 1, rendimientoQq = 0, precioVentaTn = 0, labores = []) {
  const rendTn = (parseFloat(rendimientoQq) || 0) / 10
  const precioVenta = parseFloat(precioVentaTn) || 0

  // ── Labor / servicio del catálogo de labores ──
  if (item.laborId) {
    const labor = labores.find(l => l.id === item.laborId)
    if (!labor) return parseFloat(item.costoHaUsd) || 0
    if (labor.esPorcentaje) {
      const porc = (item.dosis != null && item.dosis !== '') ? parseFloat(item.dosis) : parseFloat(labor.porcentaje)
      return (porc || 0) / 100 * rendTn * precioVenta
    }
    const precio = parseFloat(labor.precio) || 0
    const dosis = parseFloat(item.dosis) || 1
    let costo
    switch (labor.unidadPrecio) {
      case 'tn':     costo = precio * rendTn; break                          // flete: USD/tn × rinde
      case 'qq':     costo = precio * (parseFloat(rendimientoQq) || 0); break
      case 'ha':     costo = precio * dosis; break                           // pasadas
      case 'viaje':
      case 'unidad': costo = precio * dosis; break
      default:       costo = precio * dosis
    }
    if (labor.moneda === 'ARS') costo = costo / (parseFloat(tipoCambio) || 1)
    return costo
  }

  // ── Ítems especiales (arrendamiento) ──
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

// Igual que calcLote pero suma el alquiler del CONTRATO. Evita doble conteo:
// con contrato, se ignoran los ítems manuales de categoría 'arrendamiento'.
export function calcLoteConAlquiler(asignacion, ha, contrato, cultivosPrecio = {}) {
  if (!contrato) return calcLote(asignacion)
  const alq = alquilerPorCultivo(contrato, asignacion, ha, cultivosPrecio)
  const costoCult = (cultivo, alquilerHa) => costoHaSinAlquiler(cultivo) + (alquilerHa || 0)
  if (asignacion.tipoSiembra === 'doble') {
    const ce = costoCult(asignacion.cultivoEstival, alq.estivalHa),  ie = calcIngresoHa(asignacion.cultivoEstival)
    const ci = costoCult(asignacion.cultivoInvernal, alq.invernalHa), ii = calcIngresoHa(asignacion.cultivoInvernal)
    return { costoHa: ce + ci, ingresoHa: ie + ii, margenHa: (ie + ii) - (ce + ci),
      est: { costoHa: ce, ingresoHa: ie, margenHa: ie - ce }, inv: { costoHa: ci, ingresoHa: ii, margenHa: ii - ci } }
  }
  const c = costoCult(asignacion.cultivo, alq.simpleHa), i = calcIngresoHa(asignacion.cultivo)
  return { costoHa: c, ingresoHa: i, margenHa: i - c }
}

// ¿El cultivo / la asignación tienen un ítem 'arrendamiento' cargado a mano?
export const tieneArrendamientoManual = cultivo => (cultivo?.itemsCosto || []).some(it => it.categoria === 'arrendamiento')
export const asignacionTieneArrendamientoManual = a => a?.tipoSiembra === 'doble'
  ? (tieneArrendamientoManual(a.cultivoInvernal) || tieneArrendamientoManual(a.cultivoEstival))
  : tieneArrendamientoManual(a?.cultivo)

export const getLoteName    = l => l.nombre || l.lote || '—'
export const getCultivoLabel = l =>
  l.tipoSiembra === 'doble'
    ? `${l.cultivoInvernal?.nombre} / ${l.cultivoEstival?.nombre}`
    : l.cultivo?.nombre || '—'

export const totalVal = i => (parseFloat(i.cantidad) || 0) * (parseFloat(i.precioUnitario) || 0)

// ══════════════════════════════════════════════════════════════════
//  Alquiler por lote + indicadores (rinde de indiferencia, margen/tn)
// ══════════════════════════════════════════════════════════════════
const _itemHa = it => parseFloat(it.costoHaCalculado ?? it.costoHaUsd) || 0

// Costo USD/ha del cultivo SIN alquiler (excluye ítems categoría 'arrendamiento').
export const costoHaSinAlquiler = cultivo =>
  (cultivo?.itemsCosto || []).filter(it => it.categoria !== 'arrendamiento').reduce((s, it) => s + _itemHa(it), 0)
// Alquiler USD/ha cargado como ítem 'arrendamiento' del editor (se usa en Proyectados).
export const alquilerHaItems = cultivo =>
  (cultivo?.itemsCosto || []).filter(it => it.categoria === 'arrendamiento').reduce((s, it) => s + _itemHa(it), 0)

// Total USD del alquiler del lote según el contrato (depende del precio del cultivo de referencia).
//   quintales_fijos:    cantidad(qq/ha) × ha / 10 (→tn) × precioRef(USD/tn)
//   porcentaje_cosecha: cantidad(%)/100 × rinde estival(qq/ha) × ha / 10 (→tn) × precioRef
export function calcAlquilerTotal(contrato, { ha = 0, rindeEstivalQq = 0, cultivosPrecio = {} } = {}) {
  if (!contrato || !contrato.tipoContrato) return 0
  const precioRef = parseFloat(cultivosPrecio[contrato.cultivoReferencia]) || 0
  const haN = parseFloat(ha) || 0
  const cant = parseFloat(contrato.cantidad) || 0
  if (!precioRef || !haN || !cant) return 0
  if (contrato.tipoContrato === 'quintales_fijos')    return (cant * haN / 10) * precioRef
  if (contrato.tipoContrato === 'porcentaje_cosecha') return (cant / 100) * ((parseFloat(rindeEstivalQq) || 0) * haN / 10) * precioRef
  return 0
}

// Reparte el alquiler total del lote entre sus cultivos (USD totales y USD/ha).
export function alquilerPorCultivo(contrato, asignacion, ha, cultivosPrecio = {}) {
  const haN = parseFloat(ha) || 0
  const esDoble = asignacion?.tipoSiembra === 'doble'
  const estival = esDoble ? asignacion?.cultivoEstival : asignacion?.cultivo
  const rindeEstivalQq = parseFloat(estival?.rendimientoQq) || 0
  const total = calcAlquilerTotal(contrato, { ha: haN, rindeEstivalQq, cultivosPrecio })
  const perHa = v => haN ? v / haN : 0
  if (esDoble) {
    const rE = parseFloat(contrato?.repartoEstival ?? 100) || 0
    const rI = parseFloat(contrato?.repartoInvernal ?? 0) || 0
    const sum = (rE + rI) || 100
    const estUsd = total * rE / sum, invUsd = total * rI / sum
    return { total, estivalUsd: estUsd, invernalUsd: invUsd, estivalHa: perHa(estUsd), invernalHa: perHa(invUsd) }
  }
  return { total, simpleUsd: total, simpleHa: perHa(total) }
}

// Indicadores por cultivo: rinde de indiferencia (con/sin alquiler) y margen de contribución/tn.
export function indicadoresCultivo({ costoSinAlqHa = 0, alquilerHa = 0, precioTn = 0, rindeQq = 0 }) {
  const precio = parseFloat(precioTn) || 0
  const rindeTn = (parseFloat(rindeQq) || 0) / 10
  const sinHa = parseFloat(costoSinAlqHa) || 0
  const conHa = sinHa + (parseFloat(alquilerHa) || 0)
  const indif = costo => precio > 0 ? costo / precio : 0   // tn/ha
  const sinTn = indif(sinHa), conTn = indif(conHa)
  const costoVarTn = rindeTn > 0 ? conHa / rindeTn : 0
  return {
    costoSinAlqHa: sinHa, alquilerHa: parseFloat(alquilerHa) || 0, costoConAlqHa: conHa,
    rindeIndifSinTn: sinTn, rindeIndifSinKg: sinTn * 1000,
    rindeIndifConTn: conTn, rindeIndifConKg: conTn * 1000,
    costoVariableTn: costoVarTn, margenContribTn: precio - costoVarTn,
  }
}
