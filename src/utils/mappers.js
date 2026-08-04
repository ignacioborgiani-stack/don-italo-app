export const loteToDb = l => ({
  id: l.id, nombre: l.nombre, campana: l.campaña,
  ha: parseFloat(l.ha) || 0, notas: l.notas || '',
  tipo_siembra: l.tipoSiembra || 'simple',
  cultivo: l.cultivo || null,
  cultivo_invernal: l.cultivoInvernal || null,
  cultivo_estival: l.cultivoEstival || null,
})
export const loteFromDb = r => ({
  id: r.id, nombre: r.nombre, campaña: r.campana, ha: r.ha, notas: r.notas || '',
  tipoSiembra: r.tipo_siembra, cultivo: r.cultivo,
  cultivoInvernal: r.cultivo_invernal, cultivoEstival: r.cultivo_estival,
})

// Un presupuesto de doble cultivo se guarda en UNA sola fila: ambos cultivos van
// dentro del JSONB `datos` (misma forma que `asignaciones_campana` en Contables).
// No hace falta migración: `datos` ya es jsonb y la columna `cultivo` guarda el
// nombre combinado ("Trigo / Soja"), con lo que el UNIQUE(user_id, cultivo,
// campana) sigue valiendo = un presupuesto por combinación y campaña.
const cultivoProyToDb = c => ({
  nombre: c?.nombre || '',
  tipo: c?.tipo || 'estival',
  rendimientoQq: c?.rendimientoQq || 0,
  precioVentaTn: c?.precioVentaTn || 0,
  itemsCosto: c?.itemsCosto || [],
  etapas: c?.etapas || [],
  ordenarCat: c?.ordenarCat !== false,
})
const cultivoProyFromDb = (c, tipo) => ({
  nombre: c?.nombre || '',
  tipo: c?.tipo || tipo,
  rendimientoQq: c?.rendimientoQq || 0,
  precioVentaTn: c?.precioVentaTn || 0,
  itemsCosto: c?.itemsCosto || [],
  etapas: c?.etapas || [],
  ordenarCat: c?.ordenarCat !== false,
})
// Nombre combinado que va a la columna `cultivo` de un presupuesto doble.
export const nombreDoble = (inv, est) => `${inv || '—'} / ${est || '—'}`

// `campana` es obligatoria: la tabla tiene UNIQUE(user_id, cultivo, campana). El
// fallback lo decide quien llama (nunca una campaña fija acá, que etiquetaría
// presupuestos nuevos en una campaña vieja).
export const proyToDb = (p, campana) => ({
  cultivo: p.tipoSiembra === 'doble' ? nombreDoble(p.cultivoInvernal?.nombre, p.cultivoEstival?.nombre) : p.cultivo,
  campana: p.campana || campana,
  datos: p.tipoSiembra === 'doble'
    ? {
        tipoSiembra: 'doble',
        cultivoInvernal: cultivoProyToDb(p.cultivoInvernal),
        cultivoEstival:  cultivoProyToDb(p.cultivoEstival),
        // Reparto del alquiler entre los dos cultivos (%).
        repartoInvernal: p.repartoInvernal == null ? 50 : parseFloat(p.repartoInvernal),
        repartoEstival:  p.repartoEstival  == null ? 50 : parseFloat(p.repartoEstival),
      }
    : {
        tipo: p.tipo, rendimientoQq: p.rendimientoQq, precioVentaTn: p.precioVentaTn,
        itemsCosto: p.itemsCosto || [], etapas: p.etapas || [], ordenarCat: p.ordenarCat !== false,
      },
})
export const proyFromDb = r => {
  const d = r.datos || {}
  const base = { id: r.id, cultivo: r.cultivo, campana: r.campana }
  // Las filas viejas no tienen `tipoSiembra` → simple (no se tocan).
  if (d.tipoSiembra === 'doble') {
    return {
      ...base,
      tipoSiembra: 'doble',
      cultivoInvernal: cultivoProyFromDb(d.cultivoInvernal, 'invernal'),
      cultivoEstival:  cultivoProyFromDb(d.cultivoEstival, 'estival'),
      repartoInvernal: d.repartoInvernal == null ? 50 : parseFloat(d.repartoInvernal),
      repartoEstival:  d.repartoEstival  == null ? 50 : parseFloat(d.repartoEstival),
    }
  }
  return {
    ...base,
    tipoSiembra: 'simple',
    tipo: d.tipo || 'estival',
    rendimientoQq: d.rendimientoQq || 0,
    precioVentaTn: d.precioVentaTn || 0,
    itemsCosto: d.itemsCosto || [],
    etapas: d.etapas || [],
    ordenarCat: d.ordenarCat !== false,
  }
}

