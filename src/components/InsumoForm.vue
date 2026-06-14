<template>
  <div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Nombre *</label>
        <input v-model="f.nombre" placeholder="ej: Glifosato 75.7 SG" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Familia</label>
        <select v-if="!nuevaFamilia" v-model="f.familia" class="di-inp" @change="onFamiliaSel">
          <option v-for="fa in familias" :key="fa" :value="fa">{{ fa }}</option>
          <option value="__nueva__">➕ Nueva familia…</option>
        </select>
        <input v-else v-model="f.familia" placeholder="Nombre de la familia" class="di-inp"/>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Precio *</label>
        <input v-model="f.precio" type="number" step="any" placeholder="0" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Moneda</label>
        <select v-model="f.moneda" class="di-inp">
          <option value="USD">USD</option>
          <option value="ARS">ARS</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Unidad</label>
        <select v-model="f.unidadPrecio" class="di-inp">
          <option v-for="u in UNIDADES" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>
    </div>

    <div style="margin-bottom:12px">
      <label class="di-lbl">Notas</label>
      <textarea v-model="f.notas" rows="2" class="di-inp" style="resize:vertical"/>
    </div>

    <!-- Equivalencias -->
    <div style="border:1px solid #e5e1d8;border-radius:10px;margin-bottom:12px;overflow:hidden">
      <button type="button" @click="eqOpen=!eqOpen"
        style="width:100%;text-align:left;padding:10px 14px;background:#f9fafb;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#374151;display:flex;justify-content:space-between;align-items:center">
        <span>Equivalencias <span style="color:#9ca3af;font-weight:400">({{ f.equivalencias.length }})</span></span>
        <span>{{ eqOpen ? '▲' : '▼' }}</span>
      </button>
      <div v-if="eqOpen" style="padding:12px 14px;display:flex;flex-direction:column;gap:12px">
        <p v-if="!f.equivalencias.length" style="font-size:12px;color:#9ca3af;margin:0">Sin equivalencias. Definí a qué producto de referencia equivale este insumo.</p>
        <div v-for="(eq, i) in f.equivalencias" :key="i" style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px">
            <span>1 {{ f.unidadPrecio }} de <b>{{ f.nombre || 'este insumo' }}</b> equivale a</span>
            <input v-model.number="eq.factor" type="number" step="any" class="di-inp" style="width:80px;padding:4px 8px"/>
            <span>{{ unidadDe(eq.insumoIdRef) }} de</span>
            <select v-model="eq.insumoIdRef" class="di-inp" style="width:auto;flex:1;min-width:140px;padding:4px 8px">
              <option value="">— Producto referencia —</option>
              <option v-for="o in otrosInsumos" :key="o.id" :value="o.id">{{ o.nombre }}</option>
            </select>
            <button type="button" @click="f.equivalencias.splice(i,1)" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:5px;cursor:pointer;color:#dc2626;width:26px;height:26px">×</button>
          </div>
          <p v-if="eq.insumoIdRef && eq.factor" style="font-size:12px;color:#166534;margin:0">
            = {{ Number(eq.factor) }} {{ unidadDe(eq.insumoIdRef) }} de {{ nombreDe(eq.insumoIdRef) }} por cada {{ f.unidadPrecio }}
          </p>
          <input v-model="eq.nota" placeholder="Nota (ej: mismo ingrediente activo)" class="di-inp" style="padding:4px 8px;font-size:12px"/>
        </div>
        <button type="button" @click="addEq" style="align-self:flex-start;padding:5px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;cursor:pointer;color:#166534;font-size:12px;font-weight:600">+ Agregar equivalencia</button>
      </div>
    </div>

    <p v-if="error" style="font-size:12px;color:#dc2626;margin:6px 0 0">{{ error }}</p>
    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="onSave"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'

const props = defineProps({
  initial:  Object,
  familias: { type: Array, default: () => [] },
  insumos:  { type: Array, default: () => [] },
})
const emit = defineEmits(['save', 'cancel'])

const UNIDADES = ['litro', 'kg', 'tn', 'bolsa', 'ha', 'unidad']
const base = () => ({ nombre: '', familia: props.familias[0] || 'Otros', precio: '', moneda: 'USD', unidadPrecio: 'litro', notas: '', equivalencias: [], activo: true })
const f = reactive(props.initial ? { ...base(), ...props.initial, equivalencias: [...(props.initial.equivalencias || [])] } : base())

const error = ref('')
const eqOpen = ref(f.equivalencias.length > 0)
const nuevaFamilia = ref(false)

const otrosInsumos = computed(() => props.insumos.filter(i => i.id !== (props.initial?.id)))
const nombreDe = id => props.insumos.find(i => i.id === id)?.nombre || '—'
const unidadDe = id => props.insumos.find(i => i.id === id)?.unidadPrecio || ''

function onFamiliaSel() {
  if (f.familia === '__nueva__') { f.familia = ''; nuevaFamilia.value = true }
}
function addEq() { f.equivalencias.push({ insumoIdRef: '', factor: 1, nota: '' }); eqOpen.value = true }

function onSave() {
  error.value = ''
  if (!f.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  if (!f.familia.trim()) { error.value = 'La familia es obligatoria'; return }
  if (f.precio === '' || isNaN(parseFloat(f.precio))) { error.value = 'El precio es obligatorio'; return }
  const equivalencias = f.equivalencias.filter(e => e.insumoIdRef && e.factor)
  emit('save', { ...f, precio: parseFloat(f.precio), equivalencias })
}
</script>
