<template>
  <q-page style="padding:24px">
    <h2 style="font-size:18px;font-weight:700;margin:0 0 14px">Catálogo</h2>

    <!-- Sub-tabs -->
    <div style="display:inline-flex;background:#fff;border:1px solid #d4cfc4;border-radius:9px;padding:3px;margin-bottom:18px">
      <button v-for="t in subtabs" :key="t.key" @click="subtab=t.key"
        :style="{padding:'7px 18px',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:'inherit',background:subtab===t.key?'#2d5a27':'transparent',color:subtab===t.key?'#fff':'#374151'}">
        {{ t.label }}
      </button>
    </div>

    <!-- ════════ INSUMOS ════════ -->
    <div v-if="subtab==='insumos'">
      <div v-if="!insumos.length" style="background:#fff;border:1px dashed #d4cfc4;border-radius:12px;padding:36px;text-align:center;color:#6b7280">
        <p style="margin:0 0 14px">No hay insumos cargados.</p>
        <q-btn unelevated color="primary" :loading="cargando" :label="`Cargar datos de referencia (${nInsumosRef} insumos)`" @click="seedInsumos"/>
        <p v-if="seedError" style="color:#dc2626;font-size:12px;margin-top:10px">{{ seedError }}</p>
      </div>

      <template v-else>
        <div v-for="fam in familiasConItems" :key="fam" style="background:#fff;border:1px solid #d4cfc4;border-radius:10px;margin-bottom:10px;overflow:hidden">
          <button @click="toggle(fam)" style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f0fdf4;border:none;cursor:pointer;font-family:inherit">
            <span style="font-weight:700;font-size:14px;color:#2d5a27">{{ fam }} <span style="color:#9ca3af;font-weight:500">· {{ porFamilia[fam].length }}</span></span>
            <span style="color:#2d5a27">{{ abiertas.has(fam) ? '▲' : '▼' }}</span>
          </button>
          <div v-if="abiertas.has(fam)" style="padding:6px 10px 12px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="color:#9ca3af;font-size:11px;text-transform:uppercase">
                  <th style="text-align:left;padding:6px 8px">Nombre</th>
                  <th style="text-align:right;padding:6px 8px">Precio</th>
                  <th style="text-align:left;padding:6px 8px">Equiv.</th>
                  <th style="text-align:right;padding:6px 8px">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in porFamilia[fam]" :key="it.id" :style="{borderTop:'1px solid #f0ede8',opacity:it.activo?1:0.5}">
                  <td style="padding:7px 8px;font-weight:600">
                    {{ it.nombre }}
                    <span v-if="!it.activo" style="font-size:10px;color:#9ca3af;font-weight:400"> (archivado)</span>
                  </td>
                  <td style="padding:7px 8px;text-align:right;white-space:nowrap">{{ fmtPrecio(it.precio) }} {{ it.moneda }}/{{ it.unidadPrecio }}</td>
                  <td style="padding:7px 8px">
                    <span v-if="it.equivalencias && it.equivalencias.length"
                      style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600;cursor:help"
                      :title="eqDetalle(it)">{{ it.equivalencias.length }} equiv.</span>
                  </td>
                  <td style="padding:7px 8px;text-align:right;white-space:nowrap">
                    <button @click="editar(it)" style="padding:3px 8px;background:#f0fdf4;border:1px solid #86efac;border-radius:5px;cursor:pointer;font-size:11px;color:#166534;margin-left:4px">Editar</button>
                    <button @click="archivar(it)" style="padding:3px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:5px;cursor:pointer;font-size:11px;color:#92400e;margin-left:4px">{{ it.activo ? 'Archivar' : 'Activar' }}</button>
                    <button @click="pedirBorrar(it)" style="padding:3px 8px;background:#fff1f2;border:1px solid #fecaca;border-radius:5px;cursor:pointer;font-size:11px;color:#dc2626;margin-left:4px">×</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <button @click="agregarEnFamilia(fam)" style="margin-top:8px;padding:5px 12px;background:#fff;border:1.5px solid #3a6b35;border-radius:6px;cursor:pointer;color:#2d5a27;font-size:12px;font-weight:600">+ Agregar insumo</button>
          </div>
        </div>
        <q-btn flat color="primary" label="+ Nueva familia" @click="agregarNuevaFamilia" style="margin-top:4px"/>
      </template>
    </div>

    <!-- ════════ CULTIVOS ════════ -->
    <div v-else-if="subtab==='cultivos'">
      <div class="row items-center justify-end q-mb-md">
        <q-btn v-if="cultivos.length" unelevated color="primary" icon="add" label="Agregar cultivo" @click="addCultivoModal()"/>
      </div>

      <div v-if="!cultivos.length" style="background:#fff;border:1px dashed #d4cfc4;border-radius:12px;padding:36px;text-align:center;color:#6b7280">
        <p style="margin:0 0 14px">No hay cultivos de referencia cargados.</p>
        <q-btn unelevated color="primary" :loading="cargando" :label="`Cargar datos de referencia (${nCultivosRef} cultivos)`" @click="seedCultivos"/>
        <p v-if="seedError" style="color:#dc2626;font-size:12px;margin-top:10px">{{ seedError }}</p>
      </div>

      <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
        <div v-for="c in cultivos" :key="c.id" style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
          <div :style="{background:getCultivoColor(c.nombre),padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}">
            <h3 style="color:#fff;font-weight:700;font-size:15px;margin:0">{{ c.nombre }}</h3>
            <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:1px 8px;font-size:11px">{{ c.tipo==='invernal'?'🌾':'☀️' }}</span>
          </div>
          <div style="padding:12px 16px;font-size:13px;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Precio</span><b>{{ fmtUSD(c.precioUsdTn) }}/tn</b></div>
          </div>
          <div style="padding:0 16px 12px;display:flex;gap:6px">
            <button @click="editCultivoModal(c)" style="flex:1;padding:6px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;cursor:pointer;font-size:12px;color:#166534;font-weight:600">Editar</button>
            <button @click="pedirBorrarCultivo(c)" style="flex:1;padding:6px;background:#fff1f2;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font-size:12px;color:#dc2626;font-weight:600">Eliminar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ LABORES ════════ -->
    <div v-else-if="subtab==='labores'">
      <div v-if="!labores.length" style="background:#fff;border:1px dashed #d4cfc4;border-radius:12px;padding:36px;text-align:center;color:#6b7280">
        <p style="margin:0 0 14px">No hay labores cargadas.</p>
        <q-btn unelevated color="primary" :loading="cargando" :label="`Cargar datos de referencia (${nLaboresRef} labores)`" @click="seedLabores"/>
        <p v-if="seedError" style="color:#dc2626;font-size:12px;margin-top:10px">{{ seedError }}</p>
      </div>

      <template v-else>
        <div v-for="cat in catLaboresConItems" :key="cat" style="background:#fff;border:1px solid #d4cfc4;border-radius:10px;margin-bottom:10px;overflow:hidden">
          <button @click="toggleL(cat)" style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f0fdf4;border:none;cursor:pointer;font-family:inherit">
            <span style="font-weight:700;font-size:14px;color:#2d5a27">{{ cat }} <span style="color:#9ca3af;font-weight:500">· {{ porCategoria[cat].length }}</span></span>
            <span style="color:#2d5a27">{{ abiertasL.has(cat) ? '▲' : '▼' }}</span>
          </button>
          <div v-if="abiertasL.has(cat)" style="padding:6px 10px 12px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="color:#9ca3af;font-size:11px;text-transform:uppercase">
                  <th style="text-align:left;padding:6px 8px">Nombre</th>
                  <th style="text-align:right;padding:6px 8px">Precio</th>
                  <th style="text-align:left;padding:6px 8px">Notas</th>
                  <th style="text-align:right;padding:6px 8px">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in porCategoria[cat]" :key="l.id" :style="{borderTop:'1px solid #f0ede8',opacity:l.activo?1:0.5}">
                  <td style="padding:7px 8px;font-weight:600">{{ l.nombre }}<span v-if="!l.activo" style="font-size:10px;color:#9ca3af;font-weight:400"> (archivado)</span></td>
                  <td style="padding:7px 8px;text-align:right;white-space:nowrap">
                    <span v-if="l.esPorcentaje" style="color:#1d4ed8;font-weight:600">{{ l.porcentaje }}% del valor</span>
                    <span v-else>{{ fmtPrecio(l.precio) }} {{ l.moneda }}/{{ l.unidadPrecio }}</span>
                  </td>
                  <td style="padding:7px 8px;color:#9ca3af;font-size:12px">{{ l.notas }}</td>
                  <td style="padding:7px 8px;text-align:right;white-space:nowrap">
                    <button @click="editarLabor(l)" style="padding:3px 8px;background:#f0fdf4;border:1px solid #86efac;border-radius:5px;cursor:pointer;font-size:11px;color:#166534;margin-left:4px">Editar</button>
                    <button @click="archivarLabor(l)" style="padding:3px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:5px;cursor:pointer;font-size:11px;color:#92400e;margin-left:4px">{{ l.activo ? 'Archivar' : 'Activar' }}</button>
                    <button @click="pedirBorrarLabor(l)" style="padding:3px 8px;background:#fff1f2;border:1px solid #fecaca;border-radius:5px;cursor:pointer;font-size:11px;color:#dc2626;margin-left:4px">×</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <button @click="agregarEnCategoria(cat)" style="margin-top:8px;padding:5px 12px;background:#fff;border:1.5px solid #3a6b35;border-radius:6px;cursor:pointer;color:#2d5a27;font-size:12px;font-weight:600">+ Agregar labor</button>
          </div>
        </div>
        <q-btn flat color="primary" label="+ Nueva categoría" @click="agregarNuevaCategoria" style="margin-top:4px"/>
      </template>
    </div>

    <!-- ════════ COSTOS FIJOS ════════ -->
    <div v-else-if="subtab==='costosfijos'">
      <div class="row items-center justify-between q-mb-md" style="flex-wrap:wrap;gap:10px">
        <div style="font-size:13px;color:#6b7280">
          Costos de estructura para <b style="color:#2d5a27">📅 {{ main.campania }}</b> — globales de la empresa (no por lote).
        </div>
        <div class="row q-gutter-sm">
          <q-btn flat dense color="primary" icon="content_copy" :loading="copiandoCF" label="Usar como plantilla" @click="copiarPlantillaCF"/>
          <q-btn unelevated dense color="primary" icon="add" label="Agregar costo fijo" @click="addCFModal()"/>
        </div>
      </div>
      <p v-if="cfMsg" :style="{fontSize:'12px',margin:'0 0 10px',color: cfErr ? '#dc2626' : '#166534'}">{{ cfMsg }}</p>

      <div style="background:#fff;border:1px solid #d4cfc4;border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f0fdf4;color:#6b7280;font-size:11px;text-transform:uppercase">
              <th style="text-align:left;padding:8px 12px">Concepto</th>
              <th style="text-align:right;padding:8px 12px">Monto</th>
              <th style="text-align:left;padding:8px 12px">Periodicidad</th>
              <th style="text-align:right;padding:8px 12px">Anual (USD)</th>
              <th style="text-align:right;padding:8px 12px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!main.costosFijosActivos.length">
              <td colspan="5" style="padding:22px;text-align:center;color:#9ca3af">Sin costos fijos para esta campaña. Agregá uno o copiá los de la campaña anterior con "Usar como plantilla".</td>
            </tr>
            <tr v-for="cf in main.costosFijosActivos" :key="cf.id" style="border-top:1px solid #f0ede8">
              <td style="padding:8px 12px;font-weight:600">
                {{ cf.concepto }}
                <div v-if="cf.notas" style="font-size:11px;color:#9ca3af;font-weight:400">{{ cf.notas }}</div>
              </td>
              <td style="padding:8px 12px;text-align:right;white-space:nowrap">{{ fmtMonto(cf.monto) }} {{ cf.moneda }}</td>
              <td style="padding:8px 12px">{{ cf.periodicidad==='mensual' ? 'Mensual' : 'Anual' }}</td>
              <td style="padding:8px 12px;text-align:right;font-weight:600;color:#dc2626">{{ fmtUSD(annualUsdCF(cf)) }}</td>
              <td style="padding:8px 12px;text-align:right;white-space:nowrap">
                <button @click="editCF(cf)" style="padding:3px 8px;background:#f0fdf4;border:1px solid #86efac;border-radius:5px;cursor:pointer;font-size:11px;color:#166534;margin-left:4px">Editar</button>
                <button @click="pedirBorrarCF(cf)" style="padding:3px 8px;background:#fff1f2;border:1px solid #fecaca;border-radius:5px;cursor:pointer;font-size:11px;color:#dc2626;margin-left:4px">×</button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="main.costosFijosActivos.length">
            <tr style="border-top:2px solid #2d5a27;background:#fafaf9">
              <td colspan="3" style="padding:9px 12px;font-weight:800;color:#2d5a27">TOTAL ANUAL</td>
              <td style="padding:9px 12px;text-align:right;font-weight:800;color:#dc2626">{{ fmtUSD(main.costosFijosTotal) }}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
      <p style="font-size:11px;color:#9ca3af;margin-top:8px">
        Para el Resultado Neto, los montos mensuales se anualizan (×12) y los ARS se convierten a USD al tipo de cambio actual ({{ main.tipoCambio }} ARS/USD).
      </p>
    </div>

    <!-- Modal costo fijo -->
    <q-dialog v-if="cfModal" :model-value="true" @hide="cfModal=null">
      <q-card style="width:560px;max-width:95vw;border-radius:14px;padding:26px">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ cfModal.edit ? 'Editar costo fijo' : 'Agregar costo fijo' }}</h2>
          <q-btn flat round dense icon="close" @click="cfModal=null"/>
        </div>
        <CostoFijoForm :initial="cfModal.item" @save="onSaveCF" @cancel="cfModal=null"/>
      </q-card>
    </q-dialog>

    <!-- Modal insumo -->
    <q-dialog v-if="insumoModal" :model-value="true" @hide="insumoModal=null">
      <q-card style="width:640px;max-width:95vw;border-radius:14px;padding:26px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ insumoModal.edit ? 'Editar insumo' : 'Agregar insumo' }}</h2>
          <q-btn flat round dense icon="close" @click="insumoModal=null"/>
        </div>
        <InsumoForm :initial="insumoModal.item" :familias="familiasTodas" :insumos="insumos" @save="onSaveInsumo" @cancel="insumoModal=null"/>
      </q-card>
    </q-dialog>

    <!-- Modal cultivo -->
    <q-dialog v-if="cultivoModal" :model-value="true" @hide="cultivoModal=null">
      <q-card style="width:560px;max-width:95vw;border-radius:14px;padding:26px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ cultivoModal.edit ? 'Editar cultivo' : 'Agregar cultivo' }}</h2>
          <q-btn flat round dense icon="close" @click="cultivoModal=null"/>
        </div>
        <CultivoRefForm :initial="cultivoModal.item" @save="onSaveCultivo" @cancel="cultivoModal=null"/>
      </q-card>
    </q-dialog>

    <!-- Modal labor -->
    <q-dialog v-if="laborModal" :model-value="true" @hide="laborModal=null">
      <q-card style="width:560px;max-width:95vw;border-radius:14px;padding:26px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ laborModal.edit ? 'Editar labor' : 'Agregar labor' }}</h2>
          <q-btn flat round dense icon="close" @click="laborModal=null"/>
        </div>
        <LaborForm :initial="laborModal.item" :categorias="catLaboresTodas" @save="onSaveLabor" @cancel="laborModal=null"/>
      </q-card>
    </q-dialog>

    <!-- Confirmar borrado -->
    <q-dialog v-model="borrarOpen">
      <q-card style="width:340px;border-radius:12px;padding:24px;text-align:center">
        <p style="font-size:15px;font-weight:700;margin:0 0 6px">¿Eliminar?</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 18px">«{{ borrarTarget?.nombre }}» se eliminará del catálogo.</p>
        <div class="row justify-center q-gutter-sm">
          <q-btn flat label="Cancelar" @click="borrarOpen=false"/>
          <q-btn unelevated color="negative" label="Eliminar" @click="confirmarBorrado"/>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { FAMILIAS_BASE, CATEGORIAS_LABORES, MOCK_CATALOGO_INSUMOS, MOCK_CATALOGO_CULTIVOS, MOCK_CATALOGO_LABORES } from '../utils/catalogoData'
