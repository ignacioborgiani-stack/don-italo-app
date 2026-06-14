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

export const proyToDb = (p, campana = '2024/25') => ({
  cultivo: p.cultivo,
  campana: p.campana || campana,
  datos: { tipo: p.tipo, rendimientoQq: p.rendimientoQq, precioVentaTn: p.precioVentaTn, itemsCosto: p.itemsCosto || [] },
})
export const proyFromDb = r => ({
  id: r.id, cultivo: r.cultivo, campana: r.campana,
  tipo: r.datos?.tipo || 'estival',
  rendimientoQq: r.datos?.rendimientoQq || 0,
  precioVentaTn: r.datos?.precioVentaTn || 0,
  itemsCosto: r.datos?.itemsCosto || [],
})

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
