# Don Italo — gestión agrícola

App web para productores agrícolas de Casilda (Santa Fe, Argentina). Sirve para
planificar y controlar los costos de una campaña: qué se siembra en cada lote,
cuánto cuesta, cuánto rinde y cuánto margen deja. La usa el dueño del campo, que
puede invitar colaboradores (ingeniero agrónomo, contador) con permisos acotados.

**Stack:** Vue 3 (`<script setup>`) · Quasar 2 (como plugin de Vite, no el CLI) ·
Pinia · Vue Router 4 con hash history · Vite 5 · Supabase (PostgreSQL + Auth + RLS).

**Deploy:** Vercel, rama `main` con auto-deploy. En producción, con datos reales
y usuarios invitados. Repo: `ignacioborgiani-stack/don-italo-app`.

**Correr local:** `npm run dev` → http://localhost:5173 (no `quasar dev`).
Las credenciales van en `.env`, que no está en git; ver `.env.example`.

---

## Conceptos del negocio

Sin esto, el código no se entiende.

- **Campaña** — el ciclo agrícola, nombrado `"2024/25"`. Casi todo está scopeado a
  la campaña activa, que se elige en la barra superior. El año se deduce de los
  primeros 4 caracteres del nombre.
- **Lote** — una parcela con nombre y hectáreas. Vive en un catastro permanente
  (`lotes_maestro`) y aparte se le asigna un cultivo por campaña
  (`asignaciones_campana`). Separar las dos cosas permite que un lote cambie de
  cultivo cada año sin duplicar el catastro.
- **Cultivo simple vs doble** — un lote puede tener un cultivo, o dos en la misma
  campaña sobre las **mismas hectáreas**: un invernal (trigo) y después un estival
  de segunda sobre el rastrojo (soja 2da). Eso es el "doble cultivo". En un doble,
  las hectáreas físicas son las mismas pero las sembradas cuentan doble.
- **Unidades** — el rinde se carga en **quintales por hectárea (qq/ha)**; 10 qq = 1 tn.
  Los precios de venta en **USD por tonelada**. Los costos, en **USD por hectárea**.
  Las conversiones qq→tn aparecen por todos lados como `/ 10`.
- **Tipo de cambio** — los insumos y servicios cotizados en pesos se pasan a USD con
  el dólar oficial del Banco Nación, que la app trae de la API pública de bluelytics
  al cargar. Se usa **`oficial.value_buy` (COMPRA)**, no la venta: es el dólar al que
  el productor liquida el grano, así que es la vara real contra la que se miden los
  costos. Como el TC va en el **divisor**, compra (más baja que venta) hace que los
  insumos en pesos valgan **más** medidos en USD. El usuario puede sobreescribirlo a
  mano y ese override gana hasta que vuelva al valor del BNA. Si la API falla, se usa
  el último valor guardado en `configuracion`.

---

## Módulos

| Módulo | Qué hace |
|---|---|
| **Dashboard** | Dos pestañas. "General": hectáreas, resultado bruto y neto, distribución por cultivo, costo vs ingreso por lote y los rindes de indiferencia por cultivo. "Encargar insumos": placeholder, sin desarrollar. |
| **Lotes** | El catastro: nombre, hectáreas, ubicación, mapa satelital con perímetro (KML). Acá también se cargan los contratos de alquiler de cada lote. |
| **Catálogo** | Precios de referencia en tres pestañas: insumos, labores/servicios y cultivos (precio USD/tn y rinde estimado). |
| **Costos Contables** | Lo que realmente pasó en cada lote de la campaña. Precios congelados al guardar. |
| **Costos Proyectados** | El presupuesto **por cultivo**, no por lote. Recalcula en vivo con el catálogo. Soporta simple y doble, y tiene plantillas reutilizables. |
| ~~**Stocks**~~ | Inventario de insumos, con traslados y aplicación en campo. **Dado de baja temporalmente** — ver abajo. |
| **Mi Granja** | Invitar colaboradores y definir sus permisos por módulo, lote y campaña. |

El módulo **Chat IA fue eliminado** (commit `cd1e4a9`). Si aparece una referencia,
es residuo.

### Stocks está dado de baja temporalmente

