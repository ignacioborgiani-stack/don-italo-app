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
      <div style="grid-column:span 2">
        <label class="di-lbl">Nota (opcional)</label>
        <input v-model="nota" class="di-inp"/>
      </div>
    </div>
    <div class="row justify-end q-gutter-sm">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Mover" @click="$emit('save', cant, ubic, nota)"/>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UBICS } from '../utils/constants'
import { fmtNum } from '../utils/formatters'

const props = defineProps({ item: Object })
defineEmits(['save', 'cancel'])

const cant = ref(props.item.cantidad)
const ubic = ref(UBICS.filter(u => u.key !== props.item.ubicacion)[0]?.key || 'galpon')
const nota = ref('')
</script>
