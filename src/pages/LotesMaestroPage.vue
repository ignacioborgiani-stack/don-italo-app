<template>
  <q-page style="padding:24px">
    <div class="q-mb-md">
      <h2 style="font-size:18px;font-weight:700;margin:0">Lotes</h2>
      <p style="font-size:13px;color:#6b7280;margin:2px 0 0">Catastro de campos — independiente de campañas y costos.</p>
    </div>

    <!-- Mapa unificado con todos los polígonos -->
    <LotesMapa :lotes="lotes" :campania="mainStore.campania" :highlight-id="hoverId"/>

    <!-- Separador "Campos" + botón agregar -->
    <div class="row items-center justify-between q-mt-lg q-mb-md" style="flex-wrap:wrap;gap:12px;border-top:1px solid #e5e1d8;padding-top:16px">
      <h3 style="font-size:16px;font-weight:700;margin:0">Campos</h3>
      <q-btn unelevated color="primary" icon="add" label="Agregar lote" @click="openModal('add')"/>
    </div>

    <div v-if="!lotes.length" style="background:#fff;border:1px dashed #d4cfc4;border-radius:12px;padding:40px;text-align:center;color:#9ca3af">
      No hay lotes cargados todavía. Clic en <b>"Agregar lote"</b> para empezar.
    </div>

    <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">
      <div v-for="l in lotes" :key="l.id"
        @mouseenter="hoverId=l.id" @mouseleave="hoverId=null"
        :style="{background:'#fff',border:`1px solid ${hoverId===l.id?'#ca8a04':'#d4cfc4'}`,borderRadius:'12px',overflow:'hidden',boxShadow:hoverId===l.id?'0 2px 10px rgba(202,138,4,.25)':'0 1px 4px rgba(0,0,0,.06)',display:'flex',flexDirection:'column',transition:'all .15s'}">
        <div style="background:#2d5a27;padding:11px 16px;display:flex;justify-content:space-between;align-items:center">
          <h3 style="color:#fff;font-weight:700;font-size:15px;margin:0">{{ l.nombre }}</h3>
          <span style="background:rgba(255,255,255,.2);color:#fff;border-radius:999px;padding:1px 10px;font-size:11px;font-weight:600">{{ fmtNum(l.ha) }} ha</span>
        </div>
        <div style="padding:12px 16px;flex:1;display:flex;flex-direction:column;gap:6px">
          <div v-if="l.ubicacion" style="font-size:13px;color:#374151">📍 {{ l.ubicacion }}</div>
          <div v-if="l.notas" style="font-size:12px;color:#6b7280;font-style:italic">{{ l.notas }}</div>
          <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">
            <span :style="geoBadge(l)">{{ (l.poligono && l.poligono.length) ? '📍 Geo cargado' : '📍 Sin geo' }}</span>
            <span :style="usoBadge(l.id)">
              {{ usoCount(l.id) ? `En uso en ${usoCount(l.id)} campaña${usoCount(l.id)>1?'s':''}` : 'Sin asignar a campañas' }}
            </span>
          </div>
        </div>
        <div style="padding:0 16px 12px;display:flex;gap:6px">
          <button @click="openModal('edit',l)" style="flex:1;padding:6px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;cursor:pointer;font-size:12px;color:#166534;font-weight:600">Editar</button>
          <button @click="pedirEliminar(l)" style="flex:1;padding:6px;background:#fff1f2;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font-size:12px;color:#dc2626;font-weight:600">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <q-dialog v-if="modal" :model-value="true" @hide="modal=null">
      <q-card style="width:560px;max-width:95vw;border-radius:14px;padding:28px;max-height:90vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ modal.mode==='edit'?'Editar lote':'Agregar lote' }}</h2>
          <q-btn flat round dense icon="close" @click="modal=null"/>
        </div>
        <LoteMaestroForm :initial="modal.lote" @save="onSave" @cancel="modal=null"/>
      </q-card>
    </q-dialog>

    <!-- Confirm delete -->
    <q-dialog v-model="eliminarOpen">
      <q-card style="width:420px;max-width:95vw;border-radius:14px;padding:26px">
        <div class="row items-center q-gutter-x-sm q-mb-sm">
          <q-icon name="warning" color="negative" size="22px"/>
          <h2 style="font-size:17px;font-weight:700;color:#dc2626;margin:0">Eliminar lote</h2>
        </div>
        <p style="font-size:14px;color:#374151;margin:6px 0 0">Vas a eliminar el lote <b>«{{ eliminarTarget?.nombre }}»</b>.</p>
        <p v-if="usoCount(eliminarTarget?.id)" style="font-size:13px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;margin-top:10px">
          ⚠️ Está en uso en <b>{{ usoCount(eliminarTarget?.id) }}</b> campaña{{ usoCount(eliminarTarget?.id)>1?'s':'' }}. Al eliminarlo también se borrarán esas asignaciones y sus costos.
        </p>
        <p style="font-size:12px;color:#9ca3af;margin-top:10px">Esta acción no se puede deshacer.</p>
        <p v-if="eliminarError" style="font-size:12px;color:#dc2626;margin-top:6px">{{ eliminarError }}</p>
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn flat label="Cancelar" @click="eliminarOpen=false"/>
          <q-btn unelevated color="negative" label="Eliminar lote" @click="confirmarEliminar"/>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLotesMaestroStore } from '../stores/lotesMaestro'
import { supabase } from '../lib/supabase'
import LoteMaestroForm from '../components/LoteMaestroForm.vue'
import LotesMapa from '../components/LotesMapa.vue'
import { useMainStore } from '../stores/main'
import { fmtNum } from '../utils/formatters'

const store = useLotesMaestroStore()
const mainStore = useMainStore()
const lotes = computed(() => store.items)

const modal  = ref(null)
const hoverId = ref(null)
const eliminarOpen   = ref(false)
const eliminarTarget = ref(null)
const eliminarError  = ref('')

// Conteo de campañas por lote (desde asignaciones_campana)
const uso = ref({})   // { loteId: nCampañas }
async function cargarUso() {
  try {
    const { data, error } = await supabase.from('asignaciones_campana').select('lote_id, campana')
    if (error) throw error
    const map = {}
    for (const r of data || []) {
      map[r.lote_id] = (map[r.lote_id] || new Set())
      map[r.lote_id].add(r.campana)
    }
    uso.value = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.size]))
  } catch (e) {
    uso.value = {}   // tabla aún no migrada: sin info de uso
  }
}
const usoCount = id => uso.value[id] || 0
const geoBadge = l => (l.poligono && l.poligono.length)
  ? 'background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600'
  : 'background:#f3f4f6;color:#9ca3af;border:1px solid #e5e7eb;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600'
const usoBadge = id => {
  const n = usoCount(id)
  return n
    ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600'
    : 'background:#f3f4f6;color:#9ca3af;border:1px solid #e5e7eb;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600'
}

onMounted(cargarUso)

function openModal(mode, lote = null) { modal.value = { mode, lote } }
async function onSave(f) {
  if (modal.value.lote) await store.updLote(modal.value.lote.id, f)
  else await store.addLote(f)
  modal.value = null
}

function pedirEliminar(l) { eliminarTarget.value = l; eliminarError.value = ''; eliminarOpen.value = true }
async function confirmarEliminar() {
  try {
    await store.delLote(eliminarTarget.value.id)
    eliminarOpen.value = false
    cargarUso()
  } catch (e) {
    eliminarError.value = e.message || 'No se pudo eliminar el lote'
  }
}
</script>