import InsumoForm from '../components/InsumoForm.vue'
import CultivoRefForm from '../components/CultivoRefForm.vue'
import LaborForm from '../components/LaborForm.vue'
import CostoFijoForm from '../components/CostoFijoForm.vue'
import { getCultivoColor } from '../utils/constants'
import { costoFijoAnualUsd } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const store = useCatalogoStore()
const main = useMainStore()
const subtabs = [{ key: 'insumos', label: 'Insumos' }, { key: 'cultivos', label: 'Cultivos' }, { key: 'labores', label: 'Labores' }, { key: 'costosfijos', label: 'Costos Fijos' }]
const subtab = ref('insumos')

const insumos  = computed(() => store.items)
const cultivos = computed(() => store.cultivos)
const labores  = computed(() => store.labores)

const cargando  = ref(false)
const seedError = ref('')
const nInsumosRef  = MOCK_CATALOGO_INSUMOS.length
const nCultivosRef = MOCK_CATALOGO_CULTIVOS.length
const nLaboresRef  = MOCK_CATALOGO_LABORES.length

// Agrupar por familia
const porFamilia = computed(() => {
  const g = {}
  for (const it of insumos.value) { (g[it.familia] ||= []).push(it) }
  return g
})
const familiasConItems = computed(() => Object.keys(porFamilia.value).sort((a, b) => a.localeCompare(b)))
const familiasTodas = computed(() => [...new Set([...FAMILIAS_BASE, ...Object.keys(porFamilia.value)])].sort((a, b) => a.localeCompare(b)))

