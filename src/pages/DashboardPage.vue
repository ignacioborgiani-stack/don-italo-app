<template>
  <q-page style="padding:24px;max-width:1400px">
    <!-- Tabs -->
    <div style="display:inline-flex;background:#fff;border:1px solid #d4cfc4;border-radius:9px;padding:3px;margin-bottom:18px">
      <button v-for="t in tabs" :key="t.key" @click="tab=t.key"
        :style="{padding:'7px 18px',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:'inherit',background:tab===t.key?'#2d5a27':'transparent',color:tab===t.key?'#fff':'#374151'}">
        {{ t.label }}
      </button>
    </div>

    <!-- ════════ ENCARGAR INSUMOS (placeholder) ════════ -->
    <div v-if="tab==='encargos'" style="background:#fff;border:1px dashed #d4cfc4;border-radius:12px;padding:56px 32px;text-align:center">
      <div style="font-size:44px;margin-bottom:12px">📦</div>
      <h3 style="font-size:18px;font-weight:700;color:#2d5a27;margin:0 0 8px">Encargo de insumos</h3>
      <p style="font-size:14px;color:#6b7280;margin:0;max-width:460px;margin-left:auto;margin-right:auto">
        Próximamente: acá vas a poder armar pedidos de insumos para tus proveedores.
      </p>
    </div>

    <!-- ════════ GENERAL ════════ -->
    <template v-else>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:16px">
      <div v-for="card in statCards" :key="card.l" style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:20px 24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <p style="font-size:11px;color:#6b7280;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">{{ card.l }}</p>
        <p :style="{fontSize:'26px',fontWeight:800,color:card.c||'#2d5a27',lineHeight:1}">{{ card.v }}</p>
        <p v-if="card.s" style="font-size:11px;color:#9ca3af;margin-top:4px">{{ card.s }}</p>
      </div>
    </div>

    <div v-if="verPlata" style="display:grid;grid-template-columns:minmax(280px,420px);gap:16px;margin-bottom:28px">
      <ResultadoNetoCard :bruto="resultadoBruto" :costos-fijos="store.costosFijosTotal" titulo="Resultado Neto de la campaña"/>
    </div>

    <!-- Rindes de indiferencia (con alquiler) por cultivo — sale de Costos Proyectados -->
    <div v-if="verPlata" style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:20px 24px;margin-bottom:28px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <div class="row items-center justify-between q-mb-sm" style="flex-wrap:wrap;gap:8px">
        <h3 style="font-size:15px;font-weight:700;margin:0">Rindes de indiferencia</h3>
        <span style="font-size:11px;color:#9ca3af">Con alquiler · presupuestos de {{ store.campania }}</span>
      </div>

      <div v-if="rindesIndif.length" style="display:flex;flex-wrap:wrap;gap:10px">
        <div v-for="r in rindesIndif" :key="r.key"
          style="border:1px solid #f0ede8;border-radius:10px;padding:9px 14px;background:#fafaf9;min-width:150px">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
            <span :style="{width:'10px',height:'10px',borderRadius:'3px',background:r.color,display:'inline-block',flexShrink:0}"/>
            <span style="font-size:13px;font-weight:700;color:#1f2937">{{ r.nombre }}</span>
            <span v-if="r.doble" :title="`Parte del doble cultivo ${r.doble}`" style="font-size:10px">🌾☀️</span>
          </div>
          <div style="font-size:17px;font-weight:800;color:#2d5a27;line-height:1.1">
            {{ r.tn > 0 ? r.tn.toFixed(2) + ' tn/ha' : '—' }}
          </div>
          <!-- kg sin separador de miles: al lado de "4.27 tn/ha" (punto decimal),
               un "4.269 kg/ha" (punto de miles) se lee ambiguo. -->
          <div v-if="r.tn > 0" style="font-size:11px;color:#9ca3af;margin-top:2px">
            {{ Math.round(r.kg) }} kg/ha
          </div>
        </div>
      </div>
      <p v-else style="font-size:13px;color:#9ca3af;margin:6px 0 0">
        Sin presupuestos cargados para {{ store.campania }} — cargalos en Costos Proyectados.
      </p>

      <p style="font-size:10px;color:#9ca3af;margin:12px 0 0">
        Rinde que hace cero el resultado incluyendo el alquiler: costos totales/ha ÷ precio de venta.
      </p>
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

      <div v-if="verPlata" style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Costo vs Ingreso por lote (USD/ha)</h3>
        <SvgVBar v-if="barData.length" :data="barData" :height="370"/>
        <p v-else style="text-align:center;color:#9ca3af;padding:60px">Sin datos para {{ store.campania }}</p>
      </div>
    </div>
    </template>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMainStore } from '../stores/main'
