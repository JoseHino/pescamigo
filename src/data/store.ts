import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Boat, Booking, Notice, Outing, PublicUser, Review, Role, State, User } from '../types'
import { GOOGLE_ENABLED, SUPABASE_KEY, SUPABASE_URL, supabase } from '../lib/supabase'
import { addDays, isoDate, toDate } from '../lib/format'

const EMPTY = { users: [], boats: [], outings: [], bookings: [], reviews: [], notices: [] }
let state: State = { ready: false, me: null, ...EMPTY }
const listeners = new Set<() => void>()

function commit(patch: Partial<State>) {
  state = { ...state, ...patch }
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
  return useAppState().me
}

const GENERIC = 'No se ha podido completar. Comprueba la conexión e inténtalo de nuevo.'
// Los mensajes que lanza la base de datos a propósito (código P0001) ya vienen redactados para el usuario.
function dbError(e: { code?: string; message?: string } | null): string | null {
  if (!e) return null
  return e.code === 'P0001' && e.message ? e.message : GENERIC
}

/* ---------- consultas ---------- */

export function seatsLeft(_s: State, o: Outing) {
  return Math.max(0, o.seats - o.seatsTaken)
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

/* ---------- carga de datos ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const toUser = (r: any): PublicUser => ({ id: r.id, username: r.username, name: r.full_name, role: r.role })
const toBoat = (r: any): Boat => ({
  id: r.id, ownerId: r.owner_id, name: r.name, model: r.model, lengthM: Number(r.length_m), capacity: r.capacity,
  portId: r.port_id, description: r.description, photos: r.photos ?? [],
  insuranceDeclared: r.insurance_declared, licenseDeclared: r.license_declared,
})
const toOuting = (r: any): Outing => ({
  id: r.id, boatId: r.boat_id, date: r.day, start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5),
  seats: r.seats, seatsTaken: r.seats_taken, type: r.fishing_type, costShare: Number(r.cost_share), notes: r.notes, status: r.status,
})
const toBooking = (r: any): Booking => ({
  id: r.id, outingId: r.outing_id, fisherId: r.fisher_id, seats: r.seats, fee: Number(r.fee), status: r.status, createdAt: r.created_at,
})
const toNotice = (r: any): Notice => ({
  id: r.id, userId: r.user_id, title: r.title, body: r.body, link: r.link, createdAt: r.created_at, read: r.read,
})
function shortName(name: string) {
  const [first, last] = name.trim().split(/\s+/)
  return last ? `${first} ${last[0]}.` : first
}

let loading: Promise<void> | null = null
export function refresh(): Promise<void> {
  if (!state.me) return Promise.resolve()
  if (loading) return loading
  loading = (async () => {
    const [users, boats, outings, bookings, reviews, notices] = await Promise.all([
      supabase.from('profiles').select('id,username,full_name,role'),
      supabase.from('boats').select('*'),
      supabase.from('outings').select('*').gte('day', addDays(-120)),
      supabase.from('bookings').select('*'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(60),
    ])
    // Si alguna consulta falla (sin cobertura, por ejemplo) se conserva lo que ya había en pantalla.
    if (users.error || boats.error || outings.error || bookings.error || reviews.error || notices.error || !state.me) return
    const us = users.data.map(toUser)
    commit({
      users: us,
      boats: boats.data.map(toBoat),
      outings: outings.data.map(toOuting),
      bookings: bookings.data.map(toBooking),
      reviews: reviews.data.map((r: any): Review => ({
        id: r.id, boatId: r.boat_id, bookingId: r.booking_id, rating: r.rating, comment: r.comment, photo: r.photo,
        date: String(r.created_at).slice(0, 10),
        authorName: shortName(us.find((u) => u.id === r.author_id)?.name ?? 'Pescador'),
      })),
      notices: notices.data.map(toNotice),
    })
  })().finally(() => {
    loading = null
  })
  return loading
}

async function loadSession(session: Session | null) {
  if (!session) {
    commit({ ready: true, me: null, ...EMPTY })
    return
  }
  const { data, error } = await supabase.rpc('my_profile')
  if (error || !data?.id) {
    // Sesión sin perfil válido (o sin conexión): se trata como no iniciada.
    commit({ ready: true, me: null, ...EMPTY })
    return
  }
  commit({
    me: {
      ...toUser(data),
      email: data.email,
      prefs: { ports: data.pref_ports ?? [], types: data.pref_types ?? [], push: data.notify_new_outings },
    },
  })
  await refresh()
  commit({ ready: true })
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return
  // Se difiere para no llamar a Supabase dentro de su propio aviso de cambio de sesión.
  setTimeout(() => {
    if (event === 'SIGNED_IN' && state.me?.id === session?.user.id) return
    void loadSession(session)
  }, 0)
})

// Los datos se refrescan cada 30 s y al volver a la app.
setInterval(() => {
  if (document.visibilityState === 'visible') void refresh()
}, 30000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refresh()
})

/* ---------- sesión ---------- */

export async function signUp(d: { name: string; username: string; email: string; password: string }): Promise<string | null> {
  const email = d.email.trim().toLowerCase()
  const username = d.username.trim().toLowerCase()
  if (d.name.trim().length < 2) return 'Escribe tu nombre.'
  if (!/^[a-z0-9._-]{3,20}$/.test(username)) return 'El nombre de usuario debe tener entre 3 y 20 letras, números, puntos o guiones.'
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Ese correo no parece válido.'
  if (d.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ name: d.name.trim(), username, email, password: d.password }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return typeof body.error === 'string' ? body.error : GENERIC
  } catch {
    return GENERIC
  }
  return signIn(email, d.password)
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) return error.status === 400 ? 'El correo o la contraseña no son correctos.' : GENERIC
  await loadSession(data.session)
  return state.me ? null : GENERIC
}

