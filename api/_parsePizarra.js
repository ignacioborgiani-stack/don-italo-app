// Parser de la pizarra de la Cámara Arbitral de Cereales de Rosario.
//
// El archivo arranca con "_" a propósito: Vercel ignora lo que empieza así
// dentro de api/, así que esto NO es un endpoint, es un módulo importable.
//
// Es una página Drupal, no una API. La estructura a la que nos enganchamos:
//
//   <div class="paragraph--type--prices-board … board-prices">
//     <h3>Precios Pizarra del día 08/09/2026</h3>
//     <div class="boards-container">
//       <div class="board board-trigo ">                    ← día normal
//         <div class="price"> $345.700,00 </div>
//         <div class="bottom"><div class="cell"><strong>US$</strong> 230,01</div></div>
//       <div class="board board-girasol estimative">        ← día S/C
//         <div class="price"><span> S/C </span><span class="price-sc-estimated"> (E) $760.000,00</span></div>
//         <div class="bottom"><div class="cell"><strong>US$</strong><span> (E) </span> 505,66</div></div>
//
// Dos decisiones de robustez:
//   1. Nos enganchamos al slug de la clase (`board-soja`), que es un
//      identificador de máquina, y NO al <h3> visible, que tiene tildes,
//      saltos de línea y espacios variables.
//   2. El día "sin cotización" se detecta por la clase `estimative` del
//      board, no parseando el texto "S/C".
//
// Verificado el 09/09/2026 contra la página real: los anclajes
// (`boards-container`, `class="board board-"`, `class="price"`,
// `<strong>US$</strong>`) aparecen exactamente 5 veces cada uno en todo el
// documento, así que no hay ambigüedad posible con el resto de la página.

export const PRODUCTOS = ['trigo', 'maiz', 'girasol', 'soja', 'sorgo']

const NOMBRE = { trigo: 'Trigo', maiz: 'Maíz', girasol: 'Girasol', soja: 'Soja', sorgo: 'Sorgo' }

const sinTags = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

// "$345.700,00" → 345700 · "230,01" → 230.01 · "(E) 505,66" → 505.66
// Formato argentino: el punto es separador de miles y la coma, decimal.
export function numeroAr(txt) {
  const t = sinTags(txt)
  if (!t) return null
  const m = t.match(/\d[\d.]*,\d+|\d[\d.]*/)
  if (!m) return null
  const n = parseFloat(m[0].replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// "08/09/2026" → "2026-09-08" (ISO, ordenable y comparable)
function aIso(dd, mm, aaaa) { return `${aaaa}-${mm}-${dd}` }

// Corta el HTML en un bloque por board, usando la posición de cada apertura.
function bloquesDeBoard(html) {
  const re = /<div\s+class="board\s+board-([a-z0-9-]+)([^"]*)"[^>]*>/gi
  const abre = []
  let m
  while ((m = re.exec(html)) !== null) {
    abre.push({ slug: m[1].toLowerCase(), resto: m[2] || '', desde: m.index })
  }
  return abre.map((a, i) => ({
    slug: a.slug,
    // La clase `estimative` viaja después del slug: "board board-girasol estimative"
    estimado: /\bestimative\b/i.test(a.resto),
    html: html.slice(a.desde, i + 1 < abre.length ? abre[i + 1].desde : undefined),
  }))
}

/**
 * Parsea el HTML de la pizarra.
 * Devuelve { fecha, fechaTexto, productos } o LANZA con el motivo exacto.
 * Nunca devuelve un resultado a medias: si la página cambió, falla fuerte
 * para que el front avise y se quede con el último valor guardado.
 */
export function parsePizarra(html) {
  if (!html || typeof html !== 'string') throw new Error('Respuesta vacía de la Cámara Arbitral')

  const fechaM = html.match(/Precios\s+Pizarra\s+del\s+d[íi]a\s*(\d{2})\/(\d{2})\/(\d{4})/i)
  if (!fechaM) throw new Error('No se encontró la fecha ("Precios Pizarra del día dd/mm/aaaa"): la página cambió de formato')

  const bloques = bloquesDeBoard(html)
  if (!bloques.length) throw new Error('No se encontró ningún bloque de precios (class="board board-…"): la página cambió de formato')

  const productos = {}
  const problemas = []

  for (const b of bloques) {
    if (!PRODUCTOS.includes(b.slug)) continue   // si algún día agregan otro grano, se ignora sin romper

    const precioM = b.html.match(/<div[^>]*class="price"[^>]*>([\s\S]*?)<\/div>/i)
    const usdM    = b.html.match(/<strong>\s*US\$\s*<\/strong>([\s\S]*?)<\/div>/i)

    const ars = precioM ? numeroAr(precioM[1]) : null
    const usd = usdM    ? numeroAr(usdM[1])    : null

    // El USD es el dato que usa la app (lo convierte la CAC con el BNA
    // comprador divisa). Sin él, el producto no sirve.
    if (!(usd > 0)) { problemas.push(`${b.slug}: no se pudo leer el precio en USD`); continue }

    productos[b.slug] = {
      nombre: NOMBRE[b.slug] || b.slug,
      ars,
      usd,
      // sc = día sin cotización. El `usd` que viene es un ESTIMADO de la CAC:
      // se informa pero no se debe guardar como precio real.
      sc: b.estimado,
      estimado: b.estimado,
    }
  }

  const faltan = PRODUCTOS.filter(p => !productos[p])
  if (faltan.length) {
    throw new Error(`Faltan productos en la pizarra (${faltan.join(', ')})${problemas.length ? ' — ' + problemas.join('; ') : ''}: la página cambió de formato`)
  }

  return {
    fecha: aIso(fechaM[1], fechaM[2], fechaM[3]),
    fechaTexto: `${fechaM[1]}/${fechaM[2]}/${fechaM[3]}`,
    productos,
  }
}
