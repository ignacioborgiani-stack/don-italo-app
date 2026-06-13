<template>
  <q-page style="padding:24px">
    <div class="row items-center justify-between q-mb-lg" style="flex-wrap:wrap;gap:12px">
      <div class="row items-center q-gutter-sm">
        <h2 style="font-size:18px;font-weight:700;margin:0">Costos Contables</h2>
        <select :value="store.campania" @change="store.setCampania($event.target.value)" style="padding:6px 12px;border:1.5px solid #d1d5db;border-radius:7px;font-size:13px;background:#fff;cursor:pointer">
          <option v-for="c in CAMPAÑAS" :key="c">{{ c }}</option>
        </select>
      </div>
      <q-btn unelevated color="primary" icon="add" label="Agregar lote" @click="openModal('add')"/>
    </div>

    <div style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#2d5a27">
              <th v-for="h in headers" :key="h" style="padding:10px 12px;color:#fff;font-size:12px;font-weight:600;text-align:left;white-space:nowrap">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="9" style="padding:24px;text-align:center;color:#9ca3af">Sin lotes para esta campaña.</td>
            </tr>
            <tr v-for="(l, i) in filtered" :key="l.id" :style="{background:i%2===0?'#fff':'#fafaf9',borderBottom:'1px solid #f0ede8'}">
              <td style="padding:8px 12px;font-weight:600;font-size:13px">{{ getLoteName(l) }}</td>
              <td style="padding:8px 12px"><CultivoBadge :lote="l"/></td>
              <td style="padding:8px 12px;font-size:13px">{{ parseFloat(l.ha)||0 }}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#dc2626">{{ fmtUSD(calcLote(l).costoHa) }}</td>
              <td style="padding:8px 12px;font-size:13px">{{ fmtUSD(calcLote(l).costoHa*(parseFloat(l.ha)||0)) }}</td>
              <td style="padding:8px 12px;font-size:13px;color:#2d5a27;font-weight:600">{{ fmtUSD(calcLote(l).ingresoHa) }}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:700" :style="{color:calcLote(l).margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtUSD(calcLote(l).margenHa) }}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:700" :style="{color:calcLote(l).margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtK(calcLote(l).margenHa*(parseFloat(l.ha)||0)) }}</td>
              <td style="padding:8px 12px">
                <div style="display:flex;gap:4px">
                  <button @click="openModal('detail',l)" style="padding:3px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font-size:11px;color:#1d4ed8">Ver</button>
                  <button @click="openModal('edit',l)"   style="padding:3px 8px;background:#f0fdf4;border:1px solid #86efac;border-radius:5px;cursor:pointer;font-size:11px;color:#166534">Editar</button>
                  <button @click="delId=l.id"            style="padding:3px 8px;background:#fff1f2;border:1px solid #fecaca;border-radius:5px;cursor:pointer;font-size:11px;color:#dc2626">×</button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="filtered.length">
            <tr style="background:#2d5a27">
              <td colspan="2" style="padding:9px 12px;color:#fff;font-weight:700;font-size:13px">TOTALES</td>
              <td style="padding:9px 12px;color:#fff;font-weight:700">{{ totHA.toLocaleString('es-AR') }}</td>
              <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtUSD(totC/Math.max(totHA,1)) }}</td>
              <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtK(totC) }}</td>
              <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtUSD(totI/Math.max(totHA,1)) }}</td>
              <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtUSD(totM/Math.max(totHA,1)) }}</td>
              <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtK(totM) }}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Detail modal -->
    <q-dialog v-if="modal?.mode==='detail'" :model-value="true" @hide="modal=null">
      <q-card style="width:640px;max-width:95vw;border-radius:14px;padding:28px">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Detalle: {{ getLoteName(modal.lote) }}</h2>
          <q-btn flat round dense icon="close" @click="modal=null"/>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div v-for="[lab,val,c] in detailStats" :key="lab" style="background:#f9fafb;border-radius:8px;padding:8px 12px">
            <p style="font-size:10px;color:#9ca3af">{{ lab }}</p>
            <p :style="{fontWeight:700,color:c||'#111',fontSize:'15px'}">{{ val }}</p>
          </div>
        </div>
        <div v-if="modal.lote.notas" style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:13px">
          <b>Notas: </b>{{ modal.lote.notas }}
        </div>
        <div v-if="pieData.length" style="display:flex;gap:16px;align-items:center;margin-top:14px">
          <SvgDonut :data="pieData" :width="170" :height="170" :inner-r="42" :outer-r="78" :tooltip-fmt="v=>fmtUSD(v)+'/ha'"/>
          <div style="flex:1">
            <div v-for="(d,i) in pieData" :key="i" style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
              <div style="display:flex;align-items:center;gap:6px">
                <span :style="{width:'10px',height:'10px',borderRadius:'2px',background:d.color,display:'inline-block'}"/>
                {{ d.name }}
              </div>
              <b>{{ fmtUSD(d.value) }}/ha</b>
            </div>
          </div>
        </div>
        <div class="row justify-end q-mt-md">
          <q-btn flat label="Cerrar" @click="modal=null"/>
        </div>
      </q-card>
    </q-dialog>

    <!-- Add/Edit modal -->
    <q-dialog v-if="modal?.mode==='add'||modal?.mode==='edit'" :model-value="true" @hide="modal=null">
      <q-card style="width:680px;max-width:95vw;border-radius:14px;padding:28px;max-height:90vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ modal.mode==='edit'?'Editar lote':'Agregar lote' }}</h2>
          <q-btn flat round dense icon="close" @click="modal=null"/>
        </div>
        <LoteForm :initial="modal.lote" @save="onSave" @cancel="modal=null"/>
      </q-card>
    </q-dialog>

    <!-- Confirm delete -->
    <q-dialog v-if="delId" :model-value="true" @hide="delId=null">
      <q-card style="width:320px;border-radius:12px;padding:28px;text-align:center">
        <p style="font-size:16px;font-weight:700;margin-bottom:8px">¿Eliminar?</p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:20px">Esta acción no se puede deshacer.</p>
        <div class="row justify-center q-gutter-sm">
          <q-btn flat label="Cancelar" @click="delId=null"/>
          <q-btn unelevated color="negative" label="Eliminar" @click="confirmDel"/>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../stores/main'
