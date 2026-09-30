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
// (seguro salió de acá: ahora es ítem especial con modalidad monto fijo / % asegurado.)
export const LABOR_CATEGORIA_MAP = {
  cosecha: ['Cosecha'],
  flete:   ['Flete'],
  labor:   ['Aplicación', 'Labranza'],
}
// Categorías que se resuelven como ítem especial manual (no catálogo).
export const CATEGORIAS_ESPECIALES = ['arrendamiento', 'seguro', 'comercializacion']

// Valores típicos de comercialización, precargados al elegir la categoría.
// Son SUGERENCIAS: el usuario los edita libremente en cada ítem.
export const COMERCIALIZACION_DEFAULT = { porcCorredor: 0.5, porcSellado: 0.07, arsPorTn: 850 }

// ── Canon de HT (hectárea tecnológica) ────────────────────────────
// Una HT tiene precio fijo en USD pero cubre N toneladas entregadas, así que
// las HT que consume un lote dependen del rinde. El ítem se vincula a un
// producto del catálogo con unidadPrecio 'ht' y lleva su propio `tnPorHT`
// (NO usa `dosis`: en todo el resto de la app la dosis multiplica y acá
// dividiría, y además `dosis` se suma en los resúmenes de insumos).
export const HT_TN_DEFAULT = 3
export const esItemHT = (item, insumo = null) => !!item?.modoHT || insumo?.unidadPrecio === 'ht'
export const tnPorHTde = item => {
  const n = parseFloat(item?.tnPorHT)
  return n > 0 ? n : HT_TN_DEFAULT
}

// ── Orden y agrupación de ítems de costo ──────────────────────────

// Orden agronómico de las categorías: define cómo se ordenan los ítems en el
// editor y el orden de las porciones en el gráfico de torta.
export const ORDEN_CATEGORIA = [
  'semilla', 'inoculante', 'fertilizante', 'fitosanitario',
  'labor', 'seguro', 'flete', 'cosecha', 'comercializacion', 'arrendamiento', 'otros',
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
  flete: '#8b5cf6', seguro: '#14b8a6', comercializacion: '#0ea5e9', arrendamiento: '#d44f8e', otros: '#9ca3af',
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

// ── Tipo de cambio ────────────────────────────────────────────────
// Un TC inválido (0, null, '', negativo, NaN) NO puede degradar a divisor 1:
// eso convertiría los pesos en dólares. Devuelve el número o null, y todo lo
// que necesite convertir de ARS devuelve null cuando no hay TC — nunca un
// número inventado. `null` es deliberado: `suma + null === suma` en JS, así que
// los totales existentes excluyen lo no convertible en vez de contarlo mal.
export function tcValido(tipoCambio) {
  const n = parseFloat(tipoCambio)
  return Number.isFinite(n) && n > 0 ? n : null
}
export const hayTc = tipoCambio => tcValido(tipoCambio) !== null

// ── Costos fijos de estructura ────────────────────────────────────
// Costo fijo llevado a USD/año: mensual ×12; ARS → USD por tipo de cambio.
// Sin TC, un costo fijo en ARS devuelve null (no convertible).
export function costoFijoAnualUsd(cf, tipoCambio = null) {
  const monto = parseFloat(cf?.monto) || 0
  let usd = monto
  if (cf?.moneda === 'ARS') {
    const tc = tcValido(tipoCambio)
    if (tc === null) return null
    usd = monto / tc
  }
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
    case 'ht':     return 'tn por HT'          // el campo editable es tnPorHT, no la dosis
    default:       return ''
  }
}

