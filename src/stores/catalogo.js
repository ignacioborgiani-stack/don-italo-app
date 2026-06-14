import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { MOCK_CATALOGO } from '../utils/constants'
import { catToDb, catFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

export const useCatalogoStore = defineStore('catalogo', () => {
  const items = ref([])

  function getUid() { return useAuthStore().usuario?.id }

  async function loadCatalogo() {
    const { data, error } = await supabase
      .from('catalogo_insumos')
      .select('*')
      .order('categoria')
      .order('nombre')
    if (error) throw error
    items.value = (data || []).map(catFromDb)
  }

  async function cargarCatalogoDemo() {
    const userId = getUid()
    const rows = MOCK_CATALOGO.map(c => ({ ...catToDb({ ...c, id: uid() }), user_id: userId }))
    const { data, error } = await supabase.from('catalogo_insumos').insert(rows).select()
    if (error) throw error
    items.value = (data || []).map(catFromDb)
  }

  async function addItem(item) {
    const userId = getUid()
    const n = { ...item, id: uid() }
    const { data, error } = await supabase
      .from('catalogo_insumos')
      .insert({ ...catToDb(n), user_id: userId })
      .select()
      .single()
    if (error) throw error
    const saved = catFromDb(data)
    items.value = [...items.value, saved].sort((a, b) =>
      a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)
    )
    return saved
  }

  async function updItem(id, delta) {
    const upd = { ...items.value.find(i => i.id === id), ...delta }
    const { error } = await supabase.from('catalogo_insumos').update(catToDb(upd)).eq('id', id)
    if (error) throw error
    items.value = items.value.map(i => i.id === id ? upd : i)
  }

  async function delItem(id) {
    const { error } = await supabase.from('catalogo_insumos').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter(i => i.id !== id)
  }

  function reset() { items.value = [] }

  // Busca un insumo por id (útil para calcularCostoItemHa)
  function byId(id) { return items.value.find(i => i.id === id) || null }

  return { items, loadCatalogo, cargarCatalogoDemo, addItem, updItem, delItem, reset, byId }
})
