<template>
  <q-page style="padding:24px">
    <div class="row items-center justify-between q-mb-lg" style="flex-wrap:wrap;gap:12px">
      <div class="row items-center q-gutter-sm">
        <h2 style="font-size:18px;font-weight:700;margin:0">Costos Proyectados</h2>
        <span style="background:#f0fdf4;border:1px solid #86efac;border-radius:7px;padding:5px 12px;font-size:13px;font-weight:600;color:#2d5a27">📅 {{ store.campania }}</span>
      </div>
      <div class="row items-center q-gutter-sm">
        <div v-if="verPrecios" style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 16px;font-size:13px">
          Margen total campaña: <b :style="{color:totalMB>=0?'#3a6b35':'#dc2626',fontSize:'16px'}">{{ fmtK(totalMB) }}</b>
        </div>
        <q-btn v-if="puedeEditar" unelevated color="primary" icon="add" label="Agregar cultivo" @click="abrirNuevo"/>
      </div>
    </div>

    <!-- Sin presupuestos en esta campaña -->
    <div v-if="!barData.length" style="background:#fff;border:1px dashed #d4cfc4;border-radius:12px;padding:36px;text-align:center;color:#6b7280;margin-bottom:28px">
      <p style="margin:0 0 6px">No hay presupuestos cargados para <b style="color:#2d5a27">{{ store.campania }}</b>.</p>
      <p v-if="proyOtrasCampanas" style="font-size:12px;margin:0 0 14px">
        Hay {{ proyOtrasCampanas }} presupuesto{{ proyOtrasCampanas>1?'s':'' }} en otras campañas — cambiá de campaña en la barra superior para verlo{{ proyOtrasCampanas>1?'s':'' }}.
      </p>
      <q-btn v-if="puedeEditar" unelevated color="primary" icon="add" label="Agregar cultivo" @click="abrirNuevo"/>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-bottom:28px">
      <div v-for="d in barData" :key="d.cultivo" style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <div :style="{background:d.headerBg,padding:'11px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px'}">
          <h3 style="color:#fff;font-weight:700;font-size:15px;margin:0">{{ d.cultivo }}</h3>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:1px 8px;font-size:11px">{{ d.esDoble ? '🌾☀️' : (d.tipo==='invernal'?'🌾':'☀️') }}</span>
            <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:1px 10px;font-size:11px;font-weight:600">{{ d.ha.toLocaleString('es-AR') }} ha</span>
          </div>
        </div>
        <div style="padding:12px 16px">
          <template v-if="verPrecios">
            <!-- Tabs: consolidado + un cultivo por parte (sólo doble) -->
            <div v-if="d.esDoble" style="display:flex;border:1px solid #d4cfc4;border-radius:8px;overflow:hidden;margin-bottom:10px">
              <button v-for="t in tabsDe(d)" :key="t.key" @click="setTab(d.cultivo, t.key)"
                :style="{flex:1,padding:'6px 4px',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'11px',fontWeight:700,background:tabDe(d.cultivo)===t.key?'#2d5a27':'#fff',color:tabDe(d.cultivo)===t.key?'#fff':'#374151'}">
                {{ t.label }}
              </button>
            </div>

            <!-- Vista consolidada (o cultivo simple) -->
            <template v-if="!d.esDoble || tabDe(d.cultivo)==='consolidado'">
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
              <!-- Indicadores del cultivo simple -->
              <div v-if="!d.esDoble" style="background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:#374151">
                <p style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 4px">Indicadores</p>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Rinde indif. s/alq</span><b>{{ fmtRinde(d.ind.rindeIndifSinTn) }}</b></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Rinde indif. c/alq</span><b>{{ fmtRinde(d.ind.rindeIndifConTn) }}</b></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Margen contrib./tn</span><b :style="{color:d.ind.margenContribTn>=0?'#166534':'#dc2626'}">{{ fmtUSD(d.ind.margenContribTn) }}/tn</b></div>
              </div>
              <!-- Desglose del doble -->
              <div v-else style="background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:#374151">
                <p style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 4px">Margen por cultivo</p>
                <div v-for="pt in d.partes" :key="pt.nombre" style="display:flex;justify-content:space-between;padding:2px 0">
                  <span>{{ pt.emoji }} {{ pt.nombre }}</span>
                  <b :style="{color:pt.margenHa>=0?'#166534':'#dc2626'}">{{ fmtUSD(pt.margenHa) }}/ha</b>
                </div>
                <div v-if="d.alquilerTotalHa > 0" style="border-top:1px solid #e5e7eb;margin-top:5px;padding-top:5px;display:flex;justify-content:space-between">
                  <span>🏠 Alquiler repartido</span>
                  <b>{{ fmtUSD(d.alquilerTotalHa) }}/ha</b>
                </div>
              </div>
            </template>

            <!-- Vista de un cultivo del doble -->
            <template v-else v-for="pt in d.partes.filter(x => x.nombre === tabDe(d.cultivo))" :key="pt.nombre">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                <div v-for="[l,v,c] in [['Costo/ha',fmtUSD(pt.costoHa),'#dc2626'],['Ingreso/ha',fmtUSD(pt.ingresoHa),'#2d5a27']]" :key="l"
                  style="background:#f9fafb;border-radius:7px;padding:7px 10px">
                  <p style="font-size:10px;color:#9ca3af">{{ l }}</p>
                  <p :style="{fontSize:'14px',fontWeight:700,color:c}">{{ v }}</p>
                </div>
              </div>
              <div :style="{background:pt.margenHa>=0?'#f0fdf4':'#fff1f2',border:`1px solid ${pt.margenHa>=0?'#86efac':'#fca5a5'}`,borderRadius:'8px',padding:'9px 12px',marginBottom:'10px',display:'flex',justifyContent:'space-between'}">
                <div>
                  <p style="font-size:11px;color:#6b7280">Margen/ha</p>
                  <p :style="{fontWeight:800,fontSize:'17px',color:pt.margenHa>=0?'#3a6b35':'#dc2626'}">{{ fmtUSD(pt.margenHa) }}</p>
                </div>
                <div style="text-align:right">
                  <p style="font-size:11px;color:#6b7280">Rinde · Precio</p>
                  <p style="font-weight:700;font-size:13px;color:#374151">{{ fmtNum(pt.rendimientoQq) }} qq · {{ fmtUSD(pt.precioVentaTn) }}/tn</p>
                </div>
              </div>
              <div style="background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:#374151">
                <p style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;margin:0 0 4px">Indicadores · {{ pt.nombre }}</p>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Rinde indif. s/alq</span><b>{{ fmtRinde(pt.ind.rindeIndifSinTn) }}</b></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Rinde indif. c/alq</span><b>{{ fmtRinde(pt.ind.rindeIndifConTn) }}</b></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Margen contrib./tn</span><b :style="{color:pt.ind.margenContribTn>=0?'#166534':'#dc2626'}">{{ fmtUSD(pt.ind.margenContribTn) }}/tn</b></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid #e5e7eb;margin-top:4px;padding-top:5px">
                  <span>🏠 Alquiler asignado</span><b>{{ fmtUSD(pt.alquilerHa) }}/ha</b>
                </div>
              </div>
            </template>
          </template>
          <button @click="editProy=proyDe(d.cultivo)"
            style="width:100%;padding:7px;border-radius:7px;border:1.5px solid #3a6b35;background:#fff;color:#3a6b35;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit">
            Editar presupuesto
          </button>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button @click="toggle(d.cultivo)" style="flex:1;padding:6px;border-radius:7px;border:1px solid #d1d5db;background:#fff;color:#374151;cursor:pointer;font-size:12px;font-family:inherit">
              {{ abiertos.has(d.cultivo) ? 'Ocultar insumos ▲' : 'Ver insumos ▾' }}
            </button>
            <button v-if="verPrecios" @click="excelProy(d)" style="flex:1;padding:6px;border-radius:7px;border:1px solid #86efac;background:#f0fdf4;color:#166534;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit">
              ⬇ Excel
            </button>
          </div>

          <div v-if="abiertos.has(d.cultivo)" style="margin-top:10px;overflow-x:auto;border:1px solid #f0ede8;border-radius:8px">
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead>
                <tr style="background:#f9fafb;color:#6b7280">
                  <th style="text-align:left;padding:5px 6px">Insumo</th>
                  <th style="text-align:right;padding:5px 6px">Cant.</th>
                  <th style="text-align:left;padding:5px 6px">Unidad</th>
                  <template v-if="verPrecios">
                    <th style="text-align:right;padding:5px 6px">$/ha</th>
                    <th style="text-align:right;padding:5px 6px">Total</th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <template v-for="sec in seccionesDe(d).secciones" :key="sec.categoria">
                  <tr style="background:#f0fdf4"><td colspan="5" style="padding:4px 6px;font-weight:700;color:#2d5a27;font-size:10px;text-transform:uppercase">{{ sec.label }}</td></tr>
                  <tr v-for="(f,i) in sec.filas" :key="sec.categoria+i" style="border-top:1px solid #f0ede8">
                    <td style="padding:5px 6px">{{ f.insumo }}</td>
                    <td style="padding:5px 6px;text-align:right">{{ f.cantidad }}</td>
                    <td style="padding:5px 6px">{{ f.unidad }}</td>
                    <template v-if="verPrecios">
                      <td style="padding:5px 6px;text-align:right">{{ fmtUSD(f.costoHa) }}</td>
                      <td style="padding:5px 6px;text-align:right;font-weight:600">{{ fmtUSD(f.costoTotal) }}</td>
                    </template>
                  </tr>
                </template>
                <tr v-if="seccionesDe(d).secciones.length && verPrecios" style="border-top:2px solid #2d5a27;background:#fafaf9">
                  <td style="padding:5px 6px;font-weight:800;color:#2d5a27">TOTAL</td>
                  <td/><td/>
                  <td style="padding:5px 6px;text-align:right;font-weight:800;color:#2d5a27">{{ fmtUSD(seccionesDe(d).totalHa) }}</td>
                  <td style="padding:5px 6px;text-align:right;font-weight:800;color:#2d5a27">{{ fmtUSD(seccionesDe(d).total) }}</td>
                </tr>
                <tr v-if="!seccionesDe(d).secciones.length"><td colspan="5" style="padding:8px;text-align:center;color:#9ca3af">Sin insumos.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <template v-if="verPrecios">
      <div style="display:grid;grid-template-columns:minmax(280px,420px);gap:16px;margin-bottom:24px">
        <ResultadoNetoCard :bruto="totalMB" :costos-fijos="store.costosFijosTotal" titulo="Resultado Neto proyectado de la campaña"/>
      </div>

      <div style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">Comparativa margen bruto proyectado (USD/ha)</h3>
        <SvgHBar :data="barData" :height="250"/>
      </div>

      <CostosFijosSection/>
    </template>

    <!-- Nuevo cultivo: elegir del Catálogo de Cultivos -->
    <q-dialog v-model="nuevoOpen">
      <q-card style="width:420px;max-width:95vw;border-radius:14px;padding:26px">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Nuevo presupuesto</h2>
          <q-btn flat round dense icon="close" @click="nuevoOpen=false"/>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:0 0 12px">
          Se crea el presupuesto del cultivo para <b style="color:#2d5a27">📅 {{ store.campania }}</b>.
        </p>

        <!-- Simple vs doble cultivo -->
        <div style="display:flex;border-radius:8px;overflow:hidden;border:2px solid #3a6b35;margin-bottom:14px">
          <button v-for="[k,l] in [['simple','🌱 Cultivo simple'],['doble','🌾☀️ Doble cultivo']]" :key="k"
            @click="nuevoTipoSiembra=k"
            :style="{flex:1,padding:'8px 0',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:nuevoTipoSiembra===k?'#3a6b35':'#fff',color:nuevoTipoSiembra===k?'#fff':'#3a6b35',fontFamily:'inherit'}">
            {{ l }}
          </button>
        </div>

        <!-- ── DOBLE ── -->
        <template v-if="nuevoTipoSiembra==='doble'">
          <label class="di-lbl" style="display:block;font-size:11px;font-weight:600;color:#6b7280">🌾 Cultivo invernal</label>
          <select v-model="nuevoInvernal" class="di-inp"
            style="width:100%;margin:4px 0 10px;padding:8px 10px;border:1px solid #d4cfc4;border-radius:7px;font-family:inherit;font-size:13px;background:#fff">
            <option value="">— Elegí el invernal —</option>
            <option v-for="c in invernalesDisponibles" :key="c.nombre" :value="c.nombre">{{ c.nombre }}</option>
          </select>
          <label class="di-lbl" style="display:block;font-size:11px;font-weight:600;color:#6b7280">☀️ Cultivo estival (sobre rastrojo)</label>
          <select v-model="nuevoEstival" class="di-inp"
            style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d4cfc4;border-radius:7px;font-family:inherit;font-size:13px;background:#fff">
            <option value="">— Elegí el estival —</option>
            <option v-for="c in estivalesDisponibles" :key="c.nombre" :value="c.nombre">{{ c.nombre }}</option>
          </select>
          <p v-if="dobleYaExiste" style="font-size:12px;color:#dc2626;background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;margin:10px 0 0">
            Ya existe un presupuesto <b>{{ nombreDobleNuevo }}</b> en {{ store.campania }}.
          </p>
          <p v-else-if="nuevoInvernal && nuevoEstival" style="font-size:11px;color:#9ca3af;margin:10px 0 0">
            Se crea como <b style="color:#2d5a27">{{ nombreDobleNuevo }}</b>. Cada cultivo tiene su propio rinde,
            precio e ítems de costo; el alquiler se reparte entre los dos.
          </p>
        </template>

        <!-- ── SIMPLE ── -->
        <template v-else-if="cultivosDisponibles.length">
          <label class="di-lbl" style="display:block;font-size:11px;font-weight:600;color:#6b7280">Cultivo</label>
          <select v-model="nuevoCultivo" class="di-inp"
            style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d4cfc4;border-radius:7px;font-family:inherit;font-size:13px;background:#fff">
            <option value="">— Elegí un cultivo —</option>
            <option v-for="c in cultivosDisponibles" :key="c.nombre" :value="c.nombre">
              {{ c.nombre }} {{ c.tipo === 'invernal' ? '🌾' : '☀️' }}
            </option>
          </select>
          <p style="font-size:11px;color:#9ca3af;margin:8px 0 0">
            Se precargan rinde y precio del Catálogo de Cultivos; después los podés ajustar.
          </p>
        </template>
        <p v-else style="font-size:13px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;margin:0">
          Todos los cultivos del catálogo ya tienen presupuesto en esta campaña.
          Podés agregar más cultivos desde <b>Catálogo → Cultivos</b>.
        </p>

        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn flat label="Cancelar" @click="nuevoOpen=false"/>
          <q-btn unelevated color="primary" label="Crear presupuesto" :disable="!puedeCrear" @click="crearPresupuesto"/>
        </div>
      </q-card>
    </q-dialog>

    <!-- Edit proy modal -->
    <q-dialog v-if="editProy" :model-value="true" @hide="cerrarEditor">
      <q-card style="width:620px;max-width:95vw;border-radius:14px;padding:28px;max-height:90vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Presupuesto: {{ editProy.cultivo }}</h2>
          <q-btn flat round dense icon="close" @click="cerrarEditor"/>
        </div>
        <p v-if="errorGuardar" style="font-size:12px;color:#dc2626;background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin:0 0 12px">
          {{ errorGuardar }}
        </p>
        <ProyForm :proy="editProy" :guardando="guardando" @save="onSaveProy" @cancel="cerrarEditor"/>
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
import SvgHBar from '../components/charts/SvgHBar.vue'
import ResultadoNetoCard from '../components/ResultadoNetoCard.vue'
import CostosFijosSection from '../components/CostosFijosSection.vue'
import ProyForm from './ProyForm.vue'
import { getCultivoColor, TODOS_CULTIVARES, CULTIVARES_INVERNALES, CULTIVARES_ESTIVALES } from '../utils/constants'
import { calcCostoHa, calcIngresoHa, costoHaSinAlquiler, alquilerHaItems, indicadoresCultivo, calcProyDoble } from '../utils/calculations'
import { nombreDoble } from '../utils/mappers'
import { filasCultivo, agruparEnSecciones, exportarExcel } from '../utils/resumenInsumos'
import { fmtUSD, fmtK, fmtNum } from '../utils/formatters'