const abiertas = ref(new Set())
function toggle(fam) { const s = new Set(abiertas.value); s.has(fam) ? s.delete(fam) : s.add(fam); abiertas.value = s }

const fmtPrecio = n => '$' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nombreDe = id => insumos.value.find(i => i.id === id)?.nombre || '—'
const eqDetalle = it => (it.equivalencias || []).map(e => `1 ${it.unidadPrecio} = ${e.factor} de ${nombreDe(e.insumoIdRef)}${e.nota ? ' ('+e.nota+')' : ''}`).join(' · ')

// Seeds
async function seedInsumos() {
  cargando.value = true; seedError.value = ''
  try { await store.cargarInsumosReferencia(); abiertas.value = new Set(familiasConItems.value) }
  catch (e) { seedError.value = e.message || 'No se pudo cargar (¿corriste la migración 04?)' }
  finally { cargando.value = false }
}
async function seedCultivos() {
  cargando.value = true; seedError.value = ''
  try { await store.cargarCultivosReferencia() }
  catch (e) { seedError.value = e.message || 'No se pudo cargar (¿corriste la migración 04?)' }
  finally { cargando.value = false }
}
async function seedLabores() {
  cargando.value = true; seedError.value = ''
  try { await store.cargarLaboresReferencia(); abiertasL.value = new Set(catLaboresConItems.value) }
  catch (e) { seedError.value = e.message || 'No se pudo cargar (¿corriste la migración 05?)' }
  finally { cargando.value = false }
}

