<template>
  <div class="di-costo-kg" :title="TIP_COSTO_KG">
    <p class="di-lbl" style="margin:0">Costo en kilos</p>
    <template v-if="valor.sin != null">
      <p style="font-weight:800;font-size:15px;color:#2d5a27;line-height:1.15;margin:2px 0 0">
        {{ fmtKg(valor.sin) }} <span style="font-weight:600;font-size:11px;color:#6b7280">kg/ha</span>
      </p>
      <p style="font-size:11px;color:#374151;margin:1px 0 0">
        <template v-if="valor.con != null">{{ fmtKg(valor.con) }} c/alq</template>
        <template v-else>— c/alq</template>
      </p>
    </template>
    <template v-else>
      <p style="font-weight:800;font-size:15px;color:#9ca3af;line-height:1.15;margin:2px 0 0">—</p>
      <p style="font-size:10px;color:#b45309;margin:1px 0 0;line-height:1.25">{{ valor.mensaje }}</p>
    </template>
  </div>
</template>

<script setup>
// Rinde de indiferencia expresado en kg/ha, sin alquiler y con alquiler.
//
// Sale de `indicadoresCultivo`, el MISMO que usan el Dashboard, Contables y
// Proyectados, así que los números coinciden exacto. Acá no hay fórmula nueva.
//
// La tasa de costo variable por tonelada se obtiene con la sonda
// (costoVariableTnDe) en vez de dividir por el rinde, así el indicador no
// depende del rinde cargado y sigue siendo correcto con rinde 0 (I4).
import { computed } from 'vue'
import { useCatalogoStore } from '../stores/catalogo'
import { useMainStore } from '../stores/main'
import { indicadoresCultivo, costoVariableTnDe, calcularCostoItemHa, factorItem,
         esItemVariableTn, esAlquilerVariable } from '../utils/calculations'

const TIP_COSTO_KG = 'Kilos de grano por ha que pagan los costos, valuando cada kilo al precio neto de gastos de cosecha, flete, comercialización y canon'

const props = defineProps({
  cultivoObj: { type: Object, required: true },
  haLote:     { type: [Number, String], default: 0 },
  // null = deducir el alquiler de los ítems 'arrendamiento' del propio cultivo.
  // En Contables el padre pasa el del CONTRATO del lote, que manda cuando
  // existe (mismo criterio que el modal Ver de LotesPage).
  alquilerHa:         { type: Number, default: null },
  alquilerVariableTn: { type: Number, default: null },
})

const catStore = useCatalogoStore()
const main = useMainStore()

const ctxTn = computed(() => ({
  catalogo: catStore.items, labores: catStore.labores,
  cultivosPrecio: main.cultivosPrecio, tipoCambio: main.tipoCambio,
}))
const items = () => props.cultivoObj?.itemsCosto || []
const factorDeItem = it => factorItem(it, props.cultivoObj?.etapas, props.haLote)
// Suma EN VIVO (no el costo congelado): el indicador acompaña lo que se edita.
const sumaHa = filtro => items().filter(filtro).reduce((s, it) => {
  const v = calcularCostoItemHa(it, catStore.items, main.cultivosPrecio, main.tipoCambio,
    props.cultivoObj?.rendimientoQq, props.cultivoObj?.precioVentaTn, catStore.labores)
  return s + (v === null ? 0 : v * factorDeItem(it))
}, 0)

const valor = computed(() => {
  const c = props.cultivoObj || {}
  const rindeTn = (parseFloat(c.rendimientoQq) || 0) / 10
  const alqPropio = props.alquilerHa == null
  const alquilerHa = alqPropio ? sumaHa(it => it.categoria === 'arrendamiento') : props.alquilerHa
  const alquilerVariableTn = alqPropio
    ? costoVariableTnDe(c, ctxTn.value, factorDeItem, esAlquilerVariable)
    : (props.alquilerVariableTn || 0)
  const ind = indicadoresCultivo({
    costoSinAlqHa: sumaHa(it => it.categoria !== 'arrendamiento'),
    alquilerHa,
    // Parte variable en USD/ha al rinde actual. Un alquiler de quintales fijos
    // tiene tasa 0 y entra entero como fijo, que es lo correcto.
    alquilerVariableHa: Math.min((alquilerVariableTn || 0) * rindeTn, alquilerHa || 0),
    costoVariableHa: sumaHa(esItemVariableTn),
    precioTn: c.precioVentaTn,
    rindeQq: c.rendimientoQq,
    costoVariableTn: costoVariableTnDe(c, ctxTn.value, factorDeItem),
    alquilerVariableTn,
  })
  return {
    sin: ind.rindeIndifSinKg,
    con: ind.rindeIndifConKg,
    mensaje: !(parseFloat(c.precioVentaTn) > 0) ? 'Cargá el precio de venta' : (ind.mensajeSinRinde || '—'),
  }
})
const fmtKg = n => Math.round(n).toLocaleString('es-AR')
</script>

<style scoped>
.di-costo-kg {
  flex: 1 1 165px;
  min-width: 155px;
  margin-left: auto;
  align-self: stretch;
  background: #f9fafb;
  border: 1px solid #eef0f2;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: help;
}
</style>