const store    = useMainStore()
const lmStore  = useLotesMaestroStore()
const catStore = useCatalogoStore()
const granja   = useGranjaStore()
const verPrecios  = computed(() => granja.verPrecios('costos_proyectados'))
const puedeEditar = computed(() => granja.puedeEditar('costos_proyectados'))
const editProy = ref(null)

// Los presupuestos son POR CAMPAÑA (UNIQUE user_id+cultivo+campana en la tabla).
const proyCampania = computed(() => store.proyecciones.filter(p => p.campana === store.campania))
const proyOtrasCampanas = computed(() => store.proyecciones.length - proyCampania.value.length)

const ctx = computed(() => ({
  catalogo: catStore.items, labores: catStore.labores, tipoCambio: store.tipoCambio,
  cultivosPrecio: Object.fromEntries(catStore.cultivos.map(c => [c.nombre, c.precioUsdTn])),
}))

// Ha por cultivo = suma de ha de los lotes ASIGNADOS a la campaña activa con ese cultivo
const calcHaCultivo = cultivo => store.asignaciones
  .filter(a => a.campaña === store.campania)
  .reduce((s, a) => {
    const ha = parseFloat(lmStore.byId(a.loteId)?.ha) || 0
    if (a.tipoSiembra === 'doble') return s + ((a.cultivoInvernal?.nombre === cultivo || a.cultivoEstival?.nombre === cultivo) ? ha : 0)
    return a.cultivo?.nombre === cultivo ? s + ha : s
  }, 0)

