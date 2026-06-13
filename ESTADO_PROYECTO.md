# Don Italo — Estado del Proyecto

> Última actualización: junio 2026  
> Repositorio: https://github.com/ignacioborgiani-stack/don-italo-app  
> Deploy: Vercel (configurado, en proceso)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework UI | Vue 3 + Composition API (`<script setup>`) |
| Componentes | Quasar 2 (q-layout, q-btn, q-tabs, q-menu, q-dialog, etc.) |
| Build | Vite 5 + `@quasar/vite-plugin` |
| Estado global | Pinia 2 (dos stores: `main` y `auth`) |
| Router | Vue Router 4 — hash history (`createWebHashHistory`) |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Estilos | SASS variables + inline styles. Fuente: DM Sans. Fondo crema `#f5f2ea` |
| Deploy | Vercel SPA — `vercel.json` redirige todo a `index.html` |

---

## Estructura de carpetas

```
don-italo-vue/
├── public/
│   └── favicon.png              ← ícono 64×64 para pestaña del navegador
├── src/
│   ├── assets/
│   │   ├── logo.png             ← logo original (fondo negro, 1024×1024)
│   │   └── logo_transparent.png ← logo procesado (fondo transparente, 477×464)
│   ├── components/
│   │   ├── charts/
│   │   │   ├── SvgDonut.vue     ← gráfico de dona SVG (sin dependencias)
│   │   │   ├── SvgVBar.vue      ← gráfico de barras verticales SVG
│   │   │   └── SvgHBar.vue      ← gráfico de barras horizontales SVG
│   │   ├── CultivoBadge.vue     ← chip de color para mostrar cultivo
│   │   ├── CultivoBlock.vue     ← bloque completo de datos de un cultivo
│   │   ├── CultivoSelect.vue    ← selector de cultivo (invernal/estival)
│   │   ├── ItemsCostoEditor.vue ← editor de ítems de costo por cultivo
│   │   ├── LoteForm.vue         ← formulario agregar/editar lote
│   │   ├── MoveForm.vue         ← formulario trasladar stock
│   │   └── StockForm.vue        ← formulario agregar/editar insumo
│   ├── css/
│   │   ├── app.css              ← estilos globales + clase di-inp, di-lbl
│   │   └── quasar-variables.sass ← paleta de colores Quasar
│   ├── layouts/
│   │   └── MainLayout.vue       ← navbar con logo, tabs y avatar/dropdown usuario
│   ├── lib/
│   │   └── supabase.js          ← singleton: createClient desde import.meta.env
│   ├── pages/
│   │   ├── AuthPage.vue         ← login / registro (tabs, errores en español)
│   │   ├── OnboardingPage.vue   ← primera vez: elegir datos demo o vacío
│   │   ├── DashboardPage.vue    ← métricas + gráfico dona + gráfico barras
│   │   ├── LotesPage.vue        ← tabla de costos contables por campaña
│   │   ├── ProyectadosPage.vue  ← costos proyectados por cultivo
│   │   ├── ProyForm.vue         ← formulario de proyección (ítems de costo)
│   │   ├── StocksPage.vue       ← inventario de insumos con filtros
│   │   └── ChatPage.vue         ← chat con IA (Anthropic API, clave por usuario)
│   ├── router/
│   │   ├── index.js             ← router + guard de navegación
│   │   └── routes.js            ← definición de rutas
│   ├── stores/
│   │   ├── auth.js              ← useAuthStore (sesión, login, registro, logout)
│   │   └── main.js              ← useMainStore (datos agrícolas, CRUD)
│   ├── utils/
│   │   ├── calculations.js      ← cálculos de costo/ingreso/margen
│   │   ├── constants.js         ← cultivares, categorías, campañas, datos mock
│   │   ├── formatters.js        ← fmtUSD, fmtNum, fmtK
│   │   └── mappers.js           ← conversión entre objetos JS y filas de DB
│   ├── App.vue                  ← spinner de carga mientras auth.loading
│   └── main.js                  ← bootstrap: Quasar + Pinia + Router + auth.init()
├── supabase/
│   └── schema_multiusuario.sql  ← ⚠️ ejecutar en Supabase SQL Editor
├── .claude/
│   └── launch.json              ← config para preview_start (npm run dev, puerto 5173)
├── .env                         ← credenciales reales (NO en git)
├── .env.example                 ← plantilla de variables de entorno
├── .gitignore
├── index.html                   ← entry point con favicon y DM Sans
├── package.json
├── vercel.json                  ← rewrite SPA para hash router
└── vite.config.js               ← alias @ → src/, plugin Quasar
```

---

## Variables de entorno

