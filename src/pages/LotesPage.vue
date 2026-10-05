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
              <td :colspan="headers.length" style="padding:24px;text-align:center;color:#9ca3af">Sin lotes asignados a esta campaña. Usá "Asignar lote a esta campaña".</td>
            </tr>
            <tr v-for="(row, i) in filas" :key="row.a.id" :style="{background:i%2===0?'#fff':'#fafaf9',borderBottom:'1px solid #f0ede8'}">
              <td style="padding:8px 12px;font-weight:600;font-size:13px">{{ row.nombre }}</td>
              <!-- Alquiler del contrato vigente. Sin contrato, la celda queda vacía. -->
              <td style="padding:8px 12px">
                <span v-if="row.alquiler" :title="row.alquiler.detalle"
                  style="background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;cursor:help">
                  {{ row.alquiler.texto }}
                </span>
              </td>
              <td style="padding:8px 12px"><CultivoBadge :lote="row.a"/></td>
              <td style="padding:8px 12px;font-size:13px">{{ fmtNum(row.ha) }}</td>
              <template v-if="verPrecios">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#dc2626">{{ fmtUSD(row.calc.costoHa) }}</td>
                <td style="padding:8px 12px;font-size:13px">{{ fmtUSD(row.calc.costoHa*row.ha) }}</td>
                <td style="padding:8px 12px;font-size:13px;color:#2d5a27;font-weight:600">{{ fmtUSD(row.calc.ingresoHa) }}</td>
                <td style="padding:8px 12px;font-size:13px;font-weight:700" :style="{color:row.calc.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtUSD(row.calc.margenHa) }}</td>
                <td style="padding:8px 12px;font-size:13px;font-weight:700" :style="{color:row.calc.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtK(row.calc.margenHa*row.ha) }}</td>
              </template>
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
              <td colspan="3" style="padding:9px 12px;color:#fff;font-weight:700;font-size:13px">TOTALES</td>
              <td style="padding:9px 12px;color:#fff;font-weight:700">{{ totHA.toLocaleString('es-AR') }}</td>
              <template v-if="verPrecios">
                <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtUSD(totC/Math.max(totHA,1)) }}</td>
                <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtK(totC) }}</td>
                <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtUSD(totI/Math.max(totHA,1)) }}</td>
                <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtUSD(totM/Math.max(totHA,1)) }}</td>
                <td style="padding:9px 12px;color:#fff;font-weight:700">{{ fmtK(totM) }}</td>
              </template>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div v-if="filas.length" style="display:grid;grid-template-columns:minmax(280px,420px);gap:16px;margin-top:18px">
      <ResultadoNetoCard :bruto="totM" :costos-fijos="store.costosFijosTotal" titulo="Resultado Neto contable de la campaña"/>
    </div>

    <CostosFijosSection v-if="verPrecios"/>

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
        <div v-if="verPrecios && pieData.length" style="display:flex;gap:16px;align-items:center;margin-top:14px">
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
        <!-- El alquiler del contrato ya está incluido en Costo/ha y Margen de arriba -->
        <div v-if="verPrecios && alquilerVer" style="margin-top:12px;background:#f0fdf4;border:1px solid #cde3cb;border-radius:8px;padding:8px 12px;font-size:12px;color:#374151">
          🏠 El <b>Costo/ha</b> y el <b>Margen</b> ya incluyen el alquiler — {{ contratoLabel(alquilerVer.contrato) }} · total {{ fmtUSD(alquilerVer.total) }}
          <template v-if="verRow.a.tipoSiembra==='doble'"> (☀️ {{ fmtUSD(alquilerVer.estivalHa) }}/ha · 🌾 {{ fmtUSD(alquilerVer.invernalHa) }}/ha)</template>
          <template v-else> ({{ fmtUSD(alquilerVer.simpleHa) }}/ha)</template>
        </div>
        <div v-if="verPrecios && dobleCargaVer" style="margin-top:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 12px;font-size:12px;color:#9a3412">
          ⚠️ Este lote tiene alquiler por <b>contrato</b> y además ítems <b>"Arrendamiento"</b> cargados a mano. Se usa el del contrato; los manuales se ignoran para no duplicar.
        </div>

        <!-- Indicadores por cultivo -->
        <div v-if="verPrecios && indicadoresVer.length" style="margin-top:16px">
          <p style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 6px">Indicadores</p>
          <div style="overflow-x:auto;border:1px solid #f0ede8;border-radius:8px">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="background:#f9fafb;color:#6b7280">
                  <th style="text-align:left;padding:6px 8px">Cultivo</th>
                  <th style="text-align:right;padding:6px 8px">Rinde indif. s/alq</th>
                  <th style="text-align:right;padding:6px 8px" title="Descuenta la parte del alquiler que varía con el rinde">Rinde indif. c/alq *</th>
                  <th style="text-align:right;padding:6px 8px">Margen contrib./tn</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in indicadoresVer" :key="row.nombre" style="border-top:1px solid #f0ede8">
                  <td style="padding:6px 8px;font-weight:600">{{ row.nombre }}</td>
                  <td style="padding:6px 8px;text-align:right">{{ fmtRinde(row.ind.rindeIndifSinTn) }}</td>
                  <td style="padding:6px 8px;text-align:right">{{ fmtRinde(row.ind.rindeIndifConTn) }}</td>
                  <!-- La contribución marginal se expresa por tonelada, pero sin
                       rinde cargado no hay producción sobre la cual leerla: se
                       deja en guión y el aviso va debajo de la tabla. -->
                  <td v-if="row.ind.sinRindeCargado" style="padding:6px 8px;text-align:right;color:#9ca3af">—</td>
                  <td v-else style="padding:6px 8px;text-align:right;font-weight:700" :style="{color: row.ind.margenContribTn>=0 ? '#166534':'#dc2626'}">{{ fmtUSD(row.ind.margenContribTn) }}/tn</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="mensajeSinRindeVer" style="font-size:11px;color:#dc2626;margin:6px 0 0">{{ mensajeSinRindeVer }}</p>
          <p v-if="sinRindeCargadoVer" style="font-size:11px;color:#b45309;margin:6px 0 0">
            ⚠️ Cargá el rinde. El rinde de indiferencia se calcula igual —no depende del rinde—, pero la contribución marginal
            y el margen por hectárea sí, y quedan sin valor.
          </p>
          <p style="font-size:10px;color:#9ca3af;margin:4px 0 0">
            * El rinde con alquiler descuenta la parte del alquiler que varía con el rinde, así que no sale de dividir por la contribución marginal de al lado.
          </p>
          <p style="font-size:10px;color:#9ca3af;margin:4px 0 0">Rinde de indiferencia = costos fijos/ha ÷ contribución marginal/tn. Contribución marginal/tn = precio − costos variables por tn (cosecha, flete, comercialización y canon HT ÷ rinde; los costos por ha no entran).</p>
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
                  <template v-if="verPrecios">
                    <th style="text-align:right;padding:6px 8px">$/ha</th>
                    <th style="text-align:right;padding:6px 8px">Total</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <template v-for="sec in resumenVer.secciones" :key="sec.categoria">
                  <tr style="background:#f0fdf4"><td colspan="5" style="padding:5px 8px;font-weight:700;color:#2d5a27;font-size:11px;text-transform:uppercase">{{ sec.label }}</td></tr>
                  <tr v-for="(f,i) in sec.filas" :key="sec.categoria+i" style="border-top:1px solid #f0ede8">
                    <td style="padding:6px 8px">{{ f.insumo }}<span v-if="verRow.a.tipoSiembra==='doble'" style="color:#9ca3af"> · {{ f.cultivo }}</span></td>
                    <td style="padding:6px 8px;text-align:right">{{ f.cantidad }}</td>
                    <td style="padding:6px 8px">{{ f.unidad }}</td>
                    <template v-if="verPrecios">
                      <td style="padding:6px 8px;text-align:right">{{ fmtUSD(f.costoHa) }}</td>
                      <td style="padding:6px 8px;text-align:right;font-weight:600">{{ fmtUSD(f.costoTotal) }}</td>
                    </template>
                  </tr>
                </template>
                <tr v-if="resumenVer.secciones.length && verPrecios" style="border-top:2px solid #2d5a27;background:#fafaf9">
                  <td style="padding:7px 8px;font-weight:800;color:#2d5a27">TOTAL</td>
                  <td/><td/>
                  <td style="padding:7px 8px;text-align:right;font-weight:800;color:#2d5a27">{{ fmtUSD(resumenVer.totalHa) }}</td>
                  <td style="padding:7px 8px;text-align:right;font-weight:800;color:#2d5a27">{{ fmtUSD(resumenVer.total) }}</td>
                </tr>
                <tr v-if="!resumenVer.secciones.length"><td colspan="5" style="padding:10px;text-align:center;color:#9ca3af">Sin insumos cargados.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="row justify-between items-center q-mt-md">
          <q-btn v-if="verPrecios" unelevated color="positive" icon="download" label="Descargar Excel" @click="excelLote(verRow)"/>
          <q-btn flat label="Cerrar" @click="verRow=null"/>
        </div>
      </q-card>
    </q-dialog>

    <!-- Asignar / Editar -->
    <q-dialog v-if="asignarModal" :model-value="true" maximized @hide="asignarModal=null">
      <q-card class="di-modal">
        <div class="di-modal-head">
          <div style="min-width:0">
            <h2 style="font-size:16px;font-weight:700;color:#2d5a27;margin:0;line-height:1.2">
              {{ asignarModal.initial ? 'Editar asignación' : 'Asignar lote a la campaña' }}
            </h2>
            <div style="font-size:12px;color:#6b7280;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              <template v-if="asignarLote">
                <b style="color:#374151">{{ asignarLote.nombre }}</b> · {{ fmtNum(asignarLote.ha) }} ha · {{ store.campania }}
              </template>
              <template v-else>{{ store.campania }}</template>
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="asignarModal=null"/>
        </div>
        <div class="di-modal-body">
          <div class="di-modal-inner">
            <AsignarLoteForm :campania="store.campania" :initial="asignarModal.initial"
              @lote="l => asignarModal.lote = l" @save="onSaveAsignacion" @cancel="asignarModal=null"/>
          </div>
        </div>
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
import { useGranjaStore } from '../stores/granja'
import AsignarLoteForm from '../components/AsignarLoteForm.vue'
import CultivoBadge from '../components/CultivoBadge.vue'
import SvgDonut    from '../components/charts/SvgDonut.vue'
import ResultadoNetoCard from '../components/ResultadoNetoCard.vue'
import CostosFijosSection from '../components/CostosFijosSection.vue'
import { calcLoteConAlquiler, pieCostosPorCategoria, costoHaSinAlquiler, alquilerHaItems, alquilerVariableHaItems, alquilerVariableDeContrato, costoVariableHaItems, alquilerPorCultivo, indicadoresCultivo, asignacionTieneArrendamientoManual, tasasVariablesTn, porTnSonda, factorItem } from '../utils/calculations'
import { filasAsignacion, agruparEnSecciones, exportarExcel } from '../utils/resumenInsumos'
import { fmtUSD, fmtK, fmtNum } from '../utils/formatters'

