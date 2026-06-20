import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { useGranjaStore } from './granja'
import { loteMaestroToDb, loteMaestroFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

export const useLotesMaestroStore = defineStore('lotesMaestro', () => {
  const items = ref([])

  // user_id del dueño del contexto activo (mío, o del dueño si soy miembro invitado).
  function getOwnerId() { return useGranjaStore().activeOwnerId || useAuthStore().usuario?.id }

  async function loadLotesMaestro() {
    const { data, error } = await supabase.from('lotes_maestro').select('*').eq('user_id', getOwnerId()).order('nombre')
    if (error) throw error
    items.value = (data || []).map(loteMaestroFromDb)
  }

  async function addLote(lote) {
    const userId = getOwnerId()
    const n = { ...lote, id: uid() }
    const { data, error } = await supabase
      .from('lotes_maestro')
      .insert({ ...loteMaestroToDb(n), user_id: userId })
      .select().single()
    if (error) throw error
    const saved = loteMaestroFromDb(data)
    items.value = [...items.value, saved].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    return saved
  }

  async function updLote(id, delta) {
    const upd = { ...items.value.find(l => l.id === id), ...delta }
    const { error } = await supabase.from('lotes_maestro').update(loteMaestroToDb(upd)).eq('id', id)
    if (error) throw error
    items.value = items.value.map(l => l.id === id ? upd : l)
  }

  async function delLote(id) {
    const { error } = await supabase.from('lotes_maestro').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter(l => l.id !== id)
  }

  function reset() { items.value = [] }

  function byId(id) { return items.value.find(l => l.id === id) || null }

  return { items, loadLotesMaestro, addLote, updLote, delLote, reset, byId }
})
