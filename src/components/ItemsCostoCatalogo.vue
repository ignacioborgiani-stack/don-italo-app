<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Ítems de costo (USD/ha)</span>
      <q-btn flat dense size="sm" color="primary" label="+ Agregar ítem" @click="add" style="border:1px solid #3a6b35;border-radius:5px;font-size:12px"/>
    </div>

    <p v-if="!items.length" style="font-size:12px;color:#9ca3af;text-align:center;padding:8px 0">Sin ítems. Clic en "+ Agregar ítem".</p>

    <!-- Un grupo por categoría (orden fijo). Dentro de cada grupo, drag & drop. -->
    <template v-for="g in grupos" :key="g.categoria">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.03em;margin:10px 0 4px">
        {{ catLabel(g.categoria) }}
      </div>
      <draggable
        :model-value="g.items"
        @update:model-value="v => onReorder(g.categoria, v)"
        :item-key="keyFor"
        handle=".di-drag-handle"
        :animation="150"
        :force-fallback="true"
        ghost-class="di-drag-ghost"
      >
        <template #item="{ element: it }">
          <ItemCostoRow
            :item="it"
            :catalogo="catalogo"
            :labores="labores"
            :cultivos-precio="cultivosPrecio"
            :tipo-cambio="tipoCambio"
            :rendimiento-qq="rendimientoQq"
            :precio-venta-tn="precioVentaTn"
            @update:item="upd(it.id, $event)"
            @remove="del(it.id)"
            @crear-insumo="onCrearInsumo(it.id, $event)"
            @crear-labor="onCrearLabor(it.id, $event)"
          />
        </template>
      </draggable>
    </template>

    <div v-if="items.length" style="text-align:right;font-size:12px;color:#374151;margin-top:4px">
      Total: <b style="color:#dc2626">{{ fmtUSD(total) }}/ha</b>
    </div>

    <!-- Crear insumo nuevo sin cerrar este modal -->
    <q-dialog v-if="crearInsumo" :model-value="true" @hide="crearInsumo=null">
      <q-card style="width:640px;max-width:95vw;border-radius:14px;padding:26px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Nuevo insumo</h2>
          <q-btn flat round dense icon="close" @click="crearInsumo=null"/>
        </div>
        <InsumoForm :initial="crearInsumo.initial" :familias="familias" :insumos="catalogo" @save="onSaveInsumo" @cancel="crearInsumo=null"/>
      </q-card>
    </q-dialog>

    <!-- Crear labor nueva sin cerrar este modal -->
    <q-dialog v-if="crearLabor" :model-value="true" @hide="crearLabor=null">
      <q-card style="width:560px;max-width:95vw;border-radius:14px;padding:26px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Nueva labor / servicio</h2>
          <q-btn flat round dense icon="close" @click="crearLabor=null"/>
        </div>
        <LaborForm :initial="crearLabor.initial" :categorias="categoriasLabores" @save="onSaveLabor" @cancel="crearLabor=null"/>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import ItemCostoRow from './ItemCostoRow.vue'
import InsumoForm from './InsumoForm.vue'
import LaborForm from './LaborForm.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { CATEGORIA_A_FAMILIAS, LABOR_CATEGORIA_MAP, calcularCostoItemHa, ordenarItemsCosto } from '../utils/calculations'
import { CATEGORIAS } from '../utils/constants'
import { FAMILIAS_BASE, CATEGORIAS_LABORES } from '../utils/catalogoData'
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
const labores = computed(() => catStore.labores)
const tipoCambio = computed(() => main.tipoCambio)
const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))
const familias = computed(() => [...new Set([...FAMILIAS_BASE, ...catalogo.value.map(i => i.familia)])].sort((a, b) => a.localeCompare(b)))
const categoriasLabores = computed(() => [...new Set([...CATEGORIAS_LABORES, ...labores.value.map(l => l.categoria)])])

const calc = it => calcularCostoItemHa(it, catalogo.value, cultivosPrecio.value, tipoCambio.value, props.rendimientoQq, props.precioVentaTn, labores.value)
const total = computed(() => props.items.reduce((s, it) => s + calc(it), 0))