export async function signInGoogle(): Promise<string | null> {
  if (!GOOGLE_ENABLED) return 'El acceso con Google todavía no está activado.'
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
  return error ? GENERIC : null
}

export async function signOut() {
  await supabase.auth.signOut()
  commit({ ready: true, me: null, ...EMPTY })
}

export async function setRole(role: Role): Promise<string | null> {
  const me = state.me
  if (!me) return GENERIC
  const { error } = await supabase.from('profiles').update({ role }).eq('id', me.id)
  if (error) return GENERIC
  commit({ me: { ...me, role } })
  void refresh()
  return null
}

export function updatePrefs(prefs: User['prefs']) {
  const me = state.me
  if (!me) return
  commit({ me: { ...me, prefs } }) // se refleja al momento y se guarda en segundo plano
  void supabase
    .from('profiles')
    .update({ pref_ports: prefs.ports, pref_types: prefs.types, notify_new_outings: prefs.push })
    .eq('id', me.id)
    .then(({ error }) => {
      if (error) commit({ me })
    })
}

/* ---------- fotos ---------- */

async function uploadPhoto(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl // ya estaba subida
  const blob = await (await fetch(dataUrl)).blob()
  const path = `${state.me!.id}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl
}

/* ---------- avisos ---------- */

export function markNoticesRead(userId: string) {
  if (!state.notices.some((n) => n.userId === userId && !n.read)) return
  commit({ notices: state.notices.map((n) => ({ ...n, read: true })) })
  void supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false).then(() => undefined)
}

/* ---------- propietario ---------- */

export async function saveBoat(d: Omit<Boat, 'id' | 'ownerId'>): Promise<string | null> {
  const me = state.me
  if (!me) return GENERIC
  let photos: string[]
  try {
    photos = await Promise.all(d.photos.map(uploadPhoto))
  } catch {
    return 'No se han podido subir las fotos. Inténtalo de nuevo.'
  }
  const row = {
    name: d.name, model: d.model, length_m: d.lengthM, capacity: d.capacity, port_id: d.portId,
    description: d.description, photos, insurance_declared: d.insuranceDeclared, license_declared: d.licenseDeclared,
  }
  const existing = myBoat(state, me.id)
  const { error } = existing
    ? await supabase.from('boats').update(row).eq('id', existing.id)
    : await supabase.from('boats').insert(row)
  if (error) return dbError(error)
  await refresh()
  return null
}

export async function publishOuting(d: Omit<Outing, 'id' | 'boatId' | 'status' | 'seatsTaken'>): Promise<string | null> {
  const boat = state.me ? myBoat(state, state.me.id) : null
  if (!boat) return 'Primero da de alta tu barco.'
  if (!d.date || d.date < isoDate(new Date())) return 'Elige una fecha de hoy en adelante.'
  if (!d.start || !d.end || d.end <= d.start) return 'La hora de vuelta debe ser posterior a la de salida.'
  if (d.seats < 1 || d.seats > boat.capacity) return `Tu barco admite entre 1 y ${boat.capacity} plazas.`
  if (Number.isNaN(d.costShare) || d.costShare < 0 || d.costShare > 500) return 'Indica el reparto de gastos por persona (entre 0 y 500 €).'
  const { error } = await supabase.from('outings').insert({
    boat_id: boat.id, day: d.date, start_time: d.start, end_time: d.end, seats: d.seats,
    fishing_type: d.type, cost_share: d.costShare, notes: d.notes,
  })
  if (error) return dbError(error)
  await refresh()
  return null
}

export async function cancelOuting(outingId: string): Promise<string | null> {
  const { error } = await supabase.rpc('cancel_outing', { p_outing: outingId })
  await refresh()
  return dbError(error)
}

/* ---------- pescador ---------- */

export async function book(outingId: string, seats: number): Promise<string | null> {
  const { error } = await supabase.rpc('book_outing', { p_outing: outingId, p_seats: seats })
  await refresh()
  return dbError(error)
}

export async function cancelBooking(bookingId: string): Promise<string | null> {
  const { error } = await supabase.rpc('cancel_booking', { p_booking: bookingId })
  await refresh()
  return dbError(error)
}

export async function addReview(bookingId: string, rating: number, comment: string, photo: string | null): Promise<string | null> {
  if (rating < 1) return 'Elige una puntuación de 1 a 5.'
  if (comment.trim().length < 10) return 'Cuenta cómo fue la salida en al menos 10 caracteres.'
  let url: string | null = null
  if (photo) {
    try {
      url = await uploadPhoto(photo)
    } catch {
      return 'No se ha podido subir la foto. Inténtalo de nuevo.'
    }
  }
  const { error } = await supabase.rpc('add_review', { p_booking: bookingId, p_rating: rating, p_comment: comment.trim(), p_photo: url })
  if (error) return dbError(error)
  await refresh()
  return null
}
