<template>
  <q-page style="padding:24px;max-width:760px;margin:0 auto">
    <div class="q-mb-md">
      <h2 style="font-size:18px;font-weight:700;margin:0">Mi Granja</h2>
      <p style="font-size:13px;color:#6b7280;margin:4px 0 0">
        Invitá a otras personas a acceder a los datos de tu granja. Los permisos por módulo llegan más adelante.
      </p>
    </div>

    <!-- Cargando -->
    <div v-if="cargando" style="text-align:center;padding:40px;color:#9ca3af">
      <q-spinner color="primary" size="28px"/>
      <div style="margin-top:8px;font-size:13px">Cargando…</div>
    </div>

    <!-- Estructura aún no migrada en Supabase -->
    <div v-else-if="tablaNoDisponible" :style="avisoWarn">
      ⚠️ La estructura de granjas todavía no está en la base de datos.
      Corré la migración <b>supabase/migration_07_granjas.sql</b> en Supabase y volvé a entrar.
    </div>

    <template v-else>
      <p v-if="errorGeneral" :style="avisoError">{{ errorGeneral }}</p>

      <!-- ── Invitaciones que me hicieron ───────────────────────── -->
      <section v-if="granja.invitaciones.length" :style="card" style="margin-bottom:16px">
        <h3 :style="cardTitle">Invitaciones recibidas</h3>
        <div v-for="i in granja.invitaciones" :key="i.id"
          style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;flex-wrap:wrap">
          <div style="font-size:14px;color:#374151">
            Te invitaron a <b>{{ i.granjaNombre || 'una granja' }}</b>
            <span :style="badge(i.estado)">{{ estadoLabel(i.estado) }}</span>
          </div>
          <div v-if="i.estado==='pendiente'" class="row q-gutter-xs">
            <q-btn unelevated dense color="positive" label="Aceptar" size="sm" :loading="busy===i.id" @click="responder(i,true)"/>
            <q-btn flat dense color="grey-7" label="Rechazar" size="sm" :disable="busy===i.id" @click="responder(i,false)"/>
          </div>
        </div>
      </section>

      <!-- ── No tengo granja: crearla ───────────────────────────── -->
      <section v-if="!granja.tieneGranja" :style="card">
        <h3 :style="cardTitle">Crear mi granja</h3>
        <p style="font-size:13px;color:#6b7280;margin:0 0 12px">
          Una granja agrupa tus datos y te deja invitar a otras personas a colaborar.
        </p>
        <label class="di-lbl">Nombre de la granja</label>
        <input v-model="nombreNueva" class="di-inp" placeholder="ej: Granja Don Italo" maxlength="60" @keyup.enter="crear"/>
        <p v-if="errorCrear" :style="avisoError" style="margin-top:8px">{{ errorCrear }}</p>
        <div class="row justify-end q-mt-md">
          <q-btn unelevated color="primary" icon="add" label="Crear mi granja"
            :disable="!nombreNueva.trim()" :loading="busy==='crear'" @click="crear"/>
        </div>
      </section>

      <!-- ── Tengo granja: gestionar ────────────────────────────── -->
      <template v-else>
        <!-- Encabezado de la granja -->
        <section :style="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:10px">
              <q-icon name="groups" size="26px" color="green-8"/>
              <template v-if="!editandoNombre">
                <h3 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ granja.miGranja.nombre }}</h3>
                <q-btn flat round dense size="sm" icon="edit" color="grey-6" @click="empezarRenombrar">
                  <q-tooltip>Renombrar</q-tooltip>
                </q-btn>
              </template>
              <template v-else>
                <input v-model="nombreEdit" class="di-inp" style="width:240px" maxlength="60" @keyup.enter="guardarNombre" autofocus/>
                <q-btn flat round dense size="sm" icon="check" color="green-7" :loading="busy==='renombrar'" @click="guardarNombre"/>
                <q-btn flat round dense size="sm" icon="close" color="grey-6" @click="editandoNombre=false"/>
              </template>
            </div>
            <span style="font-size:12px;color:#9ca3af">Sos el propietario</span>
          </div>
        </section>

        <!-- Miembros -->
        <section :style="card" style="margin-bottom:16px">
          <h3 :style="cardTitle">Miembros ({{ granja.miembros.length }})</h3>
          <div v-if="!granja.miembros.length" style="font-size:13px;color:#9ca3af;padding:6px 0">
            Todavía no invitaste a nadie. Usá el formulario de abajo.
          </div>
          <div v-for="m in granja.miembros" :key="m.id"
            style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;flex-wrap:wrap">
            <div>
              <div style="font-size:14px;color:#374151;font-weight:600">{{ m.emailInvitado }}</div>
              <div style="font-size:11px;color:#9ca3af">Invitado el {{ fmtFecha(m.invitadoEn) }}</div>
            </div>
            <div class="row items-center q-gutter-xs">
              <span :style="badge(m.estado)">{{ estadoLabel(m.estado) }}</span>
              <q-btn v-if="m.estado==='aceptado'" flat dense size="sm" color="primary" icon="tune" label="Permisos" @click="abrirPermisos(m)"/>
              <q-btn flat round dense size="sm" icon="delete_outline" color="grey-6" @click="pedirQuitar(m)">
                <q-tooltip>Quitar</q-tooltip>
              </q-btn>
            </div>
          </div>
        </section>

        <!-- Invitar -->
        <section :style="card">
          <h3 :style="cardTitle">Invitar a alguien</h3>
          <label class="di-lbl">Email de la persona</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input v-model="emailInvitar" type="email" class="di-inp" style="flex:1;min-width:220px"
              placeholder="persona@email.com" @keyup.enter="invitar"/>
            <q-btn unelevated color="primary" icon="send" label="Invitar"
              :disable="!emailInvitar.trim()" :loading="busy==='invitar'" @click="invitar"/>
          </div>
          <p v-if="errorInvitar" :style="avisoError" style="margin-top:8px">{{ errorInvitar }}</p>
          <p v-if="okInvitar" style="font-size:12px;color:#166534;margin-top:8px">✓ {{ okInvitar }}</p>
          <p style="font-size:11px;color:#9ca3af;margin-top:10px">
            La persona verá la invitación al entrar con ese email. Por ahora aceptar sólo registra el vínculo; los permisos de acceso vienen en la próxima etapa.
          </p>
        </section>
      </template>
    </template>

    <!-- Confirmar quitar miembro -->
    <q-dialog v-model="quitarOpen">
      <q-card style="width:400px;max-width:95vw;border-radius:14px;padding:26px">
        <div class="row items-center q-gutter-x-sm q-mb-sm">
          <q-icon name="warning" color="negative" size="22px"/>
          <h2 style="font-size:17px;font-weight:700;color:#dc2626;margin:0">Quitar de la granja</h2>
        </div>
        <p style="font-size:14px;color:#374151;margin:6px 0 0">
          Vas a quitar a <b>{{ quitarTarget?.emailInvitado }}</b> de tu granja.
        </p>
        <p style="font-size:12px;color:#9ca3af;margin-top:8px">Podés volver a invitarlo cuando quieras.</p>
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn flat label="Cancelar" @click="quitarOpen=false"/>
          <q-btn unelevated color="negative" label="Quitar" :loading="busy==='quitar'" @click="confirmarQuitar"/>
        </div>
      </q-card>
    </q-dialog>

    <!-- Permisos del miembro -->
    <q-dialog v-model="permisosOpen">
      <q-card style="width:580px;max-width:96vw;border-radius:14px;padding:26px;max-height:92vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-sm">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Permisos</h2>
          <q-btn flat round dense icon="close" @click="permisosOpen=false"/>
        </div>
        <p style="font-size:12px;color:#6b7280;margin:0 0 14px">{{ permisosTarget?.emailInvitado }}</p>

        <h3 :style="cardTitle">Módulos</h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <thead>
            <tr style="color:#9ca3af;font-size:10px;text-transform:uppercase">
              <th style="text-align:left;padding:4px 0">Módulo</th>
              <th style="width:52px">Ver</th>
              <th style="width:52px">Editar</th>
              <th style="width:74px">Ver precios</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in MODULOS" :key="m.key" style="border-top:1px solid #f3f4f6">
              <td style="padding:7px 0;color:#374151">{{ m.label }}</td>
              <td style="text-align:center"><input type="checkbox" v-model="permModulos[m.key].ver"/></td>
              <td style="text-align:center"><input type="checkbox" v-model="permModulos[m.key].editar" :disabled="!permModulos[m.key].ver"/></td>
              <td style="text-align:center">
                <input v-if="m.costos" type="checkbox" v-model="permModulos[m.key].verPrecios" :disabled="!permModulos[m.key].ver"/>
                <span v-else style="color:#d1d5db">—</span>
              </td>
            </tr>
          </tbody>
        </table>

        <h3 :style="cardTitle" style="margin-top:18px">Lotes con acceso</h3>
        <p v-if="!lotes.length" style="font-size:13px;color:#9ca3af">No hay lotes cargados en tu granja.</p>
        <div v-else style="display:grid;grid-template-columns:1fr 1fr;gap:4px 14px">
          <label v-for="l in lotes" :key="l.id" style="display:flex;align-items:center;gap:7px;font-size:13px;color:#374151;cursor:pointer">
            <input type="checkbox" :checked="permLotes.has(l.id)" @change="toggleLote(l.id)"/> {{ l.nombre }}
          </label>
        </div>

        <h3 :style="cardTitle" style="margin-top:18px">Campañas con acceso</h3>
        <p v-if="!campanas.length" style="font-size:13px;color:#9ca3af">No hay campañas en tu granja.</p>
        <div v-else style="display:grid;grid-template-columns:1fr 1fr;gap:4px 14px">
          <label v-for="c in campanas" :key="c.id" style="display:flex;align-items:center;gap:7px;font-size:13px;color:#374151;cursor:pointer">
            <input type="checkbox" :checked="permCampanas.has(c.id)" @change="toggleCampana(c.id)"/> {{ c.nombre }}
          </label>
        </div>

        <p v-if="errorPermisos" :style="avisoError" style="margin-top:10px">{{ errorPermisos }}</p>
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn flat label="Cancelar" @click="permisosOpen=false"/>
          <q-btn unelevated color="primary" label="Guardar permisos" :loading="busy==='permisos'" @click="guardarPermisos"/>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useGranjaStore, MODULOS } from '../stores/granja'