**Por qué.** Es el hallazgo **C1** de la auditoría. `aplicarEnLote` busca el lote en
la tabla legacy `lotes` y guarda ahí el ítem de costo, pero Costos Contables lee
`asignaciones_campana` desde el refactor a `lotes_maestro`. O sea: **aplicar un
insumo en campo descuenta el stock y el costo nunca llega al lote.**

Peor: `migrarAplicados` corría en **cada carga de la app** — aunque nadie abriera el
módulo — y por cada stock en 'aplicado' escribía el costo en la tabla equivocada y
después **borraba el stock**, con el error tapado por un `console.warn`. Ese es el
motivo real de la urgencia: no era un módulo roto, era pérdida de datos silenciosa
en background.

**Qué se hizo.** Nada se borró; el módulo queda dormido:

- La llamada a `migrarAplicados` está comentada en `reloadDatos` (`stores/main.js`),
  con la función conservada abajo y marcada como sin uso. **Esto es lo esencial.**
- Fuera del menú (`TABS` en `MainLayout.vue`), de las rutas (`router/routes.js` y
  `PATH_MODULO` en `router/index.js`) y del panel de permisos (`MODULOS` en
  `stores/granja.js`). `/stocks` cae en el catch-all y redirige al Dashboard.
- `StocksPage.vue`, el CRUD de stocks en el store, las tablas `stocks` y
  `movimientos` y sus políticas RLS **siguen intactos**. Los permisos de módulo ya
  concedidos tampoco se pierden: `guardarPermisosMiembro` hace upsert de los módulos
  listados y no borra los que faltan.

**Qué hay que arreglar ANTES de revivirlo:**

1. **C1 —** `aplicarEnLote` tiene que escribir en `asignaciones_campana` (el cultivo
   de la asignación de esa campaña), no en `lotes`. Es el arreglo de fondo: hay que
   decidir en qué etapa cae el ítem y respetar el `sinProrrateo: true`.
2. **I6 —** la tabla `lotes` no tiene políticas `gm_`, así que hoy el flujo entero
   falla en silencio para cualquier miembro invitado. Si el punto 1 mueve todo a
   `asignaciones_campana` (que sí las tiene), esto se resuelve solo; si no, hay que
   agregarlas.
3. **I5 —** `StocksPage.vue` muestra el precio unitario en USD sin ningún gate:
   `ver_precios` no existe para este módulo porque `MODULOS` lo tiene con
   `costos: false`. Un miembro con acceso a Stocks ve el precio de compra de cada
   insumo. Hay que pasarlo a `costos: true` y gatear la columna.
4. **M7 —** `movimientos` se escribe y **ninguna pantalla lo lee**. O se le da uso
   (un historial de movimientos sería lo natural) o se deja de escribir.

Antes de revivirlo conviene correr las dos consultas de diagnóstico para ver cuántos
ítems quedaron varados en `lotes` y qué registró `movimientos`.

**Diagnóstico corrido el 27/09/2026** (`supabase/diagnostico_stocks_baja.sql`):

- **5 ítems varados** en la tabla legacy `lotes`, todos de la campaña **2024/25**, en
  los lotes **El Bajo**, **La Esperanza** y **San Roque**. Son de una **cuenta de
  prueba**, no de la operación real. **No tocarlos.** Limpiarlos cuando se reviva
  Stocks, junto con el arreglo de `aplicarEnLote`.
- `movimientos`: un solo traslado y **ningún `aplicado`**. O sea que en la operación
  real "aplicar en campo" nunca llegó a ejecutarse: **C1 no costó datos productivos**.

---

## El editor de costos

Es el corazón de la app y se comparte entre Contables y Proyectados
(`ItemsCostoCatalogo.vue` + `ItemCostoRow.vue`).

El costo de un cultivo es una lista de ítems agrupados en **etapas** que define el
usuario (Barbecho, Siembra, Protección…), reordenables arrastrando, con los ítems
movibles entre etapas. Las etapas viven en el mismo JSONB que los ítems.

**Hectáreas aplicadas por etapa** — una etapa puede haberse aplicado sobre menos
hectáreas que el lote (34 de 50) o sobre más (dos pasadas sobre 50 = 100). Se define
en el menú ⋮ del encabezado de la etapa y se prorratea:

