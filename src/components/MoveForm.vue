<template>
  <div>
    <p style="font-size:14px;color:#374151;margin-bottom:14px">Moviendo: <b>{{ item.nombre }}</b> — {{ fmtNum(item.cantidad) }} {{ item.unidad }}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div>
        <label class="di-lbl">Cantidad a mover</label>
        <input v-model="cant" type="number" :max="item.cantidad" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Nueva ubicación</label>
        <select v-model="ubic" class="di-inp">
          <option v-for="u in UBICS.filter(u=>u.key!==item.ubicacion)" :key="u.key" :value="u.key">{{ u.label }}</option>
        </select>
      </div>

      <!-- Aplicar en campo → elegir lote destino (campaña activa) -->
      <div v-if="ubic==='aplicado'" style="grid-column:span 2">
        <label class="di-lbl">Lote destino (campaña {{ campania }})</label>
        <select v-model="loteDestino" class="di-inp">
          <option value="">— Seleccionar lote —</option>
          <option v-for="l in lotes" :key="l" :value="l">{{ l }}</option>
        </select>
        <p style="font-size:11px;color:#6b7280;margin-top:6px">
          Al aplicar, el insumo sale del inventario y se registra como ítem de costo en Costos Contables.
        </p>
      </div>

      <div v-else style="grid-column:span 2">
        <label class="di-lbl">Nota (opcional)</label>
        <input v-model="nota" class="di-inp"/>
      </div>
    </div>
    <div class="row justify-end q-gutter-sm">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" :label="ubic==='aplicado'?'Aplicar':'Mover'" :disable="ubic==='aplicado'&&!loteDestino" @click="$emit('save', cant, ubic, nota, loteDestino)"/>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { UBICS } from '../utils/constants'
import { fmtNum } from '../utils/formatters'

const props = defineProps({
  item:     Object,
  lotes:    { type: Array, default: () => [] },
  campania: { type: String, default: '' },
})
defineEmits(['save', 'cancel'])

const cant = ref(props.item.cantidad)
const ubic = ref(UBICS.filter(u => u.key !== props.item.ubicacion)[0]?.key || 'galpon')
const nota = ref('')
// Por defecto, el lote ya asignado al insumo si está en la campaña activa
const loteDestino = ref(props.lotes.includes(props.item.lote) ? props.item.lote : '')

// Si el usuario cambia a "aplicado", re-sugerir el lote asignado
watch(ubic, v => {
  if (v === 'aplicado' && !loteDestino.value && props.lotes.includes(props.item.lote)) {
    loteDestino.value = props.item.lote
  }
})
</script>
