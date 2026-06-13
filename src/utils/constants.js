
export const CULTIVARES_INVERNALES = [
  { nombre: 'Trigo',          color: '#5b8dd9' },
  { nombre: 'Cebada',         color: '#8da8d4' },
  { nombre: 'Arveja',         color: '#d44f8e' },
  { nombre: 'Colza',          color: '#c8a020' },
  { nombre: 'Carinata',       color: '#b8860b' },
  { nombre: 'Camelina',       color: '#daa520' },
  { nombre: 'Centeno',        color: '#a0522d' },
  { nombre: 'Otro invernal',  color: '#888888' },
]
export const CULTIVARES_ESTIVALES = [
  { nombre: 'Soja',           color: '#4a7c59' },
  { nombre: 'Maíz',           color: '#e8a838' },
  { nombre: 'Girasol',        color: '#e05c3a' },
  { nombre: 'Maní',           color: '#c4893a' },
  { nombre: 'Sorgo',          color: '#8b4513' },
  { nombre: 'Otro estival',   color: '#888888' },
]
export const TODOS_CULTIVARES = [...CULTIVARES_INVERNALES, ...CULTIVARES_ESTIVALES]
export const getCultivoColor = n => TODOS_CULTIVARES.find(c => c.nombre === n)?.color || '#888'