```
costo USD/ha de lote = costo por ha aplicada × (ha etapa ÷ ha lote)
```

Sin el campo el factor es 1 y los números quedan idénticos. **No hay tope**: puede
ser mayor a las hectáreas del lote. Sólo aparece en Contables, donde se conocen las
hectáreas del lote. Helpers: `factorEtapa` / `factorItem` en `calculations.js`.

### Orden de categorías

Fijo, en `ORDEN_CATEGORIA` (calculations.js) y duplicado en `ORDEN_CAT`
(resumenInsumos.js) para el Excel — **si tocás uno, tocá el otro**:

```
semilla · inoculante · fertilizante · fitosanitario · labor · seguro ·
flete · cosecha · comercializacion · arrendamiento · otros
```

### Categorías con cálculo propio

La mayoría de los ítems se vinculan a un producto del catálogo y valen
`precio × dosis`. Cuatro categorías son **especiales** (`CATEGORIAS_ESPECIALES`) y
guardan sus parámetros en `item.parametroEspecial`:

| Categoría | Fórmula |
|---|---|
| **Cosecha** | `% × rinde_tn × precio_tn` (o monto fijo USD/ha) |
| **Seguro** | monto fijo USD/ha, **o** `% prima × precio_tn × rinde asegurado` |
| **Arrendamiento** | `usd_ha` fijo · `qq_soja` = `valor × precio_soja ÷ 10` · `porc_grano` = `% × rinde_tn × precio_tn` |
| **Comercialización** | `[(% corredor + % sellado)/100 × precio_tn + ARS_por_tn ÷ tipo_cambio] × rinde_tn` |

Comercialización precarga valores típicos como sugerencia
(`COMERCIALIZACION_DEFAULT` = 0,50 % corredor, 0,07 % sellado, $850 ARS/tn), todos
editables por ítem.

### Canon de HT (hectárea tecnológica)

No es una categoría: es un **producto del catálogo con unidad `'ht'`**, que se usa
en categoría "otros". Una HT tiene precio fijo en USD pero cubre N toneladas
entregadas, así que las HT que consume un lote dependen del rinde:

```
costo USD/ha = precio_HT × rinde_tn ÷ tn_por_HT
```

`tn_por_HT` es un **campo propio del ítem** (`item.tnPorHT`, default 3), no la dosis
— en toda la app la dosis multiplica y acá dividiría, y además la dosis se suma en
los resúmenes de insumos. El ítem se marca `modoHT: true` al elegir el producto,
para que el cálculo no dependa de que la fila del catálogo siga existiendo.

Equivalencia clave: `precio_HT ÷ tn_por_HT` es el costo en **USD por tonelada**, y
por eso el canon es un **costo variable** que escala con la producción.

---

## Alquiler

El alquiler es información del **lote**, no del cultivo, porque depende del precio
de un cultivo de referencia y no es un monto fijo en USD.

Se carga como **contrato** en el módulo Lotes, con un rango de campañas
(`campana_inicio`..`campana_fin`). Un lote puede tener varios contratos históricos,
siempre que los rangos no se superpongan — validado en el front y por un trigger SQL.

**Sólo existen dos tipos:**

| Tipo | Cálculo |
|---|---|
| `quintales_fijos` | `cantidad(qq/ha) × ha ÷ 10 × precio_referencia` |
| `porcentaje_cosecha` | `cantidad(%) ÷ 100 × rinde_estival × ha ÷ 10 × precio_referencia` |

No hay contrato de monto fijo en USD. Un alquiler fijo en dólares se carga como
ítem de categoría arrendamiento con modalidad `usd_ha`, que es otra cosa.

El **cultivo de referencia por defecto es Soja**, aunque el lote tenga trigo o maíz:
acá los alquileres se pactan en quintales de soja. Al editar un contrato guardado se
respeta el cultivo que tiene.

**En doble cultivo** el alquiler se reparte entre los dos cultivos con un % que
define el usuario (`repartoEstival` / `repartoInvernal`). En Contables el reparto
vive en el contrato; en Proyectados, donde no hay lote ni contrato, el alquiler sale
de los ítems `arrendamiento` del presupuesto: se juntan los de ambos cultivos y se
reparten. El reparto **no cambia el total consolidado**, sólo cómo se imputa.

