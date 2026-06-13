<template>
  <q-page style="display:flex;flex-direction:column;height:calc(100vh - 56px)">
    <div v-if="!store.apiKey" style="background:#fef3c7;border:1px solid #f59e0b;margin:12px 16px;border-radius:8px;padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:13px">
      <span>🔑</span>
      <span style="flex:1">Configurá tu API key de Anthropic para usar el chat.</span>
      <button @click="showKey=true" style="padding:5px 14px;background:#d97706;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit">Configurar</button>
    </div>

    <div ref="msgList" style="flex:1;overflow-y:auto;padding:16px;background:#ece5d8;display:flex;flex-direction:column;gap:12px">
      <div v-if="!store.chatMessages.length" style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:14px;opacity:.7">
        <div style="font-size:52px">🌾</div>
        <p style="font-size:15px;font-weight:600;color:#374151">Asistente agrícola Don Italo</p>
        <p style="font-size:13px;color:#6b7280;text-align:center;max-width:340px">Consultá stocks, costos o subí fotos de facturas/remitos.</p>
      </div>
      <div v-for="m in store.chatMessages" :key="m.id" style="display:flex;flex-direction:column" :style="{alignItems:m.role==='user'?'flex-end':'flex-start'}">
        <div :style="{maxWidth:'75%',padding:'10px 14px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.role==='user'?'#2d5a27':'#fff',color:m.role==='user'?'#fff':'#1a1a1a',boxShadow:'0 1px 3px rgba(0,0,0,.1)',fontSize:'14px',lineHeight:1.5}">
          <img v-if="m.image" :src="m.image.preview" style="max-width:200px;border-radius:8px;margin-bottom:8px;display:block"/>
          <span v-if="m.role==='user'" style="white-space:pre-wrap">{{ m.text }}</span>
          <span v-else v-html="md(m.text)"/>
          <div v-if="m.parsedDoc" style="margin-top:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px">
            <p style="font-size:12px;font-weight:700;color:#166534;margin-bottom:8px">📋 Datos extraídos</p>
            <router-link to="/stocks" style="padding:4px 10px;background:#3a6b35;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;text-decoration:none">Ver Stocks</router-link>
          </div>
        </div>
        <span style="font-size:10px;color:#9ca3af;margin-top:2px">{{ m.ts }}</span>
      </div>
      <div v-if="loading" style="display:flex">
        <div style="background:#fff;border-radius:16px 16px 16px 4px;padding:12px 18px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
          <div style="display:flex;gap:5px">
            <div v-for="i in 3" :key="i" :style="{width:'8px',height:'8px',borderRadius:'50%',background:'#9ca3af',animation:`bounce 1.2s ease-in-out ${(i-1)*.4}s infinite`}"/>
          </div>
        </div>
      </div>
    </div>

    <div v-if="img" style="padding:6px 16px;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;align-items:center;gap:10px">
      <img :src="img.preview" style="width:44px;height:44px;object-fit:cover;border-radius:6px"/>
      <span style="font-size:13px;flex:1">{{ img.name }}</span>
      <button @click="img=null" style="background:none;border:none;cursor:pointer;font-size:18px;color:#6b7280">×</button>
    </div>

    <div style="padding:10px 16px;background:#fff;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:flex-end">
      <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="onFile"/>
      <button @click="fileInput.click()" style="width:40px;height:40px;border-radius:50%;border:1.5px solid #d1d5db;background:#fff;cursor:pointer;font-size:18px">📎</button>
      <textarea ref="ta" v-model="text"
        @keydown.enter.exact.prevent="send"
        @input="autoResize"
        placeholder="Escribí un mensaje… (Enter para enviar)" rows="1"
        style="flex:1;resize:none;border:1.5px solid #d1d5db;border-radius:20px;padding:10px 16px;font-size:14px;outline:none;max-height:120px;font-family:'DM Sans',system-ui,sans-serif;line-height:1.4"/>
      <button @click="send" :disabled="loading||(!text.trim()&&!img)"
        :style="{width:'44px',height:'44px',borderRadius:'50%',background:loading||(!text.trim()&&!img)?'#9ca3af':'#2d5a27',color:'#fff',border:'none',cursor:'pointer',fontSize:'18px',flexShrink:0}">
        {{ loading ? '⏳' : '➤' }}
      </button>
    </div>

    <!-- API key modal -->
    <q-dialog v-if="showKey" :model-value="true" @hide="showKey=false">
      <q-card style="width:440px;max-width:95vw;border-radius:14px;padding:28px">
        <h2 style="font-size:17px;font-weight:700;color:#2d5a27;margin-bottom:6px">🔑 API Key de Anthropic</h2>
        <p style="font-size:13px;color:#6b7280;margin-bottom:14px">Se guarda localmente. Conseguila en console.anthropic.com</p>
        <input v-model="tmpKey" type="password" placeholder="sk-ant-…" class="di-inp" style="padding:10px 14px;font-size:14px;margin-bottom:14px" @keydown.enter="saveKey"/>
        <div class="row justify-end q-gutter-sm">
          <q-btn flat label="Cancelar" @click="showKey=false"/>
          <q-btn unelevated color="primary" label="Guardar" @click="saveKey"/>
        </div>
      </q-card>
    </q-dialog>

    <style>@keyframes bounce{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}</style>
  </q-page>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useMainStore } from '../stores/main'