// Costo USD/ha de un ítem de costo. Resuelve por insumo del catálogo o por modo especial.
// item: { categoria, insumoId, dosis, modoEspecial, parametroEspecial, costoHaUsd? }
// catalogo: array de insumos; cultivosPrecio: { [nombre]: precioUsdTn } (para soja en alquiler).
// Devuelve null si el ítem está en pesos y no hay tipo de cambio válido: la
// pantalla muestra "—" y el aviso, en vez de un número calculado con divisor 1.
export function calcularCostoItemHa(item, catalogo = [], cultivosPrecio = {}, tipoCambio = null, rendimientoQq = 0, precioVentaTn = 0, labores = []) {
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
    if (labor.moneda === 'ARS') {
      const tc = tcValido(tipoCambio)
      if (tc === null) return null
      costo = costo / tc
    }
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
    if (item.categoria === 'comercializacion') {
      // Gastos de venta del grano. Los dos porcentajes se aplican sobre el valor
      // vendido (USD/tn) y el representante entregador es un monto fijo en ARS
      // por tonelada, que se pasa a USD con el tipo de cambio del BNA:
      //   [(%corredor + %sellado)/100 × precioTn + arsPorTn/tipoCambio] × rinde(tn/ha)
      if (!tiene('porcCorredor') && !tiene('porcSellado') && !tiene('arsPorTn')) return legacy
      const porc = ((parseFloat(p.porcCorredor) || 0) + (parseFloat(p.porcSellado) || 0)) / 100
      const ars  = parseFloat(p.arsPorTn) || 0
      // Sólo el representante entregador está en pesos: si es 0, el ítem es
      // enteramente en USD y no necesita tipo de cambio.
      let arsEnUsd = 0
      if (ars > 0) {
        const tc = tcValido(tipoCambio)
        if (tc === null) return null
        arsEnUsd = ars / tc
      }
      return (porc * precioVenta + arsEnUsd) * rendTn
    }
    if (item.categoria === 'seguro') {
      // % de la prima × precio de mercado del cultivo (USD/tn) × rinde asegurado (tn/ha)
      if (p.modalidad === 'porcentaje') {
        return (parseFloat(p.porcentaje) || 0) / 100 * precioVenta * (parseFloat(p.rindeAsegurado) || 0)
      }
      return tiene('valor') ? (parseFloat(p.valor) || 0) : legacy   // monto_fijo (USD/ha)
    }
    return legacy
  }

  // ── Ítems vinculados al catálogo ──
  if (item.insumoId) {
    const dosis = parseFloat(item.dosis) || 0
    const insumoHT = catalogo.find(i => i.id === item.insumoId)

    // ── Canon de HT: el precio es POR HT y las HT consumidas salen del rinde.
    //      HT/ha  = rinde(tn/ha) / tnPorHT
    //      USD/ha = precioHT × rinde(tn/ha) / tnPorHT
    //   `precioUnit` (Contables) es el precio POR HT congelado; si no está, se
    //   usa el del catálogo con su conversión de moneda. Con rinde 0 da 0.
    if (esItemHT(item, insumoHT)) {
      const tnPorHT = tnPorHTde(item)
      const manual = item.precioUnit != null && item.precioUnit !== ''
      if (!manual && !insumoHT) return parseFloat(item.costoHaUsd) || 0   // referencia rota
      let precioHT = manual ? (parseFloat(item.precioUnit) || 0) : (parseFloat(insumoHT.precio) || 0)
      if (!manual && insumoHT.moneda === 'ARS') {
        const tc = tcValido(tipoCambio)
        if (tc === null) return null
        precioHT = precioHT / tc
      }
      return precioHT * rendTn / tnPorHT
    }

    // Precio MANUAL efectivo (USD por unidad de dosis): costo = precioUnit × dosis,
    // sin más conversión de unidad/moneda. Permite congelar precios históricos y
    // sobrevive aunque el insumo se borre del catálogo.
    if (item.precioUnit != null && item.precioUnit !== '') {
      return (parseFloat(item.precioUnit) || 0) * dosis
    }
    // Sin precio manual: precio actual del catálogo (con su conversión de unidad/moneda).
    const insumo = catalogo.find(i => i.id === item.insumoId)
    if (!insumo) return parseFloat(item.costoHaUsd) || 0   // referencia rota: usa fallback
    const precio = parseFloat(insumo.precio) || 0
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
    if (insumo.moneda === 'ARS') {
      const tc = tcValido(tipoCambio)
      if (tc === null) return null
      costo = costo / tc
    }
    return costo
  }

  // ── Legacy / sin vincular: valor manual ──
  return parseFloat(item.costoHaUsd ?? item.costoHaCalculado) || 0
}