// Ha de un presupuesto doble = lotes asignados a la campaña como doble con ESA
// misma combinación de cultivos (la secuencia ocurre sobre las mismas hectáreas).
const calcHaDoble = (inv, est) => store.asignaciones
  .filter(a => a.campaña === store.campania && a.tipoSiembra === 'doble')
  .filter(a => a.cultivoInvernal?.nombre === inv && a.cultivoEstival?.nombre === est)
  .reduce((s, a) => s + (parseFloat(lmStore.byId(a.loteId)?.ha) || 0), 0)

const barData = computed(() => proyCampania.value.map(p => {
  if (p.tipoSiembra === 'doble') {
    const ha = calcHaDoble(p.cultivoInvernal?.nombre, p.cultivoEstival?.nombre)
    const d  = calcProyDoble(p)
    const parte = (x, emoji, cultivo) => ({ ...x, emoji, rendimientoQq: cultivo?.rendimientoQq, precioVentaTn: cultivo?.precioVentaTn })
    return {
      cultivo: p.cultivo, esDoble: true, ha, proy: p,
      headerBg: `linear-gradient(90deg, ${getCultivoColor(p.cultivoInvernal?.nombre)} 0%, ${getCultivoColor(p.cultivoEstival?.nombre)} 100%)`,
      costoHa: d.costoHa, ingHa: d.ingresoHa, margenHa: d.margenHa, margenTotal: d.margenHa * ha,
      alquilerTotalHa: d.alquilerTotalHa,
      partes: [parte(d.inv, '🌾', p.cultivoInvernal), parte(d.est, '☀️', p.cultivoEstival)],
    }
  }
  const ha = calcHaCultivo(p.cultivo), costoHa = calcCostoHa({ itemsCosto: p.itemsCosto || [] }), ingHa = calcIngresoHa(p)
  // Indicadores: el alquiler de Proyectados sale del ítem 'arrendamiento' del presupuesto.
  const ind = indicadoresCultivo({
    costoSinAlqHa: costoHaSinAlquiler(p), alquilerHa: alquilerHaItems(p),
    precioTn: p.precioVentaTn, rindeQq: p.rendimientoQq,
  })
  return {
    cultivo: p.cultivo, esDoble: false, tipo: p.tipo, proy: p, ha,
    headerBg: getCultivoColor(p.cultivo),
    costoHa, ingHa, margenHa: ingHa - costoHa, margenTotal: (ingHa - costoHa) * ha, ind,
  }
}).sort((a, b) => b.margenHa - a.margenHa))