import { useLotesMaestroStore } from '../stores/lotesMaestro'
import { useGranjaStore } from '../stores/granja'
import { useCatalogoStore } from '../stores/catalogo'
import SvgDonut from '../components/charts/SvgDonut.vue'
import SvgVBar  from '../components/charts/SvgVBar.vue'
import ResultadoNetoCard from '../components/ResultadoNetoCard.vue'
import { getCultivoColor } from '../utils/constants'
import { calcLoteConAlquiler, getCultivoLabel, getLoteName, indicadoresCultivo, calcProyDoble,
         costoHaSinAlquiler, alquilerHaItems, costoVariableHaItems } from '../utils/calculations'
import { fmtUSD, fmtK } from '../utils/formatters'

const tabs = [{ key: 'general', label: 'General' }, { key: 'encargos', label: 'Encargar insumos' }]
const tab  = ref('general')

const store    = useMainStore()
const lmStore  = useLotesMaestroStore()
const granja   = useGranjaStore()
const catStore = useCatalogoStore()
const cultivosPrecioMap = computed(() => Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])))
// calcLote con el alquiler del contrato del lote ya incluido.
const calcLoteAlq = l => calcLoteConAlquiler(l, l.ha, store.contratoVigente(l.loteId, store.campania), cultivosPrecioMap.value)
// Un miembro sólo ve montos si tiene permiso de precios en algún módulo de costos.
const verPlata = computed(() => granja.verPrecios('costos_contables') || granja.verPrecios('costos_proyectados'))
// Asignaciones de la campaña activa, con ha y nombre inyectados desde el catastro.
const filtered = computed(() => store.asignaciones
  .filter(a => a.campaña === store.campania)
  .map(a => { const lote = lmStore.byId(a.loteId); return { ...a, ha: parseFloat(lote?.ha) || 0, nombre: lote?.nombre || '—' } }))

const haFisicas      = computed(() => filtered.value.reduce((s, l) => s + (parseFloat(l.ha) || 0), 0))
const haSembradas    = computed(() => filtered.value.reduce((s, l) => s + (parseFloat(l.ha) || 0) * (l.tipoSiembra === 'doble' ? 2 : 1), 0))
const resultadoBruto = computed(() => filtered.value.reduce((s, l) => { const c = calcLoteAlq(l); return s + c.margenHa * (parseFloat(l.ha) || 0) }, 0))
const nDoble  = computed(() => filtered.value.filter(l => l.tipoSiembra === 'doble').length)
const haDoble = computed(() => filtered.value.filter(l => l.tipoSiembra === 'doble').reduce((s, l) => s + (parseFloat(l.ha) || 0), 0))

const statCards = computed(() => {
  const cards = [
    { l: 'Ha físicas totales',    v: haFisicas.value.toLocaleString('es-AR'),    s: 'Campaña ' + store.campania },
    { l: 'Ha sembradas totales',  v: haSembradas.value.toLocaleString('es-AR'),  s: 'Doble cultivo × 2', c: '#e8a838' },
    { l: 'Lotes activos',         v: filtered.value.length,                      c: '#5b8dd9' },
  ]
  if (verPlata.value) cards.push({ l: 'Resultado bruto proy.', v: fmtK(resultadoBruto.value), s: 'Ingreso − costo', c: resultadoBruto.value >= 0 ? '#3a6b35' : '#dc2626' })
  return cards
})

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
  const c = calcLoteAlq(l)
  return { name: getLoteName(l), costo: Math.round(c.costoHa), ingreso: Math.round(c.ingresoHa) }
}))

// ── Rindes de indiferencia CON alquiler, por cultivo ──────────────
// Salen de los presupuestos de Costos Proyectados de la campaña activa.
// En un doble cultivo se muestra cada cultivo por separado (el alquiler ya
// viene repartido según el % del presupuesto, vía calcProyDoble).
const rindesIndif = computed(() => {
  const proys = store.proyecciones.filter(p => p.campana === store.campania)
  const out = []
  for (const p of proys) {
    if (p.tipoSiembra === 'doble') {
      const d = calcProyDoble(p)
      for (const parte of [d.inv, d.est]) {
        if (!parte.nombre || parte.nombre === '—') continue
        out.push({
          key: `${p.cultivo}|${parte.nombre}`, nombre: parte.nombre, doble: p.cultivo,
          color: getCultivoColor(parte.nombre),
          tn: parte.ind.rindeIndifConTn, kg: parte.ind.rindeIndifConKg,
        })
      }
    } else {
      const ind = indicadoresCultivo({
        costoSinAlqHa: costoHaSinAlquiler(p),
        alquilerHa: alquilerHaItems(p),
        costoVariableHa: costoVariableHaItems(p),
        precioTn: p.precioVentaTn, rindeQq: p.rendimientoQq,
      })
      out.push({
        key: p.cultivo, nombre: p.cultivo, doble: null,
        color: getCultivoColor(p.cultivo),
        tn: ind.rindeIndifConTn, kg: ind.rindeIndifConKg,
      })
    }
  }
  return out.sort((a, b) => b.tn - a.tn)
})
</script>