import { useLotesMaestroStore } from '../stores/lotesMaestro'
import { useMainStore } from '../stores/main'

const granja   = useGranjaStore()
const lmStore  = useLotesMaestroStore()
const mainStore = useMainStore()
const lotes    = computed(() => lmStore.items)
const campanas = computed(() => mainStore.campanasRows)   // [{id, nombre}]

// estilos compartidos
const card      = 'background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)'
const cardTitle = 'font-size:14px;font-weight:700;color:#1f2937;margin:0 0 12px'
const avisoWarn  = 'background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:13px;color:#92400e'
const avisoError = 'font-size:12px;color:#dc2626'

const cargando         = ref(true)
const tablaNoDisponible = ref(false)
const errorGeneral     = ref('')
const busy             = ref(null)   // id o acción en curso (para loaders)

const nombreNueva = ref('')
const errorCrear  = ref('')

const editandoNombre = ref(false)
const nombreEdit     = ref('')

const emailInvitar = ref('')
const errorInvitar = ref('')
const okInvitar    = ref('')

const quitarOpen   = ref(false)
const quitarTarget = ref(null)

onMounted(async () => {
  try {
    await granja.loadGranja()
  } catch (e) {
    if (esTablaFaltante(e)) tablaNoDisponible.value = true
    else errorGeneral.value = e.message || 'No se pudieron cargar los datos de la granja'
  } finally {
    cargando.value = false
  }
})

