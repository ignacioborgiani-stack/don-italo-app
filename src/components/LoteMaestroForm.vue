<template>
  <div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Nombre del lote *</label>
        <input v-model="f.nombre" placeholder="ej: La Colorada" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Hectáreas *</label>
        <input v-model="f.ha" type="number" placeholder="0" class="di-inp"/>
      </div>
    </div>

    <div style="margin-bottom:12px">
      <label class="di-lbl">Ubicación</label>
      <input v-model="f.ubicacion" placeholder="ej: Casilda, Santa Fe" class="di-inp"/>
    </div>

    <!-- Subida de archivo KMZ/KML -->
    <div style="margin-bottom:12px">
      <label class="di-lbl">Perímetro del lote (KMZ / KML de Google Earth)</label>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label :style="btnStyle">
          <span v-if="cargando">Procesando…</span>
          <span v-else>📁 Subir archivo KMZ/KML</span>
          <input type="file" accept=".kmz,.kml" @change="onFile" :disabled="cargando" style="display:none"/>
        </label>
        <button v-if="tienePoligono" type="button" @click="quitar"
          style="padding:8px 12px;background:#fff1f2;border:1px solid #fca5a5;border-radius:7px;cursor:pointer;color:#dc2626;font-size:13px;font-weight:600;font-family:inherit">
          Quitar archivo
        </button>
        <span v-if="tienePoligono" style="font-size:12px;color:#166534">
          ✓ {{ f.poligono.length }} puntos · centro {{ f.lat?.toFixed(4) }}, {{ f.lng?.toFixed(4) }}
        </span>
      </div>
      <p v-if="fileError" style="font-size:12px;color:#dc2626;margin-top:6px">{{ fileError }}</p>
    </div>

    <!-- Preview del polígono -->
    <div v-if="tienePoligono" style="margin-bottom:12px;border:1px solid #d4cfc4;border-radius:10px;overflow:hidden">
      <LotePoligonoMap :poligono="f.poligono" :height="220" :interactive="true"/>
    </div>
    <p v-else style="font-size:12px;color:#9ca3af;margin:-2px 0 12px">
      Subí el KMZ/KML exportado de Google Earth para dibujar el perímetro del lote.
    </p>

    <div style="margin-bottom:6px">
      <label class="di-lbl">Notas</label>
      <textarea v-model="f.notas" rows="2" class="di-inp" style="resize:vertical"/>
    </div>

    <p v-if="error" style="font-size:12px;color:#dc2626;margin:6px 0 0">{{ error }}</p>

    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar lote" @click="onSave"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'
import LotePoligonoMap from './LotePoligonoMap.vue'
import { parseGeoFile } from '../utils/kml'

const props = defineProps({ initial: Object })
const emit  = defineEmits(['save', 'cancel'])

const base = () => ({ nombre: '', ha: '', ubicacion: '', lat: null, lng: null, poligono: null, notas: '' })
const f = reactive(props.initial ? { ...base(), ...props.initial } : base())

const error     = ref('')
const fileError = ref('')
const cargando  = ref(false)

const tienePoligono = computed(() => Array.isArray(f.poligono) && f.poligono.length > 0)

const btnStyle = 'padding:8px 14px;background:#f0fdf4;border:1.5px solid #3a6b35;border-radius:7px;cursor:pointer;color:#2d5a27;font-size:13px;font-weight:600;font-family:inherit;display:inline-block'

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fileError.value = ''
  cargando.value = true
  try {
    const { poligono, lat, lng } = await parseGeoFile(file)
    f.poligono = poligono
    f.lat = lat
    f.lng = lng
  } catch (err) {
    fileError.value = err.message || 'No se pudo leer el archivo'
  } finally {
    cargando.value = false
    e.target.value = ''   // permite volver a subir el mismo archivo
  }
}

function quitar() {
  f.poligono = null
  f.lat = null
  f.lng = null
  fileError.value = ''
}

function onSave() {
  error.value = ''
  if (!f.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  if (f.ha === '' || isNaN(parseFloat(f.ha))) { error.value = 'Las hectáreas son obligatorias'; return }
  emit('save', { ...f })
}
</script>
