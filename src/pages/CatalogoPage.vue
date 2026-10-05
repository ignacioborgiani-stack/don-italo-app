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
      <!-- ── Barra de pizarra (CAC Rosario) ── -->
      <div v-if="cultivos.length" style="background:#fff;border:1px solid #d4cfc4;border-radius:10px;padding:12px 16px;margin-bottom:14px">
        <div class="row items-center justify-between" style="flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:13px;font-weight:700;color:#1f2937">
              📋 Precios de pizarra — Cámara Arbitral de Rosario
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">
              <template v-if="pizarra.hayDatos">
                Pizarra del <b>{{ pizarra.fechaTexto }}</b> · se aplican a la campaña <b>{{ main.campania }}</b>
              </template>
              <template v-else>
                Trigo, maíz, girasol, soja y sorgo. Los demás cultivos siguen siendo manuales.
              </template>
            </div>
          </div>
          <div class="row items-center q-gutter-sm">
            <span v-if="conNovedad" style="background:#f0fdf4;border:1px solid #86efac;color:#166534;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700">
              {{ conNovedad }} precio{{ conNovedad === 1 ? '' : 's' }} nuevo{{ conNovedad === 1 ? '' : 's' }}
            </span>
            <q-btn flat dense no-caps size="sm" color="grey-7" icon="refresh"
              :label="pizarra.hayDatos ? 'Actualizar pizarra' : 'Consultar pizarra'"
              :loading="pizarra.cargando" @click="pizarra.cargar()"/>
            <q-btn v-if="traibles" unelevated dense no-caps size="sm" color="primary"
              :label="traibles === 1 ? 'Traer 1' : `Traer los ${traibles}`" @click="traerTodosDePizarra"/>
          </div>
        </div>

        <!-- Falla visible: los precios guardados no se tocan. -->
        <div v-if="pizarra.error" style="margin-top:9px;background:#fff1f2;border:1px solid #fecaca;border-radius:7px;padding:7px 10px;font-size:11px;color:#dc2626">
          <b>No se pudo leer la pizarra.</b> {{ pizarra.error }}
          Los precios guardados quedan como están; podés cargarlos a mano editando cada cultivo.
        </div>
        <div v-if="errorPrecio" style="margin-top:9px;background:#fff1f2;border:1px solid #fecaca;border-radius:7px;padding:7px 10px;font-size:11px;color:#dc2626">
          {{ errorPrecio }}
        </div>
        <div v-if="pizarra.hayDatos && !mapeados" style="margin-top:9px;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:7px 10px;font-size:11px;color:#92400e">
          Ningún cultivo está vinculado a un producto de pizarra. Editá un cultivo y elegí el producto.
        </div>
        <div v-if="manualesDesactualizados" style="margin-top:9px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:7px;padding:7px 10px;font-size:11px;color:#4b5563">
          {{ manualesDesactualizados }} cultivo{{ manualesDesactualizados === 1 ? ' tiene' : 's tienen' }} precio manual distinto al de la pizarra.
          No se pisan solos: traelos de a uno si querés reemplazarlos.
        </div>
      </div>

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
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="color:#6b7280">Precio</span>
              <b>{{ fmtUSD(precioVer(c).usd) }}/tn</b>
            </div>
            <!-- De dónde salió y de qué fecha: un precio sin fuente no sirve
                 para decidir. -->
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
              <span :style="`font-size:10px;font-weight:600;border-radius:999px;padding:2px 8px;background:${chipPrecio(c).bg};border:1px solid ${chipPrecio(c).bd};color:${chipPrecio(c).fg}`">
                {{ chipPrecio(c).txt }}
              </span>
              <span v-if="!precioVer(c).propio" style="font-size:10px;color:#9ca3af" :title="`Esta campaña todavía no tiene precio propio de ${c.nombre}: se usa el del catálogo`">
                usa el del catálogo
              </span>
            </div>

            <!-- Oferta de pizarra para este cultivo -->
            <template v-if="ofertaPizarra(c)">
              <!-- Día sin cotización: se informa el estimado pero NO se guarda,
                   y se mantiene el último precio bueno. -->
              <div v-if="ofertaPizarra(c).sc" style="background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:6px 9px;font-size:11px;color:#92400e">
                <b>S/C hoy</b> — sin cotización el {{ pizarra.fechaTexto }}.
                Se mantiene el precio actual. Estimado de la CAC: {{ fmtUSD(ofertaPizarra(c).usd) }}/tn (no se guarda).
              </div>
              <div v-else-if="ofertaPizarra(c).novedad" style="background:#f0fdf4;border:1px solid #86efac;border-radius:7px;padding:6px 9px;font-size:11px;color:#166534">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                  <span>Pizarra {{ pizarra.fechaTexto }}: <b>{{ fmtUSD(ofertaPizarra(c).usd) }}/tn</b></span>
                  <q-btn unelevated dense no-caps size="sm" color="primary" label="Traer"
                    :loading="guardandoPrecio === c.id" @click="traerDePizarra(c)"/>
                </div>
                <div v-if="precioVer(c).origen === 'manual'" style="font-size:10px;color:#4b5563;margin-top:3px">
                  Tenés un valor manual: no se pisa solo.
                </div>
              </div>
              <div v-else style="font-size:10px;color:#9ca3af">
                Coincide con la pizarra del {{ pizarra.fechaTexto }}.
              </div>
            </template>
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
import { FAMILIAS_BASE, CATEGORIAS_LABORES, MOCK_CATALOGO_INSUMOS, MOCK_CATALOGO_CULTIVOS, MOCK_CATALOGO_LABORES } from '../utils/catalogoData'
import InsumoForm from '../components/InsumoForm.vue'
import CultivoRefForm from '../components/CultivoRefForm.vue'
import LaborForm from '../components/LaborForm.vue'
import { getCultivoColor } from '../utils/constants'
import { fmtUSD } from '../utils/formatters'
import { useMainStore } from '../stores/main'
import { usePizarraStore } from '../stores/pizarra'

