<template>
  <div>
    <!-- ── PASO 1: elegir lote del catastro ── -->
    <template v-if="paso===1">
      <p style="font-size:13px;color:#6b7280;margin:0 0 12px">Elegí un lote del catastro para asignar a la campaña <b>{{ campania }}</b>:</p>

      <div v-if="!lotesMaestro.length" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;font-size:13px;color:#92400e;margin-bottom:12px">
        No hay lotes en el catastro todavía. Creá uno primero.
      </div>

      <!-- Sin max-height propio: el que scrollea ahora es el cuerpo del modal
           maximizado, y anidar dos scrolls hace que la grilla quede encerrada. -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:14px">
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

      <div class="di-modal-foot row items-center justify-between">
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
          :cultivo-obj="f.cultivo" :ha-lote="haLote"
          :alquiler-ha="alqContrato.simpleHa" :alquiler-variable-tn="alqContrato.variableTn"
          @update:cultivo-obj="v=>onCultivo('simple','cultivo',v)"/>
      </template>
      <template v-else>
        <CultivoBlock titulo="Cultivo Invernal" emoji="🌾" border-color="#5b8dd9" cultivo-type="invernal"
          :cultivo-obj="f.cultivoInvernal" :ha-lote="haLote"
          :alquiler-ha="alqContrato.invernalHa" :alquiler-variable-tn="alqContrato.variableTn"
          @update:cultivo-obj="v=>onCultivo('invernal','cultivoInvernal',v)"/>
        <CultivoBlock titulo="Cultivo Estival (sobre rastrojo)" emoji="☀️" border-color="#e8a838" cultivo-type="estival"
          :cultivo-obj="f.cultivoEstival" :ha-lote="haLote"
          :alquiler-ha="alqContrato.estivalHa" :alquiler-variable-tn="alqContrato.variableTn"
          @update:cultivo-obj="v=>onCultivo('estival','cultivoEstival',v)"/>
      </template>

      <!-- El aviso viaja DENTRO del pie fijo: si no, quedaría scrolleado lejos
           del botón deshabilitado y no se entendería por qué no se puede guardar. -->
      <div class="di-modal-foot">
        <div v-if="bloqueadosSinTc" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:9px 12px;font-size:12px;color:#92400e;margin-bottom:10px">
          <b>No se puede guardar sin tipo de cambio.</b>
          Hay {{ bloqueadosSinTc }} ítem{{ bloqueadosSinTc === 1 ? '' : 's' }} en pesos que no se {{ bloqueadosSinTc === 1 ? 'puede' : 'pueden' }} convertir a USD;
          guardar ahora congelaría {{ bloqueadosSinTc === 1 ? 'ese costo' : 'esos costos' }} en cero.
          Cargá el tipo de cambio desde el chip 💵 de la barra superior.
        </div>
        <div class="row items-center justify-between">
          <q-btn v-if="!editMode" flat label="← Volver" @click="paso=1"/>
          <q-btn v-else flat label="Cancelar" @click="$emit('cancel')"/>
          <q-btn unelevated color="primary" label="Guardar asignación" :disable="!!bloqueadosSinTc" @click="onGuardar"/>
        </div>
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
import { calcularCostoItemHa, factorItem, itemsSinTc, alquilerPorCultivo, porTnSonda } from '../utils/calculations'
import { fmtNum } from '../utils/formatters'

const props = defineProps({ campania: String, initial: Object })
const emit  = defineEmits(['save', 'cancel', 'lote'])

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

function elegir(l) { if (asignado(l.id)) return; loteSel.value = l; f.loteId = l.id; paso.value = 2; emit('lote', l) }
async function onCrearLote(data) {
  const nuevo = await lmStore.addLote(data)
  crearLote.value = false
  loteSel.value = nuevo; f.loteId = nuevo.id; paso.value = 2; emit('lote', nuevo)
}

// ── Precio de venta precargado (SÓLO asignaciones nuevas) ────────────
// Arranca con el precio del cultivo en la campaña activa en vez de 0, y
// acompaña si cambiás de cultivo. Al EDITAR una asignación existente no se
// toca nunca: el precio guardado es el que se congeló y manda.
const precioSugerido = nombre => parseFloat(main.cultivosPrecio?.[nombre]) || 0
// Último valor que puso la precarga. Si el que llega es distinto, lo escribió
// el usuario y a partir de ahí no se le sugiere más nada en ese bloque.
const autoPrecio   = reactive({ simple: null, invernal: null, estival: null })
const precioTocado = reactive({ simple: false, invernal: false, estival: false })