const emitSorted = arr => emit('update:items', ordenarItemsCosto(arr))

// Etiqueta (emoji + nombre) de cada categoría para el encabezado de grupo.
const CAT_INFO = Object.fromEntries(CATEGORIAS.map(c => [c.key, c]))
const catLabel = key => { const c = CAT_INFO[key]; return c ? `${c.e} ${c.label}` : key }

// Ítems agrupados por categoría (orden agronómico fijo). Dentro de cada grupo el
// orden es el manual del usuario (se reordena arrastrando).
const grupos = computed(() => {
  const out = []
  for (const it of ordenarItemsCosto(props.items)) {
    const last = out[out.length - 1]
    if (last && last.categoria === it.categoria) last.items.push(it)
    else out.push({ categoria: it.categoria, items: [it] })
  }
  return out
})

// Key estable para el v-for/drag aunque un ítem heredado todavía no tenga id.
const idCache = new WeakMap()
function keyFor(it) {
  if (it.id) return it.id
  let k = idCache.get(it)
  if (!k) { k = uid(); idCache.set(it, k) }
  return k
}

// Ítems heredados pueden no tener id; lo asignamos una vez para tener keys
// estables, edición/borrado por id y que el orden manual se persista al guardar.
onMounted(() => {
  if (props.items.some(it => !it.id)) {
    emitSorted(props.items.map(it => it.id ? it : { ...it, id: uid() }))
  }
})

function add() {
  emitSorted([...props.items, {
    id: uid(), categoria: 'fertilizante', insumoId: null, laborId: null, nombreManual: '',
    dosis: '', unidadDosis: '', costoHaCalculado: 0, modoEspecial: false, parametroEspecial: null,
  }])
}
function upd(id, it) { emitSorted(props.items.map(x => x.id === id ? it : x)) }
function del(id)     { emitSorted(props.items.filter(x => x.id !== id)) }

// Reordenado manual dentro de un grupo: reconstruye el array completo respetando
// el orden de categorías y el nuevo orden interno del grupo arrastrado.
function onReorder(categoria, nuevos) {
  emit('update:items', grupos.value.flatMap(g => g.categoria === categoria ? nuevos : g.items))
}

// Crear insumo en línea
const crearInsumo = ref(null)
function onCrearInsumo(id, categoria) {
  const fams = CATEGORIA_A_FAMILIAS[categoria]
  crearInsumo.value = { id, initial: { familia: (fams && fams[0]) || 'Otros' } }
}
async function onSaveInsumo(form) {
  const nuevo = await catStore.addItem(form)
  const id = crearInsumo.value.id
  const target = props.items.find(x => x.id === id)
  const base = { ...target, insumoId: nuevo.id, nombreManual: nuevo.nombre }
  base.costoHaCalculado = calc(base)
  emitSorted(props.items.map(x => x.id === id ? base : x))
  crearInsumo.value = null
}

// Crear labor en línea
const crearLabor = ref(null)
function onCrearLabor(id, categoria) {
  const cats = LABOR_CATEGORIA_MAP[categoria]
  crearLabor.value = { id, initial: { categoria: (cats && cats[0]) || 'Otro' } }
}
async function onSaveLabor(form) {
  const nueva = await catStore.addLabor(form)
  const id = crearLabor.value.id
  const target = props.items.find(x => x.id === id)
  const base = { ...target, laborId: nueva.id, nombreManual: nueva.nombre }
  if (nueva.esPorcentaje) base.dosis = nueva.porcentaje ?? 8
  else if (nueva.unidadPrecio === 'ha') base.dosis = base.dosis || 1
  base.costoHaCalculado = calc(base)
  emitSorted(props.items.map(x => x.id === id ? base : x))
  crearLabor.value = null
}
</script>

<style>
.di-drag-ghost { opacity: .55; background: #f0fdf4 !important; border-color: #86efac !important; }
.di-drag-handle:active { cursor: grabbing; }
</style>
