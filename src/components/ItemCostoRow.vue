<template>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-bottom:6px;background:#fff">
    <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap">
      <!-- Categoría -->
      <select :value="item.categoria" @change="onCategoria($event.target.value)" class="di-inp" style="width:120px;flex-shrink:0;padding:5px 6px;font-size:11px">
        <option v-for="c in CATEGORIAS" :key="c.key" :value="c.key">{{ c.e }} {{ c.label }}</option>
      </select>

      <!-- ── ARRENDAMIENTO (especial manual) ── -->
      <template v-if="item.categoria==='arrendamiento'">
        <select :value="param.modalidad" @change="onParam('modalidad',$event.target.value)" class="di-inp" style="width:130px;flex-shrink:0;padding:5px 6px;font-size:11px">
          <option value="usd_ha">USD/ha fijo</option>
          <option value="qq_soja">qq soja equiv.</option>
          <option value="porc_grano">% del grano</option>
        </select>
        <div style="flex:1;min-width:90px">
          <input v-if="param.modalidad==='porc_grano'" type="number" step="any" :value="param.porcentaje" @input="onParam('porcentaje',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px" placeholder="0"/>
          <input v-else type="number" step="any" :value="param.valor" @input="onParam('valor',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px" placeholder="0"/>
          <span style="font-size:10px;color:#9ca3af">{{ param.modalidad==='usd_ha' ? 'USD/ha' : param.modalidad==='qq_soja' ? 'qq soja/ha' : '% grano' }}</span>
        </div>
      </template>

      <!-- ── LABORES (cosecha / flete / labor / seguro) ── -->
      <template v-else-if="esLabor">
        <div style="flex:1;min-width:140px">
          <select :value="item.laborId || ''" @change="onLabor($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px">
            <option value="">— Elegí una labor —</option>
            <option v-for="l in laboresFiltradas" :key="l.id" :value="l.id">{{ l.nombre }}</option>
            <option value="__nuevo__">＋ Agregar al catálogo…</option>
          </select>
          <span v-if="sinVincular" style="display:inline-block;margin-top:3px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:0 7px;font-size:10px;font-weight:600">Sin vincular: {{ item.nombreManual || item.nombre }} (${{ fmtNum(item.costoHaUsd) }}/ha)</span>
        </div>
        <!-- cantidad: % / pasadas / nada según la labor -->
        <div v-if="laborSel && laborSel.esPorcentaje" style="width:88px;flex-shrink:0">
          <input type="number" step="any" :value="item.dosis" @input="onDosis($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right" placeholder="0"/>
          <span style="font-size:10px;color:#9ca3af">% del valor</span>
        </div>
        <div v-else-if="laborSel && (laborSel.unidadPrecio==='ha'||laborSel.unidadPrecio==='viaje'||laborSel.unidadPrecio==='unidad')" style="width:88px;flex-shrink:0">
          <input type="number" step="any" :value="item.dosis" @input="onDosis($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right" placeholder="1"/>
          <span style="font-size:10px;color:#9ca3af">{{ unidadDosisLabor(laborSel) }}</span>
        </div>
        <div v-else-if="laborSel" style="width:88px;flex-shrink:0;padding-top:5px">
          <span style="font-size:10px;color:#9ca3af">{{ unidadDosisLabor(laborSel) }}</span>
        </div>
        <div v-else style="width:88px;flex-shrink:0"/>
      </template>

      <!-- ── INSUMOS (semilla / fertilizante / fitosanitario / etc.) ── -->
      <template v-else>
        <div style="flex:1;min-width:140px">
          <select :value="item.insumoId || ''" @change="onProducto($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px">
            <option value="">— Elegí un producto —</option>
            <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            <option value="__nuevo__">＋ Agregar al catálogo…</option>
          </select>
          <span v-if="sinVincular" style="display:inline-block;margin-top:3px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:0 7px;font-size:10px;font-weight:600">Sin vincular: {{ item.nombreManual || item.nombre }} (${{ fmtNum(item.costoHaUsd) }}/ha)</span>
        </div>
        <div style="width:88px;flex-shrink:0">
          <input type="number" step="any" :value="item.dosis" @input="onDosis($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right" placeholder="0" :disabled="!item.insumoId"/>
          <span style="font-size:10px;color:#9ca3af">{{ unidadLabel || 'dosis' }}</span>
        </div>
      </template>

      <!-- Costo calculado -->
      <div style="width:84px;flex-shrink:0;text-align:right;padding-top:5px">
        <b style="color:#2d5a27;font-size:13px">{{ fmtUSD(costo) }}</b>
        <div style="font-size:10px;color:#9ca3af">USD/ha</div>
      </div>

      <button @click="$emit('remove')" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:5px;cursor:pointer;color:#dc2626;font-size:14px;width:26px;height:26px;flex-shrink:0">×</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CATEGORIAS } from '../utils/constants'
