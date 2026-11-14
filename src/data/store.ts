import { useSyncExternalStore } from 'react'
import type { Boat, Booking, Notice, Outing, Role, State, User } from '../types'
import { seedState, portById } from './seed'
import { SERVICE_FEE, dayLabel, demoHash, isoDate, toDate, uid } from '../lib/format'

const KEY = 'enrola-demo-v1'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    /* almacenamiento no disponible: se trabaja en memoria */
  }
  return seedState()
}

let state: State = load()
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* sin persistencia */
  }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppState() {
  return useSyncExternalStore(subscribe, () => state)
}
export function useMe(): User | null {
  const s = useAppState()
  return s.users.find((u) => u.id === s.sessionUserId) ?? null
}

/* ---------- consultas ---------- */

export function seatsLeft(s: State, o: Outing) {
  const taken = s.bookings
    .filter((b) => b.outingId === o.id && b.status === 'confirmed')
    .reduce((n, b) => n + b.seats, 0)
  return Math.max(0, o.seats - taken)
}
export function isPast(o: Outing) {
  return toDate(o.date, o.end).getTime() < Date.now()
}
export function upcomingOutings(s: State) {
  return s.outings
    .filter((o) => o.status === 'open' && !isPast(o))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
}
export function boatRating(s: State, boatId: string) {
  const rs = s.reviews.filter((r) => r.boatId === boatId)
  if (!rs.length) return { avg: 0, count: 0 }
  return { avg: rs.reduce((n, r) => n + r.rating, 0) / rs.length, count: rs.length }
}
export function myBoat(s: State, userId: string) {
  return s.boats.find((b) => b.ownerId === userId) ?? null
}

/* ---------- sesión ---------- */

const emptyPrefs = () => ({ ports: [] as string[], types: [] as string[], push: true })

export function signUp(d: { name: string; username: string; email: string; password: string }): string | null {
  const email = d.email.trim().toLowerCase()
  const username = d.username.trim().toLowerCase()
  if (!d.name.trim()) return 'Escribe tu nombre.'
  if (!/^[a-z0-9._-]{3,20}$/.test(username)) return 'El nombre de usuario debe tener entre 3 y 20 letras, números, puntos o guiones.'
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Ese correo no parece válido.'
  if (d.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (state.users.some((u) => u.email === email)) return 'Ya existe una cuenta con ese correo. Inicia sesión.'
  if (state.users.some((u) => u.username === username)) return 'Ese nombre de usuario ya está cogido.'
  const u: User = {
    id: uid(), email, username, name: d.name.trim(), passHash: demoHash(d.password),
    provider: 'email', role: null, createdAt: new Date().toISOString(), prefs: emptyPrefs(),
  }
  commit({ ...state, users: [...state.users, u], sessionUserId: u.id })
  return null
}

export function signIn(identifier: string, password: string): string | null {
  const id = identifier.trim().toLowerCase()
  const u = state.users.find((x) => x.email === id || x.username === id)
  if (!u) return 'No hay ninguna cuenta con ese correo o usuario.'
  if (u.provider === 'google') return 'Esa cuenta entra con Google.'
  if (u.passHash !== demoHash(password)) return 'La contraseña no es correcta.'
  commit({ ...state, sessionUserId: u.id })
  return null
}

// En la demo se simula la cuenta de Google. Con el backend real será OAuth.
export function signInGoogle() {
  let u = state.users.find((x) => x.provider === 'google')
  if (!u) {
    u = {
      id: uid(), email: 'invitado.google@enrola.demo', username: 'invitado.google', name: 'Invitado Google',
      passHash: null, provider: 'google', role: null, createdAt: new Date().toISOString(), prefs: emptyPrefs(),
    }
    commit({ ...state, users: [...state.users, u], sessionUserId: u.id })
  } else {
    commit({ ...state, sessionUserId: u.id })
  }
}

export function signInDemo(role: Role) {
  commit({ ...state, sessionUserId: role === 'owner' ? 'u-owner' : 'u-fisher' })
}
export function signOut() {
  commit({ ...state, sessionUserId: null })
}
export function resetDemo() {
  commit(seedState())
}

function patchUser(id: string, patch: Partial<User>) {
  commit({ ...state, users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })
}
export function setRole(role: Role) {
  if (state.sessionUserId) patchUser(state.sessionUserId, { role })
}
export function updatePrefs(prefs: User['prefs']) {
  if (state.sessionUserId) patchUser(state.sessionUserId, { prefs })
}

/* ---------- avisos ---------- */

function notice(userId: string, title: string, body: string, link: string): Notice {
  return { id: uid(), userId, title, body, link, createdAt: new Date().toISOString(), read: false }
}
export function markNoticesRead(userId: string) {
  if (!state.notices.some((n) => n.userId === userId && !n.read)) return
  commit({ ...state, notices: state.notices.map((n) => (n.userId === userId ? { ...n, read: true } : n)) })
}
function systemPush(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body })
  } catch {
    /* el navegador no admite avisos del sistema */
  }
}

