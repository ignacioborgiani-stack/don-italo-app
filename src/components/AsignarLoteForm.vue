<template>
  <div>
    <!-- ── PASO 1: elegir lote del catastro ── -->
    <template v-if="paso===1">
      <p style="font-size:13px;color:#6b7280;margin:0 0 12px">Elegí un lote del catastro para asignar a la campaña <b>{{ campania }}</b>:</p>

      <div v-if="!lotesMaestro.length" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;font-size:13px;color:#92400e;margin-bottom:12px">
        No hay lotes en el catastro todavía. Creá uno primero.
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;max-height:340px;overflow-y:auto;margin-bottom:14px">
        <button v-for="l in lotesMaestro" :key="l.id" :disabled="asignado(l.id)" @click="elegir(l)"
          :style="{textAlign:'left',padding:'10px 12px',border:`1.5px solid ${asignado(l.id)?'#e5e7eb':'#86efac'}`,borderRadius:'9px',cursor:asignado(l.id)?'not-allowed':'pointer',background:asignado(l.id)?'#f9fafb':'#fff',opacity:asignado(l.id)?0.7:1,fontFamily:'inherit'}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
            <b style="font-size:14px;color:#1f2937">{{ l.nombre }}</b>
            <span style="font-size:11px;color:#6b7280;white-space:nowrap">{{ fmtNum(l.ha) }} ha</span>
          </div>
          <div v-if="l.ubicacion" style="font-size:11px;color:#9ca3af;margin-top:2px">📍 {{ l.ubicacion }}</div>
          <span v-if="asignado(l.id)" style="display:inline-block;margin-top:4px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:0 8px;font-size:10px;font-weight:600">Ya asignado</span>
        </button>
      </div>

      <div class="row items-center justify-between">
        <q-btn flat color="primary" label="+ Crear lote nuevo" @click="crearLote=true"/>
        <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      </div>
    </template>

    <!-- ── PASO 2: configurar cultivo y costos ── -->
    <template v-else>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-size:11px;color:#6b7280">Lote</span>
          <div style="font-weight:700;font-size:15px;color:#2d5a27">{{ loteSel?.nombre }}</div>
        </div>
        <div style="text-align:right">
          <span style="font-size:11px;color:#6b7280">Hectáreas</span>
          <div style="font-weight:700;font-size:15px">{{ fmtNum(loteSel?.ha) }} ha</div>
        </div>
      </div>

      <div style="display:flex;border-radius:8px;overflow:hidden;border:2px solid #3a6b35;margin-bottom:16px">
        <button v-for="[k,l] in [['simple','🌱 Cultivo simple'],['doble','🌾☀️ Doble cultivo']]" :key="k"
          @click="f.tipoSiembra=k"
          :style="{flex:1,padding:'9px 0',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:f.tipoSiembra===k?'#3a6b35':'#fff',color:f.tipoSiembra===k?'#fff':'#3a6b35',fontFamily:'inherit'}">
          {{ l }}
        </button>
      </div>

      <template v-if="f.tipoSiembra==='simple'">
        <CultivoBlock titulo="Cultivo" emoji="🌱" border-color="#3a6b35" cultivo-type="simple"
          :cultivo-obj="f.cultivo" @update:cultivo-obj="v=>f.cultivo=v"/>
      </template>
      <template v-else>
        <CultivoBlock titulo="Cultivo Invernal" emoji="🌾" border-color="#5b8dd9" cultivo-type="invernal"
          :cultivo-obj="f.cultivoInvernal" @update:cultivo-obj="v=>f.cultivoInvernal=v"/>
        <CultivoBlock titulo="Cultivo Estival (sobre rastrojo)" emoji="☀️" border-color="#e8a838" cultivo-type="estival"
          :cultivo-obj="f.cultivoEstival" @update:cultivo-obj="v=>f.cultivoEstival=v"/>
      </template>

      <!-- ── ALQUILER (concepto aparte: depende del precio del cultivo) ── -->
      <div style="border:2px solid #c4893a;border-radius:10px;padding:14px;margin-top:14px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;margin-bottom:4px">
          <input type="checkbox" v-model="alq.activo"/>
          <span style="font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.03em">🏠 Alquiler del lote</span>
        </label>
        <p style="font-size:11px;color:#9ca3af;margin:0 0 10px">Se valúa con el precio del cultivo de referencia (no es un monto fijo en USD).</p>

        <template v-if="alq.activo">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label class="di-lbl">Tipo de contrato</label>
              <select v-model="alq.tipoContrato" class="di-inp">
                <option value="quintales_fijos">Quintales fijos (qq/ha)</option>
                <option value="porcentaje_cosecha">% de la cosecha</option>
              </select>
            </div>
            <div>
              <label class="di-lbl">Cultivo de referencia</label>
              <select v-model="alq.cultivoReferencia" class="di-inp">
                <option v-for="n in cultivoRefOpciones" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
            <div>
              <label class="di-lbl">{{ alq.tipoContrato==='quintales_fijos' ? 'Cantidad (qq/ha)' : '% de la cosecha' }}</label>
              <input v-model="alq.cantidad" type="number" step="any" class="di-inp" placeholder="0"/>
            </div>
            <div v-if="alq.tipoContrato==='porcentaje_cosecha'" style="align-self:end">
              <p style="font-size:11px;color:#9ca3af;margin:0 0 6px">Se calcula sobre el rinde del cultivo estival/verano.</p>
            </div>
          </div>

          <!-- Reparto entre cultivos si es doble -->
          <div v-if="f.tipoSiembra==='doble'" style="margin-top:10px">
            <label class="di-lbl">Reparto del alquiler entre cultivos (%)</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <input v-model="alq.repartoEstival" type="number" step="any" class="di-inp" placeholder="60"/>
                <span style="font-size:10px;color:#9ca3af">☀️ Estival ({{ f.cultivoEstival?.nombre || '—' }})</span>
              </div>
              <div>
                <input v-model="alq.repartoInvernal" type="number" step="any" class="di-inp" placeholder="40"/>
                <span style="font-size:10px;color:#9ca3af">🌾 Invernal ({{ f.cultivoInvernal?.nombre || '—' }})</span>
              </div>
            </div>
          </div>

          <!-- Vista previa del cálculo -->
          <div style="margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400e">
            <div>Alquiler total del lote: <b>{{ fmtUSD(alqPreview.total) }}</b></div>
            <template v-if="f.tipoSiembra==='doble'">
              <div>☀️ {{ f.cultivoEstival?.nombre }}: <b>{{ fmtUSD(alqPreview.estivalUsd) }}</b> ({{ fmtUSD(alqPreview.estivalHa) }}/ha)</div>
              <div>🌾 {{ f.cultivoInvernal?.nombre }}: <b>{{ fmtUSD(alqPreview.invernalUsd) }}</b> ({{ fmtUSD(alqPreview.invernalHa) }}/ha)</div>
            </template>
            <template v-else>
              <div>{{ f.cultivo?.nombre }}: <b>{{ fmtUSD(alqPreview.simpleHa) }}/ha</b></div>
            </template>
          </div>
        </template>
      </div>

      <div class="row items-center justify-between q-mt-md">
        <q-btn v-if="!editMode" flat label="← Volver" @click="paso=1"/>
        <q-btn v-else flat label="Cancelar" @click="$emit('cancel')"/>
        <q-btn unelevated color="primary" label="Guardar asignación" @click="onGuardar"/>
      </div>
    </template>

    <!-- Crear lote nuevo sin cerrar este modal -->
    <q-dialog v-if="crearLote" :model-value="true" @hide="crearLote=false">
      <q-card style="width:560px;max-width:95vw;border-radius:14px;padding:28px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Nuevo lote</h2>
          <q-btn flat round dense icon="close" @click="crearLote=false"/>
        </div>
        <LoteMaestroForm @save="onCrearLote" @cancel="crearLote=false"/>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import CultivoBlock from './CultivoBlock.vue'
