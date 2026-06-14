<template>
  <q-page style="padding:24px">
    <div class="row items-center justify-between q-mb-md" style="flex-wrap:wrap;gap:12px">
      <h2 style="font-size:18px;font-weight:700;margin:0">Stocks de Insumos</h2>
      <q-btn unelevated color="primary" icon="add" label="Agregar insumo" @click="openModal('add')"/>
    </div>

    <!-- Filter bar -->
    <div style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:12px 16px;margin-bottom:18px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
      <input v-model="search" placeholder="Buscar…" class="di-inp" style="width:160px"/>
      <select v-model="filterTipo" class="di-inp" style="width:auto">
        <option v-for="t in TIPOS_ST" :key="t">{{ t }}</option>
      </select>
      <div style="margin-left:auto;display:flex;gap:10px">
        <div v-for="u in ubicsVisibles" :key="u.key" :style="{background:u.bg,border:`1px solid ${u.border}`,borderRadius:'8px',padding:'5px 12px',textAlign:'center'}">
          <p :style="{fontSize:'10px',color:u.color,fontWeight:600}">{{ u.label.split('/')[0] }}</p>
          <p :style="{fontSize:'13px',fontWeight:700,color:u.color}">{{ fmtUSD(stocks.filter(i=>i.ubicacion===u.key).reduce((s,i)=>s+totalVal(i),0)) }}</p>
        </div>
      </div>
    </div>

    <!-- Groups by ubicacion -->
    <div v-for="ubic in ubicsVisibles" :key="ubic.key" style="margin-bottom:22px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div :style="{width:'4px',height:'22px',background:ubic.color,borderRadius:'99px'}"/>
        <h3 :style="{fontSize:'14px',fontWeight:700,color:ubic.color,margin:0}">{{ ubic.label }}</h3>
        <span :style="{background:ubic.bg,color:ubic.color,border:`1px solid ${ubic.border}`,borderRadius:'999px',padding:'1px 10px',fontSize:'11px',fontWeight:600}">{{ byUbic(ubic.key).length }}</span>
        <span style="margin-left:auto;font-size:13px;color:#6b7280">Total: <b :style="{color:ubic.color}">{{ fmtUSD(byUbic(ubic.key).reduce((s,i)=>s+totalVal(i),0)) }}</b></span>
      </div>
      <div v-if="!byUbic(ubic.key).length" :style="{background:ubic.bg,border:`1px dashed ${ubic.border}`,borderRadius:'10px',padding:'18px',textAlign:'center',color:'#9ca3af',fontSize:'13px'}">Sin insumos.</div>
      <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px">
        <div v-for="it in byUbic(ubic.key)" :key="it.id"
          :style="{background:'#fff',border:`1px solid ${ubic.border}`,borderRadius:'10px',padding:'11px 14px',display:'grid',gridTemplateColumns:'1fr auto',gap:'8px'}">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
              <b style="font-size:14px">{{ it.nombre }}</b>
              <span :style="{background:ubic.bg,color:ubic.color,border:`1px solid ${ubic.border}`,borderRadius:'999px',padding:'1px 7px',fontSize:'10px',fontWeight:700}">{{ it.tipo }}</span>
            </div>
            <div style="font-size:13px;color:#374151;display:flex;flex-wrap:wrap;gap:10px">
              <span><b :style="{color:ubic.color}">{{ fmtNum(it.cantidad) }}</b> {{ it.unidad }}</span>
              <span>{{ fmtUSD(it.precioUnitario) }}/{{ it.unidad }}</span>
              <span :style="{fontWeight:700,color:ubic.color}">{{ fmtUSD(totalVal(it)) }}</span>
            </div>
            <div style="font-size:12px;color:#9ca3af;margin-top:3px;display:flex;gap:10px;flex-wrap:wrap">
              <span v-if="it.proveedor">📦 {{ it.proveedor }}</span>
              <span v-if="it.lote">🌾 {{ it.lote }}</span>
              <span v-if="it.fecha">📅 {{ it.fecha }}</span>
              <span v-if="it.remito">🧾 {{ it.remito }}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button @click="openModal('move',it)" :style="{padding:'3px 8px',background:ubic.bg,border:`1px solid ${ubic.border}`,borderRadius:'5px',cursor:'pointer',fontSize:'11px',color:ubic.color,fontWeight:600}">Mover</button>
            <button @click="openModal('edit',it)" style="padding:3px 8px;background:#f0fdf4;border:1px solid #86efac;border-radius:5px;cursor:pointer;font-size:11px;color:#166534">Editar</button>
            <button @click="delId=it.id" style="padding:3px 8px;background:#fff1f2;border:1px solid #fecaca;border-radius:5px;cursor:pointer;font-size:11px;color:#dc2626">Elim.</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit -->
    <q-dialog v-if="modal?.mode==='add'||modal?.mode==='edit'" :model-value="true" @hide="modal=null">
      <q-card style="width:620px;max-width:95vw;border-radius:14px;padding:28px;max-height:90vh;overflow-y:auto">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ modal.mode==='edit'?'Editar insumo':'Agregar insumo' }}</h2>
          <q-btn flat round dense icon="close" @click="modal=null"/>
        </div>
        <StockForm :initial="modal.item" :lotes-unicos="lotesUnicos" @save="onSave" @cancel="modal=null"/>
      </q-card>
    </q-dialog>

    <!-- Move -->
    <q-dialog v-if="modal?.mode==='move'" :model-value="true" @hide="modal=null;moveError=''">
      <q-card style="width:440px;max-width:95vw;border-radius:14px;padding:28px">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">Mover insumo</h2>
          <q-btn flat round dense icon="close" @click="modal=null;moveError=''"/>
        </div>
        <div v-if="moveError" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:13px;color:#dc2626">{{ moveError }}</div>
        <MoveForm :item="modal.item" :lotes="lotesCampania" :campania="store.campania" @save="onMove" @cancel="modal=null;moveError=''"/>
      </q-card>
    </q-dialog>

    <!-- Confirm delete -->
    <q-dialog v-if="delId" :model-value="true" @hide="delId=null">
      <q-card style="width:320px;border-radius:12px;padding:28px;text-align:center">
        <p style="font-size:16px;font-weight:700;margin-bottom:8px">¿Eliminar?</p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:20px">Esta acción no se puede deshacer.</p>
        <div class="row justify-center q-gutter-sm">
          <q-btn flat label="Cancelar" @click="delId=null"/>
          <q-btn unelevated color="negative" label="Eliminar" @click="confirmDel"/>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../stores/main'
