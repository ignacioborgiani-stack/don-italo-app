// GET /api/pizarra — precios de pizarra de la Cámara Arbitral de Cereales
// de Rosario (Trigo, Maíz, Girasol, Soja, Sorgo), en ARS/tn y USD/tn.
//
// Existe porque la página de la CAC NO se puede leer desde el navegador:
// responde 200 pero sin ninguna cabecera Access-Control-*, así que el fetch
// del front se descarta por CORS. Además manda X-Frame-Options: DENY, o sea
// que tampoco sirve un iframe. Verificado el 09/09/2026.
//
// El USD que se devuelve es el que publica la CAC (convertido por ellos con
// el BNA comprador divisa). No se divide nada acá.
import { parsePizarra } from './_parsePizarra.js'

const URL_PIZARRA = 'https://www.cac.bcr.com.ar/es/precios-de-pizarra'
const TIMEOUT_MS = 8000
const CACHE_MS = 3 * 60 * 60 * 1000   // 3 h: la pizarra sale una vez por día hábil

// La página se declara no cacheable (Cache-Control: no-cache, private +
// X-Drupal-Dynamic-Cache: UNCACHEABLE), así que el caché lo ponemos nosotros:
// el del edge de Vercel (s-maxage) y este, en memoria, para las invocaciones
// que caen en una instancia ya tibia.
let cache = null   // { hasta: epoch_ms, datos }

async function traerHtml() {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(URL_PIZARRA, {
      signal: ctrl.signal,
      headers: {
        // UA propio, sin disfrazarse de browser: probado, el sitio lo acepta.
        'User-Agent': 'don-italo-app/1.0 (+https://github.com/ignacioborgiani-stack/don-italo-app)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    })
    if (!res.ok) throw new Error(`La Cámara Arbitral respondió ${res.status}`)
    return await res.text()
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error(`La Cámara Arbitral no respondió en ${TIMEOUT_MS / 1000} s`)
    throw e
  } finally {
    clearTimeout(t)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const ahora = Date.now()
  if (cache && cache.hasta > ahora) {
    res.setHeader('Cache-Control', 'public, s-maxage=10800, stale-while-revalidate=86400')
    res.setHeader('X-Pizarra-Cache', 'memoria')
    return res.status(200).json(cache.datos)
  }

  try {
    const datos = {
      fuente: URL_PIZARRA,
      ...parsePizarra(await traerHtml()),
      consultado: new Date().toISOString(),
    }
    cache = { hasta: ahora + CACHE_MS, datos }
    res.setHeader('Cache-Control', 'public, s-maxage=10800, stale-while-revalidate=86400')
    res.setHeader('X-Pizarra-Cache', 'miss')
    return res.status(200).json(datos)
  } catch (e) {
    // Fallar VISIBLE y no cachear el error: el front muestra el aviso y se
    // queda con el último precio guardado. Nunca devolver un JSON a medias.
    res.setHeader('Cache-Control', 'no-store')
    return res.status(502).json({
      error: 'No se pudieron leer los precios de pizarra',
      detalle: e?.message || String(e),
      fuente: URL_PIZARRA,
    })
  }
}
