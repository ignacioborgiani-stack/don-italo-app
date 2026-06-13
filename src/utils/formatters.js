export const fmtUSD = n => '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })
export const fmtNum = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })
export const fmtK   = n => {
  const v = Math.round(n)
  const sign = v < 0 ? '-' : ''
  return sign + '$' + Math.abs(Math.abs(v) >= 1000 ? v / 1000 : v).toFixed(0) + (Math.abs(v) >= 1000 ? 'K' : '')
}
