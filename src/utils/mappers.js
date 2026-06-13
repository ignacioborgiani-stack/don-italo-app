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
