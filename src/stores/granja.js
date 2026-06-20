import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { granjaToDb, granjaFromDb, miembroFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

export const useGranjaStore = defineStore('granja', () => {
  const miGranja     = ref(null)   // granja de la que SOY propietario (o null)
  const miembros     = ref([])     // miembros/invitaciones de mi granja
  const invitaciones = ref([])     // invitaciones que OTROS me hicieron a mí
  const loaded       = ref(false)

  const auth = useAuthStore()
  const miId    = () => auth.usuario?.id
  const miEmail = () => auth.usuario?.email

  const tieneGranja        = computed(() => !!miGranja.value)
  const invitacionesPendientes = computed(() => invitaciones.value.filter(i => i.estado === 'pendiente'))

  // ── Carga ──────────────────────────────────────────────────────
  async function loadGranja() {
    const yo = miId(); const email = miEmail()
    if (!yo) return

    // 1) Mi granja (de la que soy propietario)
    const { data: g, error: ge } = await supabase
      .from('granjas').select('*').eq('propietario_id', yo).maybeSingle()
    if (ge) throw ge
    miGranja.value = g ? granjaFromDb(g) : null

    // 2) Miembros de mi granja (si tengo)
    if (miGranja.value) {
      const { data: ms, error: me } = await supabase
        .from('granja_miembros').select('*').eq('granja_id', miGranja.value.id).order('invitado_en')
      if (me) throw me
      miembros.value = (ms || []).map(miembroFromDb)
    } else {
      miembros.value = []
    }

    // 3) Invitaciones que me hicieron a mí (en granjas ajenas)
    const filtros = [`user_id.eq.${yo}`]
    if (email) filtros.push(`email_invitado.eq.${email}`)
    const { data: inv, error: ie } = await supabase
      .from('granja_miembros')
      .select('*, granjas(nombre, propietario_id)')
      .or(filtros.join(','))
    if (ie) throw ie
    invitaciones.value = (inv || [])
      .map(miembroFromDb)
      .filter(i => i.granjaPropietarioId && i.granjaPropietarioId !== yo)  // excluir mi propia granja

    loaded.value = true
  }

  // ── Propietario: crear granja ──────────────────────────────────
  async function crearGranja(nombre) {
    const n = (nombre || '').trim()
    if (!n) throw new Error('Poné un nombre para la granja')
    const { data, error } = await supabase
      .from('granjas')
      .insert({ ...granjaToDb({ id: uid(), propietarioId: miId(), nombre: n }) })
      .select().single()
    if (error) throw error
    miGranja.value = granjaFromDb(data)
    miembros.value = []
    return miGranja.value
  }

  async function renombrarGranja(nombre) {
    const n = (nombre || '').trim()
    if (!n || !miGranja.value) return
    const { error } = await supabase.from('granjas').update({ nombre: n }).eq('id', miGranja.value.id)
    if (error) throw error
    miGranja.value = { ...miGranja.value, nombre: n }
  }

  // ── Propietario: invitar / quitar miembros ─────────────────────
  async function invitar(email) {
    const e = (email || '').trim().toLowerCase()
    if (!e) throw new Error('Poné un email')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Email inválido')
    if (!miGranja.value) throw new Error('Primero creá tu granja')
    if (e === (miEmail() || '').toLowerCase()) throw new Error('No te podés invitar a vos mismo')
    if (miembros.value.some(m => m.emailInvitado.toLowerCase() === e)) throw new Error('Ya invitaste a ese email')

    const { data, error } = await supabase
      .from('granja_miembros')
      .insert({ granja_id: miGranja.value.id, email_invitado: e, estado: 'pendiente' })
      .select().single()
    if (error) throw error
    miembros.value = [...miembros.value, miembroFromDb(data)]
    return miembroFromDb(data)
  }

  async function quitarMiembro(id) {
    const { error } = await supabase.from('granja_miembros').delete().eq('id', id)
    if (error) throw error
    miembros.value = miembros.value.filter(m => m.id !== id)
  }

  // ── Invitado: aceptar / rechazar ───────────────────────────────
  async function responderInvitacion(id, aceptar) {
    const patch = aceptar
      ? { estado: 'aceptado', user_id: miId(), aceptado_en: new Date().toISOString() }
      : { estado: 'rechazado' }
    const { data, error } = await supabase
      .from('granja_miembros').update(patch).eq('id', id)
      .select('*, granjas(nombre, propietario_id)').single()
    if (error) throw error
    invitaciones.value = invitaciones.value.map(i => i.id === id ? miembroFromDb(data) : i)
  }

  function reset() {
    miGranja.value = null
    miembros.value = []
    invitaciones.value = []
    loaded.value = false
  }

  return {
    miGranja, miembros, invitaciones, loaded,
    tieneGranja, invitacionesPendientes,
    loadGranja, crearGranja, renombrarGranja,
    invitar, quitarMiembro, responderInvitacion, reset,
  }
})
