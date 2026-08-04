import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { useGranjaStore } from './granja'
import { plantillaToDb, plantillaFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

export const usePlantillasStore = defineStore('plantillas', () => {
  const items = ref([])

  // user_id del dueño del contexto activo (mío, o del dueño si soy miembro invitado).
  function getOwnerId() { return useGranjaStore().activeOwnerId || useAuthStore().usuario?.id }

  async function loadPlantillas() {
    const { data, error } = await supabase
      .from('plantillas_costos').select('*').eq('user_id', getOwnerId()).order('created_at')
    if (error) throw error
    items.value = (data || []).map(plantillaFromDb)
  }

  // Plantillas disponibles para un cultivo dado. En un doble, `cultivo` es el
  // nombre combinado ("Trigo / Soja") y sólo se ofrecen plantillas de doble de
  // ESA misma combinación (una plantilla de trigo no aplica a un maíz).
  // El default 'simple' preserva el comportamiento de los llamadores viejos.
  function plantillasDe(cultivo, tipoSiembra = 'simple') {
    return items.value.filter(p => p.cultivo === cultivo && (p.tipoSiembra || 'simple') === tipoSiembra)
  }

  async function addPlantilla(p) {
    const userId = getOwnerId()
    const n = { ...p, id: uid() }
    const { data, error } = await supabase
      .from('plantillas_costos').insert({ ...plantillaToDb(n), user_id: userId }).select().single()
    if (error) throw error
    const saved = plantillaFromDb(data)
    items.value = [...items.value, saved]
    return saved
  }

  async function delPlantilla(id) {
    const { error } = await supabase.from('plantillas_costos').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter(p => p.id !== id)
  }

  function reset() { items.value = [] }

  return { items, loadPlantillas, plantillasDe, addPlantilla, delPlantilla, reset }
})