```bash
# .env  (local — nunca subir a git)
VITE_SUPABASE_URL=https://kwfotskriuvwfbeoqone.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_zObG6NwMJ9m_6FVbOCVXmA_NvYo-fC8
```

En Vercel deben configurarse en **Project → Settings → Environment Variables** con esos mismos nombres.

---

## Supabase — Schema multi-usuario

Archivo: `supabase/schema_multiusuario.sql`  
**⚠️ Ejecutar UNA VEZ en Supabase SQL Editor. Borra y recrea todas las tablas.**

### Tablas

| Tabla | PK | Campos clave |
|---|---|---|
| `lotes` | `uuid` | user_id, nombre, campana, ha, tipo_siembra, cultivo (jsonb), cultivo_invernal (jsonb), cultivo_estival (jsonb) |
| `stocks` | `uuid` | user_id, nombre, tipo, cantidad, unidad, precio_valor, precio_moneda, ubicacion, campana |
| `proyecciones` | `uuid` | user_id, cultivo, campana, datos (jsonb) — UNIQUE(user_id, cultivo, campana) |
| `movimientos` | `uuid` | user_id, fecha, tipo, stock_id, insumo_nombre, cantidad, costo_total_ars |
| `configuracion` | `uuid` | user_id, clave, valor — UNIQUE(user_id, clave) |
| `campanas` | `uuid` | user_id, nombre — UNIQUE(user_id, nombre) |

Todas las tablas tienen:
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- RLS activado con 4 políticas (SELECT / INSERT / UPDATE / DELETE) usando `auth.uid() = user_id`

### Configuración recomendada en Supabase
- **Auth → Settings → Email Confirmations**: desactivar para registro instantáneo (prototipo)

---

## Flujo de autenticación

```
App arranca
  → auth.init() — getSession() desde Supabase
  → auth.loading = false
  → App.vue muestra <router-view>
      → beforeEach guard
          ├─ ruta pública (/auth) → pasa
          └─ ruta privada → ¿auth.autenticado?
               ├─ SÍ → pasa
               └─ NO → redirect /auth

/auth (AuthPage)
  → Login: signInWithPassword → store.loadData() → push('/')
  → Registro: signUp → push('/onboarding')  [si sesión inmediata]
            └─ si necesita confirmar email → mensaje, switch a login tab

/onboarding (OnboardingPage)  [solo primer uso]
  → "Cargar datos demo"  → store.cargarDatosDemo() → push('/')
  → "Empezar desde cero" → push('/')

MainLayout (navbar)
  → Avatar circular con inicial del nombre
  → q-menu al click: nombre + email + "Cerrar sesión"
  → doLogout: store.resetData() → auth.logout() → push('/auth')
```

---

## `useAuthStore` — `src/stores/auth.js`

### Estado
| Nombre | Tipo | Descripción |
|---|---|---|
| `session` | `ref(null)` | Sesión activa de Supabase |
| `loading` | `ref(true)` | True mientras se consulta la sesión inicial |

### Computadas
| Nombre | Retorna |
|---|---|
| `autenticado` | `Boolean` — si hay sesión activa |
| `usuario` | `{ id, email, nombre }` — extraído de `session.user` y `user_metadata` |

### Acciones
| Función | Descripción |
|---|---|
| `init()` | Llama `getSession()`, setea `session`, activa listener `onAuthStateChange`. Llamada desde `main.js` post-mount |
| `login(email, password)` | `signInWithPassword`. Lanza error si falla |
| `registrarse(email, password, nombre)` | `signUp` con `user_metadata: { nombre }`. Retorna `data` para detectar si necesita confirmación de email |
| `logout()` | `signOut` + limpia `session` |

---

## `useMainStore` — `src/stores/main.js`

### Estado
| Nombre | Tipo | Descripción |
|---|---|---|
| `sbConnected` | `ref(false)` | True si la última carga de datos fue exitosa |
| `campania` | `ref('2024/25')` | Campaña activa (selector global en navbar de cada módulo) |
| `lotes` | `ref([])` | Array de lotes del usuario |
| `proyecciones` | `ref([])` | Array de proyecciones por cultivo |
| `stocks` | `ref([])` | Array de insumos/stocks |
| `chatMessages` | `ref([])` | Historial de mensajes del chat IA (solo en memoria) |
| `apiKey` | `ref('')` | Clave Anthropic del usuario (leída desde `configuracion`) |

### Helper interno
```js
function getUid() { return useAuthStore().usuario?.id }
```
Todos los inserts usan `getUid()` internamente — las páginas no necesitan pasar `userId`.

### Acciones

#### Inicialización
| Función | Descripción |
|---|---|
| `loadData()` | Carga lotes, proyecciones, stocks y apiKey en paralelo. Setea `sbConnected`. Llamada post-login |
| `cargarDatosDemo()` | Inserta MOCK_LOTES, MOCK_PROYECCIONES y MOCK_STOCKS con `user_id`. Luego llama `loadData()` |
| `resetData()` | Limpia todo el estado (usado en logout) |

