<template>
  <div>
    <!-- ════════ DOBLE CULTIVO ════════ -->
    <template v-if="esDoble">
      <CultivoBlock titulo="Cultivo Invernal" emoji="🌾" border-color="#5b8dd9" cultivo-type="invernal"
        :cultivo-obj="f.cultivoInvernal" :precio-editable="false"
        @update:cultivo-obj="v=>f.cultivoInvernal=v"/>
      <CultivoBlock titulo="Cultivo Estival (sobre rastrojo)" emoji="☀️" border-color="#e8a838" cultivo-type="estival"
        :cultivo-obj="f.cultivoEstival" :precio-editable="false"
        @update:cultivo-obj="v=>f.cultivoEstival=v"/>

      <!-- Reparto del alquiler entre los dos cultivos -->
      <div style="border:2px solid #d44f8e;border-radius:10px;padding:14px;margin-bottom:14px">
        <div class="row items-center q-gutter-x-sm q-mb-sm">
          <span style="font-size:18px">🏠</span>
          <h4 style="font-size:12px;font-weight:700;color:#d44f8e;text-transform:uppercase;letter-spacing:.04em;margin:0">Reparto del alquiler</h4>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:0 0 10px">
          El alquiler cargado como ítem <b>Arrendamiento</b> en cualquiera de los dos cultivos se junta
          (<b>{{ fmtUSD(alquilerTotalHa) }}/ha</b>) y se reparte con estos porcentajes.
          No cambia el costo total del doble: sólo cómo se imputa a cada cultivo.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label class="di-lbl">🌾 {{ f.cultivoInvernal.nombre || 'Invernal' }} (%)</label>
            <input v-model="f.repartoInvernal" type="number" step="any" class="di-inp" @input="ajustarReparto('inv')"/>
          </div>
          <div>
            <label class="di-lbl">☀️ {{ f.cultivoEstival.nombre || 'Estival' }} (%)</label>
            <input v-model="f.repartoEstival" type="number" step="any" class="di-inp" @input="ajustarReparto('est')"/>
          </div>
        </div>
        <p v-if="alquilerTotalHa > 0" style="font-size:11px;color:#374151;margin:8px 0 0">
          🌾 {{ fmtUSD(repartoCalc.invHa) }}/ha · ☀️ {{ fmtUSD(repartoCalc.estHa) }}/ha
        </p>
        <p v-else style="font-size:11px;color:#9ca3af;margin:8px 0 0">
          Todavía no hay ítems de Arrendamiento cargados — el reparto no tiene efecto hasta que agregues uno.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin:14px 0">
        <div v-for="[l,v,c] in statsDoble" :key="l">
          <p style="font-size:11px;color:#6b7280">{{ l }}</p>
          <p :style="{fontSize:'17px',fontWeight:700,color:c}">{{ fmtUSD(v) }}</p>
        </div>
      </div>

      <div class="row justify-end q-gutter-sm">
        <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
        <q-btn unelevated color="primary" label="Guardar" :loading="guardando" @click="onGuardar"/>
      </div>
    </template>

    <!-- ════════ CULTIVO SIMPLE ════════ -->
    <template v-else>
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
      <q-btn unelevated color="primary" label="Guardar" :loading="guardando" @click="onGuardar"/>
    </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'
import ItemsCostoCatalogo from '../components/ItemsCostoCatalogo.vue'
import CultivoBlock from '../components/CultivoBlock.vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { usePlantillasStore } from '../stores/plantillas'
import { calcIngresoHa, calcularCostoItemHa } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({ proy: Object, guardando: { type: Boolean, default: false } })
const emit  = defineEmits(['save', 'cancel'])

const catStore = useCatalogoStore()
const main = useMainStore()
const plantillas = usePlantillasStore()

