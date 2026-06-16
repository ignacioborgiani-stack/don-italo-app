<template>
  <div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Nombre *</label>
        <input v-model="f.nombre" placeholder="ej: Cosecha Soja 1era" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Categoría</label>
        <select v-if="!nuevaCat" v-model="f.categoria" class="di-inp" @change="onCatSel">
          <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
          <option value="__nueva__">➕ Nueva categoría…</option>
        </select>
        <input v-else v-model="f.categoria" placeholder="Nombre de la categoría" class="di-inp"/>
      </div>
    </div>

    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;margin-bottom:12px;cursor:pointer">
      <input type="checkbox" v-model="f.esPorcentaje"/>
      ¿Se calcula como porcentaje del valor cosechado?
    </label>

    <!-- Por porcentaje -->
    <div v-if="f.esPorcentaje" style="margin-bottom:12px">
      <label class="di-lbl">Porcentaje (%)</label>
      <input v-model="f.porcentaje" type="number" step="any" placeholder="ej: 8" class="di-inp" style="max-width:160px"/>
      <p style="font-size:11px;color:#6b7280;margin-top:6px">El costo USD/ha se calcula al usarla, según rendimiento y precio del cultivo.</p>
    </div>

    <!-- Por precio -->
    <div v-else style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label class="di-lbl">Precio *</label>
        <input v-model="f.precio" type="number" step="any" placeholder="0" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Moneda</label>
        <select v-model="f.moneda" class="di-inp"><option value="USD">USD</option><option value="ARS">ARS</option></select>
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

    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;margin-bottom:6px;cursor:pointer">
      <input type="checkbox" v-model="f.activo"/> Activo
    </label>

    <p v-if="error" style="font-size:12px;color:#dc2626;margin:6px 0 0">{{ error }}</p>
    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="onSave"/>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const props = defineProps({ initial: Object, categorias: { type: Array, default: () => [] } })
const emit  = defineEmits(['save', 'cancel'])

const UNIDADES = ['ha', 'tn', 'qq', 'viaje', 'unidad']
const base = () => ({ nombre: '', categoria: props.categorias[0] || 'Otro', precio: '', moneda: 'USD', unidadPrecio: 'ha', esPorcentaje: false, porcentaje: '', notas: '', activo: true })
const f = reactive(props.initial ? { ...base(), ...props.initial } : base())

const error = ref('')
const nuevaCat = ref(false)
function onCatSel() { if (f.categoria === '__nueva__') { f.categoria = ''; nuevaCat.value = true } }

function onSave() {
  error.value = ''
  if (!f.nombre.trim()) { error.value = 'El nombre es obligatorio'; return }
  if (!f.categoria.trim()) { error.value = 'La categoría es obligatoria'; return }
  if (f.esPorcentaje) {
    if (f.porcentaje === '' || isNaN(parseFloat(f.porcentaje))) { error.value = 'Ingresá el porcentaje'; return }
    emit('save', { ...f, porcentaje: parseFloat(f.porcentaje), precio: 0 })
  } else {
    if (f.precio === '' || isNaN(parseFloat(f.precio))) { error.value = 'El precio es obligatorio'; return }
    emit('save', { ...f, precio: parseFloat(f.precio), porcentaje: null })
  }
}
</script>
