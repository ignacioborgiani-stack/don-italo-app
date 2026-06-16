<template>
  <div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div>
        <label class="di-lbl">Nombre del lote</label>
        <input v-model="f.nombre" placeholder="ej: La Colorada" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Campaña</label>
        <select v-model="f.campaña" class="di-inp">
          <option v-for="c in store.campanas" :key="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Hectáreas</label>
        <input v-model="f.ha" type="number" placeholder="0" class="di-inp"/>
      </div>
    </div>

    <div style="display:flex;border-radius:8px;overflow:hidden;border:2px solid #3a6b35;margin-bottom:18px">
      <button v-for="[k,l] in [['simple','🌱 Cultivo simple'],['doble','🌾☀️ Doble cultivo']]" :key="k"
        @click="f.tipoSiembra=k"
        :style="{flex:1,padding:'9px 0',border:'none',cursor:'pointer',fontWeight:700,fontSize:14,background:f.tipoSiembra===k?'#3a6b35':'#fff',color:f.tipoSiembra===k?'#fff':'#3a6b35',transition:'all .15s'}">
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
      <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:14px;margin-bottom:14px">
        <p style="font-weight:700;font-size:11px;color:#166534;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Resultado combinado del lote</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#dcfce7">
              <th v-for="h in ['','Invernal','Estival','TOTAL']" :key="h"
                :style="{padding:'5px 10px',textAlign:h?'right':'left',color:'#166534',fontWeight:700,fontSize:'12px'}">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[lbl,key,c] in combinedRows" :key="lbl" style="border-bottom:1px solid #d1fae5">
              <td style="padding:5px 10px;font-weight:600">{{ lbl }}</td>
              <td style="padding:5px 10px;text-align:right">{{ fmtUSD(calc.inv?.[key]||0) }}</td>
              <td style="padding:5px 10px;text-align:right">{{ fmtUSD(calc.est?.[key]||0) }}</td>
              <td :style="{padding:'5px 10px',textAlign:'right',fontWeight:700,color:c||(calc[key]>=0?'#3a6b35':'#dc2626')}">{{ fmtUSD(calc[key]||0) }}</td>
            </tr>
          </tbody>
        </table>
        <div style="border-top:2px solid #86efac;margin-top:10px;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;font-size:13px">Resultado total ({{ f.ha||0 }} ha):</span>
          <span :style="{fontWeight:800,fontSize:'18px',color:calc.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtK(calc.margenHa*(parseFloat(f.ha)||0)) }}</span>
        </div>
      </div>
    </template>

    <div>
      <label class="di-lbl">Notas</label>
      <textarea v-model="f.notas" rows="2" class="di-inp" style="resize:vertical"/>
    </div>

    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar lote" @click="onGuardar"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import CultivoBlock from './CultivoBlock.vue'
import { useMainStore } from '../stores/main'
import { useCatalogoStore } from '../stores/catalogo'
import { calcLote, calcularCostoItemHa } from '../utils/calculations'
import { fmtUSD, fmtK } from '../utils/formatters'

const props = defineProps({ initial: Object })
const emit = defineEmits(['save', 'cancel'])

const store = useMainStore()
const catStore = useCatalogoStore()
const cultivosPrecio = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))

// Congela costoHaCalculado de cada ítem con el rinde/precio del cultivo (para vistas resumen).
function finalizarCultivo(c) {
  if (!c) return c
  const itemsCosto = (c.itemsCosto || []).map(it => ({
    ...it,
    costoHaCalculado: calcularCostoItemHa(it, catStore.items, cultivosPrecio.value, store.tipoCambio, c.rendimientoQq, c.precioVentaTn, catStore.labores),
  }))
  return { ...c, itemsCosto }
}
function onGuardar() {
  const out = { ...f }
  if (f.tipoSiembra === 'doble') {
    out.cultivoInvernal = finalizarCultivo(f.cultivoInvernal)
    out.cultivoEstival  = finalizarCultivo(f.cultivoEstival)
  } else {
    out.cultivo = finalizarCultivo(f.cultivo)
  }
  emit('save', out)
}

const emptyC = (nombre, tipo) => ({ nombre, tipo, rendimientoQq: '', precioVentaTn: '', itemsCosto: [] })
const base   = () => ({
  nombre: '', campaña: store.campania, ha: '', notas: '', tipoSiembra: 'simple',
  cultivo:         emptyC('Soja',  'estival'),
  cultivoInvernal: emptyC('Trigo', 'invernal'),
  cultivoEstival:  emptyC('Soja',  'estival'),
})

const f = reactive(props.initial ? { ...base(), ...props.initial } : base())

const calc = computed(() => calcLote(f))
const combinedRows = [
  ['Costo/ha',  'costoHa',  '#dc2626'],
  ['Ingreso/ha','ingresoHa','#2d5a27'],
  ['Margen/ha', 'margenHa', null],
]
</script>