function esTablaFaltante(e) {
  const m = `${e?.message || ''} ${e?.code || ''}`
  return /does not exist|42P01|schema cache|Could not find the table|PGRST205/i.test(m)
}

const estadoLabel = e => ({ pendiente: 'Pendiente', aceptado: 'Aceptado', rechazado: 'Rechazado' }[e] || e)
function badge(estado) {
  const c = {
    pendiente: 'background:#fffbeb;color:#92400e;border:1px solid #fde68a',
    aceptado:  'background:#f0fdf4;color:#166534;border:1px solid #86efac',
    rechazado: 'background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb',
  }[estado] || ''
  return `${c};border-radius:999px;padding:1px 10px;font-size:11px;font-weight:700;margin-left:8px;white-space:nowrap`
}
function fmtFecha(f) {
  if (!f) return '—'
  try { return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return '—' }
}

async function crear() {
  errorCrear.value = ''
  busy.value = 'crear'
  try { await granja.crearGranja(nombreNueva.value); nombreNueva.value = '' }
  catch (e) { errorCrear.value = e.message || 'No se pudo crear la granja' }
  finally { busy.value = null }
}

function empezarRenombrar() { nombreEdit.value = granja.miGranja.nombre; editandoNombre.value = true }
async function guardarNombre() {
  busy.value = 'renombrar'
  try { await granja.renombrarGranja(nombreEdit.value); editandoNombre.value = false }
  catch (e) { errorGeneral.value = e.message || 'No se pudo renombrar' }
  finally { busy.value = null }
}