import LoteMaestroForm from './LoteMaestroForm.vue'
import { useLotesMaestroStore } from '../stores/lotesMaestro'
import { useMainStore } from '../stores/main'
import { useCatalogoStore } from '../stores/catalogo'
import { calcularCostoItemHa, alquilerPorCultivo } from '../utils/calculations'
import { fmtNum, fmtUSD } from '../utils/formatters'

const props = defineProps({ campania: String, initial: Object })
const emit  = defineEmits(['save', 'cancel'])

const lmStore = useLotesMaestroStore()
const main = useMainStore()
const catStore = useCatalogoStore()

const editMode = !!props.initial
const lotesMaestro = computed(() => lmStore.items)
const asignadasIds = computed(() => new Set(main.asignaciones.filter(a => a.campaña === props.campania).map(a => a.loteId)))
const asignado = id => asignadasIds.value.has(id) && id !== props.initial?.loteId

const paso = ref(editMode ? 2 : 1)
const loteSel = ref(editMode ? lmStore.byId(props.initial.loteId) : null)
const crearLote = ref(false)

const emptyC = (nombre, tipo) => ({ nombre, tipo, rendimientoQq: '', precioVentaTn: '', itemsCosto: [] })
const f = reactive(editMode ? {
  loteId: props.initial.loteId, tipoSiembra: props.initial.tipoSiembra || 'simple',
  cultivo:         props.initial.cultivo         || emptyC('Soja', 'estival'),
  cultivoInvernal: props.initial.cultivoInvernal || emptyC('Trigo', 'invernal'),
  cultivoEstival:  props.initial.cultivoEstival  || emptyC('Soja', 'estival'),
} : {
  loteId: null, tipoSiembra: 'simple',
  cultivo: emptyC('Soja', 'estival'), cultivoInvernal: emptyC('Trigo', 'invernal'), cultivoEstival: emptyC('Soja', 'estival'),
})