// ── Tabs de la card del doble (consolidado / cada cultivo) ────────
const tabs = ref({})
const tabDe  = key => tabs.value[key] || 'consolidado'
const setTab = (key, v) => { tabs.value = { ...tabs.value, [key]: v } }
const tabsDe = d => [
  { key: 'consolidado', label: 'Consolidado' },
  ...d.partes.map(pt => ({ key: pt.nombre, label: `${pt.emoji} ${pt.nombre}` })),
]

const fmtRinde = tn => tn > 0 ? `${tn.toFixed(2)} tn (${Math.round(tn * 1000).toLocaleString('es-AR')} kg)` : '—'

const totalMB = computed(() => barData.value.reduce((s, d) => s + d.margenTotal, 0))

// Insumos proyectados por cultivo (tabla colapsable + Excel)
const abiertos = ref(new Set())
function toggle(cultivo) { const s = new Set(abiertos.value); s.has(cultivo) ? s.delete(cultivo) : s.add(cultivo); abiertos.value = s }
const proyDe = cultivo => proyCampania.value.find(p => p.cultivo === cultivo)

// Filas de insumos de un presupuesto. En el doble se concatenan los dos
// cultivos, cada uno etiquetado con su nombre.
function filasDe(d) {
  const p = d.proy
  if (!p) return []
  if (p.tipoSiembra === 'doble') {
    return [
      ...filasCultivo(p.cultivoInvernal, d.ha, ctx.value, p.cultivoInvernal?.nombre),
      ...filasCultivo(p.cultivoEstival,  d.ha, ctx.value, p.cultivoEstival?.nombre),
    ]
  }
  return filasCultivo(p, d.ha, ctx.value, d.cultivo)
}
// En pantalla la tabla sigue al tab activo: en un cultivo del doble muestra
// sólo los insumos de ese cultivo. El arrendamiento se reemplaza por la parte
// que le toca según el reparto, para que el total de la tabla coincida con el
// Costo/ha de la card (si no, mostraría el alquiler completo del doble).
function insumosDe(d) {
  const filas = filasDe(d)
  if (!d.esDoble) return filas
  const tab = tabDe(d.cultivo)
  if (tab === 'consolidado') return filas
  const parte = d.partes.find(p => p.nombre === tab)
  const propias = filas.filter(f => f.cultivo === tab && f.categoria !== 'arrendamiento')
  if (!parte || !(parte.alquilerHa > 0)) return propias
  return [...propias, {
    cultivo: tab, insumo: 'Arrendamiento (repartido)', categoria: 'arrendamiento',
    cantidad: '', unidad: 'USD/ha',
    costoHa: Math.round(parte.alquilerHa * 100) / 100,
    costoTotal: Math.round(parte.alquilerHa * (parseFloat(d.ha) || 0) * 100) / 100,
  }]
}
function seccionesDe(d) {
  return agruparEnSecciones(insumosDe(d), d.ha)
}
function excelProy(d) {
  const filasResumen = barData.value.flatMap(x => filasDe(x).map(f => ({ ...f, lote: x.cultivo, ha: x.ha })))
  exportarExcel({
    archivo: `costos-proyectados-${d.cultivo.replace(/\s*\/\s*/g, '-')}-${store.campania.replace('/','-')}.xlsx`,
    hojaDetalle: `Detalle ${d.cultivo}`.replace(/\//g, '-'),
    filasDetalle: filasDe(d),
    haDetalle: d.ha,
    filasResumen,
    campania: store.campania,
  })
}

// ── Alta de presupuesto ───────────────────────────────────────────
// Los cultivos salen del Catálogo de Cultivos; si aún no cargó ninguno, se
// ofrece la lista fija de referencia para no dejar la pantalla sin salida.
const nuevoOpen   = ref(false)
const nuevoCultivo = ref('')
const cultivosCatalogo = computed(() => catStore.cultivos.length
  ? catStore.cultivos.map(c => ({ nombre: c.nombre, tipo: c.tipo, rendimientoQq: c.rendimientoEstimadoQq, precioVentaTn: c.precioUsdTn }))
  : TODOS_CULTIVARES.map(c => ({
      nombre: c.nombre,
      tipo: CULTIVARES_INVERNALES.some(i => i.nombre === c.nombre) ? 'invernal' : 'estival',
      rendimientoQq: 0, precioVentaTn: 0,
    })))
// Excluye los que YA tienen presupuesto en la campaña activa (si no, el alta
// pisaría el existente y además chocaría con el UNIQUE de la tabla).
const cultivosDisponibles = computed(() => {
  const conPresupuesto = new Set(proyCampania.value.map(p => p.cultivo))
  return cultivosCatalogo.value.filter(c => !conPresupuesto.has(c.nombre))
})
// ── Doble cultivo en el alta ──────────────────────────────────────
const nuevoTipoSiembra = ref('simple')
const nuevoInvernal = ref('')
const nuevoEstival  = ref('')
const invernalesDisponibles = computed(() => cultivosCatalogo.value.filter(c => c.tipo === 'invernal'))
const estivalesDisponibles  = computed(() => cultivosCatalogo.value.filter(c => c.tipo !== 'invernal'))
// El doble se identifica por su nombre combinado: no puede repetirse en la campaña.
const nombreDobleNuevo = computed(() => nombreDoble(nuevoInvernal.value, nuevoEstival.value))
const dobleYaExiste = computed(() =>
  !!nuevoInvernal.value && !!nuevoEstival.value &&
  proyCampania.value.some(p => p.cultivo === nombreDobleNuevo.value))
const puedeCrear = computed(() => nuevoTipoSiembra.value === 'doble'
  ? (!!nuevoInvernal.value && !!nuevoEstival.value && !dobleYaExiste.value)
  : !!nuevoCultivo.value)

function abrirNuevo() {
  nuevoTipoSiembra.value = 'simple'
  nuevoCultivo.value = ''; nuevoInvernal.value = ''; nuevoEstival.value = ''
  errorGuardar.value = ''; nuevoOpen.value = true
}
// Cultivo del catálogo → objeto de presupuesto con rinde y precio precargados.
const draftCultivo = (nombre, tipoPorDefecto) => {
  const c = cultivosCatalogo.value.find(x => x.nombre === nombre)
  return {
    nombre,
    tipo: c?.tipo || tipoPorDefecto,
    rendimientoQq: parseFloat(c?.rendimientoQq) || 0,
    precioVentaTn: parseFloat(c?.precioVentaTn) || 0,
    itemsCosto: [], etapas: [], ordenarCat: true,
  }
}
function crearPresupuesto() {
  if (!puedeCrear.value) return
  if (nuevoTipoSiembra.value === 'doble') {
    editProy.value = {
      cultivo: nombreDobleNuevo.value,
      campana: store.campania,
      tipoSiembra: 'doble',
      cultivoInvernal: draftCultivo(nuevoInvernal.value, 'invernal'),
      cultivoEstival:  draftCultivo(nuevoEstival.value, 'estival'),
      repartoInvernal: 50, repartoEstival: 50,
    }
  } else {
    const c = cultivosDisponibles.value.find(x => x.nombre === nuevoCultivo.value)
    if (!c) return
    editProy.value = {
      ...draftCultivo(c.nombre, 'estival'),
      cultivo: c.nombre,
      campana: store.campania,
      tipoSiembra: 'simple',
    }
  }
  nuevoOpen.value = false
}

const guardando    = ref(false)
const errorGuardar = ref('')
function cerrarEditor() { editProy.value = null; errorGuardar.value = '' }
async function onSaveProy(f) {
  guardando.value = true; errorGuardar.value = ''
  try {
    await store.updProy(editProy.value.cultivo, { ...f, campana: editProy.value.campana || store.campania })
    cerrarEditor()
  } catch (e) {
    errorGuardar.value = /duplicate key|unique/i.test(e?.message || '')
      ? `Ya existe un presupuesto de ${editProy.value.cultivo} en ${store.campania}.`
      : (e?.message || 'No se pudo guardar el presupuesto.')
  } finally { guardando.value = false }
}
</script>