async function invitar() {
  errorInvitar.value = ''; okInvitar.value = ''
  busy.value = 'invitar'
  try {
    const m = await granja.invitar(emailInvitar.value)
    okInvitar.value = `Invitación enviada a ${m.emailInvitado}`
    emailInvitar.value = ''
  } catch (e) { errorInvitar.value = e.message || 'No se pudo invitar' }
  finally { busy.value = null }
}

function pedirQuitar(m) { quitarTarget.value = m; quitarOpen.value = true }
async function confirmarQuitar() {
  busy.value = 'quitar'
  try { await granja.quitarMiembro(quitarTarget.value.id); quitarOpen.value = false }
  catch (e) { errorGeneral.value = e.message || 'No se pudo quitar' }
  finally { busy.value = null }
}

async function responder(inv, aceptar) {
  busy.value = inv.id
  try { await granja.responderInvitacion(inv.id, aceptar) }
  catch (e) { errorGeneral.value = e.message || 'No se pudo responder la invitación' }
  finally { busy.value = null }
}

// ── Permisos por miembro (panel del propietario) ───────────────
const permisosOpen   = ref(false)
const permisosTarget = ref(null)
const errorPermisos  = ref('')
const permLotes      = ref(new Set())
const permCampanas   = ref(new Set())
const permModulos    = reactive(Object.fromEntries(MODULOS.map(m => [m.key, { ver: false, editar: false, verPrecios: false }])))

async function abrirPermisos(m) {
  errorPermisos.value = ''
  permisosTarget.value = m
  for (const mod of MODULOS) permModulos[mod.key] = { ver: false, editar: false, verPrecios: false }
  permLotes.value = new Set()
  permCampanas.value = new Set()
  permisosOpen.value = true
  try {
    const { modulos, lotes: lotesPermitidos, campanas: campanasPermitidas } = await granja.loadPermisosMiembro(m.id)
    for (const k of Object.keys(modulos)) {
      if (permModulos[k]) permModulos[k] = { ver: !!modulos[k].ver, editar: !!modulos[k].editar, verPrecios: !!modulos[k].verPrecios }
    }
    permLotes.value = new Set(lotesPermitidos)
    permCampanas.value = new Set(campanasPermitidas)
  } catch (e) { errorPermisos.value = e.message || 'No se pudieron cargar los permisos' }
}

function toggleLote(id) {
  const s = new Set(permLotes.value)
  s.has(id) ? s.delete(id) : s.add(id)
  permLotes.value = s
}
function toggleCampana(id) {
  const s = new Set(permCampanas.value)
  s.has(id) ? s.delete(id) : s.add(id)
  permCampanas.value = s
}

async function guardarPermisos() {
  errorPermisos.value = ''
  busy.value = 'permisos'
  try {
    await granja.guardarPermisosMiembro(permisosTarget.value.id, { ...permModulos }, [...permLotes.value], [...permCampanas.value])
    permisosOpen.value = false
  } catch (e) { errorPermisos.value = e.message || 'No se pudieron guardar los permisos' }
  finally { busy.value = null }
}
</script>
