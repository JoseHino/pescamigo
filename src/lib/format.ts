// Comisión por plaza. A 0 mientras no haya pasarela de pago conectada: no se cobra nada a nadie.
export const SERVICE_FEE = 0

export const FISHING_TYPES = ['Fondo', 'Curricán', 'Jigging', 'Spinning', 'Calamar']

export function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function addDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDate(d)
}
export function toDate(date: string, time = '00:00') {
  return new Date(`${date}T${time}:00`)
}
export function longDate(date: string) {
  const s = toDate(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function shortDate(date: string) {
  return toDate(date)
    .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
}
export function dayLabel(date: string) {
  if (date === addDays(0)) return 'Hoy'
  if (date === addDays(1)) return 'Mañana'
  return shortDate(date)
}
export function duration(start: string, end: string) {
  const [h1, m1] = start.split(':').map(Number)
  const [h2, m2] = end.split(':').map(Number)
  const min = h2 * 60 + m2 - (h1 * 60 + m1)
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
export function euro(n: number) {
  return (
    n.toLocaleString('es-ES', {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    }) + ' €'
  )
}
export function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} d`
}
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
