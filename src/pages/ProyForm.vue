<template>
  <div>
    <!-- Cargar desde plantilla (si hay plantillas para este cultivo) -->
    <div v-if="plantillasCultivo.length" style="margin-bottom:14px;background:#f0fdf4;border:1px solid #cde3cb;border-radius:8px;padding:10px 12px">
      <label class="di-lbl" style="color:#2d5a27">📋 Cargar desde plantilla ({{ f.cultivo }})</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <select v-model="plantillaSel" class="di-inp" style="flex:1;min-width:200px">
          <option value="">— Elegí una plantilla —</option>
          <option v-for="p in plantillasCultivo" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
        <q-btn unelevated dense color="primary" label="Cargar" :disable="!plantillaSel" @click="cargarPlantilla"/>
      </div>
      <p style="font-size:11px;color:#6b7280;margin:6px 0 0">Reemplaza las etapas e ítems actuales; después podés editarlos sin afectar la plantilla.</p>
    </div>

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
      :key="editorKey"
      :items="f.itemsCosto"
      :etapas="f.etapas"
      :ordenar-cat="f.ordenarCat !== false"
      :rendimiento-qq="f.rendimientoQq"
      :precio-venta-tn="f.precioVentaTn"
      @update="onUpdItems"
    />
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin:14px 0">
      <div v-for="[l,v,c] in stats" :key="l">
        <p style="font-size:11px;color:#6b7280">{{ l }}</p>
        <p :style="{fontSize:'17px',fontWeight:700,color:c}">{{ fmtUSD(v) }}</p>
      </div>
    </div>
    <!-- Guardar como plantilla -->
    <div style="border-top:1px solid #f0ede8;margin-top:6px;padding-top:10px;margin-bottom:12px">
      <div v-if="!mostrarGuardarPlantilla" class="row items-center q-gutter-sm">
        <q-btn flat dense size="sm" color="primary" icon="bookmark_add" label="Guardar como plantilla" @click="abrirGuardarPlantilla"/>
        <span v-if="okPlantilla" style="font-size:12px;color:#166534">✓ {{ okPlantilla }}</span>
      </div>
      <div v-else style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input v-model="plantillaNombre" class="di-inp" style="flex:1;min-width:220px" placeholder="Nombre de la plantilla" @keyup.enter="guardarPlantilla"/>
        <q-btn unelevated dense color="primary" label="Guardar plantilla" :loading="guardandoPlantilla" :disable="!plantillaNombre.trim()" @click="guardarPlantilla"/>
        <q-btn flat dense label="Cancelar" @click="mostrarGuardarPlantilla=false"/>
      </div>
      <p v-if="errorPlantilla" style="font-size:12px;color:#dc2626;margin:6px 0 0">{{ errorPlantilla }}</p>
    </div>

    <div class="row justify-end q-gutter-sm">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="onGuardar"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'
import ItemsCostoCatalogo from '../components/ItemsCostoCatalogo.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { usePlantillasStore } from '../stores/plantillas'
import { calcIngresoHa, calcularCostoItemHa } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({ proy: Object })
const emit  = defineEmits(['save', 'cancel'])

const catStore = useCatalogoStore()
const main = useMainStore()
const plantillas = usePlantillasStore()

const f = reactive({ ...props.proy, itemsCosto: props.proy.itemsCosto || [], etapas: props.proy.etapas || [], ordenarCat: props.proy.ordenarCat !== false })

function onUpdItems(v) { f.itemsCosto = v.items; f.etapas = v.etapas; f.ordenarCat = v.ordenarCat }

// ── Plantillas ────────────────────────────────────────────────────
const editorKey = ref(0)   // al cambiarlo, se remonta el editor con los ítems nuevos
const plantillasCultivo = computed(() => plantillas.plantillasDe(f.cultivo))

const plantillaSel = ref('')
function cargarPlantilla() {
  const p = plantillas.items.find(x => x.id === plantillaSel.value)
  if (!p) return
  // copia profunda: editar el presupuesto NO afecta la plantilla original
  f.itemsCosto = JSON.parse(JSON.stringify(p.itemsCosto || []))
  f.etapas     = JSON.parse(JSON.stringify(p.etapas || []))
  editorKey.value++
  plantillaSel.value = ''
}

const mostrarGuardarPlantilla = ref(false)
const plantillaNombre   = ref('')
const guardandoPlantilla = ref(false)
const okPlantilla    = ref('')
const errorPlantilla = ref('')
function abrirGuardarPlantilla() {
  plantillaNombre.value = `Plantilla ${f.cultivo} ${main.campania}`
  okPlantilla.value = ''; errorPlantilla.value = ''
  mostrarGuardarPlantilla.value = true
}
async function guardarPlantilla() {
  const nombre = (plantillaNombre.value || '').trim()
  if (!nombre) return
  guardandoPlantilla.value = true; errorPlantilla.value = ''
  try {
    await plantillas.addPlantilla({ cultivo: f.cultivo, nombre, itemsCosto: f.itemsCosto, etapas: f.etapas })
    okPlantilla.value = `Guardada: ${nombre}`
    mostrarGuardarPlantilla.value = false
  } catch (e) { errorPlantilla.value = e.message || 'No se pudo guardar la plantilla' }
  finally { guardandoPlantilla.value = false }
}

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
