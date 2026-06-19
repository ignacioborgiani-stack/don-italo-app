<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Etapas de costo (USD/ha)</span>
      <label style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none">
        <input type="checkbox" v-model="ordenarCat"/> Ordenar por categoría
      </label>
    </div>

    <p v-if="!grupos.length" style="font-size:12px;color:#9ca3af;text-align:center;padding:10px 0">
      Sin etapas. Clic en "+ Agregar etapa" para empezar.
    </p>

    <!-- Etapas (reordenables entre sí arrastrando por el encabezado) -->
    <draggable
      :list="grupos"
      item-key="id"
      handle=".di-etapa-handle"
      :animation="150"
      :force-fallback="true"
      ghost-class="di-etapa-ghost"
      @end="syncUp"
    >
      <template #item="{ element: g }">
        <div style="border:1px solid #d4cfc4;border-radius:10px;padding:10px;margin-bottom:10px;background:#fafaf9">
          <!-- Encabezado de etapa -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span class="di-etapa-handle" title="Arrastrar para reordenar la etapa"
              style="cursor:grab;color:#9ca3af;font-size:16px;flex-shrink:0;user-select:none;touch-action:none">⠿</span>
            <input :value="g.nombre" @input="renombrar(g, $event.target.value)" placeholder="Nombre de la etapa"
              class="di-inp" style="flex:1;font-weight:700;font-size:13px;color:#2d5a27;padding:5px 8px"/>
            <span style="font-size:11px;color:#6b7280;white-space:nowrap">{{ g.items.length }} ít · <b style="color:#dc2626">{{ fmtUSD(totalEtapa(g)) }}</b>/ha</span>
            <button @click="pedirEliminar(g)" title="Eliminar etapa"
              style="background:#fff1f2;border:1px solid #fca5a5;border-radius:5px;cursor:pointer;color:#dc2626;font-size:14px;width:26px;height:26px;flex-shrink:0">×</button>
          </div>

          <!-- Ítems de la etapa (reordenables y movibles entre etapas arrastrando) -->
          <draggable
            :list="g.items"
            :group="grupoName"
            item-key="id"
            handle=".di-drag-handle"
            :animation="150"
            :force-fallback="true"
            ghost-class="di-drag-ghost"
            style="min-height:26px"
            @end="syncUp"
            @add="syncUp"
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
          <p v-if="!g.items.length" style="font-size:11px;color:#bfc4cb;text-align:center;padding:4px 0;font-style:italic">
            Sin ítems — arrastrá ítems acá o agregá uno.
          </p>

          <q-btn flat dense size="sm" color="primary" label="+ Agregar ítem" @click="addItem(g)"
            style="border:1px solid #cde3cb;border-radius:5px;font-size:12px;margin-top:4px"/>
        </div>
      </template>
    </draggable>

    <q-btn flat dense size="sm" color="primary" label="+ Agregar etapa" @click="addEtapa"
      style="border:1px dashed #3a6b35;border-radius:6px;font-size:12px;width:100%;margin-top:2px"/>

    <div v-if="allItems.length" style="text-align:right;font-size:12px;color:#374151;margin-top:8px">
      Total: <b style="color:#dc2626">{{ fmtUSD(total) }}/ha</b>
    </div>

    <!-- Confirmar eliminación de etapa con ítems -->
    <q-dialog v-if="eliminarRef" :model-value="true" @hide="eliminarRef=null">
      <q-card style="width:380px;border-radius:12px;padding:24px;text-align:center">
        <q-icon name="delete_outline" size="28px" color="negative"/>
        <p style="font-size:16px;font-weight:700;margin:8px 0 6px">Eliminar etapa</p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:18px">
          La etapa <b>«{{ eliminarRef.nombre || 'Sin nombre' }}»</b> tiene <b>{{ eliminarRef.items.length }}</b> ítem(s). Se eliminarán junto con la etapa.
        </p>
        <div class="row justify-center q-gutter-sm">
          <q-btn flat label="Cancelar" @click="eliminarRef=null"/>
          <q-btn unelevated color="negative" label="Eliminar" @click="confirmarEliminar"/>
        </div>
      </q-card>
    </q-dialog>

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
import { computed, ref, watch, onMounted } from 'vue'
import draggable from 'vuedraggable'
import ItemCostoRow from './ItemCostoRow.vue'
import InsumoForm from './InsumoForm.vue'
import LaborForm from './LaborForm.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { CATEGORIA_A_FAMILIAS, LABOR_CATEGORIA_MAP, calcularCostoItemHa, ordenarItemsCosto } from '../utils/calculations'
import { FAMILIAS_BASE, CATEGORIAS_LABORES } from '../utils/catalogoData'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({
  items:         { type: Array, default: () => [] },
  etapas:        { type: Array, default: () => [] },
  ordenarCat:    { type: Boolean, default: true },
  rendimientoQq: { type: [Number, String], default: 0 },
  precioVentaTn: { type: [Number, String], default: 0 },
})
const emit = defineEmits(['update'])

const catStore = useCatalogoStore()
const main = useMainStore()
const uid = () => crypto.randomUUID()
const grupoName = 'items-' + uid()   // único por instancia: evita arrastrar ítems entre cultivos distintos

const catalogo = computed(() => catStore.items)
const labores = computed(() => catStore.labores)
const tipoCambio = computed(() => main.tipoCambio)
const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))
const familias = computed(() => [...new Set([...FAMILIAS_BASE, ...catalogo.value.map(i => i.familia)])].sort((a, b) => a.localeCompare(b)))
const categoriasLabores = computed(() => [...new Set([...CATEGORIAS_LABORES, ...labores.value.map(l => l.categoria)])])

const calc = it => calcularCostoItemHa(it, catalogo.value, cultivosPrecio.value, tipoCambio.value, props.rendimientoQq, props.precioVentaTn, labores.value)

