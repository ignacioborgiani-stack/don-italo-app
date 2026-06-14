<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Ítems de costo (USD/ha)</span>
      <q-btn flat dense size="sm" color="primary" label="+ Agregar ítem" @click="add" style="border:1px solid #3a6b35;border-radius:5px;font-size:12px"/>
    </div>

    <p v-if="!items.length" style="font-size:12px;color:#9ca3af;text-align:center;padding:8px 0">Sin ítems. Clic en "+ Agregar ítem".</p>

    <ItemCostoRow
      v-for="(it, i) in items" :key="it.id || i"
      :item="it"
      :catalogo="catalogo"
      :cultivos-precio="cultivosPrecio"
      :tipo-cambio="tipoCambio"
      :rendimiento-qq="rendimientoQq"
      :precio-venta-tn="precioVentaTn"
      @update:item="upd(i, $event)"
      @remove="del(i)"
      @crear-insumo="onCrear(i, $event)"
    />

    <div v-if="items.length" style="text-align:right;font-size:12px;color:#374151;margin-top:4px">
      Total: <b style="color:#dc2626">{{ fmtUSD(total) }}/ha</b>
    </div>

    <!-- Crear insumo nuevo sin cerrar este modal -->
    <q-dialog v-if="crearModal" :model-value="true" @hide="crearModal=null">
      <q-card style="width:640px;max-width:95vw;border-radius:14px;padding:26px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Nuevo insumo</h2>
          <q-btn flat round dense icon="close" @click="crearModal=null"/>
        </div>
        <InsumoForm :initial="crearModal.initial" :familias="familias" :insumos="catalogo" @save="onSaveInsumo" @cancel="crearModal=null"/>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ItemCostoRow from './ItemCostoRow.vue'
import InsumoForm from './InsumoForm.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { CATEGORIA_A_FAMILIAS, calcularCostoItemHa } from '../utils/calculations'
import { FAMILIAS_BASE } from '../utils/catalogoData'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({
  items:         { type: Array, default: () => [] },
  rendimientoQq: { type: [Number, String], default: 0 },
  precioVentaTn: { type: [Number, String], default: 0 },
})
const emit = defineEmits(['update:items'])

const catStore = useCatalogoStore()
const main = useMainStore()
const uid = () => crypto.randomUUID()

const catalogo = computed(() => catStore.items)
const tipoCambio = computed(() => main.tipoCambio)
const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))
const familias = computed(() => [...new Set([...FAMILIAS_BASE, ...catalogo.value.map(i => i.familia)])].sort((a, b) => a.localeCompare(b)))

const total = computed(() => props.items.reduce((s, it) =>
  s + calcularCostoItemHa(it, catalogo.value, cultivosPrecio.value, tipoCambio.value, props.rendimientoQq, props.precioVentaTn), 0))

function add() {
  emit('update:items', [...props.items, {
    id: uid(), categoria: 'fertilizante', insumoId: null, nombreManual: '',
    dosis: '', unidadDosis: '', costoHaCalculado: 0, modoEspecial: false, parametroEspecial: null,
  }])
}
function upd(i, it) { emit('update:items', props.items.map((x, idx) => idx === i ? it : x)) }
function del(i)     { emit('update:items', props.items.filter((_, idx) => idx !== i)) }

const crearModal = ref(null)
function onCrear(i, categoria) {
  const fams = CATEGORIA_A_FAMILIAS[categoria]
  crearModal.value = { index: i, initial: { familia: (fams && fams[0]) || 'Otros' } }
}
async function onSaveInsumo(form) {
  const nuevo = await catStore.addItem(form)
  const i = crearModal.value.index
  const base = { ...props.items[i], insumoId: nuevo.id, nombreManual: nuevo.nombre, unidadDosis: '' }
  base.costoHaCalculado = calcularCostoItemHa(base, catalogo.value, cultivosPrecio.value, tipoCambio.value, props.rendimientoQq, props.precioVentaTn)
  upd(i, base)
  crearModal.value = null
}
</script>
