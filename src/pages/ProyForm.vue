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
    <ItemsCostoCatalogo
      :items="f.itemsCosto"
      :rendimiento-qq="f.rendimientoQq"
      :precio-venta-tn="f.precioVentaTn"
      @update:items="v=>f.itemsCosto=v"
    />
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin:14px 0">
      <div v-for="[l,v,c] in stats" :key="l">
        <p style="font-size:11px;color:#6b7280">{{ l }}</p>
        <p :style="{fontSize:'17px',fontWeight:700,color:c}">{{ fmtUSD(v) }}</p>
      </div>
    </div>
    <div class="row justify-end q-gutter-sm">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="onGuardar"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import ItemsCostoCatalogo from '../components/ItemsCostoCatalogo.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { calcIngresoHa, calcularCostoItemHa } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({ proy: Object })
const emit  = defineEmits(['save', 'cancel'])

const catStore = useCatalogoStore()
const main = useMainStore()

const f = reactive({ ...props.proy, itemsCosto: props.proy.itemsCosto || [] })

const catalogo = computed(() => catStore.items)
const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))

const costoHa  = computed(() => f.itemsCosto.reduce((s, it) =>
  s + calcularCostoItemHa(it, catalogo.value, cultivosPrecio.value, main.tipoCambio, f.rendimientoQq, f.precioVentaTn, catStore.labores), 0))
const ingHa    = computed(() => calcIngresoHa(f))
const margenHa = computed(() => ingHa.value - costoHa.value)
const stats    = computed(() => [
  ['Costo/ha',  costoHa.value,  '#dc2626'],
  ['Ingreso/ha',ingHa.value,   '#2d5a27'],
  ['Margen/ha', margenHa.value, margenHa.value >= 0 ? '#3a6b35' : '#dc2626'],
])

// Al guardar, "congela" el costoHaCalculado de cada ítem con el rinde/precio actuales,
// para que las vistas resumen (Dashboard/Proyectados) muestren el total correcto.
function onGuardar() {
  const itemsCosto = f.itemsCosto.map(it => ({
    ...it,
    costoHaCalculado: calcularCostoItemHa(it, catalogo.value, cultivosPrecio.value, main.tipoCambio, f.rendimientoQq, f.precioVentaTn, catStore.labores),
  }))
  emit('save', { ...f, itemsCosto })
}
</script>
