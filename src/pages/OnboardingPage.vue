<template>
  <div style="min-height:100vh;background:#f5f2ea;display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="width:100%;max-width:520px;text-align:center">

      <div style="font-size:52px;margin-bottom:12px">🌾</div>
      <h1 style="font-size:24px;font-weight:800;color:#2d5a27;margin:0 0 6px">¡Bienvenido, {{ nombre }}!</h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 32px">Tu cuenta está lista. ¿Cómo querés empezar?</p>

      <div style="display:grid;gap:16px">

        <!-- Demo -->
        <div @click="cargarDemo"
          style="background:#fff;border:2px solid #3a6b35;border-radius:14px;padding:24px;cursor:pointer;text-align:left;transition:box-shadow .15s"
          @mouseenter="e => e.currentTarget.style.boxShadow='0 4px 16px rgba(58,107,53,.18)'"
          @mouseleave="e => e.currentTarget.style.boxShadow='none'"
        >
          <div style="font-size:28px;margin-bottom:8px">📊</div>
          <div style="font-weight:700;font-size:16px;color:#1f2937;margin-bottom:4px">Cargar datos de ejemplo</div>
          <div style="font-size:13px;color:#6b7280">Carga lotes, stocks y proyecciones de muestra para ver cómo funciona la app antes de ingresar tus propios datos.</div>
          <div v-if="cargando" style="margin-top:12px;font-size:13px;color:#3a6b35;font-weight:600">Cargando datos… por favor esperá.</div>
        </div>

        <!-- Vacío -->
        <div @click="empezarVacio"
          style="background:#fff;border:2px solid #d4cfc4;border-radius:14px;padding:24px;cursor:pointer;text-align:left;transition:box-shadow .15s"
          @mouseenter="e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'"
          @mouseleave="e => e.currentTarget.style.boxShadow='none'"
        >
          <div style="font-size:28px;margin-bottom:8px">✏️</div>
          <div style="font-weight:700;font-size:16px;color:#1f2937;margin-bottom:4px">Empezar desde cero</div>
          <div style="font-size:13px;color:#6b7280">Comenzá con la app vacía e ingresá tus propios lotes, insumos y proyecciones.</div>
        </div>

      </div>

      <p style="margin-top:20px;font-size:12px;color:#9ca3af">
        Podés cambiar esto después en cualquier momento.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMainStore } from '../stores/main'

const auth    = useAuthStore()
const store   = useMainStore()
const router  = useRouter()
const cargando = ref(false)

const nombre = computed(() => auth.usuario?.nombre || 'Usuario')

async function cargarDemo() {
  if (cargando.value) return
  cargando.value = true
  try {
    await store.cargarDatosDemo()
    router.push('/')
  } catch (e) {
    console.error(e)
    cargando.value = false
  }
}

function empezarVacio() {
  router.push('/')
}
</script>