const store   = useMainStore()
const lmStore = useLotesMaestroStore()
const catStore = useCatalogoStore()
const granja  = useGranjaStore()
// Permisos del miembro (el dueño ve precios y todos los lotes).
const verPrecios = computed(() => granja.verPrecios('costos_contables'))
const ctx = computed(() => ({
  catalogo: catStore.items, labores: catStore.labores, tipoCambio: store.tipoCambio,
  cultivosPrecio: store.cultivosPrecio,   // de la campaña activa, no el global del catálogo
}))
const headers = computed(() => verPrecios.value
  ? ['Lote','Alquiler','Cultivo','Ha','Costo/ha','Costo total','Ingreso/ha','Margen/ha','Margen total','Acciones']
  : ['Lote','Alquiler','Cultivo','Ha','Acciones'])

// Chip compacto del alquiler vigente. Sólo hay dos tipos de contrato:
// quintales fijos (qq/ha) y porcentaje de la cosecha.
function chipAlquiler(contrato) {
  if (!contrato) return null
  const cant = parseFloat(contrato.cantidad) || 0
  const esPorc = contrato.tipoContrato === 'porcentaje_cosecha'
  const rango = contrato.campanaInicio === contrato.campanaFin
    ? contrato.campanaInicio
    : `${contrato.campanaInicio} a ${contrato.campanaFin}`
  return {
    texto: esPorc ? `${fmtNum(cant)}%` : `${fmtNum(cant)} qq`,
    // El cultivo de referencia puede NO ser el sembrado (se pacta en soja).
    detalle: `${fmtNum(cant)} ${esPorc ? '% de la cosecha' : 'qq/ha'} de ${contrato.cultivoReferencia || '—'} · ${rango}`,
  }
}