export const stToDb = s => ({
  id: s.id, nombre: s.nombre, tipo: s.tipo,
  cantidad: parseFloat(s.cantidad) || 0, unidad: s.unidad,
  precio_valor: parseFloat(s.precioUnitario) || 0,
  precio_moneda: s.precioMoneda || 'ARS',
  precio_unidad_precio: s.precioUnidadPrecio || s.unidad || '',
  proveedor: s.proveedor || '', ubicacion: s.ubicacion,
  lote_asignado: s.lote || null, campana: s.campana || '2024/25',
  fecha: s.fecha || null, remito: s.remito || '', notas: s.notas || '',
})
export const stFromDb = r => ({
  id: r.id, nombre: r.nombre, tipo: r.tipo,
  cantidad: r.cantidad, unidad: r.unidad,
  precioUnitario: r.precio_valor, precioMoneda: r.precio_moneda || 'ARS',
  precioUnidadPrecio: r.precio_unidad_precio || '',
  proveedor: r.proveedor, ubicacion: r.ubicacion,
  lote: r.lote_asignado, campana: r.campana,
  fecha: r.fecha, remito: r.remito, notas: r.notas,
})

// ── Lotes maestro (catastro) ──────────────────────────────────────
export const loteMaestroToDb = l => ({
  id: l.id,
  nombre: l.nombre,
  ha: parseFloat(l.ha) || 0,
  ubicacion: l.ubicacion || '',
  lat: (l.lat === '' || l.lat == null) ? null : parseFloat(l.lat),
  lng: (l.lng === '' || l.lng == null) ? null : parseFloat(l.lng),
  poligono: (Array.isArray(l.poligono) && l.poligono.length) ? l.poligono : null,
  notas: l.notas || '',
})
export const loteMaestroFromDb = r => ({
  id: r.id,
  nombre: r.nombre,
  ha: r.ha,
  ubicacion: r.ubicacion || '',
  lat: r.lat,
  lng: r.lng,
  poligono: r.poligono || null,
  notas: r.notas || '',
})

// ── Asignaciones por campaña (lote ↔ campaña ↔ cultivo + costos) ───
export const asignacionToDb = a => ({
  id: a.id,
  lote_id: a.loteId,
  campana: a.campaña,
  tipo_siembra: a.tipoSiembra || 'simple',
  cultivo: a.cultivo || null,
  cultivo_invernal: a.cultivoInvernal || null,
  cultivo_estival: a.cultivoEstival || null,
})
export const asignacionFromDb = r => ({
  id: r.id,
  loteId: r.lote_id,
  campaña: r.campana,
  tipoSiembra: r.tipo_siembra,
  cultivo: r.cultivo,
  cultivoInvernal: r.cultivo_invernal,
  cultivoEstival: r.cultivo_estival,
})

// ── Costos fijos de estructura (por campaña) ──────────────────────
export const costoFijoToDb = c => ({
  id: c.id,
  campana_id: c.campanaId || null,
  concepto: c.concepto || '',
  monto: parseFloat(c.monto) || 0,
  moneda: c.moneda || 'USD',
  periodicidad: c.periodicidad || 'anual',
  notas: c.notas || '',
})
export const costoFijoFromDb = r => ({
  id: r.id,
  campanaId: r.campana_id || null,
  concepto: r.concepto || '',
  monto: parseFloat(r.monto) || 0,
  moneda: r.moneda || 'USD',
  periodicidad: r.periodicidad || 'anual',
  notas: r.notas || '',
  createdAt: r.created_at,
})

// ── Granjas (multi-usuario tipo clan) — Parte 1 ───────────────────
export const granjaToDb = g => ({
  id: g.id,
  propietario_id: g.propietarioId,
  nombre: g.nombre || '',
})
export const granjaFromDb = r => ({
  id: r.id,
  propietarioId: r.propietario_id,
  nombre: r.nombre || '',
  createdAt: r.created_at,
})

export const miembroFromDb = r => ({
  id: r.id,
  granjaId: r.granja_id,
  userId: r.user_id || null,
  emailInvitado: r.email_invitado || '',
  estado: r.estado || 'pendiente',
  invitadoEn: r.invitado_en,
  aceptadoEn: r.aceptado_en || null,
  // nombre de la granja cuando viene por join (granjas(nombre, propietario_id))
  granjaNombre: r.granjas?.nombre || null,
  granjaPropietarioId: r.granjas?.propietario_id || null,
})

