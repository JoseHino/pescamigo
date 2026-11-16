import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import type {
  Boat, Booking, Conversation, Message, Notice, Outing, PublicUser, Review, Role, Rule, State, User,
} from '../types'
import { GOOGLE_ENABLED, SUPABASE_KEY, SUPABASE_URL, supabase } from '../lib/supabase'
import { ACTIVE, addDays, isoDate, toDate } from '../lib/format'
import { disablePush, syncPush } from '../lib/push'

const EMPTY = {
  users: [], boats: [], outings: [], bookings: [], reviews: [], notices: [],
  rules: [], blocked: [], conversations: [], messages: {}, tripCounts: {},
}
let state: State = { ready: false, me: null, settings: { commissionPct: 15, paymentsEnabled: false, refundCutoffHours: 24, fisherFeePct: 10, ownerFeePct: 5, regularFisherFeePct: 5, regularOwnerFeePct: 3, regularAfter: 2 }, ...EMPTY }
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
  if (e.code === '23505') return 'Ya existe una solicitud igual. Revisa tus reservas.'
  return e.code === 'P0001' && e.message ? e.message : GENERIC
}

/* ---------- consultas ---------- */

export function seatsLeft(_s: State, o: Outing) {
  return Math.max(0, o.seats - o.seatsTaken)
}
export function startsAt(o: Outing) {
  return toDate(o.date, o.start).getTime()
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
export function myBoats(s: State, userId: string) {
  return s.boats.filter((b) => b.ownerId === userId).sort((a, b) => a.name.localeCompare(b.name))
}
export function myActiveBooking(s: State, outingId: string, userId: string) {
  return s.bookings.find((b) => b.outingId === outingId && b.fisherId === userId && ACTIVE.includes(b.status)) ?? null
}
/** Si ahora mismo se puede solicitar plaza en esta salida, o por qué no. */
export function bookingWindow(boat: Boat, o: Outing): { open: boolean; reason?: string } {
  const start = startsAt(o)
  if (o.status !== 'open' || start < Date.now()) return { open: false, reason: 'Esta salida ya no admite reservas.' }
  if (start > Date.now() + boat.bookMaxDays * 86400000) {
    return { open: false, reason: `Las reservas se abren ${boat.bookMaxDays} días antes de la salida.` }
  }
  if (start < Date.now() + boat.bookMinHours * 3600000) {
    return { open: false, reason: `Las reservas se cierran ${boat.bookMinHours} horas antes de salir.` }
  }
  return { open: true }
}
/** Se puede pedir plaza ahora mismo: quedan plazas y las reservas están abiertas. */
export function canBook(s: State, o: Outing) {
  const boat = s.boats.find((b) => b.id === o.boatId)
  return !!boat && o.seats - o.seatsTaken > 0 && bookingWindow(boat, o).open
}
/** Lo que ve el pescador: solo salidas en las que puede pedir plaza, más las que ya ha solicitado.
 *  Nunca una salida sin opción de reservar (cerrada por horario o completa). */
export function fisherOutings(s: State, meId: string) {
  return upcomingOutings(s).filter((o) => canBook(s, o) || !!myActiveBooking(s, o.id, meId))
}
export function conversationFor(s: State, bookingId: string) {
  return s.conversations.find((c) => c.bookingId === bookingId) ?? null
}
export function isUnread(c: Conversation, userId: string) {
  const readAt = userId === c.ownerId ? c.ownerReadAt : c.fisherReadAt
  return new Date(c.lastMessageAt).getTime() > new Date(readAt).getTime()
}

/* ---------- carga de datos ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const toUser = (r: any): PublicUser => ({ id: r.id, username: r.username, name: r.full_name, role: r.role, links: r.links ?? [], cardReady: !!r.stripe_ready })
const toBoat = (r: any): Boat => ({
  id: r.id, ownerId: r.owner_id, name: r.name, model: r.model, lengthM: Number(r.length_m), capacity: r.capacity,
  portId: r.port_id, description: r.description, photos: r.photos ?? [],
  insuranceDeclared: r.insurance_declared, licenseDeclared: r.license_declared,
  bookMaxDays: r.book_max_days, bookMinHours: r.book_min_hours,
  links: r.links ?? [], equipment: r.equipment ?? [], createdAt: r.created_at ?? '',
  live: r.live_at && r.live_lat != null ? { lat: Number(r.live_lat), lng: Number(r.live_lng), at: r.live_at } : null,
})
const hm = (t: string) => String(t).slice(0, 5)
const toOuting = (r: any): Outing => ({
  id: r.id, boatId: r.boat_id, portId: r.port_id, ruleId: r.rule_id, date: r.day, start: hm(r.start_time), end: hm(r.end_time),
  seats: r.seats, seatsTaken: r.seats_taken, type: r.fishing_type, costShare: Number(r.cost_share), notes: r.notes, status: r.status,
})
const toBooking = (r: any): Booking => ({
  id: r.id, outingId: r.outing_id, fisherId: r.fisher_id, seats: r.seats, status: r.status, message: r.message,
  amountTotal: Number(r.amount_total), commissionPct: Number(r.commission_pct), commissionAmount: Number(r.commission_amount),
  ownerAmount: Number(r.owner_amount), paymentMethod: r.payment_method, paymentStatus: r.payment_status,
  reason: r.reason, cancelledBy: r.cancelled_by,
  baseAmount: Number(r.base_amount ?? r.amount_total), fisherFee: Number(r.fisher_fee ?? 0), ownerFee: Number(r.owner_fee ?? 0),
  payBy: r.pay_by ?? null, refundStatus: r.refund_status ?? 'none', payoutStatus: r.payout_status ?? 'none', createdAt: r.created_at, updatedAt: r.updated_at,
})
const toNotice = (r: any): Notice => ({
  id: r.id, userId: r.user_id, title: r.title, body: r.body, link: r.link, createdAt: r.created_at, read: r.read,
})
const toRule = (r: any): Rule => ({
  id: r.id, boatId: r.boat_id, weekdays: r.weekdays, start: hm(r.start_time), end: hm(r.end_time), seats: r.seats,
  type: r.fishing_type, costShare: Number(r.cost_share), notes: r.notes, portId: r.port_id, validUntil: r.valid_until, active: r.active,
})
const toConversation = (r: any): Conversation => ({
  id: r.id, bookingId: r.booking_id, ownerId: r.owner_id, fisherId: r.fisher_id, lastMessage: r.last_message,
  lastMessageAt: r.last_message_at, ownerReadAt: r.owner_read_at, fisherReadAt: r.fisher_read_at,
})
const toMessage = (r: any): Message => ({
  id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, isSystem: r.is_system, body: r.body, createdAt: r.created_at,
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
    const [users, boats, outings, bookings, reviews, notices, settings, rules, blocked, convs, trips] = await Promise.all([
      supabase.from('profiles').select('id,username,full_name,role,links,stripe_ready'),
      supabase.from('boats').select('*'),
      supabase.from('outings').select('*').gte('day', addDays(-120)),
      supabase.from('bookings').select('*'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(60),
      supabase.from('app_settings').select('commission_pct,payments_enabled,refund_cutoff_hours,fisher_fee_pct,owner_fee_pct,regular_fisher_fee_pct,regular_owner_fee_pct,regular_after').maybeSingle(),
      supabase.from('outing_rules').select('*').eq('active', true),
      supabase.from('boat_blocked_days').select('boat_id,day').gte('day', isoDate(new Date())),
      supabase.from('conversations').select('*').order('last_message_at', { ascending: false }),
      supabase.rpc('owner_trip_counts'),
    ])
    const failed = [users, boats, outings, bookings, reviews, notices, settings, rules, blocked, convs].some((r) => r.error)
    // Si alguna consulta falla (sin cobertura, por ejemplo) se conserva lo que ya había en pantalla.
    if (failed || !state.me) return
    const us = (users.data ?? []).map(toUser)
    commit({
      users: us,
      settings: {
        commissionPct: Number(settings.data?.commission_pct ?? 15),
        paymentsEnabled: !!settings.data?.payments_enabled,
        refundCutoffHours: Number(settings.data?.refund_cutoff_hours ?? 24),
        fisherFeePct: Number(settings.data?.fisher_fee_pct ?? 10),
        ownerFeePct: Number(settings.data?.owner_fee_pct ?? 5),
        regularFisherFeePct: Number(settings.data?.regular_fisher_fee_pct ?? 5),
        regularOwnerFeePct: Number(settings.data?.regular_owner_fee_pct ?? 3),
        regularAfter: Number(settings.data?.regular_after ?? 2),
      },
      boats: (boats.data ?? []).map(toBoat),
      outings: (outings.data ?? []).map(toOuting),
      bookings: (bookings.data ?? []).map(toBooking),
      reviews: (reviews.data ?? []).map((r: any): Review => ({
        id: r.id, boatId: r.boat_id, bookingId: r.booking_id, rating: r.rating, comment: r.comment, photo: r.photo,
        date: String(r.created_at).slice(0, 10),
        outingDay: r.outing_day ?? null,
        authorName: shortName(us.find((u) => u.id === r.author_id)?.name ?? 'Pescador'),
      })),
      notices: (notices.data ?? []).map(toNotice),
      rules: (rules.data ?? []).map(toRule),
      blocked: (blocked.data ?? []).map((r: any) => ({ boatId: r.boat_id, day: r.day })),
      conversations: (convs.data ?? []).map(toConversation),
      // Si el recuento falla, se conservan las marcas que ya había: no impide cargar lo demás.
      tripCounts: trips.error
        ? state.tripCounts
        : Object.fromEntries(((trips.data ?? []) as { owner_id: string; trips: number }[]).map((r) => [r.owner_id, r.trips])),
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
      notifyEmail: data.notify_email,
      stripeConnected: !!data.stripe_account_id,
      prefs: { ports: data.pref_ports ?? [], types: data.pref_types ?? [], push: data.notify_new_outings },
    },
  })
  await refresh()
  commit({ ready: true })
  void syncPush()
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

/** Resultado especial: la cuenta existe pero falta escribir el código enviado al correo. */
export const NEEDS_CODE = '__verificar__'

async function callSignup(body: Record<string, unknown>): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
    })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  } catch {
    return { ok: false, data: {} }
  }
}
const fnError = (data: any) => (typeof data?.error === 'string' ? data.error : GENERIC)

