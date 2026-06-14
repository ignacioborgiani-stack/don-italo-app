<template>
  <div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Cultivo *</label>
        <input v-model="f.nombre" placeholder="ej: Soja" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Tipo</label>
        <select v-model="f.tipo" class="di-inp">
          <option value="estival">☀️ Estival</option>
          <option value="invernal">🌾 Invernal</option>
        </select>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Precio (USD/tn) *</label>
        <input v-model="f.precioUsdTn" type="number" step="any" placeholder="0" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Rinde estimado (qq/ha)</label>
        <input v-model="f.rendimientoEstimadoQq" type="number" step="any" placeholder="0" class="di-inp"/>
      </div>
    </div>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:13px">
      Ingreso bruto/ha = <b style="color:#2d5a27">{{ fmtUSD(ingresoHa) }}</b>
      <span style="color:#6b7280">(rinde/10 × precio)</span>
    </div>

    <p style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 8px">Costos por rendimiento</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div><label class="di-lbl">Cosecha (% del valor)</label><input v-model="f.cosechaPorc" type="number" step="any" class="di-inp"/></div>
      <div><label class="di-lbl">Comercialización (%)</label><input v-model="f.comercializacionPorc" type="number" step="any" class="di-inp"/></div>
      <div><label class="di-lbl">Comerc. fija (USD/tn)</label><input v-model="f.comercializacionFijaUsdTn" type="number" step="any" class="di-inp"/></div>
      <div><label class="di-lbl">Flete (USD/tn)</label><input v-model="f.fleteUsdTn" type="number" step="any" class="di-inp"/></div>
      <div><label class="di-lbl">Seguro (USD/ha)</label><input v-model="f.seguroUsdHa" type="number" step="any" class="di-inp"/></div>
      <div><label class="di-lbl">Rinde asegurado (qq/ha)</label><input v-model="f.rendimientoAseguradoQq" type="number" step="any" class="di-inp"/></div>
      <div><label class="di-lbl">Alquiler (qq soja/ha)</label><input v-model="f.alquilerQqSoja" type="number" step="any" class="di-inp"/></div>
    </div>

    <div style="margin-bottom:6px">
      <label class="di-lbl">Notas</label>
      <textarea v-model="f.notas" rows="2" class="di-inp" style="resize:vertical"/>
    </div>

    <p v-if="error" style="font-size:12px;color:#dc2626;margin:6px 0 0">{{ error }}</p>
    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="onSave"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({ initial: Object })
const emit  = defineEmits(['save', 'cancel'])

const base = () => ({
  nombre: '', tipo: 'estival', precioUsdTn: '', rendimientoEstimadoQq: '',
  cosechaPorc: '', comercializacionPorc: '', comercializacionFijaUsdTn: '',
  fleteUsdTn: '', seguroUsdHa: '', rendimientoAseguradoQq: '', alquilerQqSoja: '', notas: '',
})
const f = reactive(props.initial ? { ...base(), ...props.initial } : base())
const error = ref('')

const ingresoHa = computed(() => ((parseFloat(f.rendimientoEstimadoQq) || 0) / 10) * (parseFloat(f.precioUsdTn) || 0))

function onSave() {
  error.value = ''
  if (!f.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  if (f.precioUsdTn === '' || isNaN(parseFloat(f.precioUsdTn))) { error.value = 'El precio es obligatorio'; return }
  emit('save', { ...f })
}
</script>
