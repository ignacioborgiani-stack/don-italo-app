<template>
  <div>
    <div style="margin-bottom:12px">
      <label class="di-lbl">Cultivo *</label>
      <input v-model="f.nombre" placeholder="ej: Soja" class="di-inp"/>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6px">
      <div>
        <label class="di-lbl">Tipo</label>
        <select v-model="f.tipo" class="di-inp">
          <option value="estival">☀️ Estival</option>
          <option value="invernal">🌾 Invernal</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Precio (USD/tn) *</label>
        <input v-model="f.precioUsdTn" type="number" step="any" placeholder="0" class="di-inp"/>
      </div>
    </div>

    <!-- Vínculo con la pizarra de la CAC. La sugerencia sale del nombre, pero
         se puede cambiar o dejar en ninguno: los cultivos que no publica la
         Cámara (Arveja, Carinata, Cebada…) son 100 % manuales. -->
    <div style="margin-top:10px">
      <label class="di-lbl">Producto de pizarra (CAC Rosario)</label>
      <select v-model="f.pizarraProducto" class="di-inp">
        <option :value="null">— Sin pizarra: precio manual —</option>
        <option v-for="p in PRODUCTOS_PIZARRA" :key="p.valor" :value="p.valor">{{ p.label }}</option>
      </select>
      <p style="font-size:11px;color:#6b7280;margin:4px 0 0">
        El precio que guardes acá queda como <b>manual</b> en la campaña activa y la pizarra no lo pisa
        hasta que toques “Traer”.
      </p>
    </div>

    <p v-if="error" style="font-size:12px;color:#dc2626;margin:6px 0 0">{{ error }}</p>
    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="onSave"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { PRODUCTOS_PIZARRA, productoSugerido } from '../stores/pizarra'

const props = defineProps({ initial: Object })
const emit  = defineEmits(['save', 'cancel'])

const f = reactive({
  nombre: props.initial?.nombre || '',
  tipo: props.initial?.tipo || 'estival',
  precioUsdTn: props.initial?.precioUsdTn ?? '',
  // Al crear, se propone el producto a partir del nombre; al editar se respeta
  // lo que ya esté guardado (incluido "ninguno" elegido a propósito).
  pizarraProducto: props.initial ? (props.initial.pizarraProducto ?? null) : null,
})
// Sólo mientras se crea: si el usuario ya eligió a mano, no se le pisa.
watch(() => f.nombre, n => { if (!props.initial) f.pizarraProducto = productoSugerido(n) })
const error = ref('')

function onSave() {
  error.value = ''
  if (!f.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  if (f.precioUsdTn === '' || isNaN(parseFloat(f.precioUsdTn))) { error.value = 'El precio es obligatorio'; return }
  // Sólo se editan estos 3 campos; el resto de columnas se preservan en el store/DB.
  emit('save', { nombre: f.nombre, tipo: f.tipo, precioUsdTn: parseFloat(f.precioUsdTn), pizarraProducto: f.pizarraProducto || null })
}
</script>
