<template>
  <q-page style="padding:24px">
    <div class="row items-center justify-between q-mb-lg" style="flex-wrap:wrap;gap:12px">
      <div class="row items-center q-gutter-sm">
        <h2 style="font-size:18px;font-weight:700;margin:0">Costos Contables</h2>
        <span style="background:#f0fdf4;border:1px solid #86efac;border-radius:7px;padding:5px 12px;font-size:13px;font-weight:600;color:#2d5a27">📅 {{ store.campania }}</span>
      </div>
      <q-btn unelevated color="primary" icon="add" label="Asignar lote a esta campaña" @click="abrirAsignar()"/>
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
            <tr v-if="!filas.length">
              <td colspan="9" style="padding:24px;text-align:center;color:#9ca3af">Sin lotes asignados a esta campaña. Usá "Asignar lote a esta campaña".</td>
            </tr>
            <tr v-for="(row, i) in filas" :key="row.a.id" :style="{background:i%2===0?'#fff':'#fafaf9',borderBottom:'1px solid #f0ede8'}">
              <td style="padding:8px 12px;font-weight:600;font-size:13px">{{ row.nombre }}</td>
              <td style="padding:8px 12px"><CultivoBadge :lote="row.a"/></td>
              <td style="padding:8px 12px;font-size:13px">{{ fmtNum(row.ha) }}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#dc2626">{{ fmtUSD(row.calc.costoHa) }}</td>
              <td style="padding:8px 12px;font-size:13px">{{ fmtUSD(row.calc.costoHa*row.ha) }}</td>
              <td style="padding:8px 12px;font-size:13px;color:#2d5a27;font-weight:600">{{ fmtUSD(row.calc.ingresoHa) }}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:700" :style="{color:row.calc.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtUSD(row.calc.margenHa) }}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:700" :style="{color:row.calc.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtK(row.calc.margenHa*row.ha) }}</td>
              <td style="padding:8px 12px">
                <div style="display:flex;gap:4px">
                  <button @click="verRow=row" style="padding:3px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font-size:11px;color:#1d4ed8">Ver</button>
                  <button @click="editar(row)" style="padding:3px 8px;background:#f0fdf4;border:1px solid #86efac;border-radius:5px;cursor:pointer;font-size:11px;color:#166534">Editar</button>
                  <button @click="bajaRow=row" style="padding:3px 8px;background:#fff1f2;border:1px solid #fecaca;border-radius:5px;cursor:pointer;font-size:11px;color:#dc2626" title="Dar de baja de esta campaña">⊘ Baja</button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="filas.length">
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

    <!-- Detalle -->
    <q-dialog v-if="verRow" :model-value="true" @hide="verRow=null">
      <q-card style="width:640px;max-width:95vw;border-radius:14px;padding:28px">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Detalle: {{ verRow.nombre }}</h2>
          <q-btn flat round dense icon="close" @click="verRow=null"/>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div v-for="[lab,val,c] in detailStats" :key="lab" style="background:#f9fafb;border-radius:8px;padding:8px 12px">
            <p style="font-size:10px;color:#9ca3af">{{ lab }}</p>
            <p :style="{fontWeight:700,color:c||'#111',fontSize:'15px'}">{{ val }}</p>
          </div>
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
        <!-- Insumos reales del lote -->
        <div style="margin-top:18px">
          <p style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 6px">Insumos usados (reales)</p>
          <div style="overflow-x:auto;border:1px solid #f0ede8;border-radius:8px">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="background:#f9fafb;color:#6b7280">
                  <th style="text-align:left;padding:6px 8px">Insumo</th>
                  <th style="text-align:right;padding:6px 8px">Cantidad</th>
                  <th style="text-align:left;padding:6px 8px">Unidad</th>
                  <th style="text-align:right;padding:6px 8px">$/ha</th>
                  <th style="text-align:right;padding:6px 8px">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(f,i) in insumosVer" :key="i" style="border-top:1px solid #f0ede8">
                  <td style="padding:6px 8px">{{ f.insumo }}<span v-if="verRow.a.tipoSiembra==='doble'" style="color:#9ca3af"> · {{ f.cultivo }}</span></td>
                  <td style="padding:6px 8px;text-align:right">{{ f.cantidad }}</td>
                  <td style="padding:6px 8px">{{ f.unidad }}</td>
                  <td style="padding:6px 8px;text-align:right">{{ fmtUSD(f.costoHa) }}</td>
                  <td style="padding:6px 8px;text-align:right;font-weight:600">{{ fmtUSD(f.costoTotal) }}</td>
                </tr>
                <tr v-if="!insumosVer.length"><td colspan="5" style="padding:10px;text-align:center;color:#9ca3af">Sin insumos cargados.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="row justify-between items-center q-mt-md">
          <q-btn unelevated color="positive" icon="download" label="Descargar Excel" @click="excelLote(verRow)"/>
          <q-btn flat label="Cerrar" @click="verRow=null"/>
        </div>
      </q-card>
    </q-dialog>

    <!-- Asignar / Editar -->
    <q-dialog v-if="asignarModal" :model-value="true" @hide="asignarModal=null">
      <q-card style="width:700px;max-width:95vw;border-radius:14px;padding:28px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ asignarModal.initial ? 'Editar asignación' : 'Asignar lote a la campaña' }}</h2>
          <q-btn flat round dense icon="close" @click="asignarModal=null"/>
        </div>
        <AsignarLoteForm :campania="store.campania" :initial="asignarModal.initial" @save="onSaveAsignacion" @cancel="asignarModal=null"/>
      </q-card>
    </q-dialog>

    <!-- Dar de baja -->
    <q-dialog v-if="bajaRow" :model-value="true" @hide="bajaRow=null">
      <q-card style="width:380px;border-radius:12px;padding:26px;text-align:center">
        <q-icon name="visibility_off" size="28px" color="negative"/>
        <p style="font-size:16px;font-weight:700;margin:8px 0 6px">Dar de baja de la campaña</p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:18px">Se quita <b>«{{ bajaRow.nombre }}»</b> de <b>{{ store.campania }}</b>. El lote sigue en el catastro para otras campañas.</p>
        <div class="row justify-center q-gutter-sm">
          <q-btn flat label="Cancelar" @click="bajaRow=null"/>
          <q-btn unelevated color="negative" label="Dar de baja" @click="confirmarBaja"/>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../stores/main'