function elegir(l) { if (asignado(l.id)) return; loteSel.value = l; f.loteId = l.id; paso.value = 2 }
async function onCrearLote(data) {
  const nuevo = await lmStore.addLote(data)
  crearLote.value = false
  loteSel.value = nuevo; f.loteId = nuevo.id; paso.value = 2
}

const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))

// ── Alquiler (contrato del lote en esta campaña) ──────────────────
const existingContrato = editMode ? main.contratoDeLote(props.initial.loteId, props.campania) : null
const alq = reactive({
  activo:           !!existingContrato,
  tipoContrato:     existingContrato?.tipoContrato || 'quintales_fijos',
  cultivoReferencia: existingContrato?.cultivoReferencia || 'Soja',
  cantidad:         existingContrato?.cantidad ?? '',
  repartoEstival:   existingContrato?.repartoEstival ?? 60,
  repartoInvernal:  existingContrato?.repartoInvernal ?? 40,
})
const cultivoRefOpciones = computed(() => {
  const set = new Set(catStore.cultivos.map(c => c.nombre))
  ;[f.cultivo?.nombre, f.cultivoEstival?.nombre, f.cultivoInvernal?.nombre].forEach(n => n && set.add(n))
  return [...set].filter(Boolean)
})
const asigActual = computed(() => ({ tipoSiembra: f.tipoSiembra, cultivo: f.cultivo, cultivoEstival: f.cultivoEstival, cultivoInvernal: f.cultivoInvernal }))
const alqPreview = computed(() => alquilerPorCultivo(alq, asigActual.value, loteSel.value?.ha, cultivosPrecio.value))

function finalizar(c) {
  if (!c) return null
  return { ...c, itemsCosto: (c.itemsCosto || []).map(it => ({
    ...it,
    costoHaCalculado: calcularCostoItemHa(it, catStore.items, cultivosPrecio.value, main.tipoCambio, c.rendimientoQq, c.precioVentaTn, catStore.labores),
  })) }
}

async function onGuardar() {
  const out = { loteId: f.loteId, campaña: props.campania, tipoSiembra: f.tipoSiembra }
  if (f.tipoSiembra === 'doble') {
    out.cultivo = null
    out.cultivoInvernal = finalizar(f.cultivoInvernal)
    out.cultivoEstival = finalizar(f.cultivoEstival)
  } else {
    out.cultivo = finalizar(f.cultivo)
    out.cultivoInvernal = null
    out.cultivoEstival = null
  }
  if (editMode) out.id = props.initial.id

  // Contrato de alquiler (tabla aparte). No bloquea el guardado de la asignación.
  try {
    if (alq.activo) {
      await main.upsertContratoAlquiler(f.loteId, props.campania, {
        tipoContrato: alq.tipoContrato, cultivoReferencia: alq.cultivoReferencia,
        cantidad: alq.cantidad, repartoEstival: alq.repartoEstival, repartoInvernal: alq.repartoInvernal,
      })
    } else if (existingContrato) {
      await main.delContratoAlquiler(existingContrato.id)
    }
  } catch (e) { console.warn('[alquiler] no se pudo guardar el contrato:', e?.message) }

  emit('save', out)
}
</script>