const asignarModal = ref(null)
// Lote que muestra el encabezado del modal. Al editar sale de la asignación;
// al asignar uno nuevo lo emite el formulario cuando lo elegís (paso 1).
const asignarLote = computed(() => asignarModal.value?.lote
  || (asignarModal.value?.initial ? lmStore.byId(asignarModal.value.initial.loteId) : null))
const verRow  = ref(null)
const bajaRow = ref(null)

const filas = computed(() => store.asignaciones
  .filter(a => a.campaña === store.campania)
  .filter(a => granja.tieneAccesoLote(a.loteId))   // miembro: sólo lotes permitidos
  .map(a => {
    const lote = lmStore.byId(a.loteId)
    const ha = parseFloat(lote?.ha) || 0
    const contrato = store.contratoVigente(a.loteId, store.campania)
    return { a, nombre: lote?.nombre || '—', ha, alquiler: chipAlquiler(contrato),
             calc: calcLoteConAlquiler(a, ha, contrato, ctx.value.cultivosPrecio) }
  })
  .sort((x, y) => x.nombre.localeCompare(y.nombre)))

const totHA = computed(() => filas.value.reduce((s, r) => s + r.ha, 0))
const totC  = computed(() => filas.value.reduce((s, r) => s + r.calc.costoHa  * r.ha, 0))
const totI  = computed(() => filas.value.reduce((s, r) => s + r.calc.ingresoHa * r.ha, 0))
const totM  = computed(() => totI.value - totC.value)