**Anti doble conteo:** si el lote tiene contrato, se ignoran los ítems manuales de
categoría arrendamiento. El modal "Ver" avisa cuando coexisten.

---

## Indicadores

En `indicadoresCultivo` (calculations.js), usada por el Dashboard, Proyectados y el
modal Ver de Contables.

**Contribución marginal por tonelada** — definición clásica:

```
margenContribTn = precio_USD_tn − (costos_variables_ha ÷ rinde_tn)
```

Variables son los que escalan con las toneladas: las categorías de
`CATEGORIAS_VARIABLES_TN = ['cosecha', 'flete', 'comercializacion']` **más el canon
de HT**, que se carga en categoría "otros" y por eso se reconoce por el flag
`modoHT` del ítem (helper `esItemVariableTn`). Semilla, fertilizantes,
fitosanitarios, labores, seguro y arrendamiento son fijos por hectárea y no entran.

**Rinde de indiferencia** — con y sin alquiler:

```
rindeIndifTn = costos_fijos_ha ÷ margenContribTn
```

donde `costos_fijos_ha = costo_total_ha − costos_variables_ha`, sobre la misma base
para que no haya doble conteo. Dividir el costo total por el precio (como se hacía
antes) se muerde la cola cuando hay costos que escalan con el rinde.

Si la contribución marginal **no es positiva** no existe rinde que dé cero:
`rindeIndif*` devuelven `null` y `sinRindeIndif` queda en `true`. Las tres pantallas
muestran un guión y, en rojo, *"La contribución marginal es negativa: ningún rinde
cubre los costos variables."* Ojo al ordenar por rinde: `null` restado da `NaN`.

### El alquiler, en el denominador con alquiler

Del alquiler sólo escala con el rinde la parte por porcentaje: el ítem `porc_grano`
y el contrato `porcentaje_cosecha`. `usd_ha`, `qq_soja` y `quintales_fijos` son
fijos — el de quintales de soja depende del precio de la soja, no de tu rinde.

Por eso hay **dos denominadores**: el visible (la contribución marginal, sin
alquiler) y uno interno que además descuenta el alquiler variable, usado sólo para
el rinde de indiferencia CON alquiler. Helpers: `alquilerVariableHaItems` y
`alquilerVariableDeContrato`; en Contables la parte variable sigue la misma rama que
el alquiler (del contrato si hay contrato, del ítem si no), y `calcProyDoble` la
reparte con el mismo porcentaje que el total.

Consecuencia para el usuario: dividir los costos fijos por la contribución marginal
que se muestra **no** da el rinde con alquiler. De ahí el asterisco y el tooltip
*"Descuenta la parte del alquiler que varía con el rinde"*.

El caso sin solución se desdobla en `sinRindeIndifSin` y `sinRindeIndifCon`, porque
el alquiler por porcentaje puede tumbar el rinde con alquiler con la contribución
visible todavía positiva; decir ahí "la contribución marginal es negativa" sería
falso. `mensajeSinRinde` elige el texto, y los dos viven en `MSG_SIN_RINDE` para que
las tres pantallas no se desincronicen.

---

## Convenciones

**Precios congelados vs vivos.** Es la diferencia central entre los dos módulos de costos:

- **Contables** congela: al guardar, cada ítem guarda `costoHaCalculado` (USD/ha, ya
  prorrateado por las hectáreas de la etapa) y `precioUnit` (precio efectivo por
  unidad de dosis). Abrir un lote viejo y guardarlo sin tocar nada **no debe cambiar
  ningún número**. Es la promesa central de la app.
- **Proyectados** recalcula en vivo contra el catálogo actual.

`costoHaCalculado` es la fuente de casi todo lo demás: totales, márgenes,
indicadores, Dashboard y Excel. Por eso el prorrateo por hectáreas de etapa se
aplica ahí y no en cada consumidor.

**RLS.** La seguridad real está en la base, no en la interfaz. Todas las tablas
tienen `user_id` y políticas `auth.uid() = user_id` para el dueño, más políticas con
prefijo `gm_` para los miembros de granja, que se combinan con OR y usan funciones
`SECURITY DEFINER` para evitar recursión. El gating de la UI (menú, router guard,
`ver_precios`) es **cosmético**.

