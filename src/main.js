import { createApp } from 'vue'
import { Quasar, Dialog, Notify, Loading } from 'quasar'
import { createPinia } from 'pinia'
import 'quasar/src/css/index.sass'
import '@quasar/extras/material-icons/material-icons.css'
import './css/app.css'

import router from './router'
import App from './App.vue'
import { useAuthStore } from './stores/auth'

const app  = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Quasar, {
  plugins: { Dialog, Notify, Loading },
  config: {
    brand: {
      primary: '#3a6b35',
      secondary: '#4a8a44',
      accent: '#e8a838',
      dark: '#2d5a27',
      positive: '#3a6b35',
      negative: '#dc2626',
      info: '#5b8dd9',
      warning: '#e8a838',
    },
    notify: { position: 'top-right', timeout: 2500 },
  }
})

app.mount('#app')

// Inicializar auth DESPUÉS del mount (Pinia ya activa)
useAuthStore(pinia).init()
