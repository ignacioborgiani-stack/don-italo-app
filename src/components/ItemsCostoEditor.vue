<template>
  <div>
    <div class="row items-center justify-between q-mb-sm">
      <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Ítems de costo (USD/ha)</span>
      <q-btn flat dense size="sm" color="primary" label="+ Agregar" @click="add" style="border:1px solid #3a6b35;border-radius:5px;font-size:12px"/>
    </div>
    <p v-if="!items.length" style="font-size:12px;color:#9ca3af;text-align:center;padding:8px 0">Sin ítems. Clic en "+ Agregar"</p>
    <div v-for="(it, i) in items" :key="i" class="row q-gutter-xs q-mb-xs items-center">
      <div style="width:128px;flex-shrink:0">
        <select :value="it.categoria" @change="upd(i,'categoria',$event.target.value)" class="di-inp" style="padding:5px 6px;font-size:11px">
          <option v-for="c in CATEGORIAS" :key="c.key" :value="c.key">{{ c.e }} {{ c.label }}</option>
        </select>
      </div>
      <div style="flex:1;min-width:80px">
        <input :value="it.nombre" @input="upd(i,'nombre',$event.target.value)" placeholder="Descripción…" class="di-inp" style="padding:5px 8px;font-size:12px"/>
      </div>
      <div style="width:80px;flex-shrink:0">
        <input type="number" :value="it.costoHaUsd" @input="upd(i,'costoHaUsd',$event.target.value)" placeholder="0" class="di-inp" style="padding:5px 6px;font-size:12px;text-align:right"/>
      </div>
      <button @click="del(i)" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:5px;cursor:pointer;color:#dc2626;font-size:14px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0">×</button>
    </div>
    <div v-if="items.length" style="text-align:right;font-size:12px;color:#374151;margin-top:4px">
      Total: <b style="color:#dc2626">{{ fmtUSD(total) }}/ha</b>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CATEGORIAS } from '../utils/constants'
import { fmtUSD } from '../utils/formatters'

const props  = defineProps({ items: { type: Array, required: true } })
const emit   = defineEmits(['update:items'])

const total  = computed(() => props.items.reduce((s, i) => s + (parseFloat(i.costoHaUsd) || 0), 0))

function add()           { emit('update:items', [...props.items, { categoria: 'semilla', nombre: '', costoHaUsd: '' }]) }
function del(i)          { emit('update:items', props.items.filter((_, idx) => idx !== i)) }
function upd(i, k, v)   { emit('update:items', props.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it)) }
</script>

<style>
.di-inp {
  width: 100%;
  padding: 7px 10px;
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  font-size: 13px;
  outline: none;
  background: #fff;
  font-family: 'DM Sans', system-ui, sans-serif;
}
</style>
