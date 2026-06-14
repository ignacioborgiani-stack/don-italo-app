<template>
  <q-layout view="hHh LpR fFf">
    <q-header elevated style="background:#2d5a27">
      <q-toolbar>
        <!-- Logo -->
        <div class="row items-center q-gutter-x-sm" style="padding-right:12px;border-right:1px solid rgba(255,255,255,.15)">
          <img src="@/assets/logo_transparent.png" alt="Don Italo" style="width:40px;height:40px;object-fit:contain"/>
          <span style="color:#fff;font-weight:800;font-size:17px">Don Italo</span>
        </div>

        <!-- Tabs -->
        <q-tabs
          v-model="activeTab"
          align="left"
          dense
          no-caps
          indicator-color="transparent"
          class="q-ml-sm"
          style="flex:1"
          @update:model-value="onTab"
        >
          <q-tab v-for="t in TABS" :key="t.name" :name="t.name"
            :style="activeTab===t.name?'background:#4a8a44;border-bottom:3px solid #a8d5a2':'border-bottom:3px solid transparent'"
          >
            <template #default>
              <span style="margin-right:5px">{{ t.e }}</span>{{ t.label }}
            </template>
          </q-tab>
        </q-tabs>

        <!-- Campaign selector -->
        <q-btn
          flat no-caps dense
          class="q-ml-sm"
          style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:8px;color:#fff;font-weight:700;font-size:13px;padding:5px 12px"
        >
          <span style="margin-right:6px">📅</span>{{ store.campania }}
          <q-icon name="expand_more" size="16px" class="q-ml-xs"/>
          <q-menu anchor="bottom right" self="top right" style="border-radius:10px;border:1px solid #d4cfc4;min-width:200px">
            <div style="padding:8px 14px 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em">Campañas</div>
            <q-item
              v-for="c in campanasOrdenadas" :key="c"
              clickable v-close-popup
              @click="store.setCampania(c)"
              :style="{padding:'8px 6px 8px 14px',fontSize:'13px',fontWeight:c===store.campania?700:500,color:c===store.campania?'#2d5a27':'#374151',background:c===store.campania?'#f0fdf4':'transparent'}"
            >
              <q-item-section avatar style="min-width:24px">
                <q-icon v-if="c===store.campania" name="check" size="16px" color="green-8"/>
              </q-item-section>
              <q-item-section>{{ c }}</q-item-section>
              <q-item-section side v-if="campanasOrdenadas.length > 1">
                <q-btn flat round dense size="sm" icon="delete_outline" color="grey-6"
                  v-close-popup @click.stop="pedirEliminar(c)">
                  <q-tooltip>Eliminar campaña</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
            <q-separator/>
            <q-item clickable v-close-popup @click="openNueva"
              style="padding:9px 14px;font-size:13px;font-weight:600;color:#2d5a27">
              <q-item-section avatar style="min-width:24px"><q-icon name="add" size="16px"/></q-item-section>
              <q-item-section>Nueva campaña</q-item-section>
            </q-item>
          </q-menu>
        </q-btn>

        <!-- User Avatar Button -->
        <q-btn
          flat round
          class="q-ml-sm"
          style="width:34px;height:34px;min-height:unset;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);color:#fff;font-weight:700;font-size:13px"
        >
          {{ inicial }}
          <q-menu anchor="bottom right" self="top right" style="border-radius:10px;border:1px solid #d4cfc4;min-width:190px">
            <!-- Header -->
            <div style="padding:10px 16px 8px;border-bottom:1px solid #f0ede8">
              <div style="font-weight:700;font-size:13px;color:#1f2937">{{ auth.usuario?.nombre }}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px">{{ auth.usuario?.email }}</div>
            </div>
            <!-- Logout -->
            <q-item clickable v-close-popup @click="doLogout"
              style="color:#dc2626;font-weight:600;font-size:13px;padding:10px 16px">
              <q-item-section avatar style="min-width:28px">
                <q-icon name="logout" size="15px"/>
              </q-item-section>
              <q-item-section>Cerrar sesión</q-item-section>
            </q-item>
          </q-menu>
        </q-btn>

      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Nueva campaña -->
    <q-dialog v-model="nuevaOpen">
      <q-card style="width:380px;max-width:95vw;border-radius:14px;padding:26px">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Nueva campaña</h2>
          <q-btn flat round dense icon="close" @click="nuevaOpen=false"/>
        </div>
        <label class="di-lbl">Nombre de la campaña</label>
        <input v-model="nuevaNombre" class="di-inp" placeholder="ej: 2025/26" @keyup.enter="crearCampana" autofocus/>
        <p style="font-size:11px;color:#6b7280;margin-top:6px">Formato sugerido: AAAA/AA (texto libre permitido).</p>
        <p v-if="nuevaError" style="font-size:12px;color:#dc2626;margin-top:6px">{{ nuevaError }}</p>
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn flat label="Cancelar" @click="nuevaOpen=false"/>
          <q-btn unelevated color="primary" label="Crear" :disable="!nuevaNombre.trim()" @click="crearCampana"/>
        </div>
      </q-card>
    </q-dialog>

    <!-- Confirmar eliminar campaña -->
    <q-dialog v-model="eliminarOpen">
      <q-card style="width:400px;max-width:95vw;border-radius:14px;padding:26px">
        <div class="row items-center q-gutter-x-sm q-mb-sm">
          <q-icon name="warning" color="negative" size="22px"/>
          <h2 style="font-size:17px;font-weight:700;color:#dc2626;margin:0">Eliminar campaña</h2>
        </div>
        <p style="font-size:14px;color:#374151;margin:6px 0 0">
          Vas a eliminar la campaña <b>«{{ eliminarTarget }}»</b>.
        </p>
        <p v-if="lotesEnTarget > 0" style="font-size:13px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;margin-top:10px">
          ⚠️ Tiene <b>{{ lotesEnTarget }}</b> lote{{ lotesEnTarget>1?'s':'' }} cargado{{ lotesEnTarget>1?'s':'' }}. No se eliminan, pero dejarán de verse al quitar la campaña del selector.
        </p>
        <p style="font-size:12px;color:#9ca3af;margin-top:10px">Esta acción no se puede deshacer.</p>
        <p v-if="eliminarError" style="font-size:12px;color:#dc2626;margin-top:6px">{{ eliminarError }}</p>
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn flat label="Cancelar" @click="eliminarOpen=false"/>
          <q-btn unelevated color="negative" label="Eliminar campaña" @click="confirmarEliminar"/>
        </div>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMainStore } from '../stores/main'
