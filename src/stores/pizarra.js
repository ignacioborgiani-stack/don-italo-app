// Precios de pizarra de la Cámara Arbitral de Cereales de Rosario.
//
// Los trae /api/pizarra (función serverless). No se puede pedir la página de
// la CAC desde el navegador: no manda cabeceras CORS. Ver api/pizarra.js.
//
// El refresh es SIEMPRE explícito: nunca se consulta sola al cargar la app.
// Un precio de venta es un insumo de decisión, no un ticker; que cambie solo
// mientras mirás la pantalla es peor que útil.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Los cinco productos que publica la CAC. El valor es el slug que devuelve la
// función y que se guarda en catalogo_cultivos.pizarra_producto.
export const PRODUCTOS_PIZARRA = [
  { valor: 'trigo',   label: 'Trigo' },
  { valor: 'maiz',    label: 'Maíz' },
  { valor: 'girasol', label: 'Girasol' },
  { valor: 'soja',    label: 'Soja' },
  { valor: 'sorgo',   label: 'Sorgo' },
]

// Sugerencia de mapeo a partir del nombre del cultivo. Tolera variantes
// ("Soja 1ra", "Soja de 2da", "MAÍZ temprano") normalizando tildes y sufijos.
// Es sólo una propuesta: el usuario puede cambiarla o dejarla en ninguno.
export function productoSugerido(nombre) {
  const n = String(nombre || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // saca tildes
    .trim()
  for (const p of PRODUCTOS_PIZARRA) if (n.startsWith(p.valor)) return p.valor
  return null
}

export const usePizarraStore = defineStore('pizarra', () => {
  const datos    = ref(null)    // { fecha, fechaTexto, productos, fuente, consultado }
  const cargando = ref(false)
  const error    = ref('')

  const fecha      = computed(() => datos.value?.fecha || '')
  const fechaTexto = computed(() => datos.value?.fechaTexto || '')
  const hayDatos   = computed(() => !!datos.value?.productos)

  // Precio USD/tn publicado para un producto, o null.
  // Los días S/C se devuelven igual pero marcados: el valor es un ESTIMADO de
  // la CAC y no se debe guardar como precio real.
  function precioDe(producto) {
    const p = datos.value?.productos?.[producto]
    return p ? { usd: p.usd, ars: p.ars, sc: !!p.sc, nombre: p.nombre } : null
  }

  async function cargar() {
    cargando.value = true
    error.value = ''
    try {
      const res = await fetch('/api/pizarra', { headers: { Accept: 'application/json' } })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.detalle || body?.error || `La consulta falló (${res.status})`)
      if (!body?.productos) throw new Error('Respuesta inesperada de /api/pizarra')
      datos.value = body
      return body
    } catch (e) {
      // El error queda a la vista y los precios guardados NO se tocan.
      error.value = e?.message || 'No se pudieron consultar los precios de pizarra'
      return null
    } finally {
      cargando.value = false
    }
  }

  function reset() { datos.value = null; cargando.value = false; error.value = '' }

  return { datos, cargando, error, fecha, fechaTexto, hayDatos, precioDe, cargar, reset }
})
