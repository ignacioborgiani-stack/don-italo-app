<template>
  <div style="position:relative;display:inline-block" :style="{width:width+'px',height:height+'px'}">
    <svg :width="width" :height="height">
      <path
        v-for="(s, i) in slices" :key="i"
        :d="s.path" :fill="s.color"
        :transform="`translate(${hov===i?(Math.cos(s.mid)*5).toFixed(1):0},${hov===i?(Math.sin(s.mid)*5).toFixed(1):0})`"
        :style="{cursor:'pointer',transition:'transform .1s',opacity:hov!==null&&hov!==i?.65:1}"
        @mouseenter="hov=i" @mouseleave="hov=null"
      />
    </svg>
    <div v-if="$slots.default" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">
      <slot />
    </div>
    <div v-if="hov!==null" style="position:absolute;top:6px;right:-8px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:7px 11px;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,.12);pointer-events:none;z-index:20;white-space:nowrap">
      <div style="font-weight:700;margin-bottom:2px">{{ slices[hov].name }}</div>
      <div>{{ tooltipFmt ? tooltipFmt(parseFloat(slices[hov].value)) : parseFloat(slices[hov].value).toLocaleString('es-AR') + ' ha' }}</div>
      <div style="color:#6b7280;font-size:11px">{{ (slices[hov].frac * 100).toFixed(1) }}%</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data:       { type: Array,  required: true },
  width:      { type: Number, default: 310 },
  height:     { type: Number, default: 230 },
  innerR:     { type: Number, default: 64 },
  outerR:     { type: Number, default: 104 },
  tooltipFmt: { type: Function, default: null },
})

const hov = ref(null)

const slices = computed(() => {
  const cx = props.width / 2, cy = props.height / 2
  const total = props.data.reduce((s, d) => s + (parseFloat(d.value) || 0), 0)
  if (!total) return []
  const gap = props.data.length > 1 ? 0.03 : 0
  let a = -Math.PI / 2
  return props.data.map(d => {
    const frac = (parseFloat(d.value) || 0) / total
    const sa = a + gap / 2, ea = a + frac * 2 * Math.PI - gap / 2, mid = (sa + ea) / 2
    a += frac * 2 * Math.PI
    const P = (r, ang) => `${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`
    const lg = frac > 0.5 ? 1 : 0
    const path = `M${P(props.outerR,sa)}A${props.outerR},${props.outerR},0,${lg},1,${P(props.outerR,ea)}L${P(props.innerR,ea)}A${props.innerR},${props.innerR},0,${lg},0,${P(props.innerR,sa)}Z`
    return { ...d, path, frac, mid }
  })
})
</script>
