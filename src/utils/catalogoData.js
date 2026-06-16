// Datos de referencia del catálogo (precarga del Excel real del productor)

export const FAMILIAS_BASE = [
  'Fertilizantes', 'Herbicidas', 'Insecticidas', 'Fungicidas',
  'Curasemillas', 'Biológicos', 'Coadyuvantes', 'Semillas',
  'Labores', 'Inoculantes', 'Otros',
]

const I = (nombre, familia, precio, unidadPrecio, extra = {}) =>
  ({ nombre, familia, precio, moneda: 'USD', unidadPrecio, notas: '', ...extra })

export const MOCK_CATALOGO_INSUMOS = [
  // ── Fertilizantes ──
  I('Urea', 'Fertilizantes', 896, 'tn'),
  I('MAP', 'Fertilizantes', 1100, 'tn'),
  I('SPS', 'Fertilizantes', 512, 'tn'),
  I('Foszinc40', 'Fertilizantes', 1080, 'tn'),

  // ── Herbicidas ──
  I('Glifosato 75.7 SG', 'Herbicidas', 5.40, 'kg'),
  I('Glifosato Power Plus', 'Herbicidas', 5.40, 'litro'),
  I('24D EHE 102%', 'Herbicidas', 5.60, 'litro'),
  I('24D EHE 89%', 'Herbicidas', 5.03, 'litro'),
  I('24D Enlist', 'Herbicidas', 5.60, 'litro'),
  I('Atrazina 90 WG', 'Herbicidas', 6.75, 'kg'),
  I('Pyroxasulfone 85%', 'Herbicidas', 103, 'kg'),
  I('Cletodim 24', 'Herbicidas', 7.40, 'litro'),
  I('Terbutilazina 75 WG', 'Herbicidas', 6.80, 'kg'),
  I('Flumioxazin 480 G/L SC', 'Herbicidas', 18.60, 'litro'),
  I('Sulfentrazone 500 G/L SC', 'Herbicidas', 19.00, 'litro'),
  I('S-Metolachlor 960 G/L EC', 'Herbicidas', 7.30, 'litro'),
  I('Acuron', 'Herbicidas', 40.04, 'litro'),
  I('Éxito', 'Herbicidas', 16.00, 'litro'),
  I('Fixer', 'Herbicidas', 45.00, 'litro'),
  I('Ligate', 'Herbicidas', 155.00, 'litro'),
  I('Carfentrazone', 'Herbicidas', 94.50, 'litro'),
  I('Diquat', 'Herbicidas', 11.00, 'litro'),
  I('Paraquat', 'Herbicidas', 3.65, 'litro'),
  I('Prometrina 500 G/L SC', 'Herbicidas', 7.50, 'litro'),
  I('Metsulfuron-methyl 60% WG', 'Herbicidas', 30.00, 'kg'),
  I('Lontrel', 'Herbicidas', 35.50, 'litro'),
  I('Premerge', 'Herbicidas', 10.00, 'litro'),
  I('Fipronil 25', 'Herbicidas', 68.00, 'litro', { notas: 'También usado como insecticida' }),
  I('Dinamic', 'Herbicidas', 40.30, 'litro'),
  I('Galant Max', 'Herbicidas', 40.00, 'litro'),
  I('Panzer Gold', 'Herbicidas', 5.55, 'litro'),
  I('Convey', 'Herbicidas', 307.00, 'litro'),
  I('Pixxaro', 'Herbicidas', 50.40, 'litro'),
  I('Sulfosit (sulfato de amonio)', 'Herbicidas', 15.00, 'kg'),
  I('Thiamethoxam 141+Lambda Cyhalothrin 106 ZC', 'Herbicidas', 16.60, 'litro'),

  // ── Insecticidas ──
  I('Transform', 'Insecticidas', 241.00, 'kg'),
  I('Abamectina 1.8', 'Insecticidas', 6.00, 'litro'),
  I('Archer Plus', 'Insecticidas', 72.00, 'litro'),
  I('Bifentrin 25%', 'Insecticidas', 15.00, 'litro'),
  I('Bifentrin 40%', 'Insecticidas', 25.40, 'litro'),
  I('Coragen EVO 60%', 'Insecticidas', 205.00, 'litro'),
  I('Mustang', 'Insecticidas', 22.50, 'litro'),
  I('Lambdacialotrina 25% ME', 'Insecticidas', 18.60, 'litro'),
  I('Lumivia', 'Insecticidas', 80.00, 'litro'),
  I('Quintal Xtra', 'Insecticidas', 73.00, 'litro'),

  // ── Fungicidas ──
  I('Azoxystrobin 200+Cypronazole 80% SL', 'Fungicidas', 14.00, 'litro'),
  I('Stinger', 'Fungicidas', 24.10, 'litro'),
  I('Opera', 'Fungicidas', 21.60, 'litro'),

  // ── Curasemillas ──
  I('Sistiva', 'Curasemillas', 372.60, 'litro'),
  I('Histic+Acronix', 'Curasemillas', 258.00, 'kg'),

  // ── Biológicos ──
  I('Utrisha', 'Biológicos', 76.00, 'litro'),
  I('Bio Forge Advance', 'Biológicos', 35.50, 'litro'),
  I('Naturamin WSP', 'Biológicos', 35.00, 'kg'),
  I('Sett', 'Biológicos', 9.40, 'litro'),
  I('Raiza', 'Biológicos', 37.50, 'litro'),

  // ── Coadyuvantes ──
  I('Aceite Metilado Siliconado Breaker', 'Coadyuvantes', 15.00, 'litro'),
  I('Aceite Metilado Siliconado', 'Coadyuvantes', 14.00, 'litro'),
  I('Physio (sulfato de amonio)', 'Coadyuvantes', 30.00, 'kg'),
  I('Lemur x20', 'Coadyuvantes', 10.00, 'unidad'),

  // ── Semillas ──
  I('Semilla Soja', 'Semillas', 28.07, 'bolsa', { kgPorBolsa: 80 }),
  I('Semilla Trigo', 'Semillas', 29.67, 'bolsa', { kgPorBolsa: 130 }),
  I('Bolsa Soja (extra)', 'Semillas', 35.00, 'bolsa'),
  I('Bolsa Trigo (extra)', 'Semillas', 35.00, 'bolsa'),
  I('BASF 7344 VT3 (Maíz)', 'Semillas', 170.00, 'bolsa'),
  I('Bolsa Girasol MG360', 'Semillas', 250.00, 'bolsa'),

  // ── Labores ──
  I('Labor siembra', 'Labores', 94.00, 'ha'),
  I('Aplicación terrestre', 'Labores', 10.00, 'ha'),
  I('Aplicación aérea', 'Labores', 14.00, 'ha'),
  I('Fertilización voleo', 'Labores', 10.00, 'ha'),
  I('Subsolador', 'Labores', 85.00, 'ha', { notas: 'Se amortiza en 4 campañas' }),

  // ── Inoculantes ──
  I('Nussed Nujet 350', 'Inoculantes', 51.99, 'bolsa'),
]

