<template>
  <div style="position:relative">
    <div ref="el" style="height:400px;width:100%;border-radius:12px;overflow:hidden;background:#e5e7eb;border:1px solid #d4cfc4"></div>
    <div v-if="!hayPoligonos" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
      <div style="background:rgba(255,255,255,.92);padding:10px 18px;border-radius:8px;font-size:13px;color:#6b7280;border:1px solid #d4cfc4;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        Subí un archivo KMZ en cada lote para ver los campos en el mapa
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fmtNum } from '../utils/formatters'

const props = defineProps({
  lotes:       { type: Array,  default: () => [] },   // [{id,nombre,ha,ubicacion,notas,poligono}]
  campania:    { type: String, default: '' },
  highlightId: { type: [String, Number], default: null },
})

const CASILDA = [-33.045, -61.168]
const PALETA = ['#2d5a27', '#e8a838', '#5b8dd9', '#a0522d', '#d44f8e', '#4a7c59', '#e05c3a', '#8b4513', '#6b21a8', '#0891b2']

const el = ref(null)
let map = null
let grupo = null
const capas = {}   // id -> L.polygon

const conPoligono = () => props.lotes.filter(l => Array.isArray(l.poligono) && l.poligono.length)
const hayPoligonos = computed(() => conPoligono().length > 0)

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function popupHtml(l) {
  const badge = props.campania
    ? `<span style="display:inline-block;margin-top:6px;background:#f0fdf4;color:#2d5a27;border:1px solid #86efac;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600">📅 ${esc(props.campania)}</span>`
    : ''
  return `<div style="font-size:13px;min-width:140px;line-height:1.5">
    <b style="font-size:14px;color:#2d5a27">${esc(l.nombre)}</b><br>
    <b>${fmtNum(l.ha)}</b> ha${l.ubicacion ? `<br>📍 ${esc(l.ubicacion)}` : ''}
    ${l.notas ? `<br><i style="color:#6b7280">${esc(l.notas)}</i>` : ''}
    <br>${badge}
  </div>`
}

function dibujar() {
  if (!map) return
  if (grupo) { grupo.remove(); grupo = null }
  Object.keys(capas).forEach(k => delete capas[k])

  const lotes = conPoligono()
  if (!lotes.length) { map.setView(CASILDA, 12); return }

  grupo = L.featureGroup()
  lotes.forEach((l, i) => {
    const base = PALETA[i % PALETA.length]
    const pts = l.poligono.map(([lng, lat]) => [lat, lng])
    const poly = L.polygon(pts, { color: base, weight: 2, fillColor: base, fillOpacity: 0.4 })
    poly._base = base
    poly.bindTooltip(`${esc(l.nombre)} · ${fmtNum(l.ha)} ha`, { sticky: true })
    poly.bindPopup(popupHtml(l))
    poly.addTo(grupo)
    capas[l.id] = poly
  })
  grupo.addTo(map)
  map.fitBounds(grupo.getBounds(), { padding: [24, 24], maxZoom: 15 })
  aplicarHighlight()
  setTimeout(() => map && map.invalidateSize(), 60)
}

function aplicarHighlight() {
  Object.entries(capas).forEach(([id, poly]) => {
    if (String(id) === String(props.highlightId)) {
      poly.setStyle({ color: '#ca8a04', fillColor: '#facc15', weight: 4, fillOpacity: 0.65 })
      poly.bringToFront()
    } else {
      poly.setStyle({ color: poly._base, fillColor: poly._base, weight: 2, fillOpacity: 0.4 })
    }
  })
}

function init() {
  if (!el.value) return
  map = L.map(el.value, { scrollWheelZoom: false, attributionControl: false }).setView(CASILDA, 12)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  dibujar()
  setTimeout(() => map && map.invalidateSize(), 120)
}

onMounted(() => nextTick(init))
watch(() => props.lotes, dibujar, { deep: true })
watch(() => props.highlightId, aplicarHighlight)
onBeforeUnmount(() => { if (map) { map.remove(); map = null } })
</script>
