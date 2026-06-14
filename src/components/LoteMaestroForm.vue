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

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Latitud</label>
        <input v-model="f.lat" type="number" step="any" placeholder="ej: -33.045" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Longitud</label>
        <input v-model="f.lng" type="number" step="any" placeholder="ej: -61.168" class="di-inp"/>
      </div>
    </div>

    <!-- Mapa OSM (sin API key) -->
    <div v-if="hasCoords" style="margin-bottom:12px;border:1px solid #d4cfc4;border-radius:10px;overflow:hidden">
      <iframe
        :src="mapSrc"
        style="width:100%;height:200px;border:0;display:block"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Ubicación del lote"
      />
      <a :href="osmLink" target="_blank" rel="noopener"
        style="display:block;padding:5px 10px;font-size:11px;color:#2d5a27;background:#f9fafb;text-decoration:none">
        Ver en OpenStreetMap ↗
      </a>
    </div>
    <p v-else style="font-size:12px;color:#9ca3af;margin:-2px 0 12px">
      Cargá latitud y longitud para ver el mapa.
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

const props = defineProps({ initial: Object })
const emit  = defineEmits(['save', 'cancel'])

const base = () => ({ nombre: '', ha: '', ubicacion: '', lat: '', lng: '', notas: '' })
const f = reactive(props.initial ? { ...base(), ...props.initial } : base())
const error = ref('')

const hasCoords = computed(() =>
  f.lat !== '' && f.lng !== '' && f.lat != null && f.lng != null &&
  !isNaN(parseFloat(f.lat)) && !isNaN(parseFloat(f.lng))
)
const mapSrc = computed(() => {
  const lat = parseFloat(f.lat), lng = parseFloat(f.lng), d = 0.02
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
})
const osmLink = computed(() => `https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lng}#map=14/${f.lat}/${f.lng}`)

function onSave() {
  error.value = ''
  if (!f.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  if (f.ha === '' || isNaN(parseFloat(f.ha))) { error.value = 'Las hectáreas son obligatorias'; return }
  emit('save', { ...f })
}
</script>