const store = useCatalogoStore()
const subtabs = [{ key: 'insumos', label: 'Insumos' }, { key: 'cultivos', label: 'Cultivos' }, { key: 'labores', label: 'Labores' }]
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

// ── Precios de pizarra (CAC Rosario) ──────────────────────────────
// El precio que se muestra y se usa es el de la CAMPAÑA ACTIVA, no el global
// del catálogo: cambiar el global movería el alquiler de campañas cerradas.
// Ver "El precio de cultivo está atado a la CAMPAÑA" en el CLAUDE.md.
const main    = useMainStore()
const pizarra = usePizarraStore()

// Precio efectivo del cultivo en la campaña activa (con su origen y fecha).
// Si la campaña todavía no tiene fila propia, cae al del catálogo y se avisa.
function precioVer(c) {
  const fila = main.precioCampanaDe(c.nombre)
  if (fila) return { usd: fila.precioUsdTn, origen: fila.origen, fecha: fila.fecha, propio: true }
  return { usd: parseFloat(c.precioUsdTn) || 0, origen: 'catalogo', fecha: '', propio: false }
}

// "2026-09-08" → "08/09"
const fechaCorta = iso => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')

const chipPrecio = c => {
  const p = precioVer(c)
  if (!p.propio) return { txt: 'Sin precio propio', bg: '#fffbeb', bd: '#fde68a', fg: '#92400e' }
  if (p.origen === 'pizarra') return { txt: `Pizarra ${fechaCorta(p.fecha) || '—'}`, bg: '#f0fdf4', bd: '#86efac', fg: '#166534' }
  return { txt: p.fecha ? `Manual ${fechaCorta(p.fecha)}` : 'Manual', bg: '#f3f4f6', bd: '#e5e7eb', fg: '#4b5563' }
}

// Dos precios son "el mismo" si se ven iguales en pantalla. Es la comparación
// que importa para decidir si hay algo que traer.
const mismoPrecio = (a, b) => fmtUSD(a) === fmtUSD(b)

