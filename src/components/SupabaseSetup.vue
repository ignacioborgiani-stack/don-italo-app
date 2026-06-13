<template>
  <q-dialog :model-value="true" @hide="$emit('close')">
    <q-card style="width:500px;max-width:95vw;border-radius:14px;padding:28px">
      <div class="row items-center justify-between q-mb-md">
        <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin:0">🗄️ Supabase</h2>
        <q-btn flat round dense icon="close" @click="$emit('close')"/>
      </div>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;font-size:13px;color:#0c4a6e;line-height:1.6;margin-bottom:14px">
        <b>1.</b> Creá un proyecto en <a href="https://supabase.com" target="_blank" style="color:#0369a1">supabase.com</a><br/>
        <b>2.</b> Ejecutá <code style="background:#e0f2fe;padding:1px 5px;border-radius:3px">supabase/schema.sql</code> en el SQL Editor<br/>
        <b>3.</b> Pegá la URL y la Anon Key de <i>Settings → API</i>
      </div>

      <div style="display:grid;gap:10px;margin-bottom:14px">
        <div>
          <label class="di-lbl">Project URL</label>
          <input v-model="url" placeholder="https://xxxxxxxxxxxx.supabase.co" class="di-inp"/>
        </div>
        <div>
          <label class="di-lbl">Anon Key (public)</label>
          <input v-model="key" type="password" placeholder="sb_publishable_…" class="di-inp"/>
        </div>
      </div>

      <div v-if="st==='ok'"  style="background:#f0fdf4;border:1px solid #86efac;border-radius:7px;padding:9px 13px;font-size:13px;color:#166534;margin-bottom:12px">✅ ¡Conectado! Los datos se sincronizan con Supabase.</div>
      <div v-if="st==='err'" style="background:#fff1f2;border:1px solid #fca5a5;border-radius:7px;padding:9px 13px;font-size:13px;color:#dc2626;margin-bottom:12px">❌ No se pudo conectar. Verificá URL y clave.</div>

      <div class="row items-center justify-between">
        <div class="row q-gutter-sm">
          <q-btn v-if="store.sbConnected" flat label="Desconectar" color="negative" size="sm" @click="disconnect"/>
          <q-btn flat label="Cancelar" @click="$emit('close')"/>
        </div>
        <q-btn unelevated color="primary" :label="st==='testing'?'Conectando…':'Guardar y conectar'"
          :loading="st==='testing'" :disable="!url||!key" @click="connect"/>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useMainStore } from '../stores/main'

const store  = useMainStore()
const emit   = defineEmits(['close'])
const url    = ref(localStorage.getItem('di_sb_url') || '')
const key    = ref(localStorage.getItem('di_sb_key') || '')
const st     = ref('idle')

async function connect() {
  if (!url.value.trim() || !key.value.trim()) return
  st.value = 'testing'
  const ok = await store.initSupabase(url.value, key.value)
  st.value = ok ? 'ok' : 'err'
  if (ok) setTimeout(() => emit('close'), 900)
}

function disconnect() {
  store.disconnect()
  emit('close')
}
</script>