function conSugerido(key, c) {
  if (editMode || precioTocado[key]) return c
  const p = precioSugerido(c.nombre)
  autoPrecio[key] = p || ''
  return { ...c, precioVentaTn: p || '' }
}

function onCultivo(key, campo, v) {
  const cambioCultivo = v.nombre !== f[campo].nombre
  if (!editMode && String(v.precioVentaTn ?? '') !== String(autoPrecio[key] ?? '')) precioTocado[key] = true
  f[campo] = cambioCultivo ? conSugerido(key, v) : v
}

if (!editMode) {
  f.cultivo         = conSugerido('simple',   f.cultivo)
  f.cultivoInvernal = conSugerido('invernal', f.cultivoInvernal)
  f.cultivoEstival  = conSugerido('estival',  f.cultivoEstival)
}

// Precio de la CAMPAÑA ACTIVA, no el global del catálogo: si no, cambiarlo
// movería el alquiler de todas las campañas, incluidas las cerradas.
const cultivosPrecio = computed(() => main.cultivosPrecio)
// Hectáreas del lote elegido: habilitan las "hectáreas aplicadas" por etapa.
const haLote = computed(() => parseFloat(loteSel.value?.ha) || 0)

// ── Alquiler del CONTRATO para el "costo en kilos con alquiler" ──────
// Mismo criterio que el modal Ver de LotesPage: si el lote tiene contrato
// vigente manda el contrato; si no, cada bloque deduce el alquiler de sus
// propios ítems 'arrendamiento' (null = que lo resuelva el bloque).
// La parte que escala con el rinde se saca con la sonda —recalculando el
// contrato a un rinde de referencia— para que el indicador no dependa del
// rinde cargado.
const alqContrato = computed(() => {
  const vacio = { simpleHa: null, invernalHa: null, estivalHa: null, variableTn: null }
  const contrato = loteSel.value ? main.contratoVigente(loteSel.value.id, props.campania) : null
  if (!contrato) return vacio
  const asig = { tipoSiembra: f.tipoSiembra, cultivo: f.cultivo, cultivoInvernal: f.cultivoInvernal, cultivoEstival: f.cultivoEstival }
  const r = alquilerPorCultivo(contrato, asig, haLote.value, cultivosPrecio.value)
  // Sólo 'porcentaje_cosecha' escala con el rinde; los quintales fijos no.
  const variableTn = contrato.tipoContrato === 'porcentaje_cosecha'
    ? porTnSonda(rinde => {
        const conRinde = f.tipoSiembra === 'doble'
          ? { ...asig, cultivoEstival: { ...f.cultivoEstival, rendimientoQq: rinde } }
          : { ...asig, cultivo: { ...f.cultivo, rendimientoQq: rinde } }
        const x = alquilerPorCultivo(contrato, conRinde, haLote.value, cultivosPrecio.value)
        return (x.simpleHa ?? 0) + (x.invernalHa ?? 0) + (x.estivalHa ?? 0)
      })
    : 0
  return { simpleHa: r.simpleHa ?? 0, invernalHa: r.invernalHa ?? 0, estivalHa: r.estivalHa ?? 0, variableTn }
})

function finalizar(c) {
  if (!c) return null
  // El costo se congela YA PRORRATEADO a la hectárea de lote, para que todo lo
  // que lee `costoHaCalculado` (totales, márgenes, indicadores, Excel) siga igual.
  return { ...c, itemsCosto: (c.itemsCosto || []).map(it => ({
    ...it,
    costoHaCalculado: calcularCostoItemHa(it, catStore.items, cultivosPrecio.value, main.tipoCambio, c.rendimientoQq, c.precioVentaTn, catStore.labores)
      * factorItem(it, c.etapas, haLote.value),
  })) }
}

// Ítems en pesos que no se pueden convertir. Congelarlos sin TC guardaría un
// costo nulo que después se lee como 0: se bloquea el guardado hasta que haya
// tipo de cambio.
const ctxTc = computed(() => ({ catalogo: catStore.items, cultivosPrecio: cultivosPrecio.value, labores: catStore.labores }))
const bloqueadosSinTc = computed(() => (f.tipoSiembra === 'doble'
  ? [...itemsSinTc(f.cultivoInvernal, ctxTc.value, main.tipoCambio), ...itemsSinTc(f.cultivoEstival, ctxTc.value, main.tipoCambio)]
  : itemsSinTc(f.cultivo, ctxTc.value, main.tipoCambio)).length)

function onGuardar() {
  if (bloqueadosSinTc.value) return
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
  emit('save', out)
}
</script>
