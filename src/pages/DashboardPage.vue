<template>
  <q-page style="padding:24px;max-width:1400px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:16px">
      <div v-for="card in statCards" :key="card.l" style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:20px 24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <p style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">{{ card.l }}</p>
        <p :style="{fontSize:'26px',fontWeight:800,color:card.c||'#2d5a27',lineHeight:1}">{{ card.v }}</p>
        <p v-if="card.s" style="font-size:11px;color:#9ca3af;margin-top:4px">{{ card.s }}</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:minmax(280px,420px);gap:16px;margin-bottom:28px">
      <ResultadoNetoCard :bruto="resultadoBruto" :costos-fijos="store.costosFijosTotal" titulo="Resultado Neto de la campaña"/>
    </div>

    <div style="display:grid;grid-template-columns:minmax(300px,400px) 1fr;gap:20px;align-items:start">
      <div style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Distribución de Ha por cultivo</h3>
        <template v-if="donutData.length">
          <SvgDonut :data="donutData" :width="310" :height="230" :inner-r="64" :outer-r="104" :tooltip-fmt="v=>fmtUSD(v)+'/ha'">
            <div style="font-size:22px;font-weight:800;color:#2d5a27;line-height:1">{{ haFisicas.toLocaleString('es-AR') }}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">ha físicas</div>
          </SvgDonut>
          <div v-for="d in donutData" :key="d.name" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f3f4f6">
            <div style="display:flex;align-items:center;gap:8px">
              <span :style="{width:'12px',height:'12px',borderRadius:'3px',background:d.color,display:'inline-block',flexShrink:0}"/>
              <span style="font-size:13px;color:#374151">{{ d.name }}</span>
            </div>
            <span style="font-size:13px;font-weight:600">{{ d.value.toLocaleString('es-AR') }} ha</span>
          </div>
          <div v-if="nDoble>0" style="margin-top:10px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;font-size:12px;color:#854d0e">
            🌾☀️ <b>{{ nDoble }} lotes</b> con doble cultivo — {{ haDoble.toLocaleString('es-AR') }} ha físicas / {{ (haDoble*2).toLocaleString('es-AR') }} ha sembradas
          </div>
        </template>
        <p v-else style="text-align:center;color:#9ca3af;padding:40px">Sin lotes para {{ store.campania }}</p>
      </div>

      <div style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Costo vs Ingreso por lote (USD/ha)</h3>
        <SvgVBar v-if="barData.length" :data="barData" :height="370"/>
        <p v-else style="text-align:center;color:#9ca3af;padding:60px">Sin datos para {{ store.campania }}</p>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useMainStore } from '../stores/main'
import { useLotesMaestroStore } from '../stores/lotesMaestro'
import SvgDonut from '../components/charts/SvgDonut.vue'
import SvgVBar  from '../components/charts/SvgVBar.vue'
import ResultadoNetoCard from '../components/ResultadoNetoCard.vue'
import { getCultivoColor } from '../utils/constants'
import { calcLote, getCultivoLabel, getLoteName } from '../utils/calculations'
import { fmtUSD, fmtK } from '../utils/formatters'

const store    = useMainStore()
const lmStore  = useLotesMaestroStore()
// Asignaciones de la campaña activa, con ha y nombre inyectados desde el catastro.
const filtered = computed(() => store.asignaciones
  .filter(a => a.campaña === store.campania)
  .map(a => { const lote = lmStore.byId(a.loteId); return { ...a, ha: parseFloat(lote?.ha) || 0, nombre: lote?.nombre || '—' } }))

const haFisicas      = computed(() => filtered.value.reduce((s, l) => s + (parseFloat(l.ha) || 0), 0))
const haSembradas    = computed(() => filtered.value.reduce((s, l) => s + (parseFloat(l.ha) || 0) * (l.tipoSiembra === 'doble' ? 2 : 1), 0))
const resultadoBruto = computed(() => filtered.value.reduce((s, l) => { const c = calcLote(l); return s + c.margenHa * (parseFloat(l.ha) || 0) }, 0))
const nDoble  = computed(() => filtered.value.filter(l => l.tipoSiembra === 'doble').length)
const haDoble = computed(() => filtered.value.filter(l => l.tipoSiembra === 'doble').reduce((s, l) => s + (parseFloat(l.ha) || 0), 0))

const statCards = computed(() => [
  { l: 'Ha físicas totales',    v: haFisicas.value.toLocaleString('es-AR'),    s: 'Campaña ' + store.campania },
  { l: 'Ha sembradas totales',  v: haSembradas.value.toLocaleString('es-AR'),  s: 'Doble cultivo × 2', c: '#e8a838' },
  { l: 'Lotes activos',         v: filtered.value.length,                      c: '#5b8dd9' },
  { l: 'Resultado bruto proy.', v: fmtK(resultadoBruto.value),                 s: 'Ingreso − costo', c: resultadoBruto.value >= 0 ? '#3a6b35' : '#dc2626' },
])

const donutData = computed(() => {
  const map = {}
  filtered.value.forEach(l => {
    const key   = getCultivoLabel(l)
    const color = l.tipoSiembra === 'doble' ? getCultivoColor(l.cultivoInvernal?.nombre) : getCultivoColor(l.cultivo?.nombre)
    const ha    = parseFloat(l.ha) || 0
    map[key]    = { value: (map[key]?.value || 0) + ha, color }
  })
  return Object.entries(map).map(([name, { value, color }]) => ({ name, value, color })).sort((a, b) => b.value - a.value)
})

const barData = computed(() => filtered.value.map(l => {
  const c = calcLote(l)
  return { name: getLoteName(l), costo: Math.round(c.costoHa), ingreso: Math.round(c.ingresoHa) }
}))
</script>