import { CATEGORIA_A_FAMILIAS, LABOR_CATEGORIA_MAP, unidadDosisInsumo, unidadDosisLabor, calcularCostoItemHa } from '../utils/calculations'
import { fmtUSD, fmtNum } from '../utils/formatters'

const props = defineProps({
  item:           { type: Object, required: true },
  catalogo:       { type: Array,  default: () => [] },
  labores:        { type: Array,  default: () => [] },
  cultivosPrecio: { type: Object, default: () => ({}) },
  tipoCambio:     { type: Number, default: 1000 },
  rendimientoQq:  { type: [Number, String], default: 0 },
  precioVentaTn:  { type: [Number, String], default: 0 },
})
const emit = defineEmits(['update:item', 'remove', 'crear-insumo', 'crear-labor'])

const esLabor = computed(() => !!LABOR_CATEGORIA_MAP[props.item.categoria])
const param = computed(() => props.item.parametroEspecial || {})

const insumoSel = computed(() => props.catalogo.find(i => i.id === props.item.insumoId) || null)
const laborSel  = computed(() => props.labores.find(l => l.id === props.item.laborId) || null)
const unidadLabel = computed(() => unidadDosisInsumo(insumoSel.value))

const sinVincular = computed(() =>
  !props.item.insumoId && !props.item.laborId && !props.item.modoEspecial &&
  props.item.categoria !== 'arrendamiento' &&
  (props.item.costoHaUsd != null && props.item.costoHaUsd !== '')
)

const productos = computed(() => {
  const fams = CATEGORIA_A_FAMILIAS[props.item.categoria]
  return props.catalogo.filter(i => i.activo !== false).filter(i => fams == null ? true : fams.includes(i.familia))
})
const laboresFiltradas = computed(() => {
  const cats = LABOR_CATEGORIA_MAP[props.item.categoria] || []
  return props.labores.filter(l => l.activo !== false && cats.includes(l.categoria))
})

const costo = computed(() => calcularCostoItemHa(
  props.item, props.catalogo, props.cultivosPrecio, props.tipoCambio, props.rendimientoQq, props.precioVentaTn, props.labores
))

function recompute(it) {
  return { ...it, costoHaCalculado: calcularCostoItemHa(it, props.catalogo, props.cultivosPrecio, props.tipoCambio, props.rendimientoQq, props.precioVentaTn, props.labores) }
}
function emitChange(patch) { emit('update:item', recompute({ ...props.item, ...patch })) }

function onCategoria(cat) {
  const patch = { categoria: cat, insumoId: null, laborId: null, nombreManual: '', dosis: '', modoEspecial: false, parametroEspecial: null }
  if (cat === 'arrendamiento') { patch.modoEspecial = true; patch.parametroEspecial = { modalidad: 'usd_ha', valor: 0, porcentaje: 0 } }
  emitChange(patch)
}
function onProducto(val) {
  if (val === '__nuevo__') { emit('crear-insumo', props.item.categoria); return }
  const insumo = props.catalogo.find(i => i.id === val)
  emitChange({ insumoId: val || null, nombreManual: insumo ? insumo.nombre : props.item.nombreManual, unidadDosis: unidadDosisInsumo(insumo) })
}
function onLabor(val) {
  if (val === '__nuevo__') { emit('crear-labor', props.item.categoria); return }
  const labor = props.labores.find(l => l.id === val)
  let dosis = props.item.dosis
  if (labor) {
    if (labor.esPorcentaje) dosis = labor.porcentaje ?? 8
    else if (labor.unidadPrecio === 'ha') dosis = props.item.dosis || 1
    else dosis = ''
  }
  emitChange({ laborId: val || null, nombreManual: labor ? labor.nombre : props.item.nombreManual, dosis })
}
function onDosis(val) { emitChange({ dosis: val }) }
function onParam(k, v) { emitChange({ parametroEspecial: { ...param.value, [k]: v } }) }
</script>