// ¿Este ítem necesita tipo de cambio para poder calcularse?
// Fuente única de verdad: es exactamente el caso en el que calcularCostoItemHa
// devuelve null con TC nulo. Así no se duplica la lógica de ramas (que ya nos
// mordió: la rama de labores corta antes que la de precio manual).
export const itemRequiereTc = (item, catalogo = [], cultivosPrecio = {}, rendimientoQq = 0, precioVentaTn = 0, labores = []) =>
  calcularCostoItemHa(item, catalogo, cultivosPrecio, null, rendimientoQq, precioVentaTn, labores) === null

// Ítems de un cultivo que no se pueden convertir con el TC dado. Con un TC
// válido siempre da 0: sirve para decidir si mostrar el aviso y para bloquear
// el guardado y la exportación.
export function itemsSinTc(cultivoObj, ctx = {}, tipoCambio = null) {
  if (hayTc(tipoCambio)) return []
  return (cultivoObj?.itemsCosto || []).filter(it => itemRequiereTc(
    it, ctx.catalogo || [], ctx.cultivosPrecio || {},
    cultivoObj?.rendimientoQq, cultivoObj?.precioVentaTn, ctx.labores || [],
  ))
}

// ── Hectáreas aplicadas por etapa ─────────────────────────────────
// Una etapa puede haberse aplicado sobre menos hectáreas que el lote (34 de 50)
// o sobre más (dos pasadas sobre 50 = 100). El costo de sus ítems se prorratea
// a la hectárea de LOTE para que la columna siga siendo sumable:
//   costo USD/ha de lote = costo por ha aplicada × (ha etapa ÷ ha lote)
// SIN `haAplicadas` (o sin haLote, como en Proyectados) el factor es 1 y los
// números quedan idénticos a los de siempre. No hay tope: puede ser > haLote.
export function factorEtapa(etapa, haLote) {
  const hE = parseFloat(etapa?.haAplicadas)
  const hL = parseFloat(haLote)
  if (!(hE > 0) || !(hL > 0)) return 1
  return hE / hL
}
// Factor que le toca a un ítem según su etapa. Los ítems que vienen de Stocks
// traen el costo YA expresado por hectárea de lote (`aplicarEnLote` divide por
// las ha del lote), así que se marcan `sinProrrateo` para no prorratearlos dos veces.
export function factorItem(item, etapas, haLote) {
  if (item?.sinProrrateo) return 1
  return factorEtapa((etapas || []).find(e => e.id === item?.etapa), haLote)
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

// No todo el alquiler es fijo. De las tres modalidades del ítem, sólo
// 'porc_grano' (% del grano) escala con el rinde; 'usd_ha' es un monto fijo y
// 'qq_soja' depende del precio de la SOJA, no del rinde de este cultivo.
export const esAlquilerVariable = it =>
  it?.categoria === 'arrendamiento' && it?.parametroEspecial?.modalidad === 'porc_grano'
export const alquilerVariableHaItems = cultivo =>
  (cultivo?.itemsCosto || []).filter(esAlquilerVariable).reduce((s, it) => s + _itemHa(it), 0)

// Lo mismo para los contratos de Contables: 'porcentaje_cosecha' escala con el
// rinde, 'quintales_fijos' no. Devuelve cuánto del alquiler ya calculado es variable.
export const alquilerVariableDeContrato = (contrato, alquilerHa) =>
  contrato?.tipoContrato === 'porcentaje_cosecha' ? (parseFloat(alquilerHa) || 0) : 0

// Categorías cuyo costo escala con las TONELADAS producidas: son los costos
// VARIABLES de la contribución marginal. Cosecha (si es % del valor ya es por
// tn; si es monto fijo/ha, dividirlo por el rinde lo lleva a USD/tn), flete
// (USD/tn) y comercialización si existiera. El resto (semilla, fertilizante,
// fitosanitarios, labores, seguro, arrendamiento) es fijo POR HECTÁREA — se
// gasta igual sea cual sea el rinde — y NO entra.
export const CATEGORIAS_VARIABLES_TN = ['cosecha', 'flete', 'comercializacion']
// El canon de HT también escala con las toneladas (precio_HT ÷ tn_por_HT es un
// costo por tn), pero se carga en categoría 'otros', así que no alcanza con
// mirar la categoría: hay que reconocerlo por el flag del ítem.
export const esItemVariableTn = it => CATEGORIAS_VARIABLES_TN.includes(it?.categoria) || !!it?.modoHT
export const costoVariableHaItems = cultivo =>
  (cultivo?.itemsCosto || []).filter(esItemVariableTn).reduce((s, it) => s + _itemHa(it), 0)

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

// ── Presupuesto de doble cultivo (Proyectados) ────────────────────
// A diferencia de Contables, un presupuesto no está atado a un lote y por lo
// tanto no tiene contrato: el alquiler es el que el usuario carga como ítem
// 'arrendamiento'. Se JUNTA el de los dos cultivos y se reparte según el % que
// define el usuario. Ojo: el reparto NO cambia el total consolidado (mueve
// alquiler de un cultivo al otro), sólo el margen y los indicadores de cada uno.
export function calcProyDoble(p) {
  const rI = parseFloat(p?.repartoInvernal ?? 50) || 0
  const rE = parseFloat(p?.repartoEstival ?? 50) || 0
  const sum = (rI + rE) || 100
  const alquilerTotalHa = alquilerHaItems(p?.cultivoInvernal) + alquilerHaItems(p?.cultivoEstival)
  // La parte del alquiler que escala con el rinde se junta y se reparte con el
  // MISMO porcentaje que el total, para que las dos cifras queden consistentes.
  const alqVarTotalHa = alquilerVariableHaItems(p?.cultivoInvernal) + alquilerVariableHaItems(p?.cultivoEstival)

  const parte = (cultivo, alquilerHa, alquilerVariableHa) => {
    const costoSinAlqHa = costoHaSinAlquiler(cultivo)
    const costoHa   = costoSinAlqHa + alquilerHa
    const ingresoHa = calcIngresoHa(cultivo)
    return {
      nombre: cultivo?.nombre || '—',
      tipo: cultivo?.tipo || 'estival',
      costoSinAlqHa, alquilerHa, costoHa, ingresoHa, margenHa: ingresoHa - costoHa,
      ind: indicadoresCultivo({
        costoSinAlqHa, alquilerHa, alquilerVariableHa, costoVariableHa: costoVariableHaItems(cultivo),
        precioTn: cultivo?.precioVentaTn, rindeQq: cultivo?.rendimientoQq,
      }),
    }
  }

  const inv = parte(p?.cultivoInvernal, alquilerTotalHa * rI / sum, alqVarTotalHa * rI / sum)
  const est = parte(p?.cultivoEstival,  alquilerTotalHa * rE / sum, alqVarTotalHa * rE / sum)
  return {
    alquilerTotalHa,
    costoHa:   inv.costoHa + est.costoHa,
    ingresoHa: inv.ingresoHa + est.ingresoHa,
    margenHa:  (inv.ingresoHa + est.ingresoHa) - (inv.costoHa + est.costoHa),
    inv, est,
  }
}

// Indicadores por cultivo: rinde de indiferencia (con/sin alquiler) y contribución marginal/tn.
// `costoVariableHa` = SOLO las categorías que escalan con las toneladas (ver
// CATEGORIAS_VARIABLES_TN); los llamadores lo obtienen con costoVariableHaItems.
// Mensajes del caso sin solución. Viven acá para que las tres pantallas que
// muestran indicadores no repitan (ni desincronicen) la misma explicación.
export const MSG_SIN_RINDE = {
  sinAlquiler: 'La contribución marginal es negativa: ningún rinde cubre los costos variables.',
  soloConAlquiler: 'Con el alquiler por porcentaje del grano no hay rinde que cubra los costos: se lleva toda la contribución marginal.',
  sinRinde: 'Cargá el rinde para calcular el rinde de indiferencia.',
}

// ── Costo variable POR TONELADA, sin depender del rinde cargado ───
// Los cuatro conceptos variables son exactamente proporcionales al rinde:
//   cosecha  % × rinde_tn × precio   → por tn = % × precio
//   flete    tarifa × rinde_tn       → por tn = tarifa
//   comerc.  usdPorTn × rinde_tn     → por tn = usdPorTn
//   canon HT precioHT × rinde_tn / tnPorHT → por tn = precioHT / tnPorHT
// O sea que la tasa por tonelada se obtiene evaluando la MISMA función de
// costo a un rinde de referencia y dividiendo. No hay fórmula nueva: es el
// mismo motor, así que no puede desincronizarse de lo que se muestra.
//
// Esto arregla I4: `costoVariableHa / rinde` se indefine con rinde 0 y hacía
// que el margen de contribución diera el precio completo y el rinde de
// indiferencia un número plausible pero inventado.
export const RINDE_SONDA_QQ = 100   // 10 tn/ha

// Pasa a "por tonelada" cualquier costo/ha que escale con el rinde, evaluando
// la función a la sonda. `fnHaEnRinde(rindeQq)` devuelve USD/ha (o null).
export function porTnSonda(fnHaEnRinde) {
  const v = fnHaEnRinde(RINDE_SONDA_QQ)
  return v == null ? null : v / (RINDE_SONDA_QQ / 10)
}

// Costo variable USD/tn de un cultivo, recalculando sus ítems variables a la
// sonda. `factor` aplica el prorrateo por etapa (Contables) y `filtro` elige
// qué ítems entran: por defecto los variables por tonelada, pero sirve igual
// para el alquiler por porcentaje del grano (esAlquilerVariable), que también
// escala con el rinde y NO está en CATEGORIAS_VARIABLES_TN.
export function costoVariableTnDe(cultivo, ctx = {}, factor = () => 1, filtro = esItemVariableTn) {
  const items = (cultivo?.itemsCosto || []).filter(filtro)
  if (!items.length) return 0
  return porTnSonda(rinde => {
    let total = 0
    for (const it of items) {
      const v = calcularCostoItemHa(it, ctx.catalogo || [], ctx.cultivosPrecio || {}, ctx.tipoCambio,
        rinde, cultivo?.precioVentaTn, ctx.labores || [])
      if (v === null) return null   // ítem en pesos sin tipo de cambio
      total += v * (parseFloat(factor(it)) || 1)
    }
    return total
  })
}

// `costoVariableTn` y `alquilerVariableTn` son OPCIONALES y preferidos: si el
// llamador puede calcular la tasa por tonelada sin dividir por el rinde (ver
// costoVariableTnDe), el indicador deja de depender del rinde cargado. Si no
// se pasan, el comportamiento es exactamente el de siempre para rinde > 0.
export function indicadoresCultivo({ costoSinAlqHa = 0, alquilerHa = 0, alquilerVariableHa = 0, costoVariableHa = 0, precioTn = 0, rindeQq = 0,
  costoVariableTn = null, alquilerVariableTn = null }) {
  const precio = parseFloat(precioTn) || 0
  const rindeTn = (parseFloat(rindeQq) || 0) / 10
  const sinHa = parseFloat(costoSinAlqHa) || 0
  const alqHa = parseFloat(alquilerHa) || 0
  const conHa = sinHa + alqHa
  const varHa = parseFloat(costoVariableHa) || 0
  // La parte variable nunca puede superar al alquiler total (si el llamador se
  // equivoca, el resto quedaría como fijo negativo).
  const alqVarHa = Math.min(Math.max(0, parseFloat(alquilerVariableHa) || 0), alqHa)

  // Tasa por tonelada. Si el llamador la pasó, se usa tal cual y el indicador
  // no depende del rinde. Si no, se deduce dividiendo, como siempre.
  const varTnDado = costoVariableTn == null ? null : (parseFloat(costoVariableTn) || 0)
  const alqVarTnDado = alquilerVariableTn == null ? null : (parseFloat(alquilerVariableTn) || 0)
  // Con rinde 0 y sin tasa por tonelada no hay forma de saber cuánto cuesta
  // cada tonelada: los cuatro conceptos variables valen 0/ha justamente porque
  // el rinde es 0. Antes se asumía "no hay variables" y salía un número
  // inventado (I4 de la auditoría); ahora se dice que falta el rinde.
  const faltaRinde = rindeTn <= 0 && varTnDado == null

  // ── Denominador VISIBLE: sin alquiler. Es la contribución marginal clásica
  // y no cambia. Variables = cosecha, flete, comercialización y canon HT.
  const costoVarTn = varTnDado != null ? varTnDado : (rindeTn > 0 ? varHa / rindeTn : 0)
  const margenContribTn = precio - costoVarTn

  // ── Denominador CON ALQUILER: suma la parte del alquiler que escala con el
  // rinde ('porc_grano' en los ítems, 'porcentaje_cosecha' en los contratos).
  // Es un segundo denominador, interno: NO se muestra como contribución marginal.
  const varConAlqHa = varHa + alqVarHa
  const alqVarTn = alqVarTnDado != null ? alqVarTnDado : (rindeTn > 0 ? alqVarHa / rindeTn : 0)
  const costoVarConAlqTn = varTnDado != null ? varTnDado + alqVarTn : (rindeTn > 0 ? varConAlqHa / rindeTn : 0)
  const margenContribConAlqTn = precio - costoVarConAlqTn

  // Rinde de indiferencia = costos FIJOS/ha ÷ contribución marginal/tn, cada uno
  // con su denominador. Dividir el costo TOTAL por el precio se muerde la cola
  // cuando hay costos que escalan con el rinde.
  //
  // Si el denominador no es positivo NO existe rinde que dé cero: cada tonelada
  // extra cuesta más de lo que aporta. Devuelve null (no 0, no Infinity, no NaN).
  const fijos = (totalHa, variableHa) => Math.max(0, totalHa - variableHa)
  const indif = (fijosHa, contrib) => (!faltaRinde && contrib > 0) ? fijosHa / contrib : null
  const sinTn = indif(fijos(sinHa, varHa), margenContribTn)
  const conTn = indif(fijos(conHa, varConAlqHa), margenContribConAlqTn)
  const enKg  = tn => tn == null ? null : tn * 1000

  // El alquiler variable puede tumbar SÓLO el rinde con alquiler, con la
  // contribución visible todavía en positivo: ahí el mensaje es otro.
  const sinRindeIndifSin = sinTn === null
  const sinRindeIndifCon = conTn === null

  return {
    costoSinAlqHa: sinHa, alquilerHa: alqHa, alquilerVariableHa: alqVarHa, costoConAlqHa: conHa,
    costoFijoSinAlqHa: fijos(sinHa, varHa),
    costoFijoConAlqHa: fijos(conHa, varConAlqHa),
    rindeIndifSinTn: sinTn, rindeIndifSinKg: enKg(sinTn),
    rindeIndifConTn: conTn, rindeIndifConKg: enKg(conTn),
    costoVariableHa: varHa, costoVariableTn: costoVarTn,
    margenContribTn,                       // el visible: SIN alquiler
    margenContribConAlqTn,                 // interno: denominador del rinde c/alq
    sinRindeIndifSin, sinRindeIndifCon, faltaRinde,
    sinRindeIndif: sinRindeIndifSin || sinRindeIndifCon,
    mensajeSinRinde: faltaRinde ? MSG_SIN_RINDE.sinRinde
      : sinRindeIndifSin ? MSG_SIN_RINDE.sinAlquiler
      : sinRindeIndifCon ? MSG_SIN_RINDE.soloConAlquiler : '',
  }
}