// Lo que la pizarra ofrece hoy para este cultivo, si está mapeado.
function ofertaPizarra(c) {
  if (!c.pizarraProducto || !pizarra.hayDatos) return null
  const p = pizarra.precioDe(c.pizarraProducto)
  if (!p) return null
  const actual = precioVer(c)
  return {
    ...p,
    // "Hay precio nuevo" sólo si cambia el número QUE SE VE. fmtUSD redondea a
    // enteros, así que una diferencia de centavos no es novedad: ofrecer
    // "Traer" para algo que no mueve ningún número confunde.
    // Que cambie sólo la FECHA tampoco es novedad — no habría nada que traer.
    // Y un S/C nunca lo es: su valor es un estimado y no se guarda.
    novedad: !p.sc && !mismoPrecio(p.usd, actual.usd),
  }
}
// Cuántos precios nuevos hay (informativo) y cuántos se traerían de una. No
// son lo mismo: un precio puesto a mano NO se pisa en masa, así que el botón
// tiene que decir lo que realmente va a hacer.
const conNovedad = computed(() => cultivos.value.filter(c => ofertaPizarra(c)?.novedad).length)
const traibles   = computed(() => cultivos.value.filter(c => ofertaPizarra(c)?.novedad && precioVer(c).origen !== 'manual').length)
const mapeados   = computed(() => cultivos.value.filter(c => c.pizarraProducto).length)

const guardandoPrecio = ref('')
const errorPrecio = ref('')

// Escribe el precio de pizarra en la campaña activa. Los días S/C NO se
// guardan: el valor que publica la CAC esos días es un estimado.
async function traerDePizarra(c) {
  const o = ofertaPizarra(c)
  if (!o || o.sc) return
  guardandoPrecio.value = c.id
  errorPrecio.value = ''
  try {
    await main.setPrecioCampana(c.nombre, o.usd, { origen: 'pizarra', fecha: pizarra.fecha })
  } catch (e) {
    errorPrecio.value = `${c.nombre}: ${e?.message || 'no se pudo guardar el precio'}`
  } finally {
    guardandoPrecio.value = ''
  }
}

// Trae todos los que tengan novedad. Los S/C y los manuales quedan afuera:
// un valor puesto a mano no se pisa hasta que lo pidas por cultivo.
async function traerTodosDePizarra() {
  errorPrecio.value = ''
  for (const c of cultivos.value) {
    const o = ofertaPizarra(c)
    if (o?.novedad && precioVer(c).origen !== 'manual') await traerDePizarra(c)
  }
}

// Cultivos manuales que tienen un precio de pizarra distinto: se informa, no
// se pisa. Es el mismo criterio que el override del tipo de cambio.
const manualesDesactualizados = computed(() => cultivos.value.filter(c => {
  const o = ofertaPizarra(c)
  return o?.novedad && precioVer(c).origen === 'manual'
}).length)

// Cultivos CRUD
const cultivoModal = ref(null)
function addCultivoModal() { cultivoModal.value = { edit: false, item: null } }
function editCultivoModal(c) { cultivoModal.value = { edit: true, item: c } }
async function onSaveCultivo(f) {
  if (cultivoModal.value.edit) await store.updCultivo(cultivoModal.value.item.id, f)
  else await store.addCultivo(f)
  // El precio del catálogo es sólo la semilla: lo que realmente usan los
  // cálculos es el de la campaña activa. Escribir a mano acá lo marca 'manual'
  // con la fecha de hoy, así la pizarra no lo pisa hasta que se pida.
  try {
    await main.setPrecioCampana(f.nombre, f.precioUsdTn, {
      origen: 'manual',
      fecha: new Date().toISOString().slice(0, 10),
    })
  } catch (e) {
    errorPrecio.value = `${f.nombre}: se guardó el cultivo pero no el precio de la campaña — ${e?.message || ''}`
  }
  cultivoModal.value = null
}

// Borrado (insumo, cultivo o labor)
const borrarOpen = ref(false)
const borrarTarget = ref(null)
const borrarTipo = ref('insumo')
function pedirBorrar(it) { borrarTarget.value = it; borrarTipo.value = 'insumo'; borrarOpen.value = true }
function pedirBorrarCultivo(c) { borrarTarget.value = c; borrarTipo.value = 'cultivo'; borrarOpen.value = true }
async function confirmarBorrado() {
  if (borrarTipo.value === 'insumo') await store.delItem(borrarTarget.value.id)
  else if (borrarTipo.value === 'cultivo') await store.delCultivo(borrarTarget.value.id)
  else await store.delLabor(borrarTarget.value.id)
  borrarOpen.value = false
}
</script>
