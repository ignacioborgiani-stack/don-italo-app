<template>
  <div :style="{border:`2px solid ${borderColor}`,borderRadius:'10px',padding:'14px',marginBottom:'14px'}">
    <div class="row items-center q-gutter-x-sm q-mb-md">
      <span style="font-size:18px">{{ emoji }}</span>
      <h4 :style="{fontSize:'12px',fontWeight:700,color:borderColor,textTransform:'uppercase',letterSpacing:'.04em',margin:0}">{{ titulo }}</h4>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Cultivo</label>
        <CultivoSelect :model-value="cultivoObj.nombre||''" :tipo="cultivoType" @update:model-value="onNombre"/>
      </div>
      <div>
        <label class="di-lbl">Rendimiento (qq/ha)</label>
        <input type="number" :value="cultivoObj.rendimientoQq||''" @input="set('rendimientoQq',$event.target.value)" placeholder="0" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Precio venta (USD/tn)</label>
        <input type="number" :value="cultivoObj.precioVentaTn||''" @input="set('precioVentaTn',$event.target.value)" placeholder="0" class="di-inp"/>
      </div>
    </div>
    <ItemsCostoCatalogo :items="cultivoObj.itemsCosto||[]" :rendimiento-qq="cultivoObj.rendimientoQq" :precio-venta-tn="cultivoObj.precioVentaTn" @update:items="v=>emit('update:cultivoObj',{...cultivoObj,itemsCosto:v})"/>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:#f9fafb;border-radius:8px;padding:8px 10px;margin-top:10px">
      <div v-for="[l,v,c] in stats" :key="l">
        <p style="font-size:10px;color:#9ca3af">{{ l }}</p>
        <p :style="{fontWeight:700,color:c,fontSize:'14px'}">{{ fmtUSD(v) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CultivoSelect from './CultivoSelect.vue'
import ItemsCostoCatalogo from './ItemsCostoCatalogo.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { CULTIVARES_INVERNALES } from '../utils/constants'
import { calcIngresoHa, calcularCostoItemHa } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({
  titulo:      String,
  emoji:       String,
  borderColor: String,
  cultivoType: String,
  cultivoObj:  Object,
})
const emit = defineEmits(['update:cultivoObj'])

const catStore = useCatalogoStore()
const main = useMainStore()
const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))

const costoHa  = computed(() => (props.cultivoObj.itemsCosto || []).reduce((s, it) =>
  s + calcularCostoItemHa(it, catStore.items, cultivosPrecio.value, main.tipoCambio, props.cultivoObj.rendimientoQq, props.cultivoObj.precioVentaTn), 0))
const ingHa    = computed(() => calcIngresoHa(props.cultivoObj))
const margenHa = computed(() => ingHa.value - costoHa.value)

const stats = computed(() => [
  ['Costo/ha',  costoHa.value,  '#dc2626'],
  ['Ingreso/ha',ingHa.value,   '#2d5a27'],
  ['Margen/ha', margenHa.value, margenHa.value >= 0 ? '#3a6b35' : '#dc2626'],
])

function set(k, v) { emit('update:cultivoObj', { ...props.cultivoObj, [k]: v }) }
function onNombre(n) {
  const tipo = CULTIVARES_INVERNALES.find(c => c.nombre === n) ? 'invernal' : 'estival'
  emit('update:cultivoObj', { ...props.cultivoObj, nombre: n, tipo })
}
</script>