// ── Contratos de alquiler por lote (rango de campañas) ────────────
export const contratoAlquilerToDb = c => ({
  id: c.id,
  lote_id: c.loteId,
  campana_inicio: c.campanaInicio || '',
  campana_fin: c.campanaFin || '',
  tipo_contrato: c.tipoContrato || 'quintales_fijos',
  cultivo_referencia: c.cultivoReferencia || '',
  cantidad: parseFloat(c.cantidad) || 0,
  reparto_estival: c.repartoEstival == null ? 100 : parseFloat(c.repartoEstival),
  reparto_invernal: c.repartoInvernal == null ? 0 : parseFloat(c.repartoInvernal),
})
export const contratoAlquilerFromDb = r => ({
  id: r.id,
  loteId: r.lote_id,
  campanaInicio: r.campana_inicio || '',
  campanaFin: r.campana_fin || '',
  tipoContrato: r.tipo_contrato || 'quintales_fijos',
  cultivoReferencia: r.cultivo_referencia || '',
  cantidad: parseFloat(r.cantidad) || 0,
  repartoEstival: r.reparto_estival == null ? 100 : parseFloat(r.reparto_estival),
  repartoInvernal: r.reparto_invernal == null ? 0 : parseFloat(r.reparto_invernal),
})

// ── Plantillas de costos (Proyectados) ────────────────────────────
// Bloque de un cultivo dentro de una plantilla de doble. Igual que las simples,
// la plantilla NO guarda rinde ni precio de venta: sólo etapas e ítems.
const cultivoPlantillaToDb = c => ({
  nombre: c?.nombre || '',
  itemsCosto: Array.isArray(c?.itemsCosto) ? c.itemsCosto : [],
  etapas: Array.isArray(c?.etapas) ? c.etapas : [],
  ordenarCat: c?.ordenarCat !== false,
})
const cultivoPlantillaFromDb = c => ({
  nombre: c?.nombre || '',
  itemsCosto: c?.itemsCosto || [],
  etapas: c?.etapas || [],
  ordenarCat: c?.ordenarCat !== false,
})

// Una plantilla de DOBLE guarda los dos cultivos + el reparto del alquiler en la
// columna `datos` (migración 15) y el nombre combinado en `cultivo`. Las simples
// siguen usando cultivo/items_costo/etapas exactamente como antes, con datos={}.
export const plantillaToDb = p => {
  const esDoble = p.tipoSiembra === 'doble'
  return {
    id: p.id,
    cultivo: esDoble ? nombreDoble(p.cultivoInvernal?.nombre, p.cultivoEstival?.nombre) : (p.cultivo || ''),
    nombre: p.nombre || '',
    tipo_siembra: esDoble ? 'doble' : 'simple',
    items_costo: esDoble ? [] : (Array.isArray(p.itemsCosto) ? p.itemsCosto : []),
    etapas:      esDoble ? [] : (Array.isArray(p.etapas) ? p.etapas : []),
    datos: esDoble
      ? {
          cultivoInvernal: cultivoPlantillaToDb(p.cultivoInvernal),
          cultivoEstival:  cultivoPlantillaToDb(p.cultivoEstival),
          repartoInvernal: p.repartoInvernal == null ? 50 : parseFloat(p.repartoInvernal),
          repartoEstival:  p.repartoEstival  == null ? 50 : parseFloat(p.repartoEstival),
        }
      : {},
  }
}
export const plantillaFromDb = r => {
  const base = { id: r.id, cultivo: r.cultivo || '', nombre: r.nombre || '', createdAt: r.created_at }
  // Las filas anteriores a la migración 15 no tienen tipo_siembra → simple.
  if (r.tipo_siembra === 'doble') {
    const d = r.datos || {}
    return {
      ...base,
      tipoSiembra: 'doble',
      cultivoInvernal: cultivoPlantillaFromDb(d.cultivoInvernal),
      cultivoEstival:  cultivoPlantillaFromDb(d.cultivoEstival),
      repartoInvernal: d.repartoInvernal == null ? 50 : parseFloat(d.repartoInvernal),
      repartoEstival:  d.repartoEstival  == null ? 50 : parseFloat(d.repartoEstival),
    }
  }
  return { ...base, tipoSiembra: 'simple', itemsCosto: r.items_costo || [], etapas: r.etapas || [] }
}