**Scoping por dueño.** Los stores usan `getOwnerId()` (= dueño del contexto activo,
o mi propia cuenta) para leer y escribir. Un miembro invitado opera sobre los datos
del dueño, no sobre los suyos.

**El precio de cultivo está atado a la CAMPAÑA.** `catalogo_cultivos.precio_usd_tn`
es un solo precio global, y el alquiler se calcula **en vivo** con él
(`calcAlquilerTotal`: las dos modalidades de contrato multiplican por
`precioRef = cultivosPrecio[cultivoReferencia]`). Con un precio global, cambiarlo
movía el alquiler —y el margen— de **todas** las campañas, incluidas las cerradas.

Por eso existe `precios_cultivo_campana` (migración 16) y **un solo lugar** arma el
mapa: `main.cultivosPrecio`, que resuelve por la campaña activa. Antes se armaba con
`Object.fromEntries(catStore.cultivos.map(...))` repetido en nueve componentes: si
agregás un consumidor nuevo, usá el del store, **no lo vuelvas a armar del catálogo**.

El catálogo quedó como *precio de hoy / semilla*: sólo se usa de respaldo cuando la
campaña todavía no tiene fila propia para ese cultivo, que después del backfill pasa
únicamente en campañas nuevas. `precioCampanaDe(cultivo)` devuelve la fila con su
`origen` ('manual' o 'pizarra') y su `fecha`; `cultivosSinPrecioCampana` lista los que
están cayendo al respaldo.

**Campaña por defecto.** Nunca un año hardcodeado. Se resuelve: la última elegida en
esa granja (guardada en `localStorage` con el `user_id` del dueño en la clave) → la
más reciente → vacío. Cambiar de granja o de usuario no arrastra la campaña de la otra.

---

## Migraciones

En `supabase/`, se corren a mano en el SQL Editor. Todas idempotentes salvo el schema base.

| Archivo | Qué hace |
|---|---|
| `schema_multiusuario.sql` | Schema base. **Borra y recrea** — sólo para arrancar de cero. |
| `migration_tablas_nuevas.sql` | `campanas` + `catalogo_insumos`. |
| `01_catalogo` | Catálogo de insumos. |
| `02_lotes_maestro` | `lotes_maestro` + `asignaciones_campana`, y migra los datos de `lotes`. |
| `03_poligono` | Columna `poligono` (perímetro KML) en lotes_maestro. |
| `04_catalogo` | `catalogo_cultivos` (precio USD/tn, rindes de referencia). |
| `05_labores` | `catalogo_labores` (siembra, cosecha, flete, aplicaciones). |
| `06_costos_fijos` | `costos_fijos` de estructura por campaña. Primera tabla con `campana_id` (FK). |
| `07_granjas` | `granjas` + `granja_miembros` (invitaciones). |
| `08_granja_permisos` | Permisos por módulo y por lote + políticas `gm_` en las tablas de datos. |
| `09_granja_permisos_campanas` | Whitelist de campañas por miembro. |
| `10_plantillas_costos` | Plantillas reutilizables de presupuesto. |
| `11_contratos_alquiler` | `contratos_alquiler` con rango de campañas (consolidada: absorbió la vieja 12). |
| `13_contratos_alquiler_multiple` | Varios contratos por lote + trigger anti-solape. |
| `14_seguridad` | Arreglos de la auditoría: RPC `aceptar_invitacion`, gate de campaña en los datos, whitelist de lotes en stocks, políticas de `movimientos`. |
| `15_plantillas_doble` | `tipo_siembra` + `datos` en plantillas, para plantillas de doble cultivo. |
| `16_precios_campana` | `precios_cultivo_campana` (precio por cultivo × campaña) + `catalogo_cultivos.pizarra_producto`. Corrida el 09/09/2026. **Ojo:** la sección 1 hace `ALTER TABLE catalogo_cultivos`, que necesita lock exclusivo — con la app abierta y dos pestañas del SQL Editor a la vez dio *deadlock* y quedó a medias (tabla creada, políticas no). Correrla de a una pestaña y con la app cerrada. |

No hay migración 12: se fusionó en la 11.

---

## ⚠️ Trampas conocidas

Cosas que ya rompieron algo y no son obvias leyendo el código.

