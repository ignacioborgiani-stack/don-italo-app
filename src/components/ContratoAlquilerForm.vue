<template>
  <div>
    <p style="font-size:12px;color:#6b7280;margin:0 0 12px">
      El alquiler es información del campo: abarca un rango de campañas y se valúa con el precio del cultivo de referencia (no es un monto fijo en USD).
    </p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <label class="di-lbl">Campaña inicio</label>
        <select v-model="c.campanaInicio" class="di-inp">
          <option v-for="k in campanas" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Campaña fin</label>
        <select v-model="c.campanaFin" class="di-inp">
          <option v-for="k in campanas" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Tipo de contrato</label>
        <select v-model="c.tipoContrato" class="di-inp">
          <option value="quintales_fijos">Quintales fijos (qq/ha)</option>
          <option value="porcentaje_cosecha">% de la cosecha</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Cultivo de referencia</label>
        <select v-model="c.cultivoReferencia" class="di-inp">
          <option v-for="n in cultivoRefOpciones" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">{{ c.tipoContrato==='quintales_fijos' ? 'Cantidad (qq/ha)' : '% de la cosecha' }}</label>
        <input v-model="c.cantidad" type="number" step="any" class="di-inp" placeholder="0"/>
      </div>
      <div v-if="c.tipoContrato==='porcentaje_cosecha'" style="align-self:end">
        <p style="font-size:11px;color:#9ca3af;margin:0 0 6px">Se calcula sobre el rinde del cultivo estival/verano de la campaña activa.</p>
      </div>
    </div>

    <p v-if="invalidoRango" style="font-size:12px;color:#dc2626;margin:8px 0 0">La campaña de inicio no puede ser posterior a la de fin.</p>
    <p v-else-if="solapaConOtro" style="font-size:12px;color:#dc2626;margin:8px 0 0">⚠️ El rango se superpone con otro contrato del lote. No puede haber dos contratos vigentes en la misma campaña.</p>

    <!-- Reparto entre cultivos: sólo si el lote es doble en la campaña activa -->
    <div v-if="esDoble" style="margin-top:12px">
      <label class="di-lbl">Reparto del alquiler entre cultivos (%) — doble en {{ main.campania }}</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <input v-model="c.repartoEstival" type="number" step="any" class="di-inp" placeholder="60"/>
          <span style="font-size:10px;color:#9ca3af">☀️ Estival ({{ asigActiva?.cultivoEstival?.nombre || '—' }})</span>
        </div>
        <div>
          <input v-model="c.repartoInvernal" type="number" step="any" class="di-inp" placeholder="40"/>
          <span style="font-size:10px;color:#9ca3af">🌾 Invernal ({{ asigActiva?.cultivoInvernal?.nombre || '—' }})</span>
        </div>
      </div>
    </div>

    <!-- Vista previa (sobre la campaña activa) -->
    <div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e">
      <div style="font-weight:700;margin-bottom:2px">Vista previa ({{ main.campania }} · {{ fmtNum(lote.ha) }} ha)</div>
      <div>Alquiler total del lote: <b>{{ fmtUSD(preview.total) }}</b></div>
      <template v-if="esDoble">
        <div>☀️ {{ asigActiva?.cultivoEstival?.nombre }}: <b>{{ fmtUSD(preview.estivalHa) }}/ha</b> ({{ fmtUSD(preview.estivalUsd) }})</div>
        <div>🌾 {{ asigActiva?.cultivoInvernal?.nombre }}: <b>{{ fmtUSD(preview.invernalHa) }}/ha</b> ({{ fmtUSD(preview.invernalUsd) }})</div>
      </template>
      <template v-else>
        <div><b>{{ fmtUSD(preview.simpleHa) }}/ha</b></div>
      </template>
      <div v-if="!precioRefOk" style="color:#9a3412;margin-top:2px">⚠️ El cultivo de referencia «{{ c.cultivoReferencia }}» no tiene precio en el catálogo → el alquiler da 0.</div>
    </div>

    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar contrato" :loading="busy==='save'" :disable="invalidoRango || solapaConOtro" @click="guardar"/>
    </div>
    <p v-if="error" style="font-size:12px;color:#dc2626;margin:8px 0 0">{{ error }}</p>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useMainStore } from '../stores/main'
