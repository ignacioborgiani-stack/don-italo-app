<template>
  <div>
    <!-- ── LISTA de contratos históricos ── -->
    <template v-if="vista==='lista'">
      <p style="font-size:12px;color:#6b7280;margin:0 0 12px">
        Contratos de alquiler del lote (histórico). Cada uno cubre un rango de campañas; los rangos no pueden superponerse.
      </p>

      <div v-if="!contratos.length" style="background:#f9fafb;border:1px dashed #d4cfc4;border-radius:10px;padding:20px;text-align:center;color:#9ca3af;font-size:13px">
        Este lote todavía no tiene contratos. Agregá el primero con <b>“+ Nuevo contrato”</b>.
      </div>

      <div v-for="ct in contratos" :key="ct.id"
        style="border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-size:14px;color:#1f2937;font-weight:700">
            {{ ct.campanaInicio || '—' }} → {{ ct.campanaFin || '—' }}
            <span v-if="esVigente(ct)" style="margin-left:6px;background:#f0fdf4;color:#166534;border:1px solid #86efac;border-radius:999px;padding:1px 9px;font-size:10px;font-weight:700">Vigente</span>
          </div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">{{ resumen(ct) }} · ref. {{ ct.cultivoReferencia || '—' }}</div>
        </div>
        <div class="q-gutter-xs">
          <q-btn flat dense size="sm" color="primary" icon="edit" label="Editar" @click="editar(ct)"/>
          <q-btn flat dense size="sm" color="grey-7" icon="delete_outline" @click="borrarTarget=ct"><q-tooltip>Eliminar</q-tooltip></q-btn>
        </div>
      </div>

      <div class="row items-center justify-between q-mt-md">
        <q-btn unelevated color="primary" icon="add" label="Nuevo contrato" @click="nuevo"/>
        <q-btn flat label="Cerrar" @click="$emit('close')"/>
      </div>
    </template>

    <!-- ── FORM (crear / editar) ── -->
    <template v-else>
      <div style="font-size:12px;color:#2d5a27;font-weight:600;cursor:pointer;margin-bottom:10px" @click="vista='lista'">← Volver a la lista</div>
      <ContratoAlquilerForm :lote="lote" :initial="editing" @save="vista='lista'" @cancel="vista='lista'"/>
    </template>

    <!-- confirmar eliminación -->
    <q-dialog v-if="borrarTarget" :model-value="true" @hide="borrarTarget=null">
      <q-card style="width:380px;border-radius:12px;padding:24px;text-align:center">
        <q-icon name="delete_outline" size="26px" color="negative"/>
        <p style="font-size:15px;font-weight:700;margin:8px 0 6px">Eliminar contrato</p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:16px">
          Vas a eliminar el contrato <b>{{ borrarTarget.campanaInicio }} → {{ borrarTarget.campanaFin }}</b>. No se puede deshacer.
        </p>
        <div class="row justify-center q-gutter-sm">
          <q-btn flat label="Cancelar" @click="borrarTarget=null"/>
          <q-btn unelevated color="negative" label="Eliminar" :loading="borrando" @click="confirmarBorrar"/>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '../stores/main'
import { fmtNum } from '../utils/formatters'
import ContratoAlquilerForm from './ContratoAlquilerForm.vue'

const props = defineProps({ lote: { type: Object, required: true } })
defineEmits(['close'])

const main = useMainStore()
const contratos = computed(() => main.contratosDeLote(props.lote.id))
const vigente = computed(() => main.contratoVigente(props.lote.id, main.campania))
const esVigente = ct => vigente.value?.id === ct.id
const resumen = ct => ct.tipoContrato === 'quintales_fijos'
  ? `${fmtNum(ct.cantidad)} qq/ha`
  : `${fmtNum(ct.cantidad)}% de la cosecha`

const vista = ref('lista')   // 'lista' | 'form'
const editing = ref(null)
function nuevo()      { editing.value = null; vista.value = 'form' }
function editar(ct)   { editing.value = ct;   vista.value = 'form' }

const borrarTarget = ref(null)
const borrando = ref(false)
async function confirmarBorrar() {
  borrando.value = true
  try { await main.delContratoAlquiler(borrarTarget.value.id); borrarTarget.value = null }
  finally { borrando.value = false }
}
</script>
