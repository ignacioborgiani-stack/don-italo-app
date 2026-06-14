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
      { path: 'stocks',      component: () => import('../pages/StocksPage.vue') },
      { path: 'chat',        component: () => import('../pages/ChatPage.vue') },
    ],
  },
]
