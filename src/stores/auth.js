import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session  = ref(null)
  const loading  = ref(true)

  const usuario = computed(() => {
    if (!session.value) return null
    const u = session.value.user
    return {
      id:     u.id,
      email:  u.email,
      nombre: u.user_metadata?.nombre || u.email?.split('@')[0] || 'Usuario',
    }
  })

  const autenticado = computed(() => !!session.value)

  // Carga de datos memoizada: una sola vez por sesión (login, restauración F5 o callback OAuth).
  let _carga = null
  function cargarDatos() {
    if (!_carga) _carga = import('./main').then(({ useMainStore }) => useMainStore().loadData())
    return _carga
  }

  async function init() {
    // Listener primero: captura el callback de OAuth (Google), cuyo intercambio de
    // code→sesión es asíncrono y llega DESPUÉS de que el guard ya redirigió a /auth.
    supabase.auth.onAuthStateChange(async (_event, s) => {
      session.value = s
      if (!s) { _carga = null; return }
      await cargarDatos()
      // El callback OAuth vuelve a /auth con la sesión recién creada → ir al dashboard.
      const prov = s.user?.app_metadata?.provider
      if (prov && prov !== 'email') {
        const { default: router } = await import('../router')
        if (router.currentRoute.value.path === '/auth') router.replace('/')
      }
    })

    // Sesión guardada (recarga F5 con login por email / restauración).
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    if (data.session) await cargarDatos()
    loading.value = false
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function loginGoogle() {
    const redirectTo = window.location.origin   // funciona en prod y en local
    console.log('[loginGoogle] iniciando OAuth, redirectTo =', redirectTo)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    console.log('[loginGoogle] resultado:', { url: data?.url, error })
    if (error) throw error
    // Fallback: si por algún motivo no redirige automáticamente, forzar la navegación.
    if (data?.url) window.location.assign(data.url)
    return data
  }

  async function registrarse(email, password, nombre) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    session.value = null
    _carga = null
  }

  return { session, loading, usuario, autenticado, init, cargarDatos, login, loginGoogle, registrarse, logout }
})
