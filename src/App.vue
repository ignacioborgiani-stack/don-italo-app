<template>
  <div v-if="auth.loading" style="min-height:100vh;background:#f5f2ea;display:flex;align-items:center;justify-content:center">
    <div style="text-align:center">
      <div style="font-size:48px;margin-bottom:12px">🌾</div>
      <div style="font-size:14px;color:#6b7280">Cargando Don Italo…</div>
    </div>
  </div>
  <router-view v-else />
</template>

<script setup>
import { useAuthStore } from './stores/auth'
const auth = useAuthStore()
</script>
