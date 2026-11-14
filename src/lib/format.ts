import type { BookingStatus } from '../types'

export const FISHING_TYPES = ['Fondo', 'Curricán', 'Jigging', 'Spinning', 'Calamar']

/** Días de la semana en orden español (lunes primero). v = número de JavaScript/PostgreSQL (0 = domingo). */
export const WEEKDAYS = [
  { v: 1, short: 'L', name: 'lunes', plural: 'lunes' },
  { v: 2, short: 'M', name: 'martes', plural: 'martes' },
  { v: 3, short: 'X', name: 'miércoles', plural: 'miércoles' },
  { v: 4, short: 'J', name: 'jueves', plural: 'jueves' },
  { v: 5, short: 'V', name: 'viernes', plural: 'viernes' },
  { v: 6, short: 'S', name: 'sábado', plural: 'sábados' },
  { v: 0, short: 'D', name: 'domingo', plural: 'domingos' },
]
export function weekdayList(days: number[]) {
  const names = WEEKDAYS.filter((d) => days.includes(d.v)).map((d) => d.plural)
  if (names.length === 7) return 'todos los días'
  if (names.length <= 1) return `los ${names[0] ?? ''}`
  return `los ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

export const STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendiente de confirmación', cls: 'bg-buoy-50 text-buoy-dark' },
  accepted: { label: 'Aceptada, pendiente de pago', cls: 'bg-sea-50 text-sea-dark' },
  confirmed: { label: 'Confirmada', cls: 'bg-ok-50 text-ok' },
  rejected: { label: 'Rechazada', cls: 'bg-red-50 text-red-800' },
  cancelled: { label: 'Cancelada', cls: 'bg-line/60 text-ink-soft' },
}
export const ACTIVE: BookingStatus[] = ['pending', 'accepted', 'confirmed']

export function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function addDays(n: number, from = new Date()) {
  const d = new Date(from)
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
export function monthLabel(year: number, month: number) {
  const s = new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
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
export function clock(iso: string) {
  const d = new Date(iso)
  const today = isoDate(new Date()) === isoDate(d)
  const t = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return today ? t : `${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')} ${t}`
}
export function parseMoney(s: string) {
  return parseFloat(s.replace(',', '.'))
}
