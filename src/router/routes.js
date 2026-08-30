import MainLayout from '../layouts/MainLayout.vue'

export default [
  {
    path: '/auth',
    component: () => import('../pages/AuthPage.vue'),
    meta: { public: true },
  },
  {
    path: '/onboarding',
    component: () => import('../pages/OnboardingPage.vue'),
    meta: { public: false },
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '',             component: () => import('../pages/DashboardPage.vue') },
      { path: 'lotes-maestro', component: () => import('../pages/LotesMaestroPage.vue') },
      { path: 'catalogo',    component: () => import('../pages/CatalogoPage.vue') },
      { path: 'lotes',       component: () => import('../pages/LotesPage.vue') },
      { path: 'proyectados', component: () => import('../pages/ProyectadosPage.vue') },
      // Stocks dado de baja temporalmente (C1 de la auditoría). StocksPage.vue
      // sigue en el repo; /stocks cae en el catch-all y redirige al Dashboard.
      // { path: 'stocks',      component: () => import('../pages/StocksPage.vue') },
      { path: 'granja',      component: () => import('../pages/GranjaPage.vue') },
    ],
  },
  // Cualquier ruta desconocida va al Dashboard. Cubre los links viejos a
  // /chat (módulo eliminado), que si no quedarían en blanco.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]
