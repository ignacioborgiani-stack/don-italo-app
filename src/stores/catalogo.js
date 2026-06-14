import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { MOCK_CATALOGO_INSUMOS, MOCK_CATALOGO_CULTIVOS } from '../utils/catalogoData'
import { catToDb, catFromDb, cultivoRefToDb, cultivoRefFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

export const useCatalogoStore = defineStore('catalogo', () => {
  const items    = ref([])   // insumos
  const cultivos = ref([])

  function getUid() { return useAuthStore().usuario?.id }

  const ordenarInsumos = arr => [...arr].sort((a, b) =>
    (a.familia || '').localeCompare(b.familia || '') || (a.nombre || '').localeCompare(b.nombre || '')
  )

  // ── Insumos ───────────────────────────────────────────────────
  async function loadCatalogo() {
    const { data, error } = await supabase.from('catalogo_insumos').select('*').order('nombre')
    if (error) throw error
    items.value = ordenarInsumos((data || []).map(catFromDb))
  }

  // Precarga de referencia (Excel del productor). Inserta sólo si está vacío.
  async function cargarInsumosReferencia() {
    const userId = getUid()
    const rows = MOCK_CATALOGO_INSUMOS.map(c => ({ ...catToDb({ ...c, id: uid() }), user_id: userId }))
    const { data, error } = await supabase.from('catalogo_insumos').insert(rows).select()
    if (error) throw error
    items.value = ordenarInsumos((data || []).map(catFromDb))
    // Equivalencia de ejemplo: Glifosato 75.7 SG ≡ Glifosato Power Plus (factor 1.0)
    const g757 = items.value.find(i => i.nombre === 'Glifosato 75.7 SG')
    const gpp  = items.value.find(i => i.nombre === 'Glifosato Power Plus')
    if (g757 && gpp) {
      await updItem(g757.id, { equivalencias: [{ insumoIdRef: gpp.id, factor: 1.0, nota: 'Mismo ingrediente activo, diferente formulación' }] })
    }
    return items.value.length
  }

  // Alias usado por el onboarding existente
  const cargarCatalogoDemo = cargarInsumosReferencia

  async function addItem(item) {
    const userId = getUid()
    const n = { ...item, id: uid() }
    const { data, error } = await supabase.from('catalogo_insumos').insert({ ...catToDb(n), user_id: userId }).select().single()
    if (error) throw error
    items.value = ordenarInsumos([...items.value, catFromDb(data)])
    return catFromDb(data)
  }

  async function updItem(id, delta) {
    const upd = { ...items.value.find(i => i.id === id), ...delta }
    const { error } = await supabase.from('catalogo_insumos').update(catToDb(upd)).eq('id', id)
    if (error) throw error
    items.value = ordenarInsumos(items.value.map(i => i.id === id ? upd : i))
  }

  async function delItem(id) {
    const { error } = await supabase.from('catalogo_insumos').delete().eq('id', id)
    if (error) throw error
    items.value = items.value.filter(i => i.id !== id)
  }

  function byId(id) { return items.value.find(i => i.id === id) || null }

  // ── Cultivos ──────────────────────────────────────────────────
  async function loadCultivos() {
    const { data, error } = await supabase.from('catalogo_cultivos').select('*').order('nombre')
    if (error) throw error
    cultivos.value = (data || []).map(cultivoRefFromDb)
  }

  async function cargarCultivosReferencia() {
    const userId = getUid()
    const rows = MOCK_CATALOGO_CULTIVOS.map(c => ({ ...cultivoRefToDb({ ...c, id: uid() }), user_id: userId }))
    const { data, error } = await supabase.from('catalogo_cultivos').insert(rows).select()
    if (error) throw error
    cultivos.value = (data || []).map(cultivoRefFromDb)
    return cultivos.value.length
  }

  async function addCultivo(c) {
    const userId = getUid()
    const n = { ...c, id: uid() }
    const { data, error } = await supabase.from('catalogo_cultivos').insert({ ...cultivoRefToDb(n), user_id: userId }).select().single()
    if (error) throw error
    cultivos.value = [...cultivos.value, cultivoRefFromDb(data)].sort((a, b) => a.nombre.localeCompare(b.nombre))
    return cultivoRefFromDb(data)
  }

  async function updCultivo(id, delta) {
    const upd = { ...cultivos.value.find(c => c.id === id), ...delta }
    const { error } = await supabase.from('catalogo_cultivos').update(cultivoRefToDb(upd)).eq('id', id)
    if (error) throw error
    cultivos.value = cultivos.value.map(c => c.id === id ? upd : c)
  }

  async function delCultivo(id) {
    const { error } = await supabase.from('catalogo_cultivos').delete().eq('id', id)
    if (error) throw error
    cultivos.value = cultivos.value.filter(c => c.id !== id)
  }

  function reset() { items.value = []; cultivos.value = [] }

  return {
    items, cultivos,
    loadCatalogo, cargarInsumosReferencia, cargarCatalogoDemo, addItem, updItem, delItem, byId,
    loadCultivos, cargarCultivosReferencia, addCultivo, updCultivo, delCultivo,
    reset,
  }
})