/* ---------- propietario ---------- */

export function saveBoat(d: Omit<Boat, 'id' | 'ownerId'>) {
  const ownerId = state.sessionUserId
  if (!ownerId) return
  const existing = myBoat(state, ownerId)
  const boats = existing
    ? state.boats.map((b) => (b.id === existing.id ? { ...existing, ...d } : b))
    : [...state.boats, { ...d, id: uid(), ownerId }]
  commit({ ...state, boats })
}

export function publishOuting(d: Omit<Outing, 'id' | 'boatId' | 'status'>): string | null {
  const ownerId = state.sessionUserId
  const boat = ownerId ? myBoat(state, ownerId) : null
  if (!boat) return 'Primero da de alta tu barco.'
  if (!d.date || d.date < isoDate(new Date())) return 'Elige una fecha de hoy en adelante.'
  if (!d.start || !d.end || d.end <= d.start) return 'La hora de vuelta debe ser posterior a la de salida.'
  if (toDate(d.date, d.start).getTime() < Date.now()) return 'Esa hora de salida ya ha pasado.'
  if (d.seats < 1 || d.seats > boat.capacity) return `Tu barco admite entre 1 y ${boat.capacity} plazas.`
  if (d.costShare < 0 || Number.isNaN(d.costShare)) return 'Indica el reparto de gastos por persona.'
  const clash = state.outings.some(
    (x) => x.boatId === boat.id && x.status === 'open' && x.date === d.date && d.start < x.end && x.start < d.end,
  )
  if (clash) return 'Ya tienes una salida publicada que coincide con ese horario.'
  const o: Outing = { ...d, id: uid(), boatId: boat.id, status: 'open' }
  const port = portById(boat.portId)
  // Aviso a los pescadores cuyas preferencias encajan (sin preferencias = todas las salidas).
  const targets = state.users.filter(
    (u) =>
      u.role === 'fisher' &&
      u.prefs.push &&
      (u.prefs.ports.length === 0 || u.prefs.ports.includes(boat.portId)) &&
      (u.prefs.types.length === 0 || u.prefs.types.includes(d.type)),
  )
  const title = `Nueva salida: ${boat.name}`
  const body = `${d.type} desde ${port.name}, ${dayLabel(d.date).toLowerCase()} de ${d.start} a ${d.end}.`
  commit({
    ...state,
    outings: [...state.outings, o],
    notices: [...targets.map((u) => notice(u.id, title, body, `/salida/${o.id}`)), ...state.notices],
  })
  return null
}

export function cancelOuting(outingId: string) {
  const o = state.outings.find((x) => x.id === outingId)
  if (!o) return
  const boat = state.boats.find((b) => b.id === o.boatId)
  const affected = state.bookings.filter((b) => b.outingId === outingId && b.status === 'confirmed')
  commit({
    ...state,
    outings: state.outings.map((x) => (x.id === outingId ? { ...x, status: 'cancelled' } : x)),
    bookings: state.bookings.map((b) => (b.outingId === outingId ? { ...b, status: 'cancelled' } : b)),
    notices: [
      ...affected.map((b) =>
        notice(b.fisherId, `Salida cancelada: ${boat?.name ?? ''}`, `El propietario ha cancelado la salida del ${dayLabel(o.date).toLowerCase()}. Se devuelve el coste de gestión.`, '/reservas'),
      ),
      ...state.notices,
    ],
  })
}

