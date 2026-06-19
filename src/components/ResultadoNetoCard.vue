<template>
  <div style="background:#fff;border:1px solid #d4cfc4;border-radius:12px;padding:18px 22px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
    <p style="font-size:11px;color:#6b7280;margin:0 0 12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">{{ titulo }}</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:13px;color:#374151">Resultado bruto</span>
        <b :style="{fontSize:'15px',color: bruto>=0 ? '#3a6b35' : '#dc2626'}">{{ fmtK(bruto) }}</b>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:13px;color:#374151">− Costos fijos de estructura</span>
        <b style="font-size:15px;color:#dc2626">{{ fmtK(costosFijos) }}</b>
      </div>
      <div style="border-top:1px solid #e5e7eb;margin-top:2px;padding-top:9px;display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:13px;font-weight:700;color:#111827">= Resultado neto</span>
        <b :style="{fontSize:'21px',fontWeight:800,color: neto>=0 ? '#3a6b35' : '#dc2626'}">{{ fmtK(neto) }}</b>
      </div>
    </div>
    <p v-if="!costosFijos" style="font-size:10px;color:#9ca3af;margin:10px 0 0">
      Sin costos fijos cargados para la campaña — cargalos en <b>Catálogo → Costos Fijos</b>.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtK } from '../utils/formatters'

const props = defineProps({
  bruto:       { type: Number, default: 0 },
  costosFijos: { type: Number, default: 0 },
  titulo:      { type: String, default: 'Resultado Neto' },
})
const neto = computed(() => props.bruto - props.costosFijos)
</script>
