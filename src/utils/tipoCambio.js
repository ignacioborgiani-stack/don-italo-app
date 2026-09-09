// Dólar oficial (Banco Nación) vía la API pública de bluelytics.
//
// El objeto `oficial` trae value_buy (compra), value_sell (venta) y value_avg.
// Se usa **value_buy = COMPRA**: es el dólar al que el productor liquida el
// grano, así que es la vara real contra la que se miden los costos. Como el
// tipo de cambio va en el DIVISOR, usar compra (más bajo que venta) hace que
// los insumos en pesos valgan un poco más medidos en USD.
const BLUELYTICS_URL = 'https://api.bluelytics.com.ar/v2/latest'

export async function fetchDolarOficialBNA() {
  const res = await fetch(BLUELYTICS_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`La API respondió ${res.status}`)
  const data = await res.json()
  const valor = Number(data?.oficial?.value_buy)
  if (!valor || !Number.isFinite(valor)) throw new Error('Respuesta sin oficial.value_buy')
  return { valor, actualizado: data.last_update || new Date().toISOString() }
}

// "28/07 14:35" — corto, para mostrar al lado del valor.
export function fmtActualizado(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  const f = d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
  return f.replace(',', '')
}

export const fmtARS = n => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
