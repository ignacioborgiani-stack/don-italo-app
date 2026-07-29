<template>
  <div style="margin-top:28px">
    <div class="row items-center justify-between q-mb-md" style="flex-wrap:wrap;gap:10px">
      <div>
        <h3 style="font-size:16px;font-weight:700;margin:0;color:#2d5a27">Costos Fijos de Estructura</h3>
        <div style="font-size:12px;color:#6b7280;margin-top:3px">
          Costos de estructura para <b style="color:#2d5a27">📅 {{ main.campania }}</b> — globales de la empresa (no por lote).
        </div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn flat dense color="primary" icon="content_copy" :loading="copiando" label="Usar como plantilla" @click="copiarPlantilla"/>
        <q-btn unelevated dense color="primary" icon="add" label="Agregar costo fijo" @click="addModal()"/>
      </div>
    </div>
    <p v-if="msg" :style="{fontSize:'12px',margin:'0 0 10px',color: err ? '#dc2626' : '#166534'}">{{ msg }}</p>

    <div style="background:#fff;border:1px solid #d4cfc4;border-radius:10px;overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f0fdf4;color:#6b7280;font-size:11px;text-transform:uppercase">
              <th style="text-align:left;padding:8px 12px">Concepto</th>
              <th style="text-align:right;padding:8px 12px">Monto</th>
              <th style="text-align:left;padding:8px 12px">Periodicidad</th>
              <th style="text-align:right;padding:8px 12px">Anual (USD)</th>
              <th style="text-align:right;padding:8px 12px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!main.costosFijosActivos.length">
              <td colspan="5" style="padding:22px;text-align:center;color:#9ca3af">Sin costos fijos para esta campaña. Agregá uno o copiá los de la campaña anterior con "Usar como plantilla".</td>
            </tr>
            <tr v-for="cf in main.costosFijosActivos" :key="cf.id" style="border-top:1px solid #f0ede8">
              <td style="padding:8px 12px;font-weight:600">
                {{ cf.concepto }}
                <div v-if="cf.notas" style="font-size:11px;color:#9ca3af;font-weight:400">{{ cf.notas }}</div>
              </td>
              <td style="padding:8px 12px;text-align:right;white-space:nowrap">{{ fmtMonto(cf.monto) }} {{ cf.moneda }}</td>
              <td style="padding:8px 12px">{{ cf.periodicidad==='mensual' ? 'Mensual' : 'Anual' }}</td>
              <td style="padding:8px 12px;text-align:right;font-weight:600;color:#dc2626">{{ fmtUSD(annualUsd(cf)) }}</td>
              <td style="padding:8px 12px;text-align:right;white-space:nowrap">
                <button @click="editar(cf)" style="padding:3px 8px;background:#f0fdf4;border:1px solid #86efac;border-radius:5px;cursor:pointer;font-size:11px;color:#166534;margin-left:4px">Editar</button>
                <button @click="pedirBorrar(cf)" style="padding:3px 8px;background:#fff1f2;border:1px solid #fecaca;border-radius:5px;cursor:pointer;font-size:11px;color:#dc2626;margin-left:4px">×</button>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="main.costosFijosActivos.length">
            <tr style="border-top:2px solid #2d5a27;background:#fafaf9">
              <td colspan="3" style="padding:9px 12px;font-weight:800;color:#2d5a27">TOTAL ANUAL</td>
              <td style="padding:9px 12px;text-align:right;font-weight:800;color:#dc2626">{{ fmtUSD(main.costosFijosTotal) }}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    <p style="font-size:11px;color:#9ca3af;margin-top:8px">
      Para el Resultado Neto, los montos mensuales se anualizan (×12) y los ARS se convierten a USD al tipo de cambio actual ({{ fmtMonto(main.tipoCambio) }} ARS/USD).
    </p>

    <!-- Modal costo fijo -->
    <q-dialog v-if="modal" :model-value="true" @hide="modal=null">
      <q-card style="width:560px;max-width:95vw;border-radius:14px;padding:26px">
        <div class="row items-center justify-between q-mb-md">
          <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">{{ modal.edit ? 'Editar costo fijo' : 'Agregar costo fijo' }}</h2>
          <q-btn flat round dense icon="close" @click="modal=null"/>
        </div>
        <CostoFijoForm :initial="modal.item" @save="onSave" @cancel="modal=null"/>
      </q-card>
    </q-dialog>

    <!-- Confirmar borrado -->
    <q-dialog v-model="borrarOpen">
      <q-card style="width:340px;border-radius:12px;padding:24px;text-align:center">
        <p style="font-size:15px;font-weight:700;margin:0 0 6px">¿Eliminar?</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 18px">«{{ borrarTarget?.concepto }}» se eliminará de los costos fijos de la campaña.</p>
        <div class="row justify-center q-gutter-sm">
          <q-btn flat label="Cancelar" @click="borrarOpen=false"/>
          <q-btn unelevated color="negative" label="Eliminar" @click="confirmarBorrado"/>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMainStore } from '../stores/main'
import CostoFijoForm from './CostoFijoForm.vue'
import { costoFijoAnualUsd } from '../utils/calculations'
import { fmtUSD } from '../utils/formatters'

const main = useMainStore()

const fmtMonto  = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })
const annualUsd = cf => costoFijoAnualUsd(cf, main.tipoCambio)

const modal    = ref(null)
const msg      = ref('')
const err      = ref(false)
const copiando = ref(false)

const errorMsg = e => /schema cache|costos_fijos|does not exist|relation .* does not/i.test(e?.message || '')
  ? 'Falta crear la tabla: corré la migración 06 (supabase/migration_06_costos_fijos.sql) en Supabase → SQL Editor.'
  : (e?.message || 'No se pudo completar la acción.')

function addModal() { modal.value = { edit: false, item: null } }
function editar(cf) { modal.value = { edit: true, item: cf } }

async function onSave(form) {
  msg.value = ''
  try {
    if (modal.value.edit) await main.updCostoFijo(modal.value.item.id, form)
    else await main.addCostoFijo(form)
    modal.value = null
  } catch (e) { err.value = true; msg.value = errorMsg(e); modal.value = null }
}

async function copiarPlantilla() {
  copiando.value = true; msg.value = ''
  try { const n = await main.copiarCostosFijosDeAnterior(); err.value = false; msg.value = `Se copiaron ${n} costo(s) fijo(s) de la campaña anterior.` }
  catch (e) { err.value = true; msg.value = errorMsg(e) }
  finally { copiando.value = false }
}

const borrarOpen   = ref(false)
const borrarTarget = ref(null)
function pedirBorrar(cf) { borrarTarget.value = cf; borrarOpen.value = true }
async function confirmarBorrado() {
  await main.delCostoFijo(borrarTarget.value.id)
  borrarOpen.value = false
}
</script>
