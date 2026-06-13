<template>
  <div style="overflow-x:auto">
    <svg :width="W" :height="H" style="display:block;font-family:'DM Sans',sans-serif">
      <g v-for="t in ticks" :key="t">
        <line :x1="pL" :y1="sy(t)" :x2="W-pR" :y2="sy(t)" stroke="#f0ede8" stroke-width="1"/>
        <text :x="pL-6" :y="sy(t)+4" text-anchor="end" fill="#9ca3af" font-size="11">{{ t >= 1000 ? '$'+(t/1000).toFixed(0)+'k' : '$'+t }}</text>
      </g>
      <line :x1="pL" :y1="sy(0)" :x2="W-pR" :y2="sy(0)" stroke="#d1d5db" stroke-width="1"/>
      <g v-for="(d, i) in data" :key="i" style="cursor:pointer" @mouseenter="hov=i" @mouseleave="hov=null">
        <rect :x="gx(i)-bW-2" :y="sy(d.ingreso||0)" :width="bW" :height="((d.ingreso||0)/maxV)*inH" :fill="hov===i?'#166534':'#3a6b35'" rx="3"/>
        <rect :x="gx(i)+2"    :y="sy(d.costo||0)"   :width="bW" :height="((d.costo||0)/maxV)*inH"   :fill="hov===i?'#b91c1c':'#e05c3a'" rx="3"/>
        <text :x="gx(i)" :y="H-pB+16" text-anchor="middle" fill="#4b5563" font-size="11" :transform="`rotate(-35,${gx(i)},${H-pB+16})`">{{ d.name.length>12?d.name.slice(0,11)+'…':d.name }}</text>
        <template v-if="hov===i">
          <rect :x="Math.min(gx(i)+8,W-142)" :y="pT" width="134" height="64" fill="#fff" rx="7" stroke="#e5e7eb" stroke-width="1"/>
          <text :x="Math.min(gx(i)+18,W-132)" :y="pT+18" fill="#111" font-size="12" font-weight="bold">{{ d.name }}</text>
          <rect :x="Math.min(gx(i)+18,W-132)" :y="pT+27" width="8" height="8" fill="#3a6b35" rx="1"/>
          <text :x="Math.min(gx(i)+30,W-120)" :y="pT+35" fill="#374151" font-size="11">Ingreso: {{ fmtUSD(d.ingreso) }}/ha</text>
          <rect :x="Math.min(gx(i)+18,W-132)" :y="pT+44" width="8" height="8" fill="#e05c3a" rx="1"/>
          <text :x="Math.min(gx(i)+30,W-120)" :y="pT+52" fill="#374151" font-size="11">Costo: {{ fmtUSD(d.costo) }}/ha</text>
        </template>
      </g>
      <rect :x="pL" :y="H-16" width="10" height="10" fill="#3a6b35" rx="2"/>
      <text :x="pL+14" :y="H-7" fill="#374151" font-size="12">Ingreso/ha</text>
      <rect :x="pL+90" :y="H-16" width="10" height="10" fill="#e05c3a" rx="2"/>
      <text :x="pL+104" :y="H-7" fill="#374151" font-size="12">Costo/ha</text>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { fmtUSD } from '../../utils/formatters'

const props = defineProps({
  data:   { type: Array,  required: true },
  height: { type: Number, default: 370 },
})

const hov = ref(null)
const pL = 60, pR = 20, pT = 20, pB = 70

const iW   = computed(() => Math.max(props.data.length * 110, 380))
const W    = computed(() => iW.value + pL + pR)
const H    = computed(() => props.height)
const inH  = computed(() => H.value - pT - pB)
const maxV = computed(() => Math.max(...props.data.flatMap(d => [d.costo || 0, d.ingreso || 0]), 100))
const ts   = computed(() => Math.ceil(maxV.value / 5 / 50) * 50 || 50)
const ticks = computed(() => Array.from({ length: Math.ceil(maxV.value / ts.value) + 1 }, (_, i) => i * ts.value))
const bW   = computed(() => Math.min(26, (iW.value / props.data.length) * 0.32))

const sy  = v => pT + inH.value - (v / maxV.value) * inH.value
const gx  = i => pL + i * (iW.value / props.data.length) + (iW.value / props.data.length) / 2
</script>