const ordenarCat = ref(props.ordenarCat)

// ── Estado local: etapas con sus ítems (estructura anidada para el drag&drop) ──
// Normaliza datos heredados: ids faltantes y ítems sin etapa → etapa "General".
function buildGrupos() {
  const items = (props.items || []).map(it => (it.id ? { ...it } : { ...it, id: uid() }))
  let etapas = (props.etapas || []).map(e => (e.id ? { ...e } : { ...e, id: uid() }))
  const etapaIds = new Set(etapas.map(e => e.id))
  const sinEtapa = items.some(it => !it.etapa || !etapaIds.has(it.etapa))
  if (sinEtapa || (!etapas.length && items.length)) {
    let general = etapas.find(e => e.nombre === 'General')
    if (!general) { general = { id: uid(), nombre: 'General' }; etapas.unshift(general); etapaIds.add(general.id) }
    for (const it of items) if (!it.etapa || !etapaIds.has(it.etapa)) it.etapa = general.id
  }
  let grp = etapas.map(e => ({ id: e.id, nombre: e.nombre, items: items.filter(it => it.etapa === e.id) }))
  if (ordenarCat.value) grp.forEach(g => { g.items = ordenarItemsCosto(g.items) })
  return grp
}
const grupos = ref(buildGrupos())

const allItems = computed(() => grupos.value.flatMap(g => g.items))
const total = computed(() => allItems.value.reduce((s, it) => s + calc(it), 0))
const totalEtapa = g => g.items.reduce((s, it) => s + calc(it), 0)

// Estampa la etapa en cada ítem, ordena por categoría si corresponde y emite al padre.
function syncUp() {
  for (const g of grupos.value) {
    for (const it of g.items) it.etapa = g.id
    if (ordenarCat.value) g.items = ordenarItemsCosto(g.items)
  }
  emit('update', {
    items: grupos.value.flatMap(g => g.items),
    etapas: grupos.value.map(g => ({ id: g.id, nombre: g.nombre })),
    ordenarCat: ordenarCat.value,
  })
}

// Persistir la normalización (General/ids/etapas) ni bien se abre el editor.
onMounted(syncUp)

// Al activar el orden por categoría, reordenar lo ya cargado.
watch(ordenarCat, v => {
  if (v) grupos.value.forEach(g => { g.items = ordenarItemsCosto(g.items) })
  syncUp()
})

// ── Etapas ────────────────────────────────────────────────────────
function addEtapa() { grupos.value.push({ id: uid(), nombre: '', items: [] }); syncUp() }
function renombrar(g, nombre) { g.nombre = nombre; syncUp() }
function pedirEliminar(g) {
  if (g.items.length) eliminarRef.value = g
  else { grupos.value = grupos.value.filter(x => x !== g); syncUp() }
}
const eliminarRef = ref(null)
function confirmarEliminar() {
  grupos.value = grupos.value.filter(x => x !== eliminarRef.value)
  eliminarRef.value = null
  syncUp()
}

// ── Ítems ─────────────────────────────────────────────────────────
function addItem(g) {
  g.items.push({
    id: uid(), etapa: g.id, categoria: 'fertilizante', insumoId: null, laborId: null, nombreManual: '',
    dosis: '', unidadDosis: '', costoHaCalculado: 0, modoEspecial: false, parametroEspecial: null,
  })
  syncUp()
}
function findItem(id) {
  for (const g of grupos.value) { const i = g.items.findIndex(x => x.id === id); if (i !== -1) return { g, i } }
  return null
}
function upd(id, it) { const f = findItem(id); if (f) { it.etapa = f.g.id; f.g.items.splice(f.i, 1, it); syncUp() } }
function del(id)     { const f = findItem(id); if (f) { f.g.items.splice(f.i, 1); syncUp() } }

// ── Crear insumo / labor en línea ─────────────────────────────────
const crearInsumo = ref(null)
function onCrearInsumo(id, categoria) {
  const fams = CATEGORIA_A_FAMILIAS[categoria]
  crearInsumo.value = { id, initial: { familia: (fams && fams[0]) || 'Otros' } }
}
async function onSaveInsumo(form) {
  const nuevo = await catStore.addItem(form)
  const f = findItem(crearInsumo.value.id)
  if (f) {
    const base = { ...f.g.items[f.i], insumoId: nuevo.id, nombreManual: nuevo.nombre }
    base.costoHaCalculado = calc(base)
    f.g.items.splice(f.i, 1, base)
    syncUp()
  }
  crearInsumo.value = null
}

const crearLabor = ref(null)
function onCrearLabor(id, categoria) {
  const cats = LABOR_CATEGORIA_MAP[categoria]
  crearLabor.value = { id, initial: { categoria: (cats && cats[0]) || 'Otro' } }
}
async function onSaveLabor(form) {
  const nueva = await catStore.addLabor(form)
  const f = findItem(crearLabor.value.id)
  if (f) {
    const base = { ...f.g.items[f.i], laborId: nueva.id, nombreManual: nueva.nombre }
    if (nueva.esPorcentaje) base.dosis = nueva.porcentaje ?? 8
    else if (nueva.unidadPrecio === 'ha') base.dosis = base.dosis || 1
    base.costoHaCalculado = calc(base)
    f.g.items.splice(f.i, 1, base)
    syncUp()
  }
  crearLabor.value = null
}
</script>

<style>
.di-drag-ghost  { opacity: .55; background: #f0fdf4 !important; border-color: #86efac !important; }
.di-etapa-ghost { opacity: .55; background: #ecfdf5 !important; border-color: #6ee7b7 !important; }
.di-drag-handle:active, .di-etapa-handle:active { cursor: grabbing; }
</style>
