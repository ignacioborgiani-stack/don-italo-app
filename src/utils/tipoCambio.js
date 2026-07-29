// Dólar oficial (Banco Nación) vía la API pública de bluelytics.
// Se usa `oficial.value_sell` = precio de VENTA del BNA, que es el que aplica
// para valuar costos en ARS a USD.
const BLUELYTICS_URL = 'https://api.bluelytics.com.ar/v2/latest'

export async function fetchDolarOficialBNA() {
  const res = await fetch(BLUELYTICS_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`La API respondió ${res.status}`)
  const data = await res.json()
  const valor = Number(data?.oficial?.value_sell)
  if (!valor || !Number.isFinite(valor)) throw new Error('Respuesta sin oficial.value_sell')
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