export async function signUp(d: { name: string; username: string; email: string; password: string }): Promise<string | null> {
  const email = d.email.trim().toLowerCase()
  const username = d.username.trim().toLowerCase()
  if (d.name.trim().length < 2) return 'Escribe tu nombre.'
  if (!/^[a-z0-9._-]{3,20}$/.test(username)) return 'El nombre de usuario debe tener entre 3 y 20 letras, números, puntos o guiones.'
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Ese correo no parece válido.'
  if (d.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  const { ok, data } = await callSignup({ action: 'signup', name: d.name.trim(), username, email, password: d.password })
  if (!ok) return fnError(data)
  if (data.verify) return NEEDS_CODE
  return signIn(email, d.password)
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const mail = email.trim().toLowerCase()
  const { data, error } = await supabase.auth.signInWithPassword({ email: mail, password })
  if (error) {
    if (error.code === 'email_not_confirmed') {
      void resendCode(mail) // se manda un código nuevo por si el anterior ya caducó
      return NEEDS_CODE
    }
    return error.status === 400 ? 'El correo o la contraseña no son correctos.' : GENERIC
  }
  await loadSession(data.session)
  return state.me ? null : GENERIC
}

export async function verifyEmail(email: string, code: string, password: string): Promise<string | null> {
  const { ok, data } = await callSignup({ action: 'verify', email: email.trim().toLowerCase(), code })
  if (!ok) return fnError(data)
  return signIn(email, password)
}

export async function resendCode(email: string): Promise<string | null> {
  const { ok, data } = await callSignup({ action: 'resend', email: email.trim().toLowerCase() })
  return ok ? null : fnError(data)
}

export async function requestPasswordReset(email: string): Promise<string | null> {
  const mail = email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(mail)) return 'Ese correo no parece válido.'
  const { ok, data } = await callSignup({ action: 'reset_request', email: mail })
  return ok ? null : fnError(data)
}