// Labores
const porCategoria = computed(() => {
  const g = {}
  for (const l of labores.value) { (g[l.categoria] ||= []).push(l) }
  return g
})
const catLaboresConItems = computed(() => Object.keys(porCategoria.value).sort((a, b) => a.localeCompare(b)))
const catLaboresTodas = computed(() => [...new Set([...CATEGORIAS_LABORES, ...Object.keys(porCategoria.value)])])
const abiertasL = ref(new Set())
function toggleL(cat) { const s = new Set(abiertasL.value); s.has(cat) ? s.delete(cat) : s.add(cat); abiertasL.value = s }

const laborModal = ref(null)
function agregarEnCategoria(cat) { laborModal.value = { edit: false, item: { categoria: cat } } }
function agregarNuevaCategoria() { laborModal.value = { edit: false, item: { categoria: '' } } }
function editarLabor(l) { laborModal.value = { edit: true, item: l } }
async function onSaveLabor(form) {
  if (laborModal.value.edit) await store.updLabor(laborModal.value.item.id, form)
  else await store.addLabor(form)
  laborModal.value = null
}
async function archivarLabor(l) { await store.updLabor(l.id, { activo: !l.activo }) }
function pedirBorrarLabor(l) { borrarTarget.value = l; borrarTipo.value = 'labor'; borrarOpen.value = true }

