<template>
  <div style="overflow-x:auto">
    <svg :width="W" :height="H" style="display:block;font-family:'DM Sans',sans-serif">
      <line :x1="zX" :y1="pT" :x2="zX" :y2="H-pB" stroke="#9ca3af" stroke-dasharray="4,4" stroke-width="1"/>
      <template v-for="n in [-3,-2,-1,1,2,3]" :key="n">
        <template v-if="Math.abs(tStep*n) <= maxA*1.12">
          <line :x1="zX+tStep*n*sc" :y1="pT" :x2="zX+tStep*n*sc" :y2="H-pB" stroke="#f0ede8" stroke-width="1"/>
          <text :x="zX+tStep*n*sc" :y="H-pB+14" text-anchor="middle" fill="#9ca3af" font-size="10">{{ fmtUSD(tStep*n) }}</text>
        </template>
      </template>
      <text :x="zX" :y="H-pB+14" text-anchor="middle" fill="#9ca3af" font-size="10">$0</text>
      <g v-for="(d, i) in data" :key="i" style="cursor:pointer" @mouseenter="hov=i" @mouseleave="hov=null">
        <rect
          :x="d.margenHa>=0 ? zX : zX - Math.abs(d.margenHa)*sc"
          :y="pT + i*iH + (iH-bH)/2"
          :width="Math.max(Math.abs(d.margenHa||0)*sc, 2)"
          :height="bH"
          :fill="d.margenHa>=0 ? (getCultivoColor(d.cultivo)||'#3a6b35') : '#ef4444'"
          rx="3"
          :opacity="hov===null||hov===i?1:.65"
        />
        <text :x="pL-6" :y="pT+i*iH+iH/2+4" text-anchor="end" fill="#374151" font-size="12" :font-weight="hov===i?'bold':'normal'">{{ d.cultivo }}</text>
        <text
          v-if="Math.abs(d.margenHa||0)*sc > 36"
          :x="d.margenHa>=0 ? zX+Math.abs(d.margenHa)*sc-5 : zX-Math.abs(d.margenHa)*sc+5"
          :y="pT+i*iH+iH/2+4"
          :text-anchor="d.margenHa>=0?'end':'start'"
          fill="#fff" font-size="11" font-weight="bold"
        >{{ fmtUSD(d.margenHa) }}</text>
        <text
          v-else
          :x="d.margenHa>=0 ? zX+Math.abs(d.margenHa)*sc+5 : zX-Math.abs(d.margenHa)*sc-5"
          :y="pT+i*iH+iH/2+4"
          :text-anchor="d.margenHa>=0?'start':'end'"
          :fill="d.margenHa>=0?(getCultivoColor(d.cultivo)||'#3a6b35'):'#ef4444'"
          font-size="11" font-weight="bold"
        >{{ fmtUSD(d.margenHa) }}</text>
        <template v-if="hov===i">
          <rect :x="Math.min(zX+6,W-pR-140)" :y="pT+i*iH+iH/2-14" width="128" height="24" fill="#fff" rx="5" stroke="#e5e7eb" stroke-width="1"/>
          <text :x="Math.min(zX+14,W-pR-132)" :y="pT+i*iH+iH/2+2" fill="#374151" font-size="11">
            Margen: <tspan font-weight="bold" :fill="d.margenHa>=0?(getCultivoColor(d.cultivo)||'#3a6b35'):'#ef4444'">{{ fmtUSD(d.margenHa) }}/ha</tspan>
          </text>
        </template>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { fmtUSD } from '../../utils/formatters'
import { getCultivoColor } from '../../utils/constants'

const props = defineProps({
  data:   { type: Array,  required: true },
  height: { type: Number, default: 250 },
})

const hov = ref(null)
const pL = 104, pR = 70, pT = 10, pB = 30
const W  = 700

const maxA  = computed(() => Math.max(...props.data.map(d => Math.abs(d.margenHa || 0)), 1))
const H     = computed(() => Math.max(props.data.length * 46 + pT + pB, props.height))
const inW   = W - pL - pR
const zX    = pL + inW / 2
const sc    = computed(() => (inW / 2) / maxA.value)
const iH    = computed(() => (H.value - pT - pB) / props.data.length)
const bH    = computed(() => Math.min(26, iH.value * 0.62))
const tStep = computed(() => Math.ceil(maxA.value / 3 / 50) * 50 || 50)
</script>
