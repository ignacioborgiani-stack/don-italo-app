<template>
  <div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div style="grid-column:span 2">
        <label class="di-lbl">Nombre</label>
        <input v-model="f.nombre" placeholder="ej: Urea granulada" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Tipo</label>
        <select v-model="f.tipo" class="di-inp">
          <option v-for="t in TIPOS_ST.slice(1)" :key="t">{{ t }}</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Ubicación</label>
        <select v-model="f.ubicacion" class="di-inp">
          <option v-for="u in UBICS" :key="u.key" :value="u.key">{{ u.label }}</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Cantidad</label>
        <input v-model="f.cantidad" type="number" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Unidad</label>
        <select v-model="f.unidad" class="di-inp">
          <option v-for="u in UNIDADES" :key="u">{{ u }}</option>
        </select>
      </div>
      <div>
        <label class="di-lbl">Precio unitario</label>
        <div style="display:flex;gap:4px">
          <select v-model="f.precioMoneda" style="width:70px;flex-shrink:0;padding:7px 4px" class="di-inp">
            <option>ARS</option><option>USD</option>
          </select>
          <input v-model="f.precioUnitario" type="number" class="di-inp" placeholder="0"/>
        </div>
      </div>
      <div>
        <label class="di-lbl">Total</label>
        <div class="di-inp" style="background:#f9fafb;font-weight:700;color:#3a6b35">{{ fmtUSD(totalVal(f)) }}</div>
      </div>
      <div>
        <label class="di-lbl">Proveedor</label>
        <input v-model="f.proveedor" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">Lote (opcional)</label>
        <input v-model="f.lote" list="lotes-dl" class="di-inp"/>
        <datalist id="lotes-dl">
          <option v-for="l in lotesUnicos" :key="l" :value="l"/>
        </datalist>
      </div>
      <div>
        <label class="di-lbl">Fecha</label>
        <input v-model="f.fecha" type="date" class="di-inp"/>
      </div>
      <div>
        <label class="di-lbl">N° remito</label>
        <input v-model="f.remito" placeholder="F-0123" class="di-inp"/>
      </div>
      <div style="grid-column:span 2">
        <label class="di-lbl">Notas</label>
        <textarea v-model="f.notas" rows="2" class="di-inp" style="resize:vertical"/>
      </div>
    </div>
    <div class="row justify-end q-gutter-sm">
      <q-btn flat label="Cancelar" @click="$emit('cancel')"/>
      <q-btn unelevated color="primary" label="Guardar" @click="$emit('save', f)"/>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { TIPOS_ST, UNIDADES, UBICS } from '../utils/constants'
import { fmtUSD } from '../utils/formatters'
import { totalVal } from '../utils/calculations'

const props = defineProps({ initial: Object, lotesUnicos: Array })
defineEmits(['save', 'cancel'])

const emptyStock = () => ({
  nombre: '', tipo: 'Fertilizante', cantidad: '', unidad: 'kg',
  precioUnitario: '', precioMoneda: 'ARS', precioUnidadPrecio: '',
  proveedor: '', ubicacion: 'insumera', lote: '', campana: '2024/25',
  fecha: new Date().toISOString().slice(0, 10), remito: '', notas: '',
})

const f = reactive(props.initial ? { ...emptyStock(), ...props.initial } : emptyStock())
</script>
