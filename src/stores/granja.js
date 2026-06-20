import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { granjaToDb, granjaFromDb, miembroFromDb } from '../utils/mappers'

const uid = () => crypto.randomUUID()

// Módulos sobre los que se asignan permisos.
export const MODULOS = [
  { key: 'dashboard',          label: 'Dashboard',          costos: false },
  { key: 'lotes',              label: 'Lotes',              costos: false },
  { key: 'catalogo',           label: 'Catálogo',           costos: false },
  { key: 'costos_contables',   label: 'Costos Contables',   costos: true  },
  { key: 'costos_proyectados', label: 'Costos Proyectados', costos: true  },
  { key: 'stocks',             label: 'Stocks',             costos: false },
  { key: 'costos_fijos',       label: 'Costos Fijos',       costos: false },
]

export const useGranjaStore = defineStore('granja', () => {
  const miGranja     = ref(null)   // granja de la que SOY propietario (o null)
  const miembros     = ref([])     // miembros/invitaciones de mi granja
  const invitaciones = ref([])     // invitaciones que OTROS me hicieron a mí
  const loaded       = ref(false)

  // ── Contexto activo (selector de granja) ───────────────────────
  const contextoId   = ref(null)   // null = mis propios datos; si no, granja_id de una granja donde soy miembro
  const permisos     = ref([])     // granja_permisos del contexto activo (si soy miembro)
  const lotesPermitidos = ref([])  // lote_ids con acceso en el contexto activo

  const auth = useAuthStore()
  const miId    = () => auth.usuario?.id
  const miEmail = () => auth.usuario?.email

  const tieneGranja = computed(() => !!miGranja.value)
  const invitacionesPendientes = computed(() => invitaciones.value.filter(i => i.estado === 'pendiente'))

  // Granjas donde soy miembro ACEPTADO (para el selector)
  const granjasComoMiembro = computed(() =>
    invitaciones.value.filter(i => i.estado === 'aceptado' && i.granjaPropietarioId && i.granjaPropietarioId !== miId()))

  // Opciones del selector: mis datos + cada granja donde soy miembro
  const contextos = computed(() => {
    const out = [{ id: null, nombre: miGranja.value?.nombre || 'Mis datos', esPropio: true }]
    for (const m of granjasComoMiembro.value) out.push({ id: m.granjaId, nombre: m.granjaNombre || 'Granja', esPropio: false, ownerId: m.granjaPropietarioId, miembroId: m.id })
    return out
  })
  const contextoActual = computed(() => contextos.value.find(c => c.id === contextoId.value) || contextos.value[0])
  // Si estoy en mi propio contexto NO hay restricciones; si soy miembro, aplican permisos.
  const esPropietarioActivo = computed(() => !contextoActual.value || contextoActual.value.esPropio)
  // user_id de los datos a cargar: null cuando es mi propio contexto (el caller usa mi auth id).
  const activeOwnerId = computed(() => esPropietarioActivo.value ? null : contextoActual.value.ownerId)

  // ── Getters de permiso (el DUEÑO siempre obtiene true) ─────────
  const permisoDe = m => permisos.value.find(p => p.modulo === m)
  function puedeVer(modulo)    { return esPropietarioActivo.value || !!permisoDe(modulo)?.puede_ver }
  function puedeEditar(modulo) { return esPropietarioActivo.value || !!permisoDe(modulo)?.puede_editar }
  function verPrecios(modulo)  { return esPropietarioActivo.value || !!permisoDe(modulo)?.ver_precios }
  function tieneAccesoLote(loteId) { return esPropietarioActivo.value || lotesPermitidos.value.includes(loteId) }
  // Lista de módulos visibles (para menú/guard)
  const modulosVisibles = computed(() => esPropietarioActivo.value
    ? MODULOS.map(m => m.key)
    : MODULOS.filter(m => puedeVer(m.key)).map(m => m.key))

  // ── Carga ──────────────────────────────────────────────────────
  async function loadGranja() {
    const yo = miId(); const email = miEmail()
    if (!yo) return

    const { data: g, error: ge } = await supabase
      .from('granjas').select('*').eq('propietario_id', yo).maybeSingle()
    if (ge) throw ge
    miGranja.value = g ? granjaFromDb(g) : null

    if (miGranja.value) {
      const { data: ms, error: me } = await supabase
        .from('granja_miembros').select('*').eq('granja_id', miGranja.value.id).order('invitado_en')
      if (me) throw me
      miembros.value = (ms || []).map(miembroFromDb)
    } else {
      miembros.value = []
    }

    const filtros = [`user_id.eq.${yo}`]
    if (email) filtros.push(`email_invitado.eq.${email}`)
    const { data: inv, error: ie } = await supabase
      .from('granja_miembros').select('*, granjas(nombre, propietario_id)').or(filtros.join(','))
    if (ie) throw ie
    invitaciones.value = (inv || []).map(miembroFromDb).filter(i => i.granjaPropietarioId && i.granjaPropietarioId !== yo)

    // Validar el contexto activo; si dejó de ser válido, volver a "mis datos".
    if (contextoId.value && !granjasComoMiembro.value.some(m => m.granjaId === contextoId.value)) {
      contextoId.value = null
    }
    await loadPermisosActivos()
    loaded.value = true
  }

  // Permisos del contexto activo (cuando soy miembro de esa granja).
  async function loadPermisosActivos() {
    if (esPropietarioActivo.value) { permisos.value = []; lotesPermitidos.value = []; return }
    const miembroId = contextoActual.value.miembroId
    const [{ data: ps }, { data: pls }] = await Promise.all([
      supabase.from('granja_permisos').select('*').eq('miembro_id', miembroId),
      supabase.from('granja_permisos_lotes').select('*').eq('miembro_id', miembroId).eq('acceso', true),
    ])
    permisos.value = ps || []
    lotesPermitidos.value = (pls || []).map(r => r.lote_id)
  }

  // Cambiar de granja en el selector → recargar TODOS los datos del nuevo dueño.
  async function setContexto(id) {
    contextoId.value = id
    await loadPermisosActivos()
    const { useMainStore } = await import('./main')
    await useMainStore().reloadDatos()
  }

  // ── Propietario: crear / renombrar granja ──────────────────────
  async function crearGranja(nombre) {
    const n = (nombre || '').trim()
    if (!n) throw new Error('Poné un nombre para la granja')
    const { data, error } = await supabase
      .from('granjas').insert({ ...granjaToDb({ id: uid(), propietarioId: miId(), nombre: n }) }).select().single()
    if (error) throw error
    miGranja.value = granjaFromDb(data); miembros.value = []
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
      .from('granja_miembros').insert({ granja_id: miGranja.value.id, email_invitado: e, estado: 'pendiente' }).select().single()
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
      .from('granja_miembros').update(patch).eq('id', id).select('*, granjas(nombre, propietario_id)').single()
    if (error) throw error
    invitaciones.value = invitaciones.value.map(i => i.id === id ? miembroFromDb(data) : i)
  }

  // ── Propietario: permisos por miembro ──────────────────────────
  // Devuelve { modulos: {modulo:{ver,editar,verPrecios}}, lotes: [lote_id] }
  async function loadPermisosMiembro(miembroId) {
    const [{ data: ps, error: e1 }, { data: pls, error: e2 }] = await Promise.all([
      supabase.from('granja_permisos').select('*').eq('miembro_id', miembroId),
      supabase.from('granja_permisos_lotes').select('*').eq('miembro_id', miembroId),
    ])
    if (e1) throw e1; if (e2) throw e2
    const modulos = {}
    for (const p of ps || []) modulos[p.modulo] = { ver: p.puede_ver, editar: p.puede_editar, verPrecios: p.ver_precios }
    const lotes = (pls || []).filter(r => r.acceso).map(r => r.lote_id)
    return { modulos, lotes }
  }

  // Guarda permisos de un miembro: upsert de los 7 módulos + reescribe la whitelist de lotes.
  async function guardarPermisosMiembro(miembroId, modulos, lotes) {
    const filasMod = MODULOS.map(m => ({
      miembro_id: miembroId,
      modulo: m.key,
      puede_ver: !!modulos[m.key]?.ver,
      puede_editar: !!modulos[m.key]?.editar,
      ver_precios: !!modulos[m.key]?.verPrecios,
    }))
    const { error: e1 } = await supabase.from('granja_permisos').upsert(filasMod, { onConflict: 'miembro_id,modulo' })
    if (e1) throw e1
    // Whitelist de lotes: borrar y volver a insertar los concedidos.
    const { error: e2 } = await supabase.from('granja_permisos_lotes').delete().eq('miembro_id', miembroId)
    if (e2) throw e2
    if (lotes.length) {
      const filasLotes = lotes.map(loteId => ({ miembro_id: miembroId, lote_id: loteId, acceso: true }))
      const { error: e3 } = await supabase.from('granja_permisos_lotes').insert(filasLotes)
      if (e3) throw e3
    }
  }

  function reset() {
    miGranja.value = null; miembros.value = []; invitaciones.value = []
    contextoId.value = null; permisos.value = []; lotesPermitidos.value = []
    loaded.value = false
  }

  return {
    miGranja, miembros, invitaciones, loaded,
    contextoId, permisos, lotesPermitidos,
    tieneGranja, invitacionesPendientes, granjasComoMiembro,
    contextos, contextoActual, esPropietarioActivo, activeOwnerId, modulosVisibles,
    puedeVer, puedeEditar, verPrecios, tieneAccesoLote,
    loadGranja, loadPermisosActivos, setContexto,
    crearGranja, renombrarGranja, invitar, quitarMiembro, responderInvitacion,
    loadPermisosMiembro, guardarPermisosMiembro, reset,
  }
})
