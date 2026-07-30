<template>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-bottom:6px;background:#fff">
    <div class="di-fila" style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap">
      <!-- Tirador para arrastrar (reordena dentro de la categoría) -->
      <span class="di-drag-handle" title="Arrastrar para reordenar dentro de la categoría"
        style="cursor:grab;color:#cbd5e1;font-size:15px;line-height:28px;flex-shrink:0;user-select:none;touch-action:none">⠿</span>

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

      <!-- ── SEGURO (especial: monto fijo o % del valor asegurado) ── -->
      <!-- Fila 1: sólo el selector de modalidad (+ campo USD/ha si es monto fijo).
           Los campos de % prima y rinde asegurado van en la Fila 2 (abajo). -->
      <template v-else-if="item.categoria==='seguro'">
        <select :value="param.modalidad || 'monto_fijo'" @change="onParam('modalidad',$event.target.value)" class="di-inp" style="width:170px;flex-shrink:0;padding:5px 6px;font-size:11px">
          <option value="monto_fijo">Monto fijo (USD/ha)</option>
          <option value="porcentaje">% del valor asegurado</option>
        </select>
        <div v-if="(param.modalidad||'monto_fijo')!=='porcentaje'" style="flex:1;min-width:90px">
          <input type="number" step="any" :value="param.valor" @input="onParam('valor',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px" placeholder="0"/>
          <span style="font-size:10px;color:#9ca3af">USD/ha</span>
        </div>
        <div v-else style="flex:1;min-width:20px"/>
      </template>

      <!-- ── COMERCIALIZACIÓN (especial: % corredor + % sellado + ARS/tn) ── -->
      <!-- Los 3 campos editables van en la Fila 2 (abajo), para que la fila
           principal no se amontone. Acá va el resumen de lo cargado. -->
      <template v-else-if="item.categoria==='comercializacion'">
        <div class="di-col-prod" style="flex:1;min-width:140px;padding-top:6px">
          <span style="font-size:11px;color:#6b7280">
            {{ fmtPorc(param.porcCorredor) }}% corredor + {{ fmtPorc(param.porcSellado) }}% sellado
            + {{ fmtNum(param.arsPorTn) }} ARS/tn
          </span>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px">
            sobre {{ fmtUSD(precioVentaTn) }}/tn × {{ fmtNum(rendTnHa) }} tn/ha · TC {{ fmtNum(tipoCambio) }}
          </div>
        </div>
      </template>

      <!-- ── LABORES (cosecha / flete / labor) ── -->
      <template v-else-if="esLabor">
        <div class="di-col-prod" style="flex:1;min-width:140px">
          <select :value="item.laborId || ''" @change="onLabor($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px">
            <option value="">— Elegí una labor —</option>
            <option v-for="l in laboresFiltradas" :key="l.id" :value="l.id">{{ l.nombre }}</option>
            <option value="__nuevo__">＋ Agregar al catálogo…</option>
          </select>
          <span v-if="sinVincular" style="display:inline-block;margin-top:3px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:0 7px;font-size:10px;font-weight:600">Sin vincular: {{ item.nombreManual || item.nombre }} (${{ fmtNum(item.costoHaUsd) }}/ha)</span>
        </div>
        <!-- cantidad: % / pasadas / nada según la labor -->
        <div v-if="laborSel && laborSel.esPorcentaje" class="di-col-num" style="width:88px;flex-shrink:0">
          <input type="number" step="any" :value="item.dosis" @input="onDosis($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right" placeholder="0"/>
          <span style="font-size:10px;color:#9ca3af">% del valor</span>
        </div>
        <div v-else-if="laborSel && (laborSel.unidadPrecio==='ha'||laborSel.unidadPrecio==='viaje'||laborSel.unidadPrecio==='unidad')" class="di-col-num" style="width:88px;flex-shrink:0">
          <input type="number" step="any" :value="item.dosis" @input="onDosis($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right" placeholder="1"/>
          <span style="font-size:10px;color:#9ca3af">{{ unidadDosisLabor(laborSel) }}</span>
        </div>
        <div v-else-if="laborSel" class="di-col-num" style="width:88px;flex-shrink:0;padding-top:5px">
          <span style="font-size:10px;color:#9ca3af">{{ unidadDosisLabor(laborSel) }}</span>
        </div>
        <div v-else class="di-col-num" style="width:88px;flex-shrink:0"/>
      </template>

      <!-- ── INSUMOS (semilla / fertilizante / fitosanitario / etc.) ── -->
      <template v-else>
        <div class="di-col-prod" style="flex:1;min-width:140px">
          <select :value="item.insumoId || ''" @change="onProducto($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px">
            <option value="">— Elegí un producto —</option>
            <option v-for="p in productos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            <option value="__nuevo__">＋ Agregar al catálogo…</option>
          </select>
          <span v-if="sinVincular" style="display:inline-block;margin-top:3px;background:#fffbeb;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:0 7px;font-size:10px;font-weight:600">Sin vincular: {{ item.nombreManual || item.nombre }} (${{ fmtNum(item.costoHaUsd) }}/ha)</span>
        </div>
        <div class="di-col-num" style="width:88px;flex-shrink:0">
          <input type="number" step="any" :value="item.dosis" @input="onDosis($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right" placeholder="0" :disabled="!item.insumoId"/>
          <span style="font-size:10px;color:#9ca3af">{{ unidadLabel || 'dosis' }}</span>
        </div>
        <!-- Precio manual (Contables): sugerido del catálogo, editable, se congela -->
        <div v-if="precioEditable && item.insumoId" class="di-col-num" style="width:88px;flex-shrink:0">
          <input type="number" step="any" :value="precioMostrado" @input="onPrecio($event.target.value)" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right" placeholder="0" title="Precio del insumo (editable para campañas históricas)"/>
          <span style="font-size:10px;color:#9ca3af">{{ precioLabel }}</span>
        </div>
      </template>

      <!-- Costo calculado -->
      <div class="di-col-costo" style="width:84px;flex-shrink:0;text-align:right;padding-top:5px">
        <b style="color:#2d5a27;font-size:13px">{{ fmtCosto(costo) }}</b>
        <div style="font-size:10px;color:#9ca3af">USD/ha</div>
      </div>

      <button @click="$emit('remove')" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:5px;cursor:pointer;color:#dc2626;font-size:14px;width:26px;height:26px;flex-shrink:0">×</button>
    </div>

    <!-- Fila 2: Comercialización → los 3 componentes, todos editables -->
    <div v-if="item.categoria==='comercializacion'" class="di-fila"
      style="display:flex;gap:12px;margin-top:8px;padding-left:32px;flex-wrap:wrap">
      <div class="di-col-num" style="flex:0 0 130px">
        <input type="number" step="any" :value="param.porcCorredor" @input="onParam('porcCorredor',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px;text-align:right" placeholder="0.50"/>
        <span style="font-size:10px;color:#9ca3af">% corredor</span>
      </div>
      <div class="di-col-num" style="flex:0 0 130px">
        <input type="number" step="any" :value="param.porcSellado" @input="onParam('porcSellado',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px;text-align:right" placeholder="0.07"/>
        <span style="font-size:10px;color:#9ca3af">% sellado bolsa</span>
      </div>
      <div class="di-col-num" style="flex:0 0 160px">
        <input type="number" step="any" :value="param.arsPorTn" @input="onParam('arsPorTn',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px;text-align:right" placeholder="850"/>
        <span style="font-size:10px;color:#9ca3af">ARS/tn representante</span>
      </div>
    </div>

    <!-- Fila 2: Seguro % del valor asegurado → % prima + rinde asegurado, con espacio -->
    <div v-if="item.categoria==='seguro' && (param.modalidad||'monto_fijo')==='porcentaje'"
      class="di-fila"
      style="display:flex;gap:12px;margin-top:8px;padding-left:32px;flex-wrap:wrap">
      <div style="flex:0 0 130px">
        <input type="number" step="any" :value="param.porcentaje" @input="onParam('porcentaje',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px;text-align:right" placeholder="0"/>
        <span style="font-size:10px;color:#9ca3af">% prima</span>
      </div>
      <div style="flex:0 0 150px">
        <input type="number" step="any" :value="param.rindeAsegurado" @input="onParam('rindeAsegurado',$event.target.value)" class="di-inp" style="padding:5px 8px;font-size:12px;text-align:right" placeholder="0"/>
        <span style="font-size:10px;color:#9ca3af">rinde aseg. (tn/ha)</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CATEGORIAS } from '../utils/constants'
