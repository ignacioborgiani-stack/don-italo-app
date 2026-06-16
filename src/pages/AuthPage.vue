<template>
  <div style="min-height:100vh;background:#f5f2ea;display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="width:100%;max-width:420px">

      <!-- Logo -->
      <div style="text-align:center;margin-bottom:28px">
        <img src="@/assets/logo_transparent.png" alt="Don Italo" style="width:80px;height:80px;object-fit:contain;margin-bottom:8px"/>
        <h1 style="font-size:26px;font-weight:800;color:#2d5a27;margin:0">Don Italo</h1>
        <p style="font-size:13px;color:#6b7280;margin-top:4px">Gestión Agrícola</p>
      </div>

      <!-- Card -->
      <div style="background:#fff;border:1px solid #d4cfc4;border-radius:16px;padding:32px;box-shadow:0 4px 16px rgba(0,0,0,.08)">

        <!-- Tabs -->
        <div style="display:flex;border-radius:10px;overflow:hidden;border:2px solid #3a6b35;margin-bottom:24px">
          <button v-for="t in ['login','registro']" :key="t" @click="tab=t"
            :style="{flex:1,padding:'10px 0',border:'none',cursor:'pointer',fontWeight:700,fontSize:14,transition:'all .15s',
              background:tab===t?'#3a6b35':'#fff',color:tab===t?'#fff':'#3a6b35'}">
            {{ t==='login' ? 'Iniciar sesión' : 'Crear cuenta' }}
          </button>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;margin-bottom:16px">
          {{ errorMsg }}
        </div>
        <!-- Success (email confirm) -->
        <div v-if="successMsg" style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;font-size:13px;color:#166534;margin-bottom:16px">
          {{ successMsg }}
        </div>

        <!-- LOGIN -->
        <form v-if="tab==='login'" @submit.prevent="doLogin" style="display:grid;gap:14px">
          <div>
            <label class="di-lbl">Email</label>
            <input v-model="email" type="email" autocomplete="email" placeholder="tu@email.com" class="di-inp" required/>
          </div>
          <div>
            <label class="di-lbl">Contraseña</label>
            <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••" class="di-inp" required/>
          </div>
          <button type="submit" :disabled="cargando"
            style="width:100%;padding:12px;background:#3a6b35;color:#fff;border:none;border-radius:9px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:4px;transition:opacity .15s"
            :style="{opacity:cargando?.65:1}">
            {{ cargando ? 'Ingresando…' : 'Ingresar' }}
          </button>
          <p style="text-align:center;font-size:13px;color:#6b7280;margin:0">
            ¿No tenés cuenta?
            <button type="button" @click="tab='registro'" style="background:none;border:none;color:#3a6b35;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit">Registrate</button>
          </p>
        </form>

        <!-- REGISTRO -->
        <form v-else @submit.prevent="doRegistro" style="display:grid;gap:14px">
          <div>
            <label class="di-lbl">Nombre completo o empresa</label>
            <input v-model="nombre" type="text" autocomplete="name" placeholder="ej: Juan García / Don Italo" class="di-inp" required/>
          </div>
          <div>
            <label class="di-lbl">Email</label>
            <input v-model="email" type="email" autocomplete="email" placeholder="tu@email.com" class="di-inp" required/>
          </div>
          <div>
            <label class="di-lbl">Contraseña</label>
            <input v-model="password" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres" class="di-inp" required/>
          </div>
          <div>
            <label class="di-lbl">Confirmar contraseña</label>
            <input v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="••••••" class="di-inp" required/>
          </div>
          <button type="submit" :disabled="cargando"
            style="width:100%;padding:12px;background:#3a6b35;color:#fff;border:none;border-radius:9px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:4px;transition:opacity .15s"
            :style="{opacity:cargando?.65:1}">
            {{ cargando ? 'Creando cuenta…' : 'Crear cuenta' }}
          </button>
          <p style="text-align:center;font-size:13px;color:#6b7280;margin:0">
            ¿Ya tenés cuenta?
            <button type="button" @click="tab='login'" style="background:none;border:none;color:#3a6b35;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit">Iniciá sesión</button>
          </p>
        </form>

        <!-- Divisor -->
        <div style="display:flex;align-items:center;gap:10px;margin:18px 0">
          <div style="flex:1;height:1px;background:#e5e1d8"/>
          <span style="font-size:12px;color:#9ca3af">o</span>
          <div style="flex:1;height:1px;background:#e5e1d8"/>
        </div>

        <!-- Google -->
        <button type="button" :disabled="cargando" @click="doGoogle"
          style="width:100%;padding:11px;background:#fff;border:1.5px solid #d1d5db;border-radius:9px;font-size:14px;font-weight:600;color:#374151;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .15s"
          @mouseover="e=>e.currentTarget.style.background='#f9fafb'" @mouseout="e=>e.currentTarget.style.background='#fff'">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuar con Google
        </button>

      </div>

      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
        Tus datos son privados y solo accesibles con tu cuenta.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMainStore } from '../stores/main'

const auth    = useAuthStore()
const store   = useMainStore()
const router  = useRouter()

const tab             = ref('login')
const email           = ref('')
const password        = ref('')
const confirmPassword = ref('')
const nombre          = ref('')
const cargando        = ref(false)
const errorMsg        = ref('')
const successMsg      = ref('')

const ERR = {
  'Invalid login credentials':      'Email o contraseña incorrectos.',
  'User already registered':        'Este email ya está registrado.',
  'Email not confirmed':            'Confirmá tu email antes de ingresar.',
  'Password should be at least 6':  'La contraseña debe tener al menos 6 caracteres.',
  'Signup requires a valid password': 'La contraseña debe tener al menos 6 caracteres.',
}
function tradError(msg) {
  for (const [k, v] of Object.entries(ERR)) {
    if (msg?.includes(k)) return v
  }
  return msg || 'Ocurrió un error. Intentá de nuevo.'
}

async function doLogin() {
  errorMsg.value = ''; cargando.value = true
  try {
    await auth.login(email.value, password.value)
    await store.loadData()
    router.push('/')
  } catch (e) {
    errorMsg.value = tradError(e.message)
  } finally {
    cargando.value = false
  }
}

async function doGoogle() {
  errorMsg.value = ''; cargando.value = true
  try {
    await auth.loginGoogle()   // redirige al flujo de Google; al volver, init() restaura la sesión
  } catch (e) {
    console.error('[doGoogle] error:', e)
    errorMsg.value = tradError(e.message) + ' (Google)'
    cargando.value = false
  }
}

async function doRegistro() {
  errorMsg.value = ''; successMsg.value = ''
  if (password.value.length < 6) { errorMsg.value = 'La contraseña debe tener al menos 6 caracteres.'; return }
  if (password.value !== confirmPassword.value) { errorMsg.value = 'Las contraseñas no coinciden.'; return }
  cargando.value = true
  try {
    const data = await auth.registrarse(email.value, password.value, nombre.value)
    // Si Supabase requiere confirmación de email
    if (data?.user && !data.session) {
      successMsg.value = '¡Cuenta creada! Revisá tu email para confirmar tu cuenta y luego iniciá sesión.'
      tab.value = 'login'
    } else {
      await store.loadData()
      router.push('/onboarding')
    }
  } catch (e) {
    errorMsg.value = tradError(e.message)
  } finally {
    cargando.value = false
  }
}
</script>