#### Lotes (Costos Contables)
| Función | Signatura | Descripción |
|---|---|---|
| `addLote` | `(lote)` | Genera UUID, inserta en DB con `user_id`, agrega al array local |
| `updLote` | `(id, delta)` | Merge del objeto existente con delta, UPDATE en DB |
| `delLote` | `(id)` | DELETE en DB + filtra del array local |

#### Proyecciones (Costos Proyectados)
| Función | Signatura | Descripción |
|---|---|---|
| `updProy` | `(cultivo, delta)` | Si existe `id` → UPDATE por id. Si no → INSERT con `user_id`. Upsert inteligente |

#### Stocks (Inventario)
| Función | Signatura | Descripción |
|---|---|---|
| `addStock` | `(stock)` | Genera UUID, inserta en DB, agrega al array |
| `updStock` | `(id, delta)` | Merge + UPDATE en DB |
| `delStock` | `(id)` | DELETE en DB + filtra del array |
| `moveStock` | `(id, nuevaUbic, cant, nota)` | Registra movimiento. Si cant ≥ stock existente: mueve todo. Si cant < stock: divide en dos registros (el original queda con la diferencia, se crea uno nuevo en la nueva ubicación) |

#### Chat y configuración
| Función | Signatura | Descripción |
|---|---|---|
| `addMsg` | `(msg)` | Agrega mensaje al historial en memoria con UUID |
| `setApiKey` | `(key)` | Guarda en estado + upsert en tabla `configuracion` con clave `'apiKey'` |
| `setCampania` | `(campana)` | Cambia la campaña activa globalmente |

---

## Utilidades — `src/utils/`

### `calculations.js`
```js
calcCostoHa(cultivo)    // Suma costoHaUsd de todos los ítems de costo
calcIngresoHa(cultivo)  // (rendimientoQq / 10) * precioVentaTn
calcLote(lote)          // Retorna { costoHa, ingresoHa, margenHa }
                        // Para doble cultivo: suma invernal + estival
getLoteName(lote)       // lote.nombre || lote.lote || '—'
getCultivoLabel(lote)   // "Trigo / Soja" (doble) o "Soja" (simple)
totalVal(item)          // cantidad * precioUnitario (valor total de un insumo)
```

### `formatters.js`
```js
fmtUSD(n)  // "$432.000" (locale es-AR, sin decimales)
fmtNum(n)  // "1.010,5"  (locale es-AR, 1 decimal)
fmtK(n)    // "$432K" o "$650" (k para miles)
```

### `mappers.js`
```js
// Lotes
loteToDb(lote)    // JS → fila DB (campana, ha, tipo_siembra, cultivo jsonb...)
loteFromDb(row)   // fila DB → JS (campaña, tipoSiembra, cultivoInvernal...)

// Proyecciones  
proyToDb(proy)    // JS → { cultivo, campana, datos: { tipo, rendimientoQq, ... } }
proyFromDb(row)   // fila DB → JS, incluye id para UPDATE posterior

// Stocks
stToDb(stock)     // JS → fila DB (precio_valor, precio_moneda, lote_asignado...)
stFromDb(row)     // fila DB → JS (precioUnitario, precioMoneda, lote...)
```

### `constants.js`
```js
CULTIVARES_INVERNALES   // Trigo, Cebada, Arveja, Colza, Carinata, Camelina, Centeno
CULTIVARES_ESTIVALES    // Soja, Maíz, Girasol, Maní, Sorgo
TODOS_CULTIVARES        // Combinación de ambos
getCultivoColor(nombre) // Devuelve color hex del cultivo
CATEGORIAS              // semilla, inoculante, fertilizante, fitosanitario, labor, cosecha, flete, arrendamiento, otros
CAMPAÑAS                // ['2024/25', '2023/24']
TIPOS_ST                // Tipos de stock para filtros
UNIDADES                // bolsas, kg, litros, toneladas, unidades
UBICS                   // insumera, galpon, aplicado (con colores para badges)
MOCK_LOTES              // 5 lotes de ejemplo
MOCK_PROYECCIONES       // 5 proyecciones (Trigo, Arveja, Soja, Maíz, Girasol)
MOCK_STOCKS             // 6 insumos de ejemplo
```

---

## Router — `src/router/`

### Rutas
| Path | Componente | Auth |
|---|---|---|
| `/auth` | `AuthPage.vue` | Pública |
| `/onboarding` | `OnboardingPage.vue` | Privada |
| `/` | `DashboardPage.vue` (dentro de MainLayout) | Privada |
| `/lotes` | `LotesPage.vue` | Privada |
| `/proyectados` | `ProyectadosPage.vue` | Privada |
| `/stocks` | `StocksPage.vue` | Privada |
| `/chat` | `ChatPage.vue` | Privada |

