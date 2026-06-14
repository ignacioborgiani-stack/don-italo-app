<template>
  <q-page style="padding:24px">
    <div class="row items-center justify-between q-mb-lg">
      <h2 style="font-size:18px;font-weight:700;margin:0">Costos Proyectados</h2>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 16px;font-size:13px">
        Margen total campaña: <b :style="{color:totalMB>=0?'#3a6b35':'#dc2626',fontSize:'16px'}">{{ fmtK(totalMB) }}</b>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-bottom:28px">
      <div v-for="d in barData" :key="d.cultivo" style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <div :style="{background:getCultivoColor(d.cultivo),padding:'11px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}">
          <h3 style="color:#fff;font-weight:700;font-size:15px;margin:0">{{ d.cultivo }}</h3>
          <div style="display:flex;gap:6px">
            <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:1px 8px;font-size:11px">{{ d.tipo==='invernal'?'🌾':'☀️' }}</span>
            <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:1px 10px;font-size:11px;font-weight:600">{{ d.ha.toLocaleString('es-AR') }} ha</span>
          </div>
        </div>
        <div style="padding:12px 16px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div v-for="[l,v,c] in [['Costo/ha',fmtUSD(d.costoHa),'#dc2626'],['Ingreso/ha',fmtUSD(d.ingHa),'#2d5a27']]" :key="l"
              style="background:#f9fafb;border-radius:7px;padding:7px 10px">
              <p style="font-size:10px;color:#9ca3af">{{ l }}</p>
              <p :style="{fontSize:'14px',fontWeight:700,color:c}">{{ v }}</p>
            </div>
          </div>
          <div :style="{background:d.margenHa>=0?'#f0fdf4':'#fff1f2',border:`1px solid ${d.margenHa>=0?'#86efac':'#fca5a5'}`,borderRadius:'8px',padding:'9px 12px',marginBottom:'10px',display:'flex',justifyContent:'space-between'}">
            <div>
              <p style="font-size:11px;color:#6b7280">Margen/ha</p>
              <p :style="{fontWeight:800,fontSize:'17px',color:d.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtUSD(d.margenHa) }}</p>
            </div>
            <div style="text-align:right">
              <p style="font-size:11px;color:#6b7280">Total</p>
              <p :style="{fontWeight:800,fontSize:'17px',color:d.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtK(d.margenTotal) }}</p>
            </div>
          </div>
          <button @click="editProy=store.proyecciones.find(p=>p.cultivo===d.cultivo)"
            style="width:100%;padding:7px;border-radius:7px;border:1.5px solid #3a6b35;background:#fff;color:#3a6b35;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit">
            Editar presupuesto
          </button>
        </div>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">Comparativa margen bruto proyectado (USD/ha)</h3>
      <SvgHBar :data="barData" :height="250"/>
    </div>

    <!-- Edit proy modal -->
    <q-dialog v-if="editProy" :model-value="true" @hide="editProy=null">
      <q-card style="width:620px;max-width:95vw;border-radius:14px;padding:28px;max-height:90vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Presupuesto: {{ editProy.cultivo }}</h2>
          <q-btn flat round dense icon="close" @click="editProy=null"/>
        </div>
        <ProyForm :proy="editProy" @save="onSaveProy" @cancel="editProy=null"/>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../stores/main'
import { useLotesMaestroStore } from '../stores/lotesMaestro'
import SvgHBar from '../components/charts/SvgHBar.vue'
import ProyForm from './ProyForm.vue'
import { getCultivoColor } from '../utils/constants'
import { calcCostoHa, calcIngresoHa } from '../utils/calculations'
import { fmtUSD, fmtK } from '../utils/formatters'

const store    = useMainStore()
const lmStore  = useLotesMaestroStore()
const editProy = ref(null)

// Ha por cultivo = suma de ha de los lotes ASIGNADOS a la campaña activa con ese cultivo
const calcHaCultivo = cultivo => store.asignaciones
  .filter(a => a.campaña === store.campania)
  .reduce((s, a) => {
    const ha = parseFloat(lmStore.byId(a.loteId)?.ha) || 0
    if (a.tipoSiembra === 'doble') return s + ((a.cultivoInvernal?.nombre === cultivo || a.cultivoEstival?.nombre === cultivo) ? ha : 0)
    return a.cultivo?.nombre === cultivo ? s + ha : s
  }, 0)

const barData  = computed(() => store.proyecciones.map(p => {
  const ha = calcHaCultivo(p.cultivo), costoHa = calcCostoHa({ itemsCosto: p.itemsCosto || [] }), ingHa = calcIngresoHa(p)
  return { cultivo: p.cultivo, tipo: p.tipo, costoHa, ingHa, margenHa: ingHa - costoHa, margenTotal: (ingHa - costoHa) * ha, ha }
}).sort((a, b) => b.margenHa - a.margenHa))

const totalMB = computed(() => barData.value.reduce((s, d) => s + d.margenTotal, 0))

function onSaveProy(f) { store.updProy(editProy.value.cultivo, f); editProy.value = null }
</script>