import LoteForm    from '../components/LoteForm.vue'
import CultivoBadge from '../components/CultivoBadge.vue'
import SvgDonut    from '../components/charts/SvgDonut.vue'
import { CAMPAÑAS, getCultivoColor } from '../utils/constants'
import { calcLote, getLoteName } from '../utils/calculations'
import { fmtUSD, fmtK } from '../utils/formatters'

const store    = useMainStore()
const modal    = ref(null)
const delId    = ref(null)
const headers  = ['Lote','Cultivo','Ha','Costo/ha','Costo total','Ingreso/ha','Margen/ha','Margen total','Acciones']

const filtered = computed(() => store.lotes.filter(l => l.campaña === store.campania))
const totHA    = computed(() => filtered.value.reduce((s, l) => s + (parseFloat(l.ha) || 0), 0))
const totC     = computed(() => filtered.value.reduce((s, l) => s + calcLote(l).costoHa  * (parseFloat(l.ha) || 0), 0))
const totI     = computed(() => filtered.value.reduce((s, l) => s + calcLote(l).ingresoHa * (parseFloat(l.ha) || 0), 0))
const totM     = computed(() => totI.value - totC.value)

const detailStats = computed(() => {
  if (!modal.value?.lote) return []
  const l = modal.value.lote, calc = calcLote(l), ha = parseFloat(l.ha) || 0
  return [
    ['Campaña', l.campaña], ['Ha', `${ha} ha`], ['Tipo', l.tipoSiembra==='doble'?'🌾☀️ Doble':'🌱 Simple'],
    ['Costo/ha',  fmtUSD(calc.costoHa),  '#dc2626'],
    ['Ingreso/ha',fmtUSD(calc.ingresoHa),'#2d5a27'],
    ['Margen/ha', fmtUSD(calc.margenHa), calc.margenHa>=0?'#3a6b35':'#dc2626'],
    ['Margen total', fmtK(calc.margenHa*ha), calc.margenHa>=0?'#3a6b35':'#dc2626'],
  ]
})

const COLORS = ['#4a7c59','#e8a838','#5b8dd9','#d44f8e','#e05c3a','#c4893a','#2e7d5e','#9ca3af','#888']
const pieData = computed(() => {
  if (!modal.value?.lote) return []
  const l = modal.value.lote, calc = calcLote(l)
  if (l.tipoSiembra === 'doble') return [
    { name: l.cultivoInvernal.nombre, value: calc.inv.costoHa, color: getCultivoColor(l.cultivoInvernal.nombre) },
    { name: l.cultivoEstival.nombre,  value: calc.est.costoHa, color: getCultivoColor(l.cultivoEstival.nombre) },
  ]
  return (l.cultivo?.itemsCosto || []).map((it, i) => ({ name: it.nombre, value: parseFloat(it.costoHaUsd) || 0, color: COLORS[i % 9] })).filter(d => d.value > 0)
})

function openModal(mode, lote = null) { modal.value = { mode, lote } }
function onSave(f) {
  modal.value.lote ? store.updLote(modal.value.lote.id, f) : store.addLote(f)
  modal.value = null
}
function confirmDel() { store.delLote(delId.value); delId.value = null }
</script>
