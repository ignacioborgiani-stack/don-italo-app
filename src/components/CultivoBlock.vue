<template>
  <div :style="{border:`2px solid ${borderColor}`,borderRadius:'10px',padding:'14px',marginBottom:'14px'}">
    <div class="row items-center q-gutter-x-sm q-mb-md">
      <span style="font-size:18px">{{ emoji }}</span>
      <h4 :style="{fontSize:'12px',fontWeight:700,color:borderColor,textTransform:'uppercase',letterSpacing:'.04em',margin:0}">{{ titulo }}</h4>
    </div>
    <div class="di-fila-cultivo">
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
    <ItemsCostoCatalogo
      :items="cultivoObj.itemsCosto||[]"
      :etapas="cultivoObj.etapas||[]"
      :ordenar-cat="cultivoObj.ordenarCat !== false"
      :rendimiento-qq="cultivoObj.rendimientoQq"
      :precio-venta-tn="cultivoObj.precioVentaTn"
      :precio-editable="precioEditable"
      :ha-lote="haLote"
      @update="v=>emit('update:cultivoObj',{...cultivoObj,itemsCosto:v.items,etapas:v.etapas,ordenarCat:v.ordenarCat})"/>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:#f9fafb;border-radius:8px;padding:8px 10px;margin-top:10px">
      <div v-for="[l,v,c] in stats" :key="l">
        <p style="font-size:10px;color:#9ca3af">{{ l }}</p>
        <p :style="{fontWeight:700,color:c,fontSize:'14px'}">{{ fmtUSD(v) }}</p>
      </div>
    </div>
    <!-- Costo, margen y todo lo que sale de ellos están incompletos mientras
         haya ítems en pesos sin convertir. -->
    <p v-if="sinTcCount" style="font-size:11px;font-weight:600;color:#b45309;margin:6px 0 0;text-align:right">
      ⚠️ sin {{ sinTcCount }} ítem{{ sinTcCount === 1 ? '' : 's' }} en pesos — falta el tipo de cambio
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CultivoSelect from './CultivoSelect.vue'
import ItemsCostoCatalogo from './ItemsCostoCatalogo.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { CULTIVARES_INVERNALES } from '../utils/constants'
import { calcIngresoHa, calcularCostoItemHa, factorItem } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({
  titulo:      String,
  emoji:       String,
  borderColor: String,
  cultivoType: String,
  cultivoObj:  Object,
  // Contables congela precios (editable); Proyectados recalcula en vivo.
  precioEditable: { type: Boolean, default: true },
  // Hectáreas del lote: habilitan las "hectáreas aplicadas" por etapa. 0 en
  // Proyectados, donde el presupuesto abarca varios lotes.
  haLote: { type: [Number, String], default: 0 },
})
const emit = defineEmits(['update:cultivoObj'])

const catStore = useCatalogoStore()
const main = useMainStore()
// Precio de la CAMPAÑA ACTIVA, no el global del catálogo: si no, cambiarlo
// movería el alquiler de todas las campañas, incluidas las cerradas.
const cultivosPrecio = computed(() => main.cultivosPrecio)

// Costo por hectárea de LOTE: cada ítem prorrateado por las ha aplicadas de su etapa.
// Los ítems en pesos sin TC (null) quedan afuera y se cuentan aparte.
const itemHa = it => {
  const bruto = calcularCostoItemHa(it, catStore.items, cultivosPrecio.value, main.tipoCambio, props.cultivoObj.rendimientoQq, props.cultivoObj.precioVentaTn, catStore.labores)
  return bruto === null ? null : bruto * factorItem(it, props.cultivoObj.etapas, props.haLote)
}
const costoHa  = computed(() => (props.cultivoObj.itemsCosto || []).reduce((s, it) => s + (itemHa(it) ?? 0), 0))
const sinTcCount = computed(() => (props.cultivoObj.itemsCosto || []).filter(it => itemHa(it) === null).length)
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

<style scoped>
/* Cultivo / Rendimiento / Precio de venta.
   Iba con `grid-template-columns: 1fr 1fr 1fr` fijo, pero como `.di-inp` no
   está definida en ningún CSS (ver "Trampas conocidas" del CLAUDE.md) los
   inputs conservan el ancho por defecto del browser y no se achican a su
   celda: en el celular el campo de precio quedaba cortado. Se arregla acá,
   local, igual que se hizo en ItemCostoRow. */
.di-fila-cultivo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.di-fila-cultivo input,
.di-fila-cultivo select,
.di-fila-cultivo :deep(input),
.di-fila-cultivo :deep(select) { width: 100%; min-width: 0; }
</style>
