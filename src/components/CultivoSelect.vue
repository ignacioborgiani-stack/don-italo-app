<template>
  <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" class="di-inp">
    <optgroup v-if="tipo !== 'estival'" label="🌾 Invernales">
      <option v-for="c in CULTIVARES_INVERNALES" :key="c.nombre">{{ c.nombre }}</option>
    </optgroup>
    <optgroup v-if="tipo !== 'invernal'" label="☀️ Estivales">
      <option v-for="c in CULTIVARES_ESTIVALES" :key="c.nombre">{{ c.nombre }}</option>
    </optgroup>
  </select>
</template>

<script setup>
import { CULTIVARES_INVERNALES, CULTIVARES_ESTIVALES } from '../utils/constants'
defineProps({ modelValue: String, tipo: { type: String, default: 'simple' } })
defineEmits(['update:modelValue'])
</script>