// Insumos CRUD
const insumoModal = ref(null)
function agregarEnFamilia(fam) { insumoModal.value = { edit: false, item: { familia: fam } } }
function agregarNuevaFamilia() { insumoModal.value = { edit: false, item: { familia: '' } } }
function editar(it) { insumoModal.value = { edit: true, item: it } }
async function onSaveInsumo(f) {
  if (insumoModal.value.edit) await store.updItem(insumoModal.value.item.id, f)
  else await store.addItem(f)
  insumoModal.value = null
}
async function archivar(it) { await store.updItem(it.id, { activo: !it.activo }) }

// Cultivos CRUD
const cultivoModal = ref(null)
function addCultivoModal() { cultivoModal.value = { edit: false, item: null } }
function editCultivoModal(c) { cultivoModal.value = { edit: true, item: c } }
async function onSaveCultivo(f) {
  if (cultivoModal.value.edit) await store.updCultivo(cultivoModal.value.item.id, f)
  else await store.addCultivo(f)
  cultivoModal.value = null
}

// Costos Fijos CRUD
const fmtMonto = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })
const annualUsdCF = cf => costoFijoAnualUsd(cf, main.tipoCambio)
const cfModal = ref(null)
const cfMsg = ref(''); const cfErr = ref(false); const copiandoCF = ref(false)
const cfErrorMsg = e => /schema cache|costos_fijos|does not exist|relation .* does not/i.test(e?.message || '')
  ? 'Falta crear la tabla: corré la migración 06 (supabase/migration_06_costos_fijos.sql) en Supabase → SQL Editor.'
  : (e?.message || 'No se pudo completar la acción.')
