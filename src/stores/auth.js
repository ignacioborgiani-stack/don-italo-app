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

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session

    // Si había sesión activa (ej: recarga con F5), cargar los datos sin re-loguear.
    // import dinámico para evitar el ciclo auth ↔ main.
    if (data.session) {
      const { useMainStore } = await import('./main')
      await useMainStore().loadData()
    }
    loading.value = false

    supabase.auth.onAuthStateChange((_, s) => {
      session.value = s
    })
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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
  }

  return { session, loading, usuario, autenticado, init, login, registrarse, logout }
})