import { CATEGORIA_A_FAMILIAS, LABOR_CATEGORIA_MAP, COMERCIALIZACION_DEFAULT, unidadDosisInsumo, unidadDosisLabor, calcularCostoItemHa } from '../utils/calculations'
import { fmtUSD, fmtNum } from '../utils/formatters'

const props = defineProps({
  item:           { type: Object, required: true },
  catalogo:       { type: Array,  default: () => [] },
  labores:        { type: Array,  default: () => [] },
  cultivosPrecio: { type: Object, default: () => ({}) },
  tipoCambio:     { type: Number, default: 1000 },
  rendimientoQq:  { type: [Number, String], default: 0 },
  precioVentaTn:  { type: [Number, String], default: 0 },
  precioEditable: { type: Boolean, default: false },   // Contables: precio manual por ítem
})
const emit = defineEmits(['update:item', 'remove', 'crear-insumo', 'crear-labor'])

const esLabor = computed(() => !!LABOR_CATEGORIA_MAP[props.item.categoria])
const param = computed(() => props.item.parametroEspecial || {})
// Rinde en tn/ha (el editor recibe qq/ha), para el detalle de comercialización.
const rendTnHa = computed(() => (parseFloat(props.rendimientoQq) || 0) / 10)
// Porcentajes con hasta 2 decimales: fmtNum redondea a 1 y mostraría 0,07 % como
// 0,1 %, tergiversando el valor que cargó el usuario.
const fmtPorc = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })
// En el editor, los ítems chicos (comercialización ~$11,50, seguro ~$24) pierden
// información con 0 decimales; se muestran 2 debajo de $100.
const fmtCosto = n => Math.abs(Number(n) || 0) < 100
  ? '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : fmtUSD(n)

