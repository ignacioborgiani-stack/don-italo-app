// Parseo de archivos KML / KMZ (Google Earth) → polígono GeoJSON [[lng,lat], ...]

// Extrae las coordenadas del primer <Polygon> de un texto KML.
// Devuelve un array de pares [lng, lat] o null si no encuentra polígono.
export function parseKmlText(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('El archivo no es un XML válido')

  const poly = doc.getElementsByTagNameNS('*', 'Polygon')[0]
  if (!poly) return null
  const coordsEl = poly.getElementsByTagNameNS('*', 'coordinates')[0]
  if (!coordsEl) return null

  const puntos = coordsEl.textContent.trim().split(/\s+/).map(tok => {
    const [lng, lat] = tok.split(',').map(parseFloat)
    return [lng, lat]
  }).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))

  return puntos.length ? puntos : null
}

// Centroide simple: promedio de lng y lat de todos los puntos.
export function centroide(coords) {
  const n = coords.length || 1
  const [sLng, sLat] = coords.reduce((a, [lng, lat]) => [a[0] + lng, a[1] + lat], [0, 0])
  return { lng: sLng / n, lat: sLat / n }
}

// Descomprime un .kmz (ZIP) y devuelve las coordenadas del .kml interno.
export async function parseKmzFile(file) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  const kmlName = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('.kml'))
  if (!kmlName) throw new Error('El KMZ no contiene un archivo .kml')
  const text = await zip.files[kmlName].async('text')
  return parseKmlText(text)
}

// Punto de entrada: recibe un File (.kml o .kmz) y devuelve { poligono, lat, lng }.
export async function parseGeoFile(file) {
  const nombre = (file.name || '').toLowerCase()
  let coords
  if (nombre.endsWith('.kmz')) coords = await parseKmzFile(file)
  else coords = parseKmlText(await file.text())

  if (!coords || !coords.length) throw new Error('No se encontró un polígono en el archivo')
  const { lat, lng } = centroide(coords)
  return { poligono: coords, lat, lng }
}
