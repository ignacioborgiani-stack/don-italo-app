<template>
  <div ref="el" :style="{ width: '100%', height: height + 'px', borderRadius: '8px', overflow: 'hidden', background: '#e5e7eb' }"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  poligono:    { type: Array,   default: () => [] },   // [[lng,lat], ...]
  height:      { type: Number,  default: 200 },
  interactive: { type: Boolean, default: true },
})

const el = ref(null)
let map = null
let capa = null

// GeoJSON usa [lng,lat]; Leaflet usa [lat,lng]
const aLatLng = () => (props.poligono || []).map(([lng, lat]) => [lat, lng])

function dibujar() {
  if (!map) return
  if (capa) { capa.remove(); capa = null }
  const pts = aLatLng()
  if (!pts.length) { map.setView([-33, -61], 4); return }
  capa = L.polygon(pts, { color: '#2d5a27', weight: 2, fillColor: '#4a8a44', fillOpacity: 0.4 }).addTo(map)
  map.fitBounds(capa.getBounds(), { padding: [12, 12], maxZoom: 16 })
  setTimeout(() => map && map.invalidateSize(), 60)
}

function init() {
  if (!el.value) return
  map = L.map(el.value, {
    zoomControl: props.interactive,
    dragging: props.interactive,
    scrollWheelZoom: false,
    doubleClickZoom: props.interactive,
    boxZoom: props.interactive,
    keyboard: props.interactive,
    touchZoom: props.interactive,
    attributionControl: false,
  })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  dibujar()
  // El contenedor suele estar oculto al iniciar (modal/tarjeta) → recalcular tamaño
  setTimeout(() => map && map.invalidateSize(), 120)
}

onMounted(() => nextTick(init))
watch(() => props.poligono, dibujar, { deep: true })
onBeforeUnmount(() => { if (map) { map.remove(); map = null; capa = null } })
</script>