const emptyC = (nombre, tipo) => ({ nombre, tipo, rendimientoQq: '', precioVentaTn: '', itemsCosto: [], etapas: [], ordenarCat: true })
const f = reactive(props.proy.tipoSiembra === 'doble'
  ? {
      ...props.proy,
      cultivoInvernal: { ...emptyC('Trigo', 'invernal'), ...(props.proy.cultivoInvernal || {}) },
      cultivoEstival:  { ...emptyC('Soja', 'estival'),   ...(props.proy.cultivoEstival  || {}) },
      repartoInvernal: props.proy.repartoInvernal ?? 50,
      repartoEstival:  props.proy.repartoEstival  ?? 50,
    }
  : { ...props.proy, itemsCosto: props.proy.itemsCosto || [], etapas: props.proy.etapas || [], ordenarCat: props.proy.ordenarCat !== false })

const esDoble = computed(() => f.tipoSiembra === 'doble')

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

// ── Doble cultivo ─────────────────────────────────────────────────
// En el formulario los costos se calculan EN VIVO (los ítems recién agregados
// todavía no tienen `costoHaCalculado` congelado).
const itemHaLive = (it, c) => calcularCostoItemHa(it, catalogo.value, cultivosPrecio.value, main.tipoCambio, c?.rendimientoQq, c?.precioVentaTn, catStore.labores)
const sumaLive   = (c, filtro = () => true) => (c?.itemsCosto || []).filter(filtro).reduce((s, it) => s + itemHaLive(it, c), 0)
const esAlquiler = it => it.categoria === 'arrendamiento'

const alquilerTotalHa = computed(() => esDoble.value
  ? sumaLive(f.cultivoInvernal, esAlquiler) + sumaLive(f.cultivoEstival, esAlquiler)
  : 0)
const repartoCalc = computed(() => {
  const rI = parseFloat(f.repartoInvernal) || 0
  const rE = parseFloat(f.repartoEstival) || 0
  const sum = (rI + rE) || 100
  return { invHa: alquilerTotalHa.value * rI / sum, estHa: alquilerTotalHa.value * rE / sum }
})
// Al mover un porcentaje, el otro se completa hasta 100.
function ajustarReparto(cual) {
  const v = Math.max(0, Math.min(100, parseFloat(cual === 'inv' ? f.repartoInvernal : f.repartoEstival) || 0))
  if (cual === 'inv') f.repartoEstival = Math.round((100 - v) * 100) / 100
  else                f.repartoInvernal = Math.round((100 - v) * 100) / 100
}

const costoDobleHa = computed(() => sumaLive(f.cultivoInvernal) + sumaLive(f.cultivoEstival))
const ingDobleHa   = computed(() => calcIngresoHa(f.cultivoInvernal) + calcIngresoHa(f.cultivoEstival))
const statsDoble   = computed(() => {
  const m = ingDobleHa.value - costoDobleHa.value
  return [
    ['Costo/ha (doble)',   costoDobleHa.value, '#dc2626'],
    ['Ingreso/ha (doble)', ingDobleHa.value,   '#2d5a27'],
    ['Margen/ha (doble)',  m, m >= 0 ? '#3a6b35' : '#dc2626'],
  ]
})

// Al guardar, "congela" el costoHaCalculado de cada ítem con el rinde/precio actuales,
// para que las vistas resumen (Dashboard/Proyectados) muestren el total correcto.
const congelar = c => ({
  ...c,
  itemsCosto: (c?.itemsCosto || []).map(it => ({ ...it, costoHaCalculado: itemHaLive(it, c) })),
})
function onGuardar() {
  if (esDoble.value) {
    emit('save', {
      ...f,
      tipoSiembra: 'doble',
      cultivoInvernal: congelar(f.cultivoInvernal),
      cultivoEstival:  congelar(f.cultivoEstival),
      repartoInvernal: parseFloat(f.repartoInvernal) || 0,
      repartoEstival:  parseFloat(f.repartoEstival) || 0,
    })
    return
  }
  emit('save', { ...f, itemsCosto: congelar(f).itemsCosto })
}
</script>