import { useAuthStore } from '../stores/auth'

const store  = useMainStore()
const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

const inicial = computed(() => (auth.usuario?.nombre?.[0] || auth.usuario?.email?.[0] || '?').toUpperCase())

// Campañas ordenadas por año (más antigua → más nueva)
const campYear = n => { const m = String(n).match(/\d+/); return m ? parseInt(m[0], 10) : 0 }
const campanasOrdenadas = computed(() => [...store.campanas].sort((a, b) => campYear(a) - campYear(b)))

const nuevaOpen   = ref(false)
const nuevaNombre = ref('')
const nuevaError  = ref('')
function openNueva() { nuevaNombre.value = ''; nuevaError.value = ''; nuevaOpen.value = true }
async function crearCampana() {
  const n = nuevaNombre.value.trim()
  if (!n) return
  if (store.campanas.includes(n)) { nuevaError.value = 'Esa campaña ya existe'; return }
  try {
    await store.addCampana(n)
    nuevaOpen.value = false
  } catch (e) {
    nuevaError.value = e.message || 'No se pudo crear la campaña'
  }
}

// Eliminar campaña (con confirmación)
const eliminarOpen   = ref(false)
const eliminarTarget = ref('')
const eliminarError  = ref('')
const lotesEnTarget  = computed(() => store.lotes.filter(l => l.campaña === eliminarTarget.value).length)
function pedirEliminar(c) { eliminarTarget.value = c; eliminarError.value = ''; eliminarOpen.value = true }
async function confirmarEliminar() {
  try {
    await store.delCampana(eliminarTarget.value)
    eliminarOpen.value = false
  } catch (e) {
    eliminarError.value = e.message || 'No se pudo eliminar la campaña'
  }
}

const TABS = [
  { name: 'dashboard',   label: 'Dashboard',          e: '📊', path: '/' },
  { name: 'lotesMaestro',label: 'Lotes',              e: '🗺️', path: '/lotes-maestro' },
  { name: 'catalogo',    label: 'Catálogo',           e: '📚', path: '/catalogo' },
  { name: 'lotes',       label: 'Costos Contables',   e: '📒', path: '/lotes' },
  { name: 'proyectados', label: 'Costos Proyectados', e: '📈', path: '/proyectados' },
  { name: 'stocks',      label: 'Stocks',             e: '📦', path: '/stocks' },
  { name: 'chat',        label: 'Chat IA',            e: '🤖', path: '/chat' },
]

const pathToName = { '/': 'dashboard', '/lotes-maestro': 'lotesMaestro', '/catalogo': 'catalogo', '/lotes': 'lotes', '/proyectados': 'proyectados', '/stocks': 'stocks', '/chat': 'chat' }
const activeTab  = computed(() => pathToName[route.path] || 'dashboard')

function onTab(name) {
  const t = TABS.find(t => t.name === name)
  if (t) router.push(t.path)
}

async function doLogout() {
  store.resetData()
  await auth.logout()
  router.push('/auth')
}
</script>
