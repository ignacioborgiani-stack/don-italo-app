import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { MOCK_LOTES, MOCK_PROYECCIONES, MOCK_STOCKS, CAMPAÑAS } from '../utils/constants'
import { loteToDb, loteFromDb, proyToDb, proyFromDb, stToDb, stFromDb, asignacionToDb, asignacionFromDb, costoFijoToDb, costoFijoFromDb } from '../utils/mappers'
import { costoFijoAnualUsd } from '../utils/calculations'
import { useCatalogoStore } from './catalogo'
import { useLotesMaestroStore } from './lotesMaestro'
import { useGranjaStore } from './granja'

const uid = () => crypto.randomUUID()

// Ordenar campañas por el primer número del nombre ("2024/25" → 2024)
const campanaYear  = n => { const m = String(n).match(/\d+/); return m ? parseInt(m[0], 10) : 0 }
const ordenCampana = (a, b) => campanaYear(a) - campanaYear(b)

// Tipo de stock → categoría de ítem de costo contable
const TIPO_A_CATEGORIA = {
  Semilla: 'semilla', Fertilizante: 'fertilizante',
  Herbicida: 'fitosanitario', Insecticida: 'fitosanitario', Fungicida: 'fitosanitario',
}

export const useMainStore = defineStore('main', () => {
  const sbConnected  = ref(false)
  const campania     = ref('2024/25')
  const campanas     = ref([...CAMPAÑAS].sort(ordenCampana))
  const campanasRows = ref([])   // filas completas {id, nombre} para resolver campana_id
  const tipoCambio   = ref(1000)   // ARS por USD (para insumos cotizados en ARS)
  const lotes        = ref([])
  const asignaciones = ref([])   // asignaciones_campana (lote ↔ campaña ↔ cultivo + costos)
  const proyecciones = ref([])
  const stocks       = ref([])
  const costosFijos  = ref([])   // costos_fijos de estructura (por campaña)
  const chatMessages = ref([])
  const apiKey       = ref('')

  // id de la campaña activa (para costos_fijos.campana_id)
  const campanaIdActiva = computed(() => campanasRows.value.find(c => c.nombre === campania.value)?.id || null)
  // Costos fijos de la campaña activa y su total anual en USD.
  const costosFijosActivos = computed(() => costosFijos.value.filter(c => c.campanaId === campanaIdActiva.value))
  const costosFijosTotal   = computed(() => costosFijosActivos.value.reduce((s, cf) => s + costoFijoAnualUsd(cf, tipoCambio.value), 0))

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
      // Tablas opcionales: si aún no se corrió la migración, no deben romper la carga principal
      try { await useCatalogoStore().loadCatalogo() } catch (e) { console.warn('[catalogo] tabla no disponible:', e?.message) }
      try { await useCatalogoStore().loadCultivos() } catch (e) { console.warn('[catalogo_cultivos] tabla no disponible:', e?.message) }
      try { await useCatalogoStore().loadLabores() } catch (e) { console.warn('[catalogo_labores] tabla no disponible:', e?.message) }
      try { await useLotesMaestroStore().loadLotesMaestro() } catch (e) { console.warn('[lotes_maestro] tabla no disponible:', e?.message) }
      try { await loadAsignaciones() } catch (e) { console.warn('[asignaciones_campana] tabla no disponible:', e?.message) }
      try { await loadCampanas() } catch (e) { console.warn('[campanas] tabla no disponible:', e?.message) }
      try { await loadCostosFijos() } catch (e) { console.warn('[costos_fijos] tabla no disponible:', e?.message) }
      try { await useGranjaStore().loadGranja() } catch (e) { console.warn('[granjas] tabla no disponible:', e?.message) }
      try { await migrarAplicados() } catch (e) { console.warn('[migrarAplicados]', e?.message) }  // convierte stocks 'aplicado' viejos en ítems de costo
    } catch (e) {
      console.error('[loadData]', e?.message)
      sbConnected.value = false
    }
  }

  // ── Campañas ──────────────────────────────────────────────────
  async function loadCampanas() {
    const userId = getUid()
    const { data } = await supabase.from('campanas').select('*')
    let rows = data || []
    if (!rows.length) {
      // Primer arranque: sembrar con las campañas que ya aparecen en los lotes + defaults
      const enLotes = lotes.value.map(l => l.campaña).filter(Boolean)
      const nombres = [...new Set([...CAMPAÑAS, ...enLotes])]
      if (userId) {
        const { data: ins } = await supabase.from('campanas').insert(nombres.map(n => ({ user_id: userId, nombre: n }))).select()
        rows = ins || nombres.map(n => ({ nombre: n }))
      } else {
        rows = nombres.map(n => ({ nombre: n }))
      }
    }
    campanasRows.value = rows
    campanas.value = rows.map(c => c.nombre).sort(ordenCampana)
    if (!campanas.value.includes(campania.value)) campania.value = campanas.value[campanas.value.length - 1] || '2024/25'
  }

  async function addCampana(nombre) {
    const n = (nombre || '').trim()
    if (!n || campanas.value.includes(n)) { if (n) campania.value = n; return }
    const userId = getUid()
    const { data, error } = await supabase.from('campanas').insert({ user_id: userId, nombre: n }).select().single()
    if (error) throw error
    if (data) campanasRows.value = [...campanasRows.value, data]
    campanas.value = [...campanas.value, n].sort(ordenCampana)
    campania.value = n   // arranca seleccionada y vacía
  }

  async function delCampana(nombre) {
    if (campanas.value.length <= 1) throw new Error('Debe quedar al menos una campaña')
    const userId = getUid()
    const { error } = await supabase.from('campanas').delete().eq('user_id', userId).eq('nombre', nombre)
    if (error) throw error
    campanas.value = campanas.value.filter(c => c !== nombre)
    campanasRows.value = campanasRows.value.filter(c => c.nombre !== nombre)
    if (campania.value === nombre) campania.value = campanas.value[campanas.value.length - 1] || ''
  }

  // Asegura que la campaña activa tenga fila en `campanas` y devuelve su id.
  async function ensureCampanaIdActiva() {
    if (campanaIdActiva.value) return campanaIdActiva.value
    const userId = getUid()
    const { data, error } = await supabase.from('campanas').insert({ user_id: userId, nombre: campania.value }).select().single()
    if (!error && data) { campanasRows.value = [...campanasRows.value, data]; return data.id }
    // Si ya existía (conflicto único) u otro caso, recargar y devolver lo que haya.
    await loadCampanas()
    return campanaIdActiva.value
  }

  // ── Costos fijos de estructura (por campaña) ──────────────────
  async function loadCostosFijos() {
    const { data, error } = await supabase.from('costos_fijos').select('*').order('created_at')
    if (error) throw error
    costosFijos.value = (data || []).map(costoFijoFromDb)
  }

  async function addCostoFijo(cf) {
    const userId = getUid()
    const campanaId = await ensureCampanaIdActiva()
    const n = { ...cf, id: uid(), campanaId }
    const { data, error } = await supabase.from('costos_fijos').insert({ ...costoFijoToDb(n), user_id: userId }).select().single()
    if (error) throw error
    costosFijos.value = [...costosFijos.value, costoFijoFromDb(data)]
  }

  async function updCostoFijo(id, delta) {
    const upd = { ...costosFijos.value.find(c => c.id === id), ...delta }
    const { error } = await supabase.from('costos_fijos').update(costoFijoToDb(upd)).eq('id', id)
    if (error) throw error
    costosFijos.value = costosFijos.value.map(c => c.id === id ? upd : c)
  }

  async function delCostoFijo(id) {
    const { error } = await supabase.from('costos_fijos').delete().eq('id', id)
    if (error) throw error
    costosFijos.value = costosFijos.value.filter(c => c.id !== id)
  }

  // Copia los costos fijos de la campaña inmediatamente anterior a la activa.
  async function copiarCostosFijosDeAnterior() {
    const idx = campanas.value.indexOf(campania.value)
    const anterior = idx > 0 ? campanas.value[idx - 1] : null
    if (!anterior) throw new Error('No hay una campaña anterior de la cual copiar.')
    const anteriorId = campanasRows.value.find(c => c.nombre === anterior)?.id
    const origen = costosFijos.value.filter(c => c.campanaId === anteriorId)
    if (!origen.length) throw new Error(`La campaña anterior (${anterior}) no tiene costos fijos cargados.`)
    const userId = getUid()
    const campanaId = await ensureCampanaIdActiva()
    const filas = origen.map(c => ({ ...costoFijoToDb({ ...c, id: uid(), campanaId }), user_id: userId }))
    const { data, error } = await supabase.from('costos_fijos').insert(filas).select()
    if (error) throw error
    costosFijos.value = [...costosFijos.value, ...(data || []).map(costoFijoFromDb)]
    return data?.length || 0
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
    await useCatalogoStore().cargarCatalogoDemo()
    await loadData()
  }

  function resetData() {
    lotes.value = []; asignaciones.value = []; proyecciones.value = []; stocks.value = []
    costosFijos.value = []; campanasRows.value = []
    chatMessages.value = []; apiKey.value = ''; sbConnected.value = false
    campanas.value = [...CAMPAÑAS].sort(ordenCampana); campania.value = '2024/25'
    useCatalogoStore().reset()
    useLotesMaestroStore().reset()
    useGranjaStore().reset()
  }

  // ── Asignaciones por campaña (lote ↔ campaña ↔ cultivo + costos) ──
  async function loadAsignaciones() {
    const { data, error } = await supabase.from('asignaciones_campana').select('*')
    if (error) throw error
    asignaciones.value = (data || []).map(asignacionFromDb)
  }

  async function addAsignacion(a) {
    const userId = getUid()
    const n = { ...a, id: uid() }
    const { data, error } = await supabase.from('asignaciones_campana').insert({ ...asignacionToDb(n), user_id: userId }).select().single()
    if (error) throw error
    asignaciones.value = [...asignaciones.value, asignacionFromDb(data)]
  }

  async function updAsignacion(id, delta) {
    const upd = { ...asignaciones.value.find(a => a.id === id), ...delta }
    const { error } = await supabase.from('asignaciones_campana').update(asignacionToDb(upd)).eq('id', id)
    if (error) throw error
    asignaciones.value = asignaciones.value.map(a => a.id === id ? upd : a)
  }

  async function delAsignacion(id) {
    const { error } = await supabase.from('asignaciones_campana').delete().eq('id', id)
    if (error) throw error
    asignaciones.value = asignaciones.value.filter(a => a.id !== id)
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

  // Registra un insumo como ítem de costo contable en el lote indicado.
  // Devuelve true si encontró el lote (por nombre + campaña) y lo actualizó.
  async function aplicarEnLote(stock, campana, cant, loteDestino) {
    const nombreLote = loteDestino || stock.lote
    const lote = lotes.value.find(l => (l.nombre || l.lote) === nombreLote && l.campaña === campana)
    if (!lote) return false

    const ha    = parseFloat(lote.ha) || 0
    const total = (parseFloat(cant) || 0) * (parseFloat(stock.precioUnitario) || 0)
    const item  = {
      categoria: TIPO_A_CATEGORIA[stock.tipo] || 'otros',
      nombre: `${stock.nombre} (${parseFloat(cant) || 0} ${stock.unidad} aplicado)`,
      costoHaUsd: ha > 0 ? Math.round((total / ha) * 100) / 100 : 0,
      origenStock: stock.id,
    }

    let delta
    if (lote.tipoSiembra === 'doble') {
      const cult = lote.cultivoEstival || lote.cultivoInvernal || { itemsCosto: [] }
      const upd  = { ...cult, itemsCosto: [...(cult.itemsCosto || []), item] }
      delta = lote.cultivoEstival ? { cultivoEstival: upd } : { cultivoInvernal: upd }
    } else {
      const cult = lote.cultivo || { itemsCosto: [] }
      delta = { cultivo: { ...cult, itemsCosto: [...(cult.itemsCosto || []), item] } }
    }
    await updLote(lote.id, delta)
    return true
  }

  // Convierte stocks 'aplicado' antiguos en ítems de costo y los elimina del inventario.
  async function migrarAplicados() {
    for (const s of stocks.value.filter(i => i.ubicacion === 'aplicado')) {
      const ok = await aplicarEnLote(s, s.campana, s.cantidad)
      if (ok) await delStock(s.id)
    }
  }

  async function moveStock(id, newU, cant, nota, loteDestino) {
    const userId = getUid()
    const it = stocks.value.find(i => i.id === id)
    if (!it) return
    const n = parseFloat(cant) || 0

    // Aplicar en campo → se vuelve ítem de costo en el lote y sale del inventario
    if (newU === 'aplicado') {
      const ok = await aplicarEnLote(it, campania.value, n, loteDestino)
      if (!ok) throw new Error('No se encontró el lote asignado en la campaña activa')
      supabase.from('movimientos').insert({
        user_id: userId, tipo: 'aplicacion', stock_id: id,
        insumo_nombre: it.nombre, cantidad: n, unidad: it.unidad,
        lote_nombre: loteDestino || it.lote, tipo_aplicacion: 'campo',
        costo_total_ars: n * (parseFloat(it.precioUnitario) || 0),
      })
      if (n >= it.cantidad) await delStock(id)
      else await updStock(id, { cantidad: it.cantidad - n })
      return
    }

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
  function setTipoCambio(v) { tipoCambio.value = parseFloat(v) || tipoCambio.value }

  return {
    sbConnected, campania, campanas, campanasRows, tipoCambio, lotes, asignaciones, proyecciones, stocks, costosFijos, chatMessages, apiKey,
    campanaIdActiva, costosFijosActivos, costosFijosTotal,
    loadData, cargarDatosDemo, resetData,
    loadCampanas, addCampana, delCampana, setTipoCambio,
    addLote, updLote, delLote,
    loadAsignaciones, addAsignacion, updAsignacion, delAsignacion,
    updProy,
    addStock, updStock, delStock, moveStock,
    loadCostosFijos, addCostoFijo, updCostoFijo, delCostoFijo, copiarCostosFijosDeAnterior,
    addMsg, setApiKey, setCampania,
  }
})
