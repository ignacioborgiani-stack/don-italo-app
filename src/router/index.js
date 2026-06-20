import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const PATH_MODULO = {
  '/': 'dashboard', '/lotes-maestro': 'lotes', '/catalogo': 'catalogo',
  '/lotes': 'costos_contables', '/proyectados': 'costos_proyectados', '/stocks': 'stocks',
}

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  // Lazy-import to avoid circular deps at module load time
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()
  if (!auth.autenticado) return '/auth'

  // Permisos por módulo: sólo aplican a miembros invitados; el dueño ve todo.
  const { useGranjaStore } = await import('../stores/granja')
  const granja = useGranjaStore()
  if (granja.esPropietarioActivo) return true
  if (to.path === '/granja') return true   // la pantalla de granja siempre es accesible

  const modulo = PATH_MODULO[to.path]
  if (!modulo || !granja.puedeVer(modulo)) {
    const permitido = Object.keys(PATH_MODULO).find(p => granja.puedeVer(PATH_MODULO[p]))
    return permitido || '/granja'
  }
  return true
})

export default router