import StockForm from '../components/StockForm.vue'
import MoveForm  from '../components/MoveForm.vue'
import { TIPOS_ST, UBICS } from '../utils/constants'
import { totalVal } from '../utils/calculations'
import { fmtUSD, fmtNum } from '../utils/formatters'

const store      = useMainStore()
const modal      = ref(null)
const delId      = ref(null)
const search     = ref('')
const filterTipo = ref('Todos')
const moveError  = ref('')

// 'aplicado' ya no es una ubicación visible: al aplicar, el insumo pasa a ser ítem de costo del lote
const ubicsVisibles = UBICS.filter(u => u.key !== 'aplicado')

const stocks      = computed(() => store.stocks)
const lotesUnicos = computed(() => [...new Set(store.lotes.map(l => l.nombre || l.lote).filter(Boolean))])
const lotesCampania = computed(() => store.lotes.filter(l => l.campaña === store.campania).map(l => l.nombre || l.lote).filter(Boolean))
const filtered    = computed(() => stocks.value.filter(i =>
  i.ubicacion !== 'aplicado' &&
  (filterTipo.value === 'Todos' || i.tipo === filterTipo.value) &&
  (!search.value || i.nombre.toLowerCase().includes(search.value.toLowerCase()))
))
const byUbic = key => filtered.value.filter(i => i.ubicacion === key)

function openModal(mode, item = null) { modal.value = { mode, item } }
function onSave(f) { modal.value.item ? store.updStock(modal.value.item.id, f) : store.addStock(f); modal.value = null }
async function onMove(cant, ubic, nota, loteDestino) {
  try {
    await store.moveStock(modal.value.item.id, ubic, cant, nota, loteDestino)
    modal.value = null
  } catch (e) {
    moveError.value = e.message || 'No se pudo mover el insumo'
  }
}
function confirmDel() { store.delStock(delId.value); delId.value = null }
</script>