export const CATEGORIAS = [
  { key: 'semilla',       label: 'Semilla',        e: '🌱' },
  { key: 'inoculante',    label: 'Inoculante',     e: '🧪' },
  { key: 'fertilizante',  label: 'Fertilizante',   e: '💊' },
  { key: 'fitosanitario', label: 'Fitosanitario',  e: '🌿' },
  { key: 'labor',         label: 'Labor/Servicio', e: '🚜' },
  { key: 'cosecha',       label: 'Cosecha',        e: '🌾' },
  { key: 'flete',         label: 'Flete',          e: '🚛' },
  { key: 'arrendamiento', label: 'Arrendamiento',  e: '🏠' },
  { key: 'otros',         label: 'Otros',          e: '📋' },
]
export const CAMPAÑAS = ['2024/25', '2023/24']
export const TIPOS_ST = ['Todos', 'Semilla', 'Fertilizante', 'Herbicida', 'Insecticida', 'Fungicida', 'Otro']
export const UNIDADES = ['bolsas', 'kg', 'litros', 'toneladas', 'unidades']
export const UBICS = [
  { key: 'insumera', label: 'En insumera/proveedor', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'galpon',   label: 'En mi galpón/depósito', color: '#166534', bg: '#f0fdf4', border: '#86efac' },
  { key: 'aplicado', label: 'Aplicado en campo',     color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
]

const mkC = (nombre, tipo, rq, pv, items = []) => ({ nombre, tipo, rendimientoQq: rq, precioVentaTn: pv, itemsCosto: items })
const mk  = (cat, nombre, costo) => ({ categoria: cat, nombre, costoHaUsd: costo })

export const MOCK_LOTES = [
  { id: 1, nombre: 'La Colorada', campaña: '2024/25', ha: 180, notas: 'Excelente historia productiva.', tipoSiembra: 'simple',
    cultivo: mkC('Soja','estival',38,280,[mk('semilla','Semilla Soja DM 5.0i',95),mk('fertilizante','MAP arranque',120),mk('fitosanitario','Herbicidas',85),mk('labor','Siembra SD',140),mk('cosecha','Cosecha',75),mk('flete','Flete campo-puerto',40),mk('arrendamiento','Arrendamiento',80),mk('otros','Gastos varios',15)]) },
  { id: 2, nombre: 'El Bajo', campaña: '2024/25', ha: 120, notas: 'Riesgo de anegamiento.', tipoSiembra: 'simple',
    cultivo: mkC('Maíz','estival',95,130,[mk('semilla','Semilla Maíz DK7220',180),mk('fertilizante','Urea + MAP',280),mk('fitosanitario','Herbicidas + insecticidas',110),mk('labor','Siembra SD',200),mk('cosecha','Cosecha',130),mk('flete','Flete',55),mk('arrendamiento','Arrendamiento',90),mk('otros','Varios',25)]) },
  { id: 3, nombre: 'San Roque', campaña: '2024/25', ha: 95, notas: 'Doble cultivo Trigo/Soja.', tipoSiembra: 'doble',
    cultivoInvernal: mkC('Trigo','invernal',38,195,[mk('semilla','Semilla Trigo Klein Castor',55),mk('fertilizante','Urea + SFT',150),mk('fitosanitario','Fungicida + herbicida',90),mk('labor','Siembra',120),mk('cosecha','Cosecha',65),mk('flete','Flete',30)]),
    cultivoEstival:  mkC('Soja','estival',25,280,[mk('semilla','Semilla Soja DM 3.8i',70),mk('fitosanitario','Herbicida postemergente',70),mk('labor','Siembra SD',110),mk('cosecha','Cosecha',55),mk('flete','Flete',32),mk('arrendamiento','Arrendamiento compartido',60)]) },
  { id: 4, nombre: 'Los Álamos', campaña: '2024/25', ha: 120, notas: 'Trigo simple.', tipoSiembra: 'simple',
    cultivo: mkC('Trigo','invernal',40,190,[mk('semilla','Semilla Trigo',55),mk('fertilizante','Fertilizante',150),mk('fitosanitario','Fitosanitarios',90),mk('labor','Labores',120),mk('cosecha','Cosecha',65),mk('flete','Flete',30),mk('arrendamiento','Arrendamiento',65)]) },
  { id: 5, nombre: 'La Esperanza', campaña: '2024/25', ha: 200, notas: 'Doble cultivo.', tipoSiembra: 'doble',
    cultivoInvernal: mkC('Trigo','invernal',40,195,[mk('semilla','Semilla Trigo Klein Proteo',45),mk('fertilizante','Urea',120)]),
    cultivoEstival:  mkC('Soja','estival',28,280,[mk('semilla','Semilla Soja DM 4.2i',38),mk('fitosanitario','Herbicida postemergente',35)]) },
]

export const MOCK_PROYECCIONES = [
  { cultivo: 'Trigo',   tipo: 'invernal', rendimientoQq: 40, precioVentaTn: 190, itemsCosto: [mk('semilla','Semilla',55),mk('fertilizante','Fertilizante base',100),mk('fertilizante','Fertilizante cobertura',50),mk('fitosanitario','Herbicidas',60),mk('fitosanitario','Fungicidas',40),mk('cosecha','Cosecha',65),mk('flete','Flete',30),mk('arrendamiento','Arrendamiento',65)] },
  { cultivo: 'Arveja',  tipo: 'invernal', rendimientoQq: 22, precioVentaTn: 300, itemsCosto: [mk('semilla','Semilla',90),mk('inoculante','Inoculante',12),mk('fertilizante','Fertilizante',30),mk('fitosanitario','Herbicidas',45),mk('fitosanitario','Insecticidas',20),mk('cosecha','Cosecha',50),mk('flete','Flete',28),mk('arrendamiento','Arrendamiento',55)] },
  { cultivo: 'Soja',    tipo: 'estival',  rendimientoQq: 38, precioVentaTn: 280, itemsCosto: [mk('semilla','Semilla',95),mk('inoculante','Inoculante',8),mk('fertilizante','MAP',80),mk('fitosanitario','Herbicidas',65),mk('fitosanitario','Insecticidas',20),mk('fitosanitario','Fungicidas',25),mk('cosecha','Cosecha',75),mk('flete','Flete',42),mk('arrendamiento','Arrendamiento',80)] },
  { cultivo: 'Maíz',    tipo: 'estival',  rendimientoQq: 95, precioVentaTn: 130, itemsCosto: [mk('semilla','Semilla',185),mk('fertilizante','Fertilizante base',160),mk('fertilizante','Fertilizante cobertura',120),mk('fitosanitario','Herbicidas',70),mk('fitosanitario','Insecticidas',40),mk('cosecha','Cosecha',130),mk('flete','Flete',55),mk('arrendamiento','Arrendamiento',90)] },
  { cultivo: 'Girasol', tipo: 'estival',  rendimientoQq: 24, precioVentaTn: 310, itemsCosto: [mk('semilla','Semilla',80),mk('fertilizante','Fertilizante',90),mk('fitosanitario','Herbicidas',50),mk('fitosanitario','Insecticidas',25),mk('cosecha','Cosecha',75),mk('flete','Flete',38),mk('arrendamiento','Arrendamiento',65)] },
]

export const MOCK_STOCKS = [
  { id: 1, nombre: 'Urea granulada',      tipo: 'Fertilizante', cantidad: 32000, unidad: 'kg',     precioUnitario: 0.38,  precioMoneda: 'USD', precioUnidadPrecio: '', proveedor: 'Don Italo', ubicacion: 'insumera', lote: null, campana: '2024/25', fecha: '2025-03-10', remito: 'R-0012', notas: '' },
  { id: 2, nombre: 'Semilla Soja DM 5.0i',tipo: 'Semilla',      cantidad: 180,   unidad: 'bolsas', precioUnitario: 28000, precioMoneda: 'ARS', precioUnidadPrecio: '', proveedor: 'Don Italo', ubicacion: 'galpon',   lote: 'La Colorada', campana: '2024/25', fecha: '2025-02-28', remito: 'R-0009', notas: 'Tratada con fungicida' },
  { id: 3, nombre: 'Glifosato 48%',       tipo: 'Herbicida',    cantidad: 800,   unidad: 'litros', precioUnitario: 1200,  precioMoneda: 'ARS', precioUnidadPrecio: '', proveedor: 'AgroSur',  ubicacion: 'galpon',   lote: null, campana: '2024/25', fecha: '2025-03-05', remito: 'F-0234', notas: '' },
  { id: 4, nombre: 'MAP',                 tipo: 'Fertilizante', cantidad: 12000, unidad: 'kg',     precioUnitario: 0.52,  precioMoneda: 'USD', precioUnidadPrecio: '', proveedor: 'Don Italo', ubicacion: 'aplicado', lote: 'El Bajo', campana: '2024/25', fecha: '2025-03-01', remito: 'R-0011', notas: 'Aplicado al voleo' },
  { id: 5, nombre: 'Semilla Maíz DK7220', tipo: 'Semilla',      cantidad: 48,    unidad: 'bolsas', precioUnitario: 65000, precioMoneda: 'ARS', precioUnidadPrecio: '', proveedor: 'AgroSur',  ubicacion: 'insumera', lote: null, campana: '2024/25', fecha: '2025-02-15', remito: 'F-0198', notas: '' },
  { id: 6, nombre: 'Clorpirifos 48%',     tipo: 'Insecticida',  cantidad: 120,   unidad: 'litros', precioUnitario: 2800,  precioMoneda: 'ARS', precioUnidadPrecio: '', proveedor: 'AgroCampo',ubicacion: 'galpon',   lote: null, campana: '2024/25', fecha: '2025-03-08', remito: 'F-0312', notas: '' },
]