// Cultivos de referencia. Rindes en qq/ha (tn × 10).
const C = (nombre, tipo, precioUsdTn, rendimientoEstimadoQq, extra = {}) => ({
  nombre, tipo, precioUsdTn, rendimientoEstimadoQq,
  cosechaPorc: 0, comercializacionPorc: 0, comercializacionFijaUsdTn: 0,
  fleteUsdTn: 0, seguroUsdHa: 0, rendimientoAseguradoQq: 0, alquilerQqSoja: 0, notas: '',
  ...extra,
})

// ── Labores y servicios ───────────────────────────────────────────
export const CATEGORIAS_LABORES = ['Cosecha', 'Aplicación', 'Labranza', 'Flete', 'Seguro', 'Arrendamiento', 'Otro']

const L = (nombre, categoria, precio, unidadPrecio, extra = {}) =>
  ({ nombre, categoria, precio, moneda: 'USD', unidadPrecio, esPorcentaje: false, porcentaje: null, notas: '', ...extra })
const Lpct = (nombre, porcentaje = 8) =>
  ({ nombre, categoria: 'Cosecha', precio: 0, moneda: 'USD', unidadPrecio: 'ha', esPorcentaje: true, porcentaje, notas: '' })

export const MOCK_CATALOGO_LABORES = [
  // ── Cosecha (% del valor cosechado) ──
  Lpct('Cosecha Soja 1era'), Lpct('Cosecha Soja 2da'),
  Lpct('Cosecha Maíz 1era'), Lpct('Cosecha Maíz 2da'),
  Lpct('Cosecha Trigo'), Lpct('Cosecha Girasol'),
  Lpct('Cosecha Arveja'), Lpct('Cosecha Carinata'),
  // ── Aplicación (USD/ha) ──
  L('Aplicación terrestre', 'Aplicación', 10, 'ha'),
  L('Aplicación aérea', 'Aplicación', 14, 'ha'),
  L('Fertilización al voleo', 'Aplicación', 10, 'ha'),
  // ── Labranza (USD/ha) ──
  L('Labor siembra', 'Labranza', 94, 'ha'),
  L('Subsolador', 'Labranza', 85, 'ha', { notas: 'Se amortiza en 4 campañas' }),
  // ── Flete (USD/tn) ──
  L('Flete zona Casilda 85 km', 'Flete', 15.75, 'tn'),
  // ── Seguro (USD/ha) ──
  L('Seguro Soja 1era', 'Seguro', 40.46, 'ha', { notas: 'Cubre granizo e incendio, rinde asegurado 3.5 tn' }),
  L('Seguro Soja 2da', 'Seguro', 28.90, 'ha'),
  L('Seguro Maíz 1era', 'Seguro', 46.36, 'ha'),
  L('Seguro Maíz 2da', 'Seguro', 23.18, 'ha'),
  L('Seguro Trigo', 'Seguro', 48.07, 'ha'),
  L('Seguro Girasol', 'Seguro', 71.09, 'ha'),
  L('Seguro Arveja', 'Seguro', 24.56, 'ha'),
  L('Seguro Carinata', 'Seguro', 40.77, 'ha'),
]

export const MOCK_CATALOGO_CULTIVOS = [
  C('Soja', 'estival', 330, 47, { cosechaPorc: 8, comercializacionPorc: 0.5, comercializacionFijaUsdTn: 720, fleteUsdTn: 74, seguroUsdHa: 40, rendimientoAseguradoQq: 35 }),
  C('Maíz', 'estival', 181, 110, { cosechaPorc: 8, comercializacionPorc: 0.5, comercializacionFijaUsdTn: 720, fleteUsdTn: 173, seguroUsdHa: 46, rendimientoAseguradoQq: 80 }),
  C('Trigo', 'invernal', 212, 45, { cosechaPorc: 8, comercializacionPorc: 0.5, fleteUsdTn: 71, seguroUsdHa: 48, rendimientoAseguradoQq: 40 }),
  C('Girasol', 'estival', 418, 33),
  C('Arveja', 'invernal', 217, 30),
  C('Carinata', 'invernal', 479, 20),
]