const insumoSel = computed(() => props.catalogo.find(i => i.id === props.item.insumoId) || null)
const laborSel  = computed(() => props.labores.find(l => l.id === props.item.laborId) || null)
const unidadLabel = computed(() => unidadDosisInsumo(insumoSel.value))

// Precio manual efectivo por unidad de dosis (USD). Se muestra el guardado en el
// ítem; NO cae al catálogo (para no pisar precios históricos al editar).
const precioMostrado = computed(() =>
  (props.item.precioUnit != null && props.item.precioUnit !== '') ? props.item.precioUnit : '')
const precioLabel = computed(() => {
  if (!insumoSel.value) return 'precio'
  const unidad = unidadDosisInsumo(insumoSel.value).replace(/\/ha.*$/, '').replace(' (pasadas)', '') || 'u'
  return `USD/${unidad}`
})

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
  const patch = { categoria: cat, insumoId: null, laborId: null, nombreManual: '', dosis: '', precioUnit: '', modoEspecial: false, parametroEspecial: null }
  if (cat === 'arrendamiento') { patch.modoEspecial = true; patch.parametroEspecial = { modalidad: 'usd_ha', valor: 0, porcentaje: 0 } }
  else if (cat === 'seguro')   { patch.modoEspecial = true; patch.parametroEspecial = { modalidad: 'monto_fijo', valor: 0, porcentaje: 0, rindeAsegurado: 0 } }
  // Valores típicos como sugerencia; el usuario los edita libremente por ítem.
  else if (cat === 'comercializacion') { patch.modoEspecial = true; patch.parametroEspecial = { ...COMERCIALIZACION_DEFAULT } }
  emitChange(patch)
}
function onProducto(val) {
  if (val === '__nuevo__') { emit('crear-insumo', props.item.categoria); return }
  const insumo = props.catalogo.find(i => i.id === val)
  const patch = { insumoId: val || null, nombreManual: insumo ? insumo.nombre : props.item.nombreManual, unidadDosis: unidadDosisInsumo(insumo) }
  // Contables + ítem NUEVO: sugerir el precio efectivo (USD/unidad de dosis) del
  // catálogo actual, calculado con dosis=1. Editable; se congela al guardar.
  if (props.precioEditable) {
    patch.precioUnit = insumo
      ? calcularCostoItemHa({ insumoId: insumo.id, dosis: 1 }, props.catalogo, props.cultivosPrecio, props.tipoCambio, props.rendimientoQq, props.precioVentaTn, props.labores)
      : ''
  }
  emitChange(patch)
}
function onPrecio(val) { emitChange({ precioUnit: val }) }
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

<style scoped>
/* La clase `di-inp` no tiene CSS global en el proyecto: sin esto los <input> y
   <select> toman su ancho INTRÍNSECO del browser (~150px en un input number) e
   ignoran el contenedor de 88px, desbordándose ~63px y tapando la columna
   siguiente (dosis sobre el precio, o sobre el costo USD/ha en las labores).
   Con width:100% + border-box cada campo queda dentro de su columna. */
.di-fila input.di-inp,
.di-fila select.di-inp {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
/* Permite que flexbox encoja las columnas en vez de desbordarlas. */
.di-fila > * { min-width: 0; }

/* Mobile: stack predecible — el producto ocupa su propia línea completa, las
   columnas numéricas (dosis y precio) van de dos en dos, y el costo cierra
   abajo a la derecha. Así ningún campo se estira ni se solapa. */
@media (max-width: 560px) {
  .di-fila { gap: 8px 6px; }
  .di-fila > .di-col-prod { flex: 1 1 100% !important; min-width: 0 !important; }
  /* -7px cubre tanto el gap de 6px de la fila principal como el de 12px de las
     filas secundarias (seguro / comercialización): entran dos por línea. */
  .di-fila > .di-col-num  { flex: 1 1 calc(50% - 7px) !important; width: auto !important; }
  .di-fila > .di-col-costo { flex: 1 1 auto; text-align: right; }
}
</style>
