import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { MOCK_LOTES, MOCK_PROYECCIONES, MOCK_STOCKS } from '../utils/constants'
import { loteToDb, loteFromDb, proyToDb, proyFromDb, stToDb, stFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

export const useMainStore = defineStore('main', () => {
  const sbConnected  = ref(false)
  const campania     = ref('2024/25')
  const lotes        = ref([])
  const proyecciones = ref([])
  const stocks       = ref([])
  const chatMessages = ref([])
  const apiKey       = ref('')

  function getUid() {
    return useAuthStore().usuario?.id
  }

  // ── Carga de datos (post-login) ───────────────────────────────
  async function loadData() {
    try {
      const [lr, pr, sr, cr] = await Promise.all([
        supabase.from('lotes').select('*'),
        supabase.from('proyecciones').select('*'),
        supabase.from('stocks').select('*'),
        supabase.from('configuracion').select('*'),
      ])
      if (lr.error) throw lr.error
      lotes.value        = (lr.data || []).map(loteFromDb)
      proyecciones.value = (pr.data || []).map(proyFromDb)
      stocks.value       = (sr.data || []).map(stFromDb)
      apiKey.value       = cr.data?.find(c => c.clave === 'apiKey')?.valor || ''
      sbConnected.value  = true
    } catch (e) {
      console.error('[loadData]', e?.message)
      sbConnected.value = false
    }
  }

  // ── Onboarding: cargar datos de ejemplo ───────────────────────
  async function cargarDatosDemo() {
    const userId = getUid()
    await supabase.from('lotes').insert(
      MOCK_LOTES.map(l => ({ ...loteToDb({ ...l, id: uid() }), user_id: userId }))
    )
    await supabase.from('proyecciones').insert(
      MOCK_PROYECCIONES.map(p => ({ ...proyToDb(p), user_id: userId }))
    )
    await supabase.from('stocks').insert(
      MOCK_STOCKS.map(s => ({ ...stToDb({ ...s, id: uid() }), user_id: userId }))
    )
    await loadData()
  }

  function resetData() {
    lotes.value = []; proyecciones.value = []; stocks.value = []
    chatMessages.value = []; apiKey.value = ''; sbConnected.value = false
  }

  // ── Lotes ─────────────────────────────────────────────────────
  async function addLote(l) {
    const userId = getUid()
    const n = { ...l, id: uid() }
    const { data, error } = await supabase.from('lotes').insert({ ...loteToDb(n), user_id: userId }).select().single()
    if (error) throw error
    lotes.value = [...lotes.value, loteFromDb(data)]
  }

  async function updLote(id, d) {
    const upd = { ...lotes.value.find(l => l.id === id), ...d }
    const { error } = await supabase.from('lotes').update(loteToDb(upd)).eq('id', id)
    if (error) throw error
    lotes.value = lotes.value.map(l => l.id === id ? upd : l)
  }

  async function delLote(id) {
    await supabase.from('lotes').delete().eq('id', id)
    lotes.value = lotes.value.filter(l => l.id !== id)
  }

  // ── Proyecciones ──────────────────────────────────────────────
  async function updProy(cultivo, d) {
    const userId = getUid()
    const existing = proyecciones.value.find(p => p.cultivo === cultivo)
    const upd = { ...existing, ...d }

    if (existing?.id) {
      await supabase.from('proyecciones').update(proyToDb(upd)).eq('id', existing.id)
      proyecciones.value = proyecciones.value.map(p => p.cultivo === cultivo ? upd : p)
    } else {
      const { data } = await supabase.from('proyecciones')
        .insert({ ...proyToDb(upd), user_id: userId }).select().single()
      const saved = data ? proyFromDb(data) : upd
      proyecciones.value = [...proyecciones.value, saved]
    }
  }

  // ── Stocks ────────────────────────────────────────────────────
  async function addStock(s) {
    const userId = getUid()
    const n = { ...s, id: uid() }
    const { data, error } = await supabase.from('stocks').insert({ ...stToDb(n), user_id: userId }).select().single()
    if (error) throw error
    stocks.value = [...stocks.value, stFromDb(data)]
  }

  async function updStock(id, d) {
    const upd = { ...stocks.value.find(i => i.id === id), ...d }
    await supabase.from('stocks').update(stToDb(upd)).eq('id', id)
    stocks.value = stocks.value.map(i => i.id === id ? upd : i)
  }

  async function delStock(id) {
    await supabase.from('stocks').delete().eq('id', id)
    stocks.value = stocks.value.filter(i => i.id !== id)
  }

  async function moveStock(id, newU, cant, nota) {
    const userId = getUid()
    const it = stocks.value.find(i => i.id === id)
    if (!it) return
    const n = parseFloat(cant) || 0

    supabase.from('movimientos').insert({
      user_id: userId, tipo: 'traslado', stock_id: id,
      insumo_nombre: it.nombre, cantidad: n, unidad: it.unidad,
      costo_total_ars: n * (parseFloat(it.precioUnitario) || 0),
    })

    if (n >= it.cantidad) {
      await supabase.from('stocks').update({ ubicacion: newU }).eq('id', id)
      stocks.value = stocks.value.map(i => i.id === id ? { ...i, ubicacion: newU } : i)
    } else {
      const upd = { ...it, cantidad: it.cantidad - n }
      const nw  = { ...it, id: uid(), cantidad: n, ubicacion: newU, notas: nota || '' }
      await supabase.from('stocks').update(stToDb(upd)).eq('id', id)
      const { data } = await supabase.from('stocks').insert({ ...stToDb(nw), user_id: userId }).select().single()
      stocks.value = [...stocks.value.map(i => i.id === id ? upd : i), stFromDb(data)]
    }
  }

  // ── Chat / API Key ────────────────────────────────────────────
  function addMsg(m) { chatMessages.value = [...chatMessages.value, { ...m, id: uid() }] }

  async function setApiKey(k) {
    const userId = getUid()
    apiKey.value = k
    await supabase.from('configuracion').upsert({ user_id: userId, clave: 'apiKey', valor: k })
  }

  function setCampania(c) { campania.value = c }

  return {
    sbConnected, campania, lotes, proyecciones, stocks, chatMessages, apiKey,
    loadData, cargarDatosDemo, resetData,
    addLote, updLote, delLote,
    updProy,
    addStock, updStock, delStock, moveStock,
    addMsg, setApiKey, setCampania,
  }
})