### Navigation guard (`index.js`)
```js
router.beforeEach(async (to) => {
  if (to.meta.public) return true          // /auth siempre pasa
  const auth = useAuthStore()
  if (!auth.autenticado) return '/auth'    // redirige si no hay sesión
})
```

---

## Historial de commits

```
1ab9eed  Agregar alias @ en vite.config.js para resolver imports de assets
ebb3629  Actualizar logo
0001387  Initial commit - Don Italo app
```

---

## Últimos cambios realizados

### Multi-usuario y autenticación
- `supabase/schema_multiusuario.sql` — Schema completo con uuid PKs, columna `user_id` en todas las tablas, RLS con 4 políticas por tabla
- `src/lib/supabase.js` — Cliente Supabase singleton (usa `import.meta.env`)
- `src/stores/auth.js` — Store de autenticación completa con persistencia de sesión
- `src/stores/main.js` — Reescrito: usa `useAuthStore()` internamente, todas las funciones usan `getUid()`, sin parámetro `userId` en la API pública
- `src/pages/AuthPage.vue` — Pantalla login/registro con tabs, validación, errores en español
- `src/pages/OnboardingPage.vue` — Pantalla de primera vez (datos demo vs vacío)
- `src/layouts/MainLayout.vue` — Avatar con inicial + `q-menu` dropdown (nombre, email, cerrar sesión)
- `src/router/index.js` — Guard `beforeEach` para proteger rutas privadas
- `src/router/routes.js` — Rutas `/auth` y `/onboarding` agregadas
- `src/App.vue` — Spinner de carga mientras `auth.loading === true`
- `src/main.js` — Llama `authStore.init()` post-mount; eliminado `store.initSupabase()`
- `src/utils/mappers.js` — `proyFromDb` ahora incluye `id` para UPDATE por id

### Logo y assets
- `src/assets/logo_transparent.png` — Fondo negro eliminado con flood fill BFS (C# inline PowerShell). Recortado al círculo: 477×464 px
- `public/favicon.png` — Versión 64×64 para pestaña del navegador
- `src/layouts/MainLayout.vue` — Emoji 🌾 reemplazado por `<img>` 40px
- `src/pages/AuthPage.vue` — Emoji 🌾 reemplazado por `<img>` 80px
- `index.html` — Agregado `<link rel="icon" type="image/png" href="/favicon.png">`

### Preparación para deploy
- `.env` / `.env.example` — Variables de entorno para Supabase (credenciales fuera del código)
- `.gitignore` — Actualizado para excluir `.env`, `node_modules`, `dist`, logs
- `vite.config.js` — Alias `@` → `src/` agregado (fix para build en Vercel)
- `vercel.json` — Rewrite SPA: todo el tráfico → `index.html`
- Git inicializado, conectado a GitHub (`ignacioborgiani-stack/don-italo-app`)

---

## Pasos pendientes para poner en producción

1. **Ejecutar `schema_multiusuario.sql`** en Supabase SQL Editor  
   ⚠️ Borra todas las tablas existentes — hacerlo antes del primer usuario real

2. **Configurar variables en Vercel**  
   Project → Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **Desactivar confirmación de email** (opcional para prototipo)  
   Supabase → Authentication → Settings → Email Confirmations → OFF

4. **Instalar dependencias localmente** (si no están instaladas):
   ```bash
   cd don-italo-vue
   npm install
   npm run dev   # → http://localhost:5173
   ```

---

## Notas técnicas importantes

- **IDs**: todos los registros usan `uuid` generado con `crypto.randomUUID()` (cliente) o `gen_random_uuid()` (DB). Esto evita colisiones entre usuarios concurrentes (reemplazó el anterior `Date.now()` como bigint)
- **RLS**: las políticas usan `auth.uid()` del JWT — el cliente Supabase envía el token automáticamente cuando hay sesión activa. Las queries NO necesitan filtrar por `user_id` explícitamente en el SELECT; RLS lo hace
- **Hash router**: `createWebHashHistory()` — las URLs son tipo `/#/lotes`. Necesario para que Vercel no rompa las rutas con su rewrite. El `vercel.json` ya está configurado correctamente
- **`updProy` upsert**: usa UPDATE por `id` si la proyección ya existe en el array local (cargada desde DB). Usa INSERT si es nueva. Esto evita conflictos con el UNIQUE constraint de DB
- **Proyecciones en jsonb**: los ítems de costo se guardan como un blob JSON en la columna `datos`. No hay tabla separada de ítems
