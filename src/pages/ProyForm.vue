<template>
  <div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div>
        <label class="di-lbl">Rendimiento (qq/ha)</label>
        <input v-model="f.rendimientoQq" type="number" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Precio venta (USD/tn)</label>
        <input v-model="f.precioVentaTn" type="number" class="di-inp"/>
      </div>
    </div>
    <ItemsCostoEditor :items="f.itemsCosto" @update:items="v=>f.itemsCosto=v"/>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin:14px 0">
      <div v-for="[l,v,c] in stats" :key="l">
        <p style="font-size:11px;color:#6b7280">{{ l }}</p>
        <p :style="{fontSize:'17px',fontWeight:700,color:c}">{{ fmtUSD(v) }}</p>
      </div>
    </div>
    <div class="row justify-end q-gutter-sm">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="$emit('save', f)"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import ItemsCostoEditor from '../components/ItemsCostoEditor.vue'
import { calcCostoHa, calcIngresoHa } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({ proy: Object })
defineEmits(['save', 'cancel'])

const f = reactive({ ...props.proy, itemsCosto: props.proy.itemsCosto || [] })

const costoHa  = computed(() => calcCostoHa({ itemsCosto: f.itemsCosto }))
const ingHa    = computed(() => calcIngresoHa(f))
const margenHa = computed(() => ingHa.value - costoHa.value)
const stats    = computed(() => [
  ['Costo/ha',  costoHa.value,  '#dc2626'],
  ['Ingreso/ha',ingHa.value,   '#2d5a27'],
  ['Margen/ha', margenHa.value, margenHa.value >= 0 ? '#3a6b35' : '#dc2626'],
])
</script>
