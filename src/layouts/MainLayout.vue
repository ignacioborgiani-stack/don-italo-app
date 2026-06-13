<template>
  <q-layout view="hHh LpR fFf">
    <q-header elevated style="background:#2d5a27">
      <q-toolbar>
        <!-- Logo -->
        <div class="row items-center q-gutter-x-sm" style="padding-right:12px;border-right:1px solid rgba(255,255,255,.15)">
          <img src="@/assets/logo_transparent.png" alt="Don Italo" style="width:40px;height:40px;object-fit:contain"/>
          <span style="color:#fff;font-weight:800;font-size:17px">Don Italo</span>
        </div>

        <!-- Tabs -->
        <q-tabs
          v-model="activeTab"
          align="left"
          dense
          no-caps
          indicator-color="transparent"
          class="q-ml-sm"
          style="flex:1"
          @update:model-value="onTab"
        >
          <q-tab v-for="t in TABS" :key="t.name" :name="t.name"
            :style="activeTab===t.name?'background:#4a8a44;border-bottom:3px solid #a8d5a2':'border-bottom:3px solid transparent'"
          >
            <template #default>
              <span style="margin-right:5px">{{ t.e }}</span>{{ t.label }}
            </template>
          </q-tab>
        </q-tabs>

        <!-- User Avatar Button -->
        <q-btn
          flat round
          class="q-ml-sm"
          style="width:34px;height:34px;min-height:unset;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);color:#fff;font-weight:700;font-size:13px"
        >
          {{ inicial }}
          <q-menu anchor="bottom right" self="top right" style="border-radius:10px;border:1px solid #d4cfc4;min-width:190px">
            <!-- Header -->
            <div style="padding:10px 16px 8px;border-bottom:1px solid #f0ede8">
              <div style="font-weight:700;font-size:13px;color:#1f2937">{{ auth.usuario?.nombre }}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px">{{ auth.usuario?.email }}</div>
            </div>
            <!-- Logout -->
            <q-item clickable v-close-popup @click="doLogout"
              style="color:#dc2626;font-weight:600;font-size:13px;padding:10px 16px">
              <q-item-section avatar style="min-width:28px">
                <q-icon name="logout" size="15px"/>
              </q-item-section>
              <q-item-section>Cerrar sesión</q-item-section>
            </q-item>
          </q-menu>
        </q-btn>

      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMainStore } from '../stores/main'
import { useAuthStore } from '../stores/auth'

const store  = useMainStore()
const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

const inicial = computed(() => (auth.usuario?.nombre?.[0] || auth.usuario?.email?.[0] || '?').toUpperCase())

const TABS = [
  { name: 'dashboard',   label: 'Dashboard',          e: '📊', path: '/' },
  { name: 'lotes',       label: 'Costos Contables',   e: '📒', path: '/lotes' },
  { name: 'proyectados', label: 'Costos Proyectados', e: '📈', path: '/proyectados' },
  { name: 'stocks',      label: 'Stocks',             e: '📦', path: '/stocks' },
  { name: 'chat',        label: 'Chat IA',            e: '🤖', path: '/chat' },
]

const pathToName = { '/': 'dashboard', '/lotes': 'lotes', '/proyectados': 'proyectados', '/stocks': 'stocks', '/chat': 'chat' }
const activeTab  = computed(() => pathToName[route.path] || 'dashboard')

function onTab(name) {
  const t = TABS.find(t => t.name === name)
  if (t) router.push(t.path)
}

async function doLogout() {
  store.resetData()
  await auth.logout()
  router.push('/auth')
}
</script>
