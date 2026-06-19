<template>
  <div>
    <div>
      <label class="di-lbl">Concepto</label>
      <input v-model="f.concepto" class="di-inp" placeholder="Ej: Administración, Ingeniero agrónomo, Almacenaje"/>
    </div>
    <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;margin-top:12px">
      <div>
        <label class="di-lbl">Monto</label>
        <input v-model="f.monto" type="number" step="any" class="di-inp" placeholder="0"/>
      </div>
      <div>
        <label class="di-lbl">Moneda</label>
        <select v-model="f.moneda" class="di-inp">
          <option value="USD">USD</option>
          <option value="ARS">ARS</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Periodicidad</label>
        <select v-model="f.periodicidad" class="di-inp">
          <option value="anual">Anual</option>
          <option value="mensual">Mensual</option>
        </select>
      </div>
    </div>
    <div style="margin-top:12px">
      <label class="di-lbl">Notas (opcional)</label>
      <input v-model="f.notas" class="di-inp" placeholder=""/>
    </div>
    <p style="font-size:11px;color:#9ca3af;margin:10px 0 0">
      Los montos mensuales se anualizan (×12) y los importes en ARS se convierten a USD para el Resultado Neto.
    </p>
    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" :disable="!f.concepto.trim()" @click="guardar"/>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
const props = defineProps({ initial: { type: Object, default: null } })
const emit = defineEmits(['save', 'cancel'])
const f = reactive({
  concepto:     props.initial?.concepto || '',
  monto:        props.initial?.monto ?? '',
  moneda:       props.initial?.moneda || 'USD',
  periodicidad: props.initial?.periodicidad || 'anual',
  notas:        props.initial?.notas || '',
})
function guardar() {
  if (!f.concepto.trim()) return
  emit('save', { concepto: f.concepto.trim(), monto: parseFloat(f.monto) || 0, moneda: f.moneda, periodicidad: f.periodicidad, notas: f.notas })
}
</script>