const detailStats = computed(() => {
  if (!verRow.value) return []
  const { a, ha, calc } = verRow.value
  const base = [
    ['Campaña', a.campaña], ['Ha', `${fmtNum(ha)} ha`], ['Tipo', a.tipoSiembra==='doble'?'🌾☀️ Doble':'🌱 Simple'],
  ]
  if (!verPrecios.value) return base   // miembro sin permiso de precios: sólo datos sin plata
  return [
    ...base,
    ['Costo/ha',  fmtUSD(calc.costoHa),  '#dc2626'],
    ['Ingreso/ha',fmtUSD(calc.ingresoHa),'#2d5a27'],
    ['Margen/ha', fmtUSD(calc.margenHa), calc.margenHa>=0?'#3a6b35':'#dc2626'],
    ['Margen total', fmtK(calc.margenHa*ha), calc.margenHa>=0?'#3a6b35':'#dc2626'],
  ]
})

// Torta de costos agrupada por familia/categoría (no por insumo individual).
const pieData = computed(() => {
  if (!verRow.value) return []
  const a = verRow.value.a
  const items = a.tipoSiembra === 'doble'
    ? [...(a.cultivoInvernal?.itemsCosto || []), ...(a.cultivoEstival?.itemsCosto || [])]
    : (a.cultivo?.itemsCosto || [])
  return pieCostosPorCategoria(items)
})

// Insumos del lote en el modal Ver: agrupados por insumo y por categoría
const resumenVer = computed(() => verRow.value
  ? agruparEnSecciones(filasAsignacion(verRow.value.a, verRow.value.ha, ctx.value, { congelado: true }), verRow.value.ha)
  : { secciones: [], total: 0, totalHa: 0 })

// ── Alquiler del lote (contrato) ──────────────────────────────────
const alquilerVer = computed(() => {
  if (!verRow.value) return null
  const c = store.contratoVigente(verRow.value.a.loteId, store.campania)
  if (!c) return null
  return { contrato: c, ...alquilerPorCultivo(c, verRow.value.a, verRow.value.ha, ctx.value.cultivosPrecio) }
})
const contratoLabel = c => c
  ? (c.tipoContrato === 'quintales_fijos'
      ? `${fmtNum(c.cantidad)} qq/ha fijos (ref. ${c.cultivoReferencia})`
      : `${fmtNum(c.cantidad)}% de la cosecha (ref. ${c.cultivoReferencia})`)
  : ''