**`syncUp` descarta los campos de etapa.** En `ItemsCostoCatalogo`, `syncUp()`
reconstruye las etapas explícitamente. Si agregás un campo nuevo a una etapa y no lo
incluís ahí, **se pierde en la siguiente edición, en silencio**. Pasó con
`haAplicadas`.

**`buildGrupos` reconstruye el precio dividiendo.** Al abrir un ítem existente en
Contables, el precio unitario se recalcula como
`costoHaCalculado / (dosis × factorEtapa)`. Dos consecuencias: si cambiás cómo se
guarda `costoHaCalculado`, hay que ajustar esa división o **se corrompen los precios
históricos al reabrir**; y los ítems que no siguen el patrón precio × dosis (canon
HT) deben quedar excluidos.

**`ItemsCostoCatalogo` no observa cambios de props.** Arma su estado interno una sola
vez en el setup. Si cambiás los ítems desde afuera (cargar una plantilla, por
ejemplo), **hay que remontarlo cambiando su `:key`** o la pantalla sigue mostrando lo
anterior aunque el estado ya cambió. En doble cultivo la key va en cada `CultivoBlock`.

**El SUMIFS de Excel no distingue mayúsculas.** Si el catálogo tiene "DIFLUFENICAN" y
"diflufenican" como productos distintos y generás una fila para cada uno, **cada
SUMIFS suma los dos y el total sale duplicado**. Por eso la hoja "Consumo campaña"
agrupa ignorando mayúsculas y emite una sola fila por grupo. Lo mismo con los
comodines `*` `?`: hay que escaparlos con `~` o un producto llamado "Zinc *" se come
a "Zinc 20" y "Zinc 40".

**SheetJS descarta filas fuera del `!ref` sin avisar.** Si escribís celdas más abajo
del rango que dejó `aoa_to_sheet` y no ampliás `ws['!ref']`, `writeFile` **las tira
en silencio**. Se perdía todo el bloque de control de la hoja de consumo. Además: el
nombre de hoja con espacio va entre comillas simples en las fórmulas
(`'Resumen 2024-25'!$H:$H`), el build ESM de `xlsx` no tiene `fs` conectado (hay que
llamar `XLSX.set_fs(fs)` para probar en Node), y `readFile` del build community no
devuelve las fórmulas — para verificarlas hay que mirar el XML.

**Ítems que vienen de Stocks.** `aplicarEnLote` ya divide el costo por las hectáreas
del lote, así que esos ítems se marcan `sinProrrateo: true` para que el prorrateo por
etapa no los aplique dos veces. *(La marca está bien puesta, pero el camino entero
está roto aguas arriba: ver la baja de Stocks más arriba. Tenerlo en cuenta cuando
se rehaga `aplicarEnLote`.)*

**`.di-inp` y `.di-lbl` no existen.** Las usan unos 20 componentes y **no están
definidas en ningún CSS**, así que los inputs quedan con el estilo por defecto del
browser y sin ancho. Ya causó un solapamiento visible en la fila de costos, resuelto
con estilos locales. Definirlas globalmente arreglaría todos los formularios de una,
pero cambia el aspecto de toda la app.

**Errores de Supabase.** Son objetos `{message, code}`, no `Error`. Si los concatenás
salen como `[object Object]`.

---

## Hallazgos abiertos de la auditoría — motor de cálculo

Los tres son de la misma familia (el congelado de precios y su reconstrucción) y
conviene atacarlos juntos. Ninguno está arreglado.

**I1 — En doble cultivo el alquiler variable usa el rinde equivocado.** Con contrato
`porcentaje_cosecha`, el monto se calcula con **un solo rinde, el del estival**, y
después se reparte entre los dos cultivos. Verificado: mover el rinde estival de 47 a
60 qq cambió el alquiler del **invernal** de 93,06 a 118,80 USD/ha; mover el rinde del
invernal no cambió nada. Consecuencia: el rinde de indiferencia con alquiler del
invernal trata como variable una plata que, respecto de su propio rinde, es fija.