export async function confirmPasswordReset(email: string, code: string, password: string): Promise<string | null> {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  const { ok, data } = await callSignup({ action: 'reset_confirm', email: email.trim().toLowerCase(), code, password })
  if (!ok) return fnError(data)
  return signIn(email, password)
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
  // Este dispositivo deja de recibir avisos de la cuenta que sale.
  await disablePush()
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

export function setNotifyEmail(on: boolean) {
  const me = state.me
  if (!me) return
  commit({ me: { ...me, notifyEmail: on } })
  void supabase
    .from('profiles')
    .update({ notify_email: on })
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

/* ---------- propietario: barcos ---------- */

export async function saveBoat(id: string | null, d: Omit<Boat, 'id' | 'ownerId' | 'createdAt' | 'live'>): Promise<{ error?: string; id?: string }> {
  const me = state.me
  if (!me) return { error: GENERIC }
  let photos: string[]
  try {
    photos = await Promise.all(d.photos.map(uploadPhoto))
  } catch {
    return { error: 'No se han podido subir las fotos. Inténtalo de nuevo.' }
  }
  const row = {
    name: d.name, model: d.model, length_m: d.lengthM, capacity: d.capacity, port_id: d.portId,
    description: d.description, photos, insurance_declared: d.insuranceDeclared, license_declared: d.licenseDeclared,
    book_max_days: d.bookMaxDays, book_min_hours: d.bookMinHours, links: d.links, equipment: d.equipment,
  }
  const before = id ? state.boats.find((b) => b.id === id)?.photos ?? [] : []
  const res = id
    ? await supabase.from('boats').update(row).eq('id', id).select('id').single()
    : await supabase.from('boats').insert(row).select('id').single()
  if (res.error) return { error: dbError(res.error) ?? GENERIC }
  // Las fotos que se han quitado se borran también del almacenamiento (solo las de la carpeta propia).
  const removed = before
    .filter((u) => !photos.includes(u))
    .map((u) => u.split('/storage/v1/object/public/photos/')[1])
    .filter((p): p is string => !!p && p.startsWith(`${me.id}/`))
  if (removed.length) void supabase.storage.from('photos').remove(removed).then(() => undefined)
  await refresh()
  return { id: res.data.id }
}

/* ---------- propietario: salidas y calendario ---------- */

export interface OutingInput {
  boatId: string
  portId: string
  date: string
  start: string
  end: string
  seats: number
  type: string
  costShare: number
  notes: string
}

function checkOuting(boat: Boat | undefined, d: Omit<OutingInput, 'date' | 'boatId'>): string | null {
  if (!boat) return 'Elige el barco.'
  if (!d.start || !d.end || d.end <= d.start) return 'La hora de vuelta debe ser posterior a la de salida.'
  if (d.seats < 1 || d.seats > boat.capacity) return `Tu barco admite entre 1 y ${boat.capacity} plazas.`
  if (Number.isNaN(d.costShare) || d.costShare < 0 || d.costShare > 500) return 'Indica el reparto de gastos por persona (entre 0 y 500 €).'
  return null
}

export async function publishOuting(d: OutingInput): Promise<string | null> {
  const boat = state.boats.find((b) => b.id === d.boatId && b.ownerId === state.me?.id)
  const bad = checkOuting(boat, d)
  if (bad) return bad
  if (!d.date || d.date < isoDate(new Date())) return 'Elige una fecha de hoy en adelante.'
  if (toDate(d.date, d.start).getTime() < Date.now()) return 'Esa hora de salida ya ha pasado.'
  const { error } = await supabase.from('outings').insert({
    boat_id: d.boatId, port_id: d.portId, day: d.date, start_time: d.start, end_time: d.end, seats: d.seats,
    fishing_type: d.type, cost_share: d.costShare, notes: d.notes,
  })
  if (error) return dbError(error)
  await refresh()
  return null
}

export async function createRule(
  d: Omit<OutingInput, 'date'> & { weekdays: number[]; until: string | null },
): Promise<{ error?: string; created?: number }> {
  const boat = state.boats.find((b) => b.id === d.boatId && b.ownerId === state.me?.id)
  const bad = checkOuting(boat, d)
  if (bad) return { error: bad }
  if (!d.weekdays.length) return { error: 'Elige al menos un día de la semana.' }
  const { data, error } = await supabase.rpc('create_rule', {
    p_boat: d.boatId, p_weekdays: d.weekdays, p_start: d.start, p_end: d.end, p_seats: d.seats, p_type: d.type,
    p_cost: d.costShare, p_notes: d.notes, p_port: d.portId, p_until: d.until || null,
  })
  if (error) return { error: dbError(error) ?? GENERIC }
  await refresh()
  return { created: data?.created ?? 0 }
}

export async function deleteRule(ruleId: string): Promise<{ error?: string; kept?: number }> {
  const { data, error } = await supabase.rpc('delete_rule', { p_rule: ruleId })
  await refresh()
  return error ? { error: dbError(error) ?? GENERIC } : { kept: data ?? 0 }
}

export async function setDayBlocked(boatId: string, day: string, blocked: boolean): Promise<{ error?: string; cancelled?: number }> {
  const { data, error } = await supabase.rpc('set_day_blocked', { p_boat: boatId, p_day: day, p_blocked: blocked })
  await refresh()
  return error ? { error: dbError(error) ?? GENERIC } : { cancelled: data ?? 0 }
}

export async function updateOuting(
  id: string,
  d: { start: string; end: string; seats: number; costShare: number; notes: string },
): Promise<string | null> {
  if (!d.start || !d.end || d.end <= d.start) return 'La hora de vuelta debe ser posterior a la de salida.'
  if (Number.isNaN(d.costShare)) return 'Indica el reparto de gastos por persona.'
  const { error } = await supabase.rpc('update_outing', {
    p_outing: id, p_start: d.start, p_end: d.end, p_seats: d.seats, p_cost: d.costShare, p_notes: d.notes,
  })
  await refresh()
  return dbError(error)
}

export async function cancelOuting(outingId: string, reason = ''): Promise<string | null> {
  const { error } = await supabase.rpc('cancel_outing', { p_outing: outingId, p_reason: reason })
  await refresh()
  return dbError(error)
}

export async function respondBooking(bookingId: string, accept: boolean, reason = ''): Promise<string | null> {
  const { error } = await supabase.rpc('respond_booking', { p_booking: bookingId, p_accept: accept, p_reason: reason })
  await refresh()
  return dbError(error)
}

/* ---------- pescador ---------- */

export async function requestBooking(outingId: string, seats: number, message: string): Promise<string | null> {
  const { error } = await supabase.rpc('request_booking', { p_outing: outingId, p_seats: seats, p_message: message })
  await refresh()
  return dbError(error)
}

/* ---------- pagos con tarjeta (Stripe) ---------- */

/** Las salidas de este barco se pagan con tarjeta en la app (pagos activos y el patrón con su cuenta de cobro lista). */
export function paysByCard(s: State, boat: Boat | undefined | null) {
  if (!boat || !s.settings.paymentsEnabled) return false
  return !!s.users.find((u) => u.id === boat.ownerId)?.cardReady
}

async function callPagos(body: Record<string, unknown>): Promise<{ ok: boolean; data: any }> {
  const { data: sess } = await supabase.auth.getSession()
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${sess.session?.access_token ?? ''}` },
      body: JSON.stringify(body),
    })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  } catch {
    return { ok: false, data: {} }
  }
}

/** Pescador y patrón ya han hecho juntos las salidas necesarias para la tarifa de compañeros habituales. */
export function isRegular(s: State, fisherId: string, ownerId: string) {
  const done = s.bookings.filter((b) => {
    if (b.fisherId !== fisherId || b.status !== 'confirmed') return false
    const o = s.outings.find((x) => x.id === b.outingId)
    const boat = o && s.boats.find((x) => x.id === o.boatId)
    return !!o && !!boat && boat.ownerId === ownerId && o.status !== 'cancelled' && isPast(o)
  }).length
  return done >= s.settings.regularAfter
}

/** Gestión de la plataforma que paga el pescador (%), según sea o no compañero habitual del patrón. */
export function fisherFeePct(s: State, fisherId: string, ownerId: string) {
  return isRegular(s, fisherId, ownerId) ? s.settings.regularFisherFeePct : s.settings.fisherFeePct
}

/** Lleva al pescador a la página de pago segura de Stripe. Devuelve un error o nada (si redirige). */
export async function payBooking(bookingId: string): Promise<string | null> {
  const { ok, data } = await callPagos({ action: 'checkout', booking_id: bookingId })
  if (!ok || !data.url) return typeof data.error === 'string' ? data.error : GENERIC
  window.location.href = data.url
  return null
}

/** Cuenta de cobro del patrón: 'onboard' abre el alta en Stripe; 'status' comprueba si ya puede cobrar. */
export async function payoutAccount(action: 'onboard' | 'status'): Promise<{ error?: string; ready?: boolean; connected?: boolean }> {
  const { ok, data } = await callPagos({ action })
  if (!ok) return { error: typeof data.error === 'string' ? data.error : GENERIC }
  if (action === 'onboard' && data.url) {
    window.location.href = data.url
    return {}
  }
  await refresh()
  return { ready: !!data.ready, connected: !!data.connected }
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

/* ---------- chat ---------- */

export async function loadMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(500)
  if (error) return
  const list = (data ?? []).map(toMessage)
  const prev = state.messages[conversationId]
  if (prev && prev.length === list.length && prev[prev.length - 1]?.id === list[list.length - 1]?.id) return
  commit({ messages: { ...state.messages, [conversationId]: list } })
}

export async function sendMessage(conversationId: string, body: string): Promise<string | null> {
  const text = body.trim()
  if (!text) return null
  const { error } = await supabase.rpc('send_message', { p_conversation: conversationId, p_body: text })
  if (error) return dbError(error)
  await Promise.all([loadMessages(conversationId), refresh()])
  return null
}

export function markConversationRead(conversationId: string) {
  const me = state.me
  const c = state.conversations.find((x) => x.id === conversationId)
  if (!me || !c || !isUnread(c, me.id)) return
  const now = new Date().toISOString()
  commit({
    conversations: state.conversations.map((x) =>
      x.id !== conversationId ? x : me.id === x.ownerId ? { ...x, ownerReadAt: now } : { ...x, fisherReadAt: now },
    ),
  })
  void supabase.rpc('mark_conversation_read', { p_conversation: conversationId }).then(() => undefined)
}