// ¿Coexisten contrato + ítem 'arrendamiento' manual? (para avisar del doble conteo)
const dobleCargaVer = computed(() => !!(verRow.value && alquilerVer.value && asignacionTieneArrendamientoManual(verRow.value.a)))

// ── Indicadores por cultivo (rinde de indiferencia + margen contrib./tn) ──
const indicadoresVer = computed(() => {
  if (!verRow.value) return []
  const a = verRow.value.a
  const alq = alquilerVer.value
  const contrato = store.contratoVigente(a.loteId, store.campania)
  const mk = (cultivo, alquilerHaContrato) => {
    if (!cultivo?.nombre) return null
    const alquilerHa = alq ? (alquilerHaContrato || 0) : alquilerHaItems(cultivo)  // si no hay contrato, usa ítem 'arrendamiento'
    // La parte que escala con el rinde sigue la misma rama: del contrato si hay
    // contrato ('porcentaje_cosecha'), del ítem si no ('porc_grano').
    const alquilerVariableHa = alq
      ? alquilerVariableDeContrato(contrato, alquilerHa)
      : alquilerVariableHaItems(cultivo)
    // Tasas por tonelada con la sonda: el rinde de indiferencia deja de
    // depender del rinde cargado y coincide exacto con el del editor. En
    // Contables el costo está prorrateado por hectáreas de etapa, así que la
    // sonda aplica el mismo factor.
    const factor = it => factorItem(it, cultivo.etapas, verRow.value.ha)
    const tasas = tasasVariablesTn(cultivo, ctx.value, factor)
    // Con contrato, la tasa del alquiler sale del contrato, no de los ítems:
    // sólo 'porcentaje_cosecha' escala con el rinde.
    if (alq) tasas.alquilerVariableTn = contrato?.tipoContrato === 'porcentaje_cosecha'
      ? porTnSonda(r => {
          const conRinde = a.tipoSiembra === 'doble'
            ? { ...a, cultivoEstival: { ...a.cultivoEstival, rendimientoQq: r } }
            : { ...a, cultivo: { ...a.cultivo, rendimientoQq: r } }
          const x = alquilerPorCultivo(contrato, conRinde, verRow.value.ha, ctx.value.cultivosPrecio)
          return (x.simpleHa ?? 0) + (x.invernalHa ?? 0) + (x.estivalHa ?? 0)
        })
      : 0
    return { nombre: cultivo.nombre, ind: indicadoresCultivo({
      costoSinAlqHa: costoHaSinAlquiler(cultivo), alquilerHa, alquilerVariableHa,
      costoVariableHa: costoVariableHaItems(cultivo),
      precioTn: cultivo.precioVentaTn, rindeQq: cultivo.rendimientoQq,
      ...tasas,
    }) }
  }
  if (a.tipoSiembra === 'doble') return [mk(a.cultivoEstival, alq?.estivalHa), mk(a.cultivoInvernal, alq?.invernalHa)].filter(Boolean)
  return [mk(a.cultivo, alq?.simpleHa)].filter(Boolean)
})
const fmtRinde = tn => tn > 0 ? `${tn.toFixed(2)} tn (${Math.round(tn * 1000).toLocaleString('es-AR')} kg)` : '—'
// Mensaje del primer cultivo que no tenga rinde de indiferencia.
const sinRindeCargadoVer = computed(() => indicadoresVer.value.some(r => r.ind.sinRindeCargado))
const mensajeSinRindeVer = computed(() => indicadoresVer.value.find(r => r.ind.sinRindeIndif)?.ind.mensajeSinRinde || '')

// Excel: hoja 1 = detalle del lote, hoja 2 = resumen de todos los lotes de la campaña
function excelLote(row) {
  const filasResumen = filas.value.flatMap(r => filasAsignacion(r.a, r.ha, ctx.value, { congelado: true }).map(f => ({ ...f, lote: r.nombre, ha: r.ha })))
  exportarExcel({
    archivo: `costos-contables-${row.nombre}-${store.campania.replace('/','-')}.xlsx`,
    hojaDetalle: `Detalle ${row.nombre}`,
    filasDetalle: filasAsignacion(row.a, row.ha, ctx.value, { congelado: true }),
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