import { useLotesMaestroStore } from '../stores/lotesMaestro'
import { useCatalogoStore } from '../stores/catalogo'
import AsignarLoteForm from '../components/AsignarLoteForm.vue'
import CultivoBadge from '../components/CultivoBadge.vue'
import SvgDonut    from '../components/charts/SvgDonut.vue'
import { getCultivoColor } from '../utils/constants'
import { calcLote } from '../utils/calculations'
import { filasAsignacion, exportarExcel } from '../utils/resumenInsumos'
import { fmtUSD, fmtK, fmtNum } from '../utils/formatters'

const store   = useMainStore()
const lmStore = useLotesMaestroStore()
const catStore = useCatalogoStore()
const ctx = computed(() => ({
  catalogo: catStore.items, labores: catStore.labores, tipoCambio: store.tipoCambio,
  cultivosPrecio: Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])),
}))
const headers = ['Lote','Cultivo','Ha','Costo/ha','Costo total','Ingreso/ha','Margen/ha','Margen total','Acciones']

const asignarModal = ref(null)
const verRow  = ref(null)
const bajaRow = ref(null)

const filas = computed(() => store.asignaciones
  .filter(a => a.campaña === store.campania)
  .map(a => {
    const lote = lmStore.byId(a.loteId)
    return { a, nombre: lote?.nombre || '—', ha: parseFloat(lote?.ha) || 0, calc: calcLote(a) }
  })
  .sort((x, y) => x.nombre.localeCompare(y.nombre)))

const totHA = computed(() => filas.value.reduce((s, r) => s + r.ha, 0))
const totC  = computed(() => filas.value.reduce((s, r) => s + r.calc.costoHa  * r.ha, 0))
const totI  = computed(() => filas.value.reduce((s, r) => s + r.calc.ingresoHa * r.ha, 0))
const totM  = computed(() => totI.value - totC.value)

const detailStats = computed(() => {
  if (!verRow.value) return []
  const { a, ha, calc } = verRow.value
  return [
    ['Campaña', a.campaña], ['Ha', `${fmtNum(ha)} ha`], ['Tipo', a.tipoSiembra==='doble'?'🌾☀️ Doble':'🌱 Simple'],
    ['Costo/ha',  fmtUSD(calc.costoHa),  '#dc2626'],
    ['Ingreso/ha',fmtUSD(calc.ingresoHa),'#2d5a27'],
    ['Margen/ha', fmtUSD(calc.margenHa), calc.margenHa>=0?'#3a6b35':'#dc2626'],
    ['Margen total', fmtK(calc.margenHa*ha), calc.margenHa>=0?'#3a6b35':'#dc2626'],
  ]
})

const COLORS = ['#4a7c59','#e8a838','#5b8dd9','#d44f8e','#e05c3a','#c4893a','#2e7d5e','#9ca3af','#888']
const itemVal = it => parseFloat(it.costoHaCalculado ?? it.costoHaUsd) || 0
const pieData = computed(() => {
  if (!verRow.value) return []
  const a = verRow.value.a, calc = verRow.value.calc
  if (a.tipoSiembra === 'doble') return [
    { name: a.cultivoInvernal?.nombre, value: calc.inv.costoHa, color: getCultivoColor(a.cultivoInvernal?.nombre) },
    { name: a.cultivoEstival?.nombre,  value: calc.est.costoHa, color: getCultivoColor(a.cultivoEstival?.nombre) },
  ].filter(d => d.value > 0)
  return (a.cultivo?.itemsCosto || []).map((it, i) => ({ name: it.nombreManual || it.nombre || 'Ítem', value: itemVal(it), color: COLORS[i % 9] })).filter(d => d.value > 0)
})

// Insumos del lote en el modal Ver
const insumosVer = computed(() => verRow.value ? filasAsignacion(verRow.value.a, verRow.value.ha, ctx.value) : [])

// Excel: hoja 1 = detalle del lote, hoja 2 = resumen de todos los lotes de la campaña
function excelLote(row) {
  const filasResumen = filas.value.flatMap(r => filasAsignacion(r.a, r.ha, ctx.value).map(f => ({ ...f, lote: r.nombre, ha: r.ha })))
  exportarExcel({
    archivo: `costos-contables-${row.nombre}-${store.campania.replace('/','-')}.xlsx`,
    hojaDetalle: `Detalle ${row.nombre}`,
    filasDetalle: filasAsignacion(row.a, row.ha, ctx.value),
    haDetalle: row.ha,
    filasResumen,
    campania: store.campania,
  })
}

function abrirAsignar() { asignarModal.value = { initial: null } }
function editar(row)    { asignarModal.value = { initial: row.a } }
async function onSaveAsignacion(out) {
  if (out.id) await store.updAsignacion(out.id, out)
  else await store.addAsignacion(out)
  asignarModal.value = null
}
async function confirmarBaja() { await store.delAsignacion(bajaRow.value.a.id); bajaRow.value = null }
</script>