const store    = useMainStore()
const text     = ref('')
const img      = ref(null)
const loading  = ref(false)
const showKey  = ref(false)
const tmpKey   = ref(store.apiKey || '')
const msgList  = ref(null)
const fileInput= ref(null)
const ta       = ref(null)

function autoResize(e) { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }

function onFile(e) {
  const f = e.target.files?.[0]; if (!f) return
  const r = new FileReader()
  r.onload = ev => { img.value = { data: ev.target.result.split(',')[1], mediaType: f.type, preview: ev.target.result, name: f.name } }
  r.readAsDataURL(f); e.target.value = ''
}

function saveKey() { store.setApiKey(tmpKey.value); showKey.value = false }

function buildSys() {
  const stocks = store.stocks.map(i => `${i.nombre}: ${i.cantidad} ${i.unidad} (${i.ubicacion}${i.lote ? ' → ' + i.lote : ''})`).join('\n') || 'Sin stocks.'
  const lotes  = store.lotes.map(l => `${l.nombre} — ${l.cultivo?.nombre || (l.cultivoInvernal?.nombre + '/' + l.cultivoEstival?.nombre)} — ${l.ha}ha`).join('\n') || 'Sin lotes.'
  return `Sos el asistente agrícola de Don Italo. Cuando el usuario sube una foto de factura o remito, extraé la info en JSON: { tipo, proveedor, fecha, productos:[{nombre,cantidad,unidad,precio_unitario,precio_total}], total, numero_documento }. Confirmá los datos y preguntá a qué lote asignar y ubicación. Respondé siempre en español rioplatense.\n\nSTOCKS:\n${stocks}\n\nLOTES:\n${lotes}`
}

async function send() {
  if (!text.value.trim() && !img.value) return
  if (!store.apiKey) { tmpKey.value = ''; showKey.value = true; return }
  store.addMsg({ role: 'user', text: text.value, image: img.value, ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) })
  const curText = text.value, curImg = img.value
  text.value = ''; img.value = null; loading.value = true
  await nextTick(); msgList.value?.scrollTo(0, msgList.value.scrollHeight)
  try {
    const content = []
    if (curImg) content.push({ type: 'image', source: { type: 'base64', media_type: curImg.mediaType, data: curImg.data } })
    content.push({ type: 'text', text: curText || 'Analizá esta imagen.' })
    const history = store.chatMessages.slice(-10).filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.role === 'user' ? (m.text || 'Imagen') : m.text }))
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': store.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-calls': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, system: buildSys(), messages: [...history, { role: 'user', content }] })
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`) }
    const data = await res.json()
    const txt  = data.content?.[0]?.text || '(Sin respuesta)'
    const jsonMatch = txt.match(/\{[\s\S]*"productos"[\s\S]*\}/)
    const parsed    = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    store.addMsg({ role: 'assistant', text: txt, parsedDoc: parsed, ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) })
  } catch (e) {
    store.addMsg({ role: 'assistant', text: `❌ Error: ${e.message}`, ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) })
  } finally {
    loading.value = false
    await nextTick(); msgList.value?.scrollTo(0, msgList.value.scrollHeight)
  }
}

function md(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/`(.*?)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\n/g, '<br>')
}
</script>