/* ---------- pescador ---------- */

export function book(outingId: string, seats: number, cardLast4: string): { error?: string; booking?: Booking } {
  const me = state.users.find((u) => u.id === state.sessionUserId)
  const o = state.outings.find((x) => x.id === outingId)
  if (!me || !o) return { error: 'No se ha encontrado la salida.' }
  if (o.status !== 'open' || isPast(o)) return { error: 'Esta salida ya no admite reservas.' }
  if (seats < 1 || seats > seatsLeft(state, o)) return { error: 'No quedan plazas suficientes.' }
  if (state.bookings.some((b) => b.outingId === outingId && b.fisherId === me.id && b.status === 'confirmed'))
    return { error: 'Ya tienes una reserva en esta salida.' }
  const boat = state.boats.find((b) => b.id === o.boatId)
  const booking: Booking = {
    id: uid(), outingId, fisherId: me.id, seats, fee: SERVICE_FEE * seats, cardLast4,
    status: 'confirmed', createdAt: new Date().toISOString(),
  }
  const extra = boat
    ? [notice(boat.ownerId, 'Nueva reserva', `${me.name} ha reservado ${seats} ${seats === 1 ? 'plaza' : 'plazas'} para ${dayLabel(o.date).toLowerCase()} a las ${o.start}.`, '/mis-salidas')]
    : []
  commit({ ...state, bookings: [...state.bookings, booking], notices: [...extra, ...state.notices] })
  systemPush('Reserva confirmada', `${boat?.name ?? 'Salida'} · ${dayLabel(o.date)} ${o.start}`)
  return { booking }
}

export function cancelBooking(bookingId: string) {
  const b = state.bookings.find((x) => x.id === bookingId)
  if (!b) return
  const o = state.outings.find((x) => x.id === b.outingId)
  const boat = o ? state.boats.find((x) => x.id === o.boatId) : null
  const me = state.users.find((u) => u.id === b.fisherId)
  const extra = boat && o
    ? [notice(boat.ownerId, 'Reserva cancelada', `${me?.name ?? 'Un pescador'} ha cancelado su reserva del ${dayLabel(o.date).toLowerCase()}.`, '/mis-salidas')]
    : []
  commit({
    ...state,
    bookings: state.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'cancelled' } : x)),
    notices: [...extra, ...state.notices],
  })
}

export function addReview(bookingId: string, rating: number, comment: string, photo: string | null): string | null {
  const b = state.bookings.find((x) => x.id === bookingId)
  const o = b ? state.outings.find((x) => x.id === b.outingId) : null
  const me = state.users.find((u) => u.id === state.sessionUserId)
  if (!b || !o || !me) return 'No se ha encontrado la reserva.'
  if (rating < 1) return 'Elige una puntuación de 1 a 5.'
  if (comment.trim().length < 10) return 'Cuenta cómo fue la salida en al menos 10 caracteres.'
  if (state.reviews.some((r) => r.bookingId === bookingId)) return 'Ya has valorado esta salida.'
  const boat = state.boats.find((x) => x.id === o.boatId)
  const [first, last] = me.name.split(' ')
  commit({
    ...state,
    reviews: [
      { id: uid(), boatId: o.boatId, bookingId, authorName: last ? `${first} ${last[0]}.` : first, rating, comment: comment.trim(), photo, date: isoDate(new Date()) },
      ...state.reviews,
    ],
    notices: boat
      ? [notice(boat.ownerId, 'Nueva valoración', `${me.name} ha valorado tu barco con ${rating} de 5.`, `/barco/${boat.id}`), ...state.notices]
      : state.notices,
  })
  return null
}
