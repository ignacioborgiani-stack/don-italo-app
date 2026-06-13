<template>
  <div style="position:relative;display:inline-block" @mouseenter="tip=true" @mouseleave="tip=false">
    <div v-if="lote.tipoSiembra==='doble'" style="display:flex;flex-direction:column;gap:3px">
      <span v-for="{n,c} in dobleItems" :key="n" :style="{background:c+'22',color:c,border:`1px solid ${c}`,borderRadius:'999px',padding:'1px 8px',fontSize:'11px',fontWeight:700,whiteSpace:'nowrap'}">{{ n }}</span>
    </div>
    <span v-else :style="{background:col+'22',color:col,border:`1px solid ${col}`,borderRadius:'999px',padding:'2px 8px',fontSize:'11px',fontWeight:700}">{{ lote.cultivo?.nombre || '—' }}</span>

    <div v-if="tip && lote.tipoSiembra==='doble'" style="position:absolute;top:100%;left:0;z-index:200;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:200px;font-size:12px;margin-top:4px">
      <p style="font-weight:700;color:#166534;margin-bottom:6px">🌾☀️ Doble cultivo</p>
      <p>{{ lote.cultivoInvernal?.nombre }}: costo <b style="color:#dc2626">{{ fmtUSD(calc.inv?.costoHa||0) }}/ha</b></p>
      <p>{{ lote.cultivoEstival?.nombre }}: costo <b style="color:#dc2626">{{ fmtUSD(calc.est?.costoHa||0) }}/ha</b></p>
      <div style="border-top:1px solid #e5e7eb;margin-top:6px;padding-top:6px;font-weight:700">Total: {{ fmtUSD(calc.costoHa) }}/ha</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getCultivoColor } from '../utils/constants'
import { calcLote } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const props = defineProps({ lote: Object })
const tip   = ref(false)
const col   = computed(() => getCultivoColor(props.lote.cultivo?.nombre))
const calc  = computed(() => calcLote(props.lote))
const dobleItems = computed(() => [
  { n: props.lote.cultivoInvernal?.nombre, c: getCultivoColor(props.lote.cultivoInvernal?.nombre) },
  { n: props.lote.cultivoEstival?.nombre,  c: getCultivoColor(props.lote.cultivoEstival?.nombre) },
])
</script>
