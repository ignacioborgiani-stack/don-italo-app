import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  // Lazy-import to avoid circular deps at module load time
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()
  if (!auth.autenticado) return '/auth'
})

export default router