// ── Catálogo de insumos ───────────────────────────────────────────
export const catToDb = c => ({
  id: c.id,
  nombre: c.nombre,
  familia: c.familia || 'Otros',
  categoria: c.categoria || 'otro',
  precio: parseFloat(c.precio) || 0,
  moneda: c.moneda || 'USD',
  unidad_precio: c.unidadPrecio || 'kg',
  kg_por_bolsa: c.kgPorBolsa ? parseFloat(c.kgPorBolsa) : null,
  equivalencias: Array.isArray(c.equivalencias) && c.equivalencias.length ? c.equivalencias : null,
  activo: c.activo === false ? false : true,
  notas: c.notas || '',
})

export const catFromDb = r => ({
  id: r.id,
  nombre: r.nombre,
  familia: r.familia || 'Otros',
  categoria: r.categoria || 'otro',
  precio: parseFloat(r.precio) || 0,
  moneda: r.moneda || 'USD',
  unidadPrecio: r.unidad_precio || 'kg',
  kgPorBolsa: r.kg_por_bolsa ? parseFloat(r.kg_por_bolsa) : null,
  equivalencias: r.equivalencias || [],
  activo: r.activo === false ? false : true,
  notas: r.notas || '',
})

// ── Catálogo de labores y servicios ───────────────────────────────
export const laborToDb = l => ({
  id: l.id,
  nombre: l.nombre,
  categoria: l.categoria || 'Otro',
  precio: parseFloat(l.precio) || 0,
  moneda: l.moneda || 'USD',
  unidad_precio: l.unidadPrecio || 'ha',
  es_porcentaje: !!l.esPorcentaje,
  porcentaje: (l.porcentaje === '' || l.porcentaje == null) ? null : parseFloat(l.porcentaje),
  notas: l.notas || '',
  activo: l.activo === false ? false : true,
})
export const laborFromDb = r => ({
  id: r.id,
  nombre: r.nombre,
  categoria: r.categoria || 'Otro',
  precio: parseFloat(r.precio) || 0,
  moneda: r.moneda || 'USD',
  unidadPrecio: r.unidad_precio || 'ha',
  esPorcentaje: !!r.es_porcentaje,
  porcentaje: r.porcentaje == null ? null : parseFloat(r.porcentaje),
  notas: r.notas || '',
  activo: r.activo === false ? false : true,
})

// ── Catálogo de cultivos (precios y rindes de referencia) ─────────
export const cultivoRefToDb = c => ({
  id: c.id,
  nombre: c.nombre,
  tipo: c.tipo || 'estival',
  precio_usd_tn: parseFloat(c.precioUsdTn) || 0,
  rendimiento_estimado_qq: parseFloat(c.rendimientoEstimadoQq) || 0,
  cosecha_porc: parseFloat(c.cosechaPorc) || 0,
  comercializacion_porc: parseFloat(c.comercializacionPorc) || 0,
  comercializacion_fija_usd_tn: parseFloat(c.comercializacionFijaUsdTn) || 0,
  flete_usd_tn: parseFloat(c.fleteUsdTn) || 0,
  seguro_usd_ha: parseFloat(c.seguroUsdHa) || 0,
  rendimiento_asegurado_qq: parseFloat(c.rendimientoAseguradoQq) || 0,
  alquiler_qq_soja: parseFloat(c.alquilerQqSoja) || 0,
  notas: c.notas || '',
})

export const cultivoRefFromDb = r => ({
  id: r.id,
  nombre: r.nombre,
  tipo: r.tipo || 'estival',
  precioUsdTn: parseFloat(r.precio_usd_tn) || 0,
  rendimientoEstimadoQq: parseFloat(r.rendimiento_estimado_qq) || 0,
  cosechaPorc: parseFloat(r.cosecha_porc) || 0,
  comercializacionPorc: parseFloat(r.comercializacion_porc) || 0,
  comercializacionFijaUsdTn: parseFloat(r.comercializacion_fija_usd_tn) || 0,
  fleteUsdTn: parseFloat(r.flete_usd_tn) || 0,
  seguroUsdHa: parseFloat(r.seguro_usd_ha) || 0,
  rendimientoAseguradoQq: parseFloat(r.rendimiento_asegurado_qq) || 0,
  alquilerQqSoja: parseFloat(r.alquiler_qq_soja) || 0,
  notas: r.notas || '',
})
