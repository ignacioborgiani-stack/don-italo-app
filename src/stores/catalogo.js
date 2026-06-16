import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { MOCK_CATALOGO_INSUMOS, MOCK_CATALOGO_CULTIVOS, MOCK_CATALOGO_LABORES } from '../utils/catalogoData'
import { catToDb, catFromDb, cultivoRefToDb, cultivoRefFromDb, laborToDb, laborFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

export const useCatalogoStore = defineStore('catalogo', () => {
  const items    = ref([])   // insumos
  const cultivos = ref([])
  const labores  = ref([])

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

  // ── Labores y servicios ───────────────────────────────────────
  const ordenarLabores = arr => [...arr].sort((a, b) =>
    (a.categoria || '').localeCompare(b.categoria || '') || (a.nombre || '').localeCompare(b.nombre || ''))

  async function loadLabores() {
    const { data, error } = await supabase.from('catalogo_labores').select('*').order('nombre')
    if (error) throw error
    labores.value = ordenarLabores((data || []).map(laborFromDb))
  }

  async function cargarLaboresReferencia() {
    const userId = getUid()
    const rows = MOCK_CATALOGO_LABORES.map(l => ({ ...laborToDb({ ...l, id: uid() }), user_id: userId }))
    const { data, error } = await supabase.from('catalogo_labores').insert(rows).select()
    if (error) throw error
    labores.value = ordenarLabores((data || []).map(laborFromDb))
    return labores.value.length
  }

  async function addLabor(l) {
    const userId = getUid()
    const n = { ...l, id: uid() }
    const { data, error } = await supabase.from('catalogo_labores').insert({ ...laborToDb(n), user_id: userId }).select().single()
    if (error) throw error
    labores.value = ordenarLabores([...labores.value, laborFromDb(data)])
    return laborFromDb(data)
  }

  async function updLabor(id, delta) {
    const upd = { ...labores.value.find(l => l.id === id), ...delta }
    const { error } = await supabase.from('catalogo_labores').update(laborToDb(upd)).eq('id', id)
    if (error) throw error
    labores.value = ordenarLabores(labores.value.map(l => l.id === id ? upd : l))
  }

  async function delLabor(id) {
    const { error } = await supabase.from('catalogo_labores').delete().eq('id', id)
    if (error) throw error
    labores.value = labores.value.filter(l => l.id !== id)
  }

  function laborById(id) { return labores.value.find(l => l.id === id) || null }

  function reset() { items.value = []; cultivos.value = []; labores.value = [] }

  return {
    items, cultivos, labores,
    loadCatalogo, cargarInsumosReferencia, cargarCatalogoDemo, addItem, updItem, delItem, byId,
    loadCultivos, cargarCultivosReferencia, addCultivo, updCultivo, delCultivo,
    loadLabores, cargarLaboresReferencia, addLabor, updLabor, delLabor, laborById,
    reset,
  }
})