function addCFModal() { cfModal.value = { edit: false, item: null } }
function editCF(cf) { cfModal.value = { edit: true, item: cf } }
async function onSaveCF(form) {
  cfMsg.value = ''
  try {
    if (cfModal.value.edit) await main.updCostoFijo(cfModal.value.item.id, form)
    else await main.addCostoFijo(form)
    cfModal.value = null
  } catch (e) { cfErr.value = true; cfMsg.value = cfErrorMsg(e); cfModal.value = null }
}
function pedirBorrarCF(cf) { borrarTarget.value = { ...cf, nombre: cf.concepto }; borrarTipo.value = 'costofijo'; borrarOpen.value = true }
async function copiarPlantillaCF() {
  copiandoCF.value = true; cfMsg.value = ''
  try { const n = await main.copiarCostosFijosDeAnterior(); cfErr.value = false; cfMsg.value = `Se copiaron ${n} costo(s) fijo(s) de la campaña anterior.` }
  catch (e) { cfErr.value = true; cfMsg.value = cfErrorMsg(e) }
  finally { copiandoCF.value = false }
}

// Borrado (insumo, cultivo, labor o costo fijo)
const borrarOpen = ref(false)
const borrarTarget = ref(null)
const borrarTipo = ref('insumo')
function pedirBorrar(it) { borrarTarget.value = it; borrarTipo.value = 'insumo'; borrarOpen.value = true }
function pedirBorrarCultivo(c) { borrarTarget.value = c; borrarTipo.value = 'cultivo'; borrarOpen.value = true }
async function confirmarBorrado() {
  if (borrarTipo.value === 'insumo') await store.delItem(borrarTarget.value.id)
  else if (borrarTipo.value === 'cultivo') await store.delCultivo(borrarTarget.value.id)
  else if (borrarTipo.value === 'costofijo') await main.delCostoFijo(borrarTarget.value.id)
  else await store.delLabor(borrarTarget.value.id)
  borrarOpen.value = false
}
</script>