**I2 — Cambiar las hectáreas del lote corrompe el precio unitario al reabrir.** Es la
trampa de `buildGrupos` disparada **sin tocar código**, sólo cambiando un dato:
`precioUnit` se reconstruye como `costoHaCalculado / (dosis × factorEtapa)` y el
`factorEtapa` se evalúa con las hectáreas de HOY, no con las de cuando se guardó.
Verificado: guardado a 50 ha da 0,90; reabierto con el lote en 60 ha muestra 1,08. El
costo total round-trippea bien, pero la primera edición de dosis posterior arranca de
un precio unitario falso, con un error de `ha_vieja / ha_nueva`.

**I8 — Labores en ARS y comercialización rompen el congelado al re-guardar.** Al
volver a guardar una asignación de Contables, `AsignarLoteForm` recalcula
`costoHaCalculado` con el tipo de cambio **del día**. Los insumos están protegidos,
esos dos no, y el motivo es el **orden de las ramas de `calcularCostoItemHa`**:

| Orden | Rama | ¿Protegida por `precioUnit`? |
|---|---|---|
| 1º | `item.laborId` (línea 133) | **No** — corta antes y reconvierte con `labor.moneda === 'ARS'` |
| 2º | especiales (línea 158) | **No** — comercialización convierte su `arsPorTn` siempre en vivo |
| 3º | canon HT (línea 210) | Sólo si el ítem tiene precio manual |
| 4º | precio manual (línea 222) | **Sí** — devuelve `precioUnit × dosis` sin conversión |

O sea: la rama de precio manual, que es la que implementa el congelado, es la
**cuarta**. Todo lo que corta antes ignora el precio guardado. Viola la promesa
central de la app ("abrir un lote viejo y guardarlo sin tocar nada no debe cambiar
ningún número") para lotes con labores en pesos o con ítem de comercialización.

---

## Pendientes

**Seguridad** (de la auditoría; los arreglos están en la migración 14)

1. **Verificar que "Confirm email" siga activo** en Supabase Auth. Es el hallazgo
   crítico: sin eso, cualquiera se registra con el mail de un invitado y toma su
   acceso, porque las políticas autorizan por email del JWT sin exigir verificación.
2. `ver_precios` es sólo del front: un miembro con acceso al módulo puede leer los
   precios por API. RLS filtra filas, no columnas.
3. Menores: `es_miembro_de_granja` no filtra por estado; la tabla legacy `lotes`
   conserva datos financieros duplicados; `ensureCampanaIdActiva` usa el uid del
   miembro y podría crear la campaña bajo su cuenta, rompiendo el gate de campaña.

**Trabajo en curso**

4. **Etapa B de hectáreas aplicadas** — el export todavía calcula el consumo con las
   hectáreas del lote, no las de la etapa. Falta la columna "Ha aplicadas" y un
   tercer filtro por ella en los SUMIFS. Decidido: agrupar por Insumo + Unidad +
   Ha aplicadas, para que cada fila cierre sola.
5. **Confirmar la etapa A de hectáreas aplicadas en la app real** con datos productivos.
6. **Revivir Stocks** — dado de baja temporalmente por C1. Los cuatro arreglos que
   tiene que tener antes de volver están listados arriba, en "Stocks está dado de
   baja temporalmente".
7. **Confirmar que la migración 14 se corrió.**

**Menores**

8. Definir `.di-inp` y `.di-lbl` globalmente.
9. El módulo "Encargar insumos" es un placeholder.
10. La API key de Anthropic quedó en la tabla `configuracion` de usuarios que la
    hayan cargado, del Chat IA que se eliminó. Conviene borrar esas filas y revocar
    la key.

---

## Verificación

La app está detrás de login de Supabase. Para probar cambios sin credenciales, el
patrón que funciona es montar los **componentes y stores reales** en un HTML suelto
servido por Vite, reemplazando **sólo** la capa de red de Supabase por una base en
memoria que serialice a JSON (que es lo que hace Postgres con el JSONB). Eso valida
mappers, componentes y round-trip de persistencia. Borrar el archivo después.

Para lógica pura sin DOM, correr los módulos en Node: hay que copiarlos al scratchpad
y reescribir los imports a rutas con extensión `.js` y URLs `file:///`.

Antes de dar por bueno un cambio de costos, la prueba que más importa es siempre la
misma: **abrir algo ya guardado, guardarlo sin tocar nada y verificar que no se movió
ningún número**.