import { useCatalogoStore } from '../stores/catalogo'
import { alquilerPorCultivo } from '../utils/calculations'
import { fmtUSD, fmtNum } from '../utils/formatters'

const props = defineProps({ lote: { type: Object, required: true }, initial: { type: Object, default: null } })
const emit  = defineEmits(['save', 'cancel'])

const main = useMainStore()
const catStore = useCatalogoStore()

// Año por los primeros 4 caracteres del string (ej: "2024/25" → 2024).
const campYear = n => parseInt(String(n || '').slice(0, 4), 10) || 0
// Campañas del store + los valores actuales del contrato (por si abarca alguna
// campaña que todavía no está en la lista), ordenadas por año.
const campanas = computed(() => {
  const set = new Set(main.campanas)
  if (c.campanaInicio) set.add(c.campanaInicio)
  if (c.campanaFin) set.add(c.campanaFin)
  return [...set].sort((a, b) => campYear(a) - campYear(b))
})

// Asignación del lote en la campaña activa (para saber si es doble y sus cultivos).
const asigActiva = computed(() => main.asignaciones.find(a => a.loteId === props.lote.id && a.campaña === main.campania) || null)
const esDoble = computed(() => asigActiva.value?.tipoSiembra === 'doble')

const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))
const cultivoRefOpciones = computed(() => {
  const set = new Set(catStore.cultivos.map(c => c.nombre))
  const a = asigActiva.value
  ;[a?.cultivo?.nombre, a?.cultivoEstival?.nombre, a?.cultivoInvernal?.nombre].forEach(n => n && set.add(n))
  return [...set].filter(Boolean)
})

const cultivoDefault = () => {
  const a = asigActiva.value
  return a?.cultivoEstival?.nombre || a?.cultivo?.nombre || catStore.cultivos[0]?.nombre || 'Soja'
}

const c = reactive({
  campanaInicio:    props.initial?.campanaInicio || main.campania,
  campanaFin:       props.initial?.campanaFin    || main.campania,
  tipoContrato:     props.initial?.tipoContrato  || 'quintales_fijos',
  cultivoReferencia: props.initial?.cultivoReferencia || cultivoDefault(),
  cantidad:         props.initial?.cantidad ?? '',
  repartoEstival:   props.initial?.repartoEstival ?? 60,
  repartoInvernal:  props.initial?.repartoInvernal ?? 40,
})

const invalidoRango = computed(() => campYear(c.campanaInicio) > campYear(c.campanaFin))
// ¿El rango se superpone con OTRO contrato del lote? (excluye el que se edita)
const solapaConOtro = computed(() => {
  const ni = campYear(c.campanaInicio), nf = campYear(c.campanaFin)
  if (!ni || !nf) return false
  return main.contratosDeLote(props.lote.id).some(o => {
    if (props.initial && o.id === props.initial.id) return false
    const oi = campYear(o.campanaInicio), of = campYear(o.campanaFin)
    return oi && of && ni <= of && nf >= oi
  })
})
const precioRefOk = computed(() => (parseFloat(cultivosPrecio.value[c.cultivoReferencia]) || 0) > 0)

// Preview sobre la asignación de la campaña activa (o simple si el lote no está asignado).
const preview = computed(() => {
  const asig = asigActiva.value || { tipoSiembra: 'simple', cultivo: { rendimientoQq: 0 } }
  return alquilerPorCultivo(c, asig, props.lote.ha, cultivosPrecio.value)
})

const busy = ref(null)
const error = ref('')
async function guardar() {
  if (invalidoRango.value || solapaConOtro.value) return
  busy.value = 'save'; error.value = ''
  const datos = {
    campanaInicio: c.campanaInicio, campanaFin: c.campanaFin,
    tipoContrato: c.tipoContrato, cultivoReferencia: c.cultivoReferencia, cantidad: c.cantidad,
    repartoEstival: esDoble.value ? c.repartoEstival : 100,
    repartoInvernal: esDoble.value ? c.repartoInvernal : 0,
  }
  try {
    if (props.initial) await main.updContratoAlquiler(props.initial.id, datos)   // EDITAR
    else               await main.addContratoAlquiler(props.lote.id, datos)      // CREAR
    emit('save')
  } catch (e) {
    error.value = /solap/i.test(e.message || '')
      ? 'El rango se superpone con otro contrato del lote.'
      : (e.message || 'No se pudo guardar el contrato')
  } finally { busy.value = null }
}
</script>
