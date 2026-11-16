import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Ban, Calculator, CalendarDays, Camera, ChevronLeft, ChevronRight, CirclePlus, Inbox, MessageCircle, Plus, Repeat, Sailboat,
  Settings2, Wallet, X,
} from 'lucide-react'
import {
  Button, Chip, Empty, ErrorMsg, Field, Header, LinksInput, Notice, OutingTicket, Photo, SectionTitle, SocialLinks, StatusBadge, inputCls,
} from '../components/ui'
import { NotFound } from './explore'
import {
  cancelOuting, conversationFor, createRule, deleteRule, isPast, myBoats, publishOuting, respondBooking, saveBoat, seatsLeft,
  setDayBlocked, updateOuting, useAppState, useMe,
} from '../data/store'
import { PORTS, portById } from '../data/seed'
import {
  ACTIVE, BOAT_EQUIPMENT, FISHING_TYPES, MAX_BOAT_PHOTOS, WEEKDAYS, addDays, dayLabel, euro, isoDate, longDate, monthLabel, parseMoney, shortDate, toDate,
  weekdayList,
} from '../lib/format'
import { fileToDataUrl } from '../lib/image'
import type { Boat, Booking, Outing, State } from '../types'

/* ---------- utilidades del propietario ---------- */

function useOwnerData() {
  const s = useAppState()
  const me = useMe()
  const boats = me ? myBoats(s, me.id) : []
  const boatIds = new Set(boats.map((b) => b.id))
  const outings = s.outings.filter((o) => boatIds.has(o.boatId))
  const outingIds = new Set(outings.map((o) => o.id))
  const bookings = s.bookings.filter((b) => outingIds.has(b.outingId))
  return { s, me, boats, outings, bookings }
}

const byWhen = (a: Outing, b: Outing) => (a.date + a.start).localeCompare(b.date + b.start)
const userName = (s: State, id: string) => s.users.find((u) => u.id === id)?.name ?? 'Pescador'

function NoBoat({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col">
      <Header title={title} />
      <Empty icon={<Sailboat size={24} />} title="Da de alta tu barco" text="Con la ficha del barco podrás publicar salidas y recibir solicitudes."
        action={<Link to="/barco-editar/nuevo" className="font-semibold text-sea">Crear la ficha del barco</Link>} />
    </div>
  )
}

/** Aceptar o rechazar una solicitud pendiente. */
function RequestActions({ b }: { b: Booking }) {
  const [mode, setMode] = useState<'idle' | 'reject'>('idle')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const answer = async (accept: boolean) => {
    setBusy(true)
    setErr(null)
    const e = await respondBooking(b.id, accept, accept ? '' : reason.trim())
    setBusy(false)
    if (e) setErr(e)
  }
  if (mode === 'reject') {
    return (
      <div className="space-y-2">
        <textarea className={`${inputCls} min-h-16 resize-none text-sm`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional). Lo verá el pescador." aria-label="Motivo del rechazo" />
        <ErrorMsg>{err}</ErrorMsg>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode('idle')}>Volver</Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => answer(false)}>Rechazar solicitud</Button>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <ErrorMsg>{err}</ErrorMsg>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode('reject')}>Rechazar</Button>
        <Button size="sm" disabled={busy} onClick={() => answer(true)}>{busy ? 'Un momento…' : 'Aceptar'}</Button>
      </div>
    </div>
  )
}

function RequestCard({ b }: { b: Booking }) {
  const s = useAppState()
  const o = s.outings.find((x) => x.id === b.outingId)
  const boat = o ? s.boats.find((x) => x.id === o.boatId) : undefined
  if (!o || !boat) return null
  const left = seatsLeft(s, o)
  const fisherLinks = s.users.find((u) => u.id === b.fisherId)?.links ?? []
  return (
    <article className="min-w-0 space-y-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{userName(s, b.fisherId)}</p>
          <p className="text-[13px] text-ink-soft">
            Pide <b className="text-ink">{b.seats} {b.seats === 1 ? 'plaza' : 'plazas'}</b> · quedan {left}
          </p>
        </div>
        <span className="tnum shrink-0 text-[15px] font-bold">{euro(b.amountTotal)}</span>
      </div>
      <SocialLinks links={fisherLinks} />
      <Link to={`/salida-editar/${o.id}`} className="block rounded-xl bg-foam px-3 py-2 text-[13px]">
        <span className="font-semibold">{dayLabel(o.date)}, {o.start} – {o.end}</span>
        <span className="block truncate text-ink-soft">{boat.name} · {portById(o.portId).name}</span>
      </Link>
      {b.message && <p className="wrap-anywhere whitespace-pre-line rounded-xl border border-line px-3 py-2 text-[13px]">«{b.message}»</p>}
      {b.commissionAmount > 0 && (
        <p className="text-xs text-ink-soft">Recibirás {euro(b.ownerAmount)} (comisión de Pescamigo: {euro(b.commissionAmount)}).</p>
      )}
      <RequestActions b={b} />
    </article>
  )
}

/** Pie de cada salida en el panel: quién va y qué falta por responder. */
function OwnerOutingFooter({ o }: { o: Outing }) {
  const s = useAppState()
  const nav = useNavigate()
  const list = s.bookings.filter((b) => b.outingId === o.id && (b.status === 'confirmed' || b.status === 'accepted'))
  const pending = s.bookings.filter((b) => b.outingId === o.id && b.status === 'pending').length
  return (
    <div className="space-y-2">
      {list.length === 0 ? (
        <p className="text-[13px] text-ink-soft">Nadie confirmado todavía.</p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((b) => {
            const chat = conversationFor(s, b.id)
            return (
              <li key={b.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="min-w-0 truncate"><b>{userName(s, b.fisherId)}</b> · {b.seats} {b.seats === 1 ? 'plaza' : 'plazas'}</span>
                {chat && (
                  <Link to={`/chat/${chat.id}`} className="flex shrink-0 items-center gap-1 font-semibold text-sea">
                    <MessageCircle size={14} /> Chat
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {pending > 0 ? (
          <span className="rounded-full bg-buoy-50 px-2.5 py-0.5 text-xs font-semibold text-buoy-dark">
            {pending} {pending === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
          </span>
        ) : <span />}
        <Button size="sm" variant="outline" onClick={() => nav(`/salida-editar/${o.id}`)}>Gestionar</Button>
      </div>
    </div>
  )
}

/* ---------- Panel ---------- */

export function Panel() {
  const { s, me, boats, outings, bookings } = useOwnerData()
  if (!me) return null
  if (!boats.length) return <NoBoat title="Panel" />
  const outingOf = (b: Booking) => s.outings.find((o) => o.id === b.outingId)!
  const pending = bookings
    .filter((b) => b.status === 'pending' && !isPast(outingOf(b)))
    .sort((a, b) => byWhen(outingOf(a), outingOf(b)))
  const upcoming = outings.filter((o) => o.status === 'open' && !isPast(o)).sort(byWhen)
  const month = isoDate(new Date()).slice(0, 7)
  const monthIncome = bookings
    .filter((b) => b.status === 'confirmed' && outingOf(b).date.startsWith(month))
    .reduce((n, b) => n + b.ownerAmount, 0)
  const since = Date.now() - 30 * 86400000
  const cancelled = bookings
    .filter((b) => b.status === 'cancelled' && new Date(b.updatedAt).getTime() > since)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8)

  const tiles: { label: string; value: string; to: string; icon: ReactNode }[] = [
    { label: 'Solicitudes', value: String(pending.length), to: '#solicitudes', icon: <Inbox size={16} /> },
    { label: 'Próximas salidas', value: String(upcoming.length), to: '/calendario', icon: <CalendarDays size={16} /> },
    { label: 'Este mes', value: euro(monthIncome), to: '/ingresos', icon: <Wallet size={16} /> },
  ]

  return (
    <div className="flex h-full flex-col">
      <Header title="Panel" sub={`Hola, ${me.name.split(' ')[0]}`} />
      <div className="col flex-1 space-y-7 overflow-y-auto p-4 lg:py-6">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => {
            const inner = (
              <>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft sm:text-xs">{t.icon}<span className="truncate">{t.label}</span></span>
                <span className="tnum mt-1 block truncate text-lg font-extrabold sm:text-xl">{t.value}</span>
              </>
            )
            return t.to.startsWith('#') ? (
              <a key={t.label} href={t.to} onClick={(e) => { e.preventDefault(); document.getElementById('solicitudes')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="min-w-0 rounded-2xl border border-line bg-white p-3">{inner}</a>
            ) : (
              <Link key={t.label} to={t.to} className="min-w-0 rounded-2xl border border-line bg-white p-3">{inner}</Link>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/publicar" className="flex items-center justify-center gap-2 rounded-xl bg-buoy px-3 py-3 text-[14px] font-semibold text-white">
            <CirclePlus size={17} /> Publicar salida
          </Link>
          <Link to="/publicar?habitual=1" className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-3 text-[14px] font-semibold">
            <Repeat size={17} /> Salida habitual
          </Link>
        </div>

        <section id="solicitudes" className="scroll-mt-4 space-y-3">
          <SectionTitle count={pending.length}>Solicitudes pendientes</SectionTitle>
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">No tienes solicitudes por responder.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">{pending.map((b) => <RequestCard key={b.id} b={b} />)}</div>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle count={upcoming.length} action={<Link to="/calendario" className="text-[13px] font-semibold text-sea">Calendario</Link>}>
            Próximas salidas
          </SectionTitle>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">No tienes salidas publicadas.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
              {upcoming.slice(0, 8).map((o) => <OutingTicket key={o.id} outing={o} to={`/salida-editar/${o.id}`} footer={<OwnerOutingFooter o={o} />} />)}
            </div>
          )}
          {upcoming.length > 8 && <Link to="/calendario" className="block text-center text-[13px] font-semibold text-sea">Ver las {upcoming.length} en el calendario</Link>}
        </section>

        <section className="space-y-3">
          <SectionTitle count={boats.length} action={<Link to="/barco-editar/nuevo" className="flex items-center gap-1 text-[13px] font-semibold text-sea"><Plus size={14} /> Añadir</Link>}>
            Mis barcos
          </SectionTitle>
          <ul className="grid gap-2 lg:grid-cols-2 [&>*]:min-w-0">
            {boats.map((b) => (
              <li key={b.id}>
                <Link to={`/barco-editar/${b.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                  <Photo src={b.photos[0]} className="max-h-12 max-w-16 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{b.name}</span>
                    <span className="block truncate text-xs text-ink-soft">{portById(b.portId).name} · {b.capacity} plazas</span>
                  </span>
                  <Settings2 size={17} className="shrink-0 text-ink-soft" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <SectionTitle action={<Link to="/ingresos" className="text-[13px] font-semibold text-sea">Ingresos</Link>}>Cancelaciones de los últimos 30 días</SectionTitle>
          {cancelled.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">Ninguna.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {cancelled.map((b) => {
                const o = outingOf(b)
                return (
                  <li key={b.id} className="px-4 py-3 text-[13px]">
                    <p className="min-w-0"><b>{userName(s, b.fisherId)}</b> · {shortDate(o.date)} {o.start}</p>
                    <p className="text-ink-soft">
                      {b.cancelledBy === 'owner' ? 'Cancelada por ti' : b.cancelledBy === 'fisher' ? 'Cancelada por el pescador' : 'Cancelada'}
                      {b.reason ? <span className="wrap-anywhere"> · {b.reason}</span> : null}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/* ---------- Calendario ---------- */

export function CalendarPage() {
  const { s, me, boats, outings, bookings } = useOwnerData()
  const [q] = useSearchParams()
  const location = useLocation()
  const nav = useNavigate()
  const today = new Date()
  const [boatId, setBoatId] = useState<string | null>(q.get('barco'))
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [sel, setSel] = useState(isoDate(today))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>((location.state as { msg?: string } | null)?.msg ?? null)
  if (!me) return null
  if (!boats.length) return <NoBoat title="Calendario" />
  const boat = boats.find((b) => b.id === boatId) ?? boats[0]
  const todayIso = isoDate(today)

  const mine = outings.filter((o) => o.boatId === boat.id)
  const openByDay = new Map<string, Outing[]>()
  for (const o of mine) {
    if (o.status !== 'open') continue
    openByDay.set(o.date, [...(openByDay.get(o.date) ?? []), o])
  }
  const pendingDays = new Set(
    bookings.filter((b) => b.status === 'pending').map((b) => mine.find((o) => o.id === b.outingId)?.date).filter(Boolean) as string[],
  )
  const blocked = new Set(s.blocked.filter((d) => d.boatId === boat.id).map((d) => d.day))
  const rules = s.rules.filter((r) => r.boatId === boat.id && r.active)

  // Rejilla del mes empezando en lunes.
  const first = new Date(ym.y, ym.m, 1)
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(new Date(ym.y, ym.m, i + 1))),
  ]
  const move = (delta: number) => {
    const d = new Date(ym.y, ym.m + delta, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }

  const dayOutings = mine.filter((o) => o.date === sel).sort(byWhen)
  const dayActive = dayOutings.filter((o) => o.status === 'open')
  const isBlocked = blocked.has(sel)
  const isPastDay = sel < todayIso

  const toggleBlock = async () => {
    setErr(null)
    setMsg(null)
    if (!isBlocked) {
      const withBookings = dayActive.filter((o) => bookings.some((b) => b.outingId === o.id && ACTIVE.includes(b.status))).length
      const text = withBookings
        ? `Ese día tienes ${withBookings === 1 ? 'una salida con solicitudes o reservas' : `${withBookings} salidas con solicitudes o reservas`}. Se cancelarán y se avisará a los pescadores. ¿Bloquear el día?`
        : dayActive.length ? 'Se cancelarán las salidas de ese día. ¿Bloquear el día?' : '¿Bloquear este día? No se publicarán salidas habituales en él.'
      if (!window.confirm(text)) return
    }
    setBusy(true)
    const r = await setDayBlocked(boat.id, sel, !isBlocked)
    setBusy(false)
    if (r.error) return setErr(r.error)
    setMsg(isBlocked ? 'Día desbloqueado.' : r.cancelled ? `Día bloqueado. Se ha avisado a ${r.cancelled} ${r.cancelled === 1 ? 'pescador' : 'pescadores'}.` : 'Día bloqueado.')
  }
  const stopRule = async (id: string) => {
    if (!window.confirm('¿Dejar de repetir esta salida? Las fechas futuras sin reservas desaparecen; las que ya tienen reservas se mantienen.')) return
    setBusy(true)
    const r = await deleteRule(id)
    setBusy(false)
    if (r.error) return setErr(r.error)
    setMsg(r.kept ? `Hecho. Se mantienen ${r.kept} ${r.kept === 1 ? 'fecha que ya tiene' : 'fechas que ya tienen'} reservas: puedes cancelarlas una a una.` : 'Hecho. Ya no se repetirá.')
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Calendario" />
      <div className="col flex-1 space-y-5 overflow-y-auto p-4 lg:py-6">
        {boats.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {boats.map((b) => <Chip key={b.id} active={b.id === boat.id} onClick={() => setBoatId(b.id)}>{b.name}</Chip>)}
          </div>
        )}
        <Notice>{msg}</Notice>
        <ErrorMsg>{err}</ErrorMsg>

        <div className="rounded-2xl border border-line bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => move(-1)} aria-label="Mes anterior" className="grid h-9 w-9 place-items-center rounded-full hover:bg-foam"><ChevronLeft size={18} /></button>
            <p className="text-[15px] font-bold">{monthLabel(ym.y, ym.m)}</p>
            <button type="button" onClick={() => move(1)} aria-label="Mes siguiente" className="grid h-9 w-9 place-items-center rounded-full hover:bg-foam"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-soft">
            {WEEKDAYS.map((d) => <span key={d.v} aria-hidden="true">{d.short}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={`x${i}`} />
              const n = openByDay.get(d)?.length ?? 0
              const isSel = d === sel
              const past = d < todayIso
              const blk = blocked.has(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSel(d); setErr(null) }}
                  aria-pressed={isSel}
                  aria-label={`${longDate(d)}${n ? `, ${n} ${n === 1 ? 'salida' : 'salidas'}` : ''}${blk ? ', bloqueado' : ''}${pendingDays.has(d) ? ', con solicitudes' : ''}`}
                  className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg text-[13px] font-semibold transition ${
                    isSel ? 'bg-ink text-white' : blk ? 'bg-foam text-ink-soft line-through' : past ? 'text-ink-soft/50' : 'hover:bg-foam'
                  } ${d === todayIso && !isSel ? 'ring-1 ring-sea' : ''}`}
                >
                  <span className="tnum">{Number(d.slice(8))}</span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {n > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-sea'}`} />}
                    {pendingDays.has(d) && <span className="h-1.5 w-1.5 rounded-full bg-buoy" />}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sea" /> Salida</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-buoy" /> Solicitudes por responder</span>
            <span className="flex items-center gap-1"><span className="text-[11px] line-through">12</span> Bloqueado</span>
          </div>
        </div>

        <section className="space-y-3">
          <SectionTitle>{longDate(sel)}</SectionTitle>
          {isBlocked && <p className="rounded-xl bg-foam px-4 py-3 text-sm text-ink-soft">Has bloqueado este día: no se publican salidas en él.</p>}
          {dayOutings.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
              {dayOutings.map((o) => <OutingTicket key={o.id} outing={o} to={`/salida-editar/${o.id}`} footer={o.status === 'open' ? <OwnerOutingFooter o={o} /> : undefined} />)}
            </div>
          ) : (
            !isBlocked && <p className="text-sm text-ink-soft">{isPastDay ? 'No hubo salidas este día.' : 'No tienes salidas este día.'}</p>
          )}
          {!isPastDay && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={isBlocked} onClick={() => nav(`/publicar?fecha=${sel}&barco=${boat.id}`)}>
                <Plus size={16} /> Publicar
              </Button>
              <Button variant={isBlocked ? 'outline' : 'danger'} disabled={busy} onClick={toggleBlock}>
                <Ban size={16} /> {isBlocked ? 'Desbloquear' : 'Bloquear día'}
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle count={rules.length} action={<Link to={`/publicar?habitual=1&barco=${boat.id}`} className="flex items-center gap-1 text-[13px] font-semibold text-sea"><Plus size={14} /> Añadir</Link>}>
            Salidas habituales
          </SectionTitle>
          {rules.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">
              Si sales siempre los mismos días, crea una salida habitual y las fechas se publicarán solas.
            </p>
          ) : (
            <ul className="space-y-2">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold first-letter:uppercase">{weekdayList(r.weekdays)}, de {r.start} a {r.end}</p>
                    <p className="text-[13px] text-ink-soft">
                      {r.type} · {r.seats} {r.seats === 1 ? 'plaza' : 'plazas'} · {euro(r.costShare)} · {portById(r.portId).name}
                      {r.validUntil ? ` · hasta el ${shortDate(r.validUntil)}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => stopRule(r.id)}>Dejar de repetir</Button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-soft">
            Los pescadores pueden pedir plaza desde {boat.bookMaxDays} días antes y hasta {boat.bookMinHours} horas antes de salir.{' '}
            <Link to={`/barco-editar/${boat.id}`} className="font-semibold text-sea">Cambiar</Link>
          </p>
        </section>
      </div>
    </div>
  )
}

/* ---------- Publicar (una fecha o cada semana) ---------- */

export function Publish() {
  const { me, boats } = useOwnerData()
  const nav = useNavigate()
  const [q] = useSearchParams()
  const initial = boats.find((b) => b.id === q.get('barco')) ?? boats[0]
  const [mode, setMode] = useState<'once' | 'weekly'>(q.get('habitual') ? 'weekly' : 'once')
  const [f, setF] = useState({
    boatId: initial?.id ?? '',
    portId: initial?.portId ?? PORTS[0].id,
    date: q.get('fecha') ?? addDays(1),
    weekdays: [6] as number[],
    until: '',
    start: '07:00',
    end: '13:00',
    seats: Math.min(2, initial?.capacity ?? 2),
    type: 'Pesca a fondo',
    costShare: '20',
    notes: '',
  })
  const [calc, setCalc] = useState({ open: false, fuel: '', other: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!me) return null
  if (!boats.length) return <NoBoat title="Publicar salida" />
  const boat = boats.find((b) => b.id === f.boatId) ?? boats[0]

  const people = f.seats + 1 // los invitados y el patrón
  const total = (parseMoney(calc.fuel) || 0) + (parseMoney(calc.other) || 0)
  const suggested = Math.ceil(total / people)
  const pickBoat = (b: Boat) => setF({ ...f, boatId: b.id, portId: b.portId, seats: Math.min(f.seats, b.capacity) })
  const toggleDay = (v: number) => setF({ ...f, weekdays: f.weekdays.includes(v) ? f.weekdays.filter((d) => d !== v) : [...f.weekdays, v] })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setErr(null)
    const base = { boatId: boat.id, portId: f.portId, start: f.start, end: f.end, seats: f.seats, type: f.type, costShare: parseMoney(f.costShare), notes: f.notes.trim() }
    setBusy(true)
    if (mode === 'once') {
      const error = await publishOuting({ ...base, date: f.date })
      setBusy(false)
      if (error) return setErr(error)
      nav('/panel')
    } else {
      const r = await createRule({ ...base, weekdays: f.weekdays, until: f.until || null })
      setBusy(false)
      if (r.error) return setErr(r.error)
      nav(`/calendario?barco=${boat.id}`, {
        state: {
          msg: r.created
            ? `Salida habitual creada: se han publicado ${r.created} ${r.created === 1 ? 'fecha' : 'fechas'}.`
            : 'Salida habitual creada. Todavía no hay fechas dentro del periodo de reserva; se publicarán solas.',
        },
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={mode === 'once' ? 'Publicar salida' : 'Salida habitual'} />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="col flex-1 space-y-4 overflow-y-auto p-4 lg:py-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-line/50 p-1" role="tablist" aria-label="Tipo de publicación">
            {(['once', 'weekly'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-[13px] font-semibold ${mode === m ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'}`}>
                {m === 'once' ? 'Una fecha' : 'Cada semana'}
              </button>
            ))}
          </div>
          {mode === 'weekly' && (
            <p className="text-[13px] text-ink-soft">
              Las fechas se publican solas dentro del periodo de reserva del barco ({boat.bookMaxDays} días). Son fechas previstas: tú confirmas cada solicitud y puedes cambiar o cancelar una fecha sin tocar las demás.
            </p>
          )}

          {boats.length > 1 && (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Barco</p>
              <div className="flex flex-wrap gap-2">
                {boats.map((b) => <Chip key={b.id} active={b.id === boat.id} onClick={() => pickBoat(b)}>{b.name}</Chip>)}
              </div>
            </div>
          )}

          {mode === 'once' ? (
            <Field label="Fecha">
              <input type="date" className={inputCls} min={addDays(0)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold">Días de la semana</p>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => (
                    <Chip key={d.v} active={f.weekdays.includes(d.v)} onClick={() => toggleDay(d.v)} label={d.name}>{d.short}</Chip>
                  ))}
                </div>
                {f.weekdays.length > 0 && <p className="mt-1.5 text-xs text-ink-soft first-letter:uppercase">{weekdayList(f.weekdays)}</p>}
              </div>
              <Field label="Hasta (opcional)" hint="Déjalo vacío si no tiene fecha de fin.">
                <input type="date" className={inputCls} min={addDays(0)} value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} />
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de salida">
              <input type="time" className={inputCls} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
            </Field>
            <Field label="Hora de vuelta">
              <input type="time" className={inputCls} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
            </Field>
          </div>
          <Field label="Puerto de salida">
            <select className={inputCls} value={f.portId} onChange={(e) => setF({ ...f, portId: e.target.value })}>
              {PORTS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.town})</option>)}
            </select>
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Tipo de pesca</p>
            <div className="flex flex-wrap gap-2">
              {FISHING_TYPES.map((t) => <Chip key={t} active={f.type === t} onClick={() => setF({ ...f, type: t })}>{t}</Chip>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Plazas que ofreces</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: boat.capacity }, (_, i) => i + 1).map((n) => (
                <Chip key={n} active={f.seats === n} onClick={() => setF({ ...f, seats: n })}>{n}</Chip>
              ))}
            </div>
          </div>

          <Field label="Reparto de gastos por persona (€)" hint="Solo gastos reales de la salida: combustible, cebo, hielo.">
            <input className={`${inputCls} tnum`} inputMode="decimal" value={f.costShare} onChange={(e) => setF({ ...f, costShare: e.target.value })} />
          </Field>

          <div className="rounded-2xl border border-line bg-white p-4">
            <button type="button" onClick={() => setCalc({ ...calc, open: !calc.open })} aria-expanded={calc.open} className="flex w-full items-center gap-2 text-left text-sm font-semibold text-sea">
              <Calculator size={16} className="shrink-0" /> Calcular el reparto a partir de los gastos
            </button>
            {calc.open && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Combustible (€)">
                    <input className={`${inputCls} tnum`} inputMode="decimal" value={calc.fuel} onChange={(e) => setCalc({ ...calc, fuel: e.target.value })} />
                  </Field>
                  <Field label="Cebo, hielo… (€)">
                    <input className={`${inputCls} tnum`} inputMode="decimal" value={calc.other} onChange={(e) => setCalc({ ...calc, other: e.target.value })} />
                  </Field>
                </div>
                <p className="text-[13px] text-ink-soft">
                  {euro(total)} entre {people} personas (tú incluido) son <b className="text-ink">{euro(suggested)}</b> por persona.
                </p>
                <Button type="button" variant="outline" full disabled={total <= 0} onClick={() => setF({ ...f, costShare: String(suggested) })}>
                  Usar {euro(suggested)}
                </Button>
              </div>
            )}
          </div>

          <Field label="Nota para quien venga (opcional)">
            <textarea className={`${inputCls} min-h-20 resize-none`} maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Zona de pesca, qué traer, punto de encuentro…" />
          </Field>
          <ErrorMsg>{err}</ErrorMsg>
        </div>
        <div className="col border-t border-line bg-white p-4">
          <Button full variant="accent" type="submit" disabled={busy}>
            {busy ? 'Publicando…' : mode === 'once' ? 'Publicar salida' : 'Crear salida habitual'}
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ---------- Gestionar una salida ---------- */

export function OutingEdit() {
  const { id } = useParams()
  const { s, me } = useOwnerData()
  const o = s.outings.find((x) => x.id === id)
  const boat = o ? s.boats.find((b) => b.id === o.boatId) : undefined
  const [f, setF] = useState(() => ({
    start: o?.start ?? '07:00', end: o?.end ?? '13:00', seats: o?.seats ?? 1, costShare: String(o?.costShare ?? ''), notes: o?.notes ?? '',
  }))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  if (!o || !boat || !me || boat.ownerId !== me.id) return <NotFound what="No encontramos esta salida." />
  const list = s.bookings.filter((b) => b.outingId === o.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const active = list.filter((b) => ACTIVE.includes(b.status))
  const editable = o.status === 'open' && toDate(o.date, o.start).getTime() > Date.now()

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    const error = await updateOuting(o.id, { ...f, costShare: parseMoney(f.costShare), notes: f.notes.trim() })
    setBusy(false)
    if (error) return setErr(error)
    setMsg(active.length && (f.start !== o.start || f.end !== o.end) ? 'Cambios guardados. Hemos avisado del nuevo horario a quien tiene plaza o solicitud.' : 'Cambios guardados.')
  }
  const cancel = async () => {
    const text = active.length
      ? `Se cancelarán ${active.length} ${active.length === 1 ? 'solicitud o reserva' : 'solicitudes o reservas'} y se avisará a los pescadores. ¿Cancelar la salida?`
      : '¿Cancelar esta salida?'
    if (!window.confirm(text)) return
    setBusy(true)
    setErr(null)
    const error = await cancelOuting(o.id, reason.trim())
    setBusy(false)
    if (error) return setErr(error)
    setMsg('Salida cancelada.')
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={longDate(o.date)} sub={`${boat.name} · ${portById(o.portId).name}`} back />
      <div className="col flex-1 space-y-6 overflow-y-auto p-4 lg:py-6">
        <Notice>{msg}</Notice>
        {o.status === 'cancelled' && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">Esta salida está cancelada.</p>}
        {o.ruleId && o.status === 'open' && (
          <p className="flex items-start gap-2 rounded-xl bg-foam px-4 py-3 text-[13px] text-ink-soft">
            <Repeat size={15} className="mt-0.5 shrink-0" /> Forma parte de una salida habitual. Lo que cambies aquí solo afecta a esta fecha.
          </p>
        )}

        <section className="space-y-3">
          <SectionTitle count={list.length}>Solicitudes y reservas</SectionTitle>
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">Nadie ha pedido plaza todavía.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((b) => {
                const chat = conversationFor(s, b.id)
                return (
                  <li key={b.id} className="space-y-2 rounded-2xl border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-bold">{userName(s, b.fisherId)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-[13px] text-ink-soft">{b.seats} {b.seats === 1 ? 'plaza' : 'plazas'} · {euro(b.amountTotal)}</p>
                    {b.message && <p className="wrap-anywhere whitespace-pre-line text-[13px]">«{b.message}»</p>}
                    {b.reason && b.status !== 'pending' && <p className="wrap-anywhere text-[13px] text-ink-soft">Motivo: {b.reason}</p>}
                    {b.status === 'pending' && editable && <RequestActions b={b} />}
                    {chat && (
                      <Link to={`/chat/${chat.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-sea">
                        <MessageCircle size={14} /> Abrir chat
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {editable && (
          <form onSubmit={save} className="space-y-4">
            <SectionTitle>Cambiar esta fecha</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora de salida">
                <input type="time" className={inputCls} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
              </Field>
              <Field label="Hora de vuelta">
                <input type="time" className={inputCls} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Plazas que ofreces</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: boat.capacity }, (_, i) => i + 1).map((n) => (
                  <Chip key={n} active={f.seats === n} onClick={() => setF({ ...f, seats: n })}>{n}</Chip>
                ))}
              </div>
              {o.seatsTaken > 0 && <p className="mt-1 text-xs text-ink-soft">Tienes {o.seatsTaken} ocupadas: no puedes ofrecer menos.</p>}
            </div>
            <Field label="Reparto de gastos por persona (€)" hint={active.length ? 'No se puede cambiar mientras haya solicitudes o reservas activas.' : undefined}>
              <input className={`${inputCls} tnum`} inputMode="decimal" disabled={active.length > 0} value={f.costShare} onChange={(e) => setF({ ...f, costShare: e.target.value })} />
            </Field>
            <Field label="Nota para quien venga">
              <textarea className={`${inputCls} min-h-20 resize-none`} maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </Field>
            <ErrorMsg>{err}</ErrorMsg>
            <Button full type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button>
          </form>
        )}

        {editable && (
          <section className="space-y-3 rounded-2xl border border-red-200 bg-white p-4">
            <h2 className="text-sm font-bold text-red-800">Cancelar esta salida</h2>
            <p className="text-[13px] text-ink-soft">Solo se cancela esta fecha. Avisaremos por correo y en la app a quien tenga plaza o solicitud.</p>
            <textarea className={`${inputCls} min-h-16 resize-none text-sm`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (opcional), por ejemplo: mal tiempo" aria-label="Motivo de la cancelación" />
            <Button full variant="danger" disabled={busy} onClick={cancel}>Cancelar salida</Button>
          </section>
        )}
      </div>
    </div>
  )
}

/* ---------- Ingresos ---------- */

export function Income() {
  const { s, me, bookings } = useOwnerData()
  if (!me) return null
  const rows = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'accepted')
    .map((b) => ({ b, o: s.outings.find((o) => o.id === b.outingId)!, boat: s.boats.find((x) => x.id === s.outings.find((o) => o.id === b.outingId)?.boatId) }))
    .sort((a, z) => (z.o.date + z.o.start).localeCompare(a.o.date + a.o.start))
  const sum = (k: 'amountTotal' | 'commissionAmount' | 'ownerAmount') => rows.reduce((n, r) => n + r.b[k], 0)
  const { paymentsEnabled, commissionPct } = s.settings

  return (
    <div className="flex h-full flex-col">
      <Header title="Ingresos" back />
      <div className="col flex-1 space-y-5 overflow-y-auto p-4 lg:py-6">
        {!paymentsEnabled && (
          <p className="rounded-2xl bg-sea-50 p-4 text-[13px] text-sea-dark">
            Ahora mismo el reparto de gastos se paga en efectivo, directamente entre pescador y patrón, y Pescamigo no cobra comisión.
            Cuando se activen los pagos en la app verás aquí la comisión ({String(commissionPct).replace('.', ',')} %) y lo que recibes por cada reserva.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Reparto total', v: sum('amountTotal') },
            { l: 'Comisión', v: sum('commissionAmount') },
            { l: 'Para ti', v: sum('ownerAmount') },
          ].map((t) => (
            <div key={t.l} className="min-w-0 rounded-2xl border border-line bg-white p-3">
              <p className="truncate text-[11px] font-semibold text-ink-soft sm:text-xs">{t.l}</p>
              <p className="tnum truncate text-base font-extrabold sm:text-xl">{euro(t.v)}</p>
            </div>
          ))}
        </div>
        {rows.length === 0 ? (
          <Empty icon={<Wallet size={24} />} title="Sin reservas confirmadas" text="Cuando aceptes solicitudes verás aquí lo que corresponde a cada reserva." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {rows.map(({ b, o, boat }) => (
              <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{shortDate(o.date)} · {boat?.name}</p>
                  <p className="truncate text-[13px] text-ink-soft">{userName(s, b.fisherId)} · {b.seats} {b.seats === 1 ? 'plaza' : 'plazas'}</p>
                  <p className="text-xs text-ink-soft">
                    {b.paymentMethod === 'cash' ? 'Efectivo, sin comisión' : b.paymentStatus === 'paid' ? 'Pagado con tarjeta' : 'Pendiente de pago'}
                    {b.status === 'confirmed' && isPast(o) ? ' · realizada' : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-sm font-bold">{euro(b.ownerAmount)}</p>
                  {b.commissionAmount > 0 && <p className="tnum text-xs text-ink-soft">de {euro(b.amountTotal)}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ---------- Ficha del barco ---------- */

const MAX_DAYS = [7, 14, 30, 60, 90, 120]
const MIN_HOURS = [0, 2, 6, 12, 24, 48, 72]

export function BoatEdit() {
  const { id } = useParams()
  const nav = useNavigate()
  const { me, boats } = useOwnerData()
  const boat = id && id !== 'nuevo' ? boats.find((b) => b.id === id) : undefined
  const [f, setF] = useState({
    name: boat?.name ?? '',
    model: boat?.model ?? '',
    lengthM: boat ? String(boat.lengthM).replace('.', ',') : '',
    capacity: boat?.capacity ?? 2,
    portId: boat?.portId ?? PORTS[0].id,
    description: boat?.description ?? '',
    photos: boat?.photos ?? ([] as string[]),
    insuranceDeclared: boat?.insuranceDeclared ?? false,
    licenseDeclared: boat?.licenseDeclared ?? false,
    bookMaxDays: boat?.bookMaxDays ?? 60,
    bookMinHours: boat?.bookMinHours ?? 12,
    links: boat?.links ?? ([] as string[]),
    equipment: boat?.equipment ?? ([] as string[]),
  })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(0)
  if (!me) return null
  if (id && id !== 'nuevo' && !boat) return <NotFound what="No encontramos este barco." />

  // Varias fotos a la vez, hasta el máximo; se reducen a 1600 px para que se vean bien a pantalla completa.
  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    const room = MAX_BOAT_PHOTOS - f.photos.length
    const take = files.slice(0, Math.max(0, room))
    setErr(files.length > room ? `Caben ${MAX_BOAT_PHOTOS} fotos como máximo: se ${take.length === 1 ? 'ha añadido 1' : `han añadido ${take.length}`}.` : null)
    setReading(take.length)
    const urls: string[] = []
    let failed = 0
    for (const file of take) {
      try {
        urls.push(await fileToDataUrl(file, 1600))
      } catch {
        failed++
      }
      setReading((n) => n - 1)
    }
    if (failed) setErr(`No se ${failed === 1 ? 'ha podido leer 1 imagen' : `han podido leer ${failed} imágenes`}. Prueba con otras.`)
    setF((x) => ({ ...x, photos: [...x.photos, ...urls].slice(0, MAX_BOAT_PHOTOS) }))
  }
  const makeCover = (i: number) => setF((x) => ({ ...x, photos: [x.photos[i], ...x.photos.filter((_, j) => j !== i)] }))
  const toggleEquipment = (t: string) =>
    setF((x) => ({ ...x, equipment: x.equipment.includes(t) ? x.equipment.filter((y) => y !== t) : [...x.equipment, t] }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const lengthM = parseMoney(f.lengthM)
    if (!f.name.trim()) return setErr('Pon el nombre del barco.')
    if (!lengthM || lengthM <= 0) return setErr('Indica la eslora en metros.')
    if (f.photos.length === 0) return setErr('Añade al menos una foto del barco.')
    setBusy(true)
    const r = await saveBoat(boat?.id ?? null, { ...f, name: f.name.trim(), model: f.model.trim(), description: f.description.trim(), lengthM })
    setBusy(false)
    if (r.error) return setErr(r.error)
    nav(boat ? '/panel' : `/publicar?barco=${r.id}`)
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={boat ? boat.name : 'Da de alta tu barco'} back={boats.length > 0} />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="col flex-1 space-y-4 overflow-y-auto p-4 lg:py-6">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold">Fotos</p>
              <span className="tnum text-xs text-ink-soft">{f.photos.length} de {MAX_BOAT_PHOTOS}</span>
            </div>
            {/* Cada foto con su forma; debajo, si es la portada o el botón para hacerla portada. */}
            <div className="flex flex-wrap items-start gap-x-2 gap-y-3">
              {f.photos.map((src, i) => (
                <div key={i} className="flex flex-col items-start gap-1">
                  <div className="relative">
                    <Photo src={src} alt={`Foto ${i + 1}`} eager className="max-h-28 max-w-[11rem] rounded-xl" />
                    <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => setF((x) => ({ ...x, photos: x.photos.filter((_, j) => j !== i) }))}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow">
                      <X size={13} />
                    </button>
                  </div>
                  {i === 0 ? (
                    <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Portada</span>
                  ) : (
                    <button type="button" onClick={() => makeCover(i)} className="px-0.5 text-[11px] font-semibold text-sea hover:underline">
                      Hacer portada
                    </button>
                  )}
                </div>
              ))}
              {reading > 0 && Array.from({ length: reading }, (_, i) => (
                <div key={`r${i}`} className="h-28 w-36 animate-pulse rounded-xl bg-sea-50" aria-hidden="true" />
              ))}
              {f.photos.length + reading < MAX_BOAT_PHOTOS && (
                <label className="grid h-28 w-32 cursor-pointer place-items-center rounded-xl border border-dashed border-line bg-white text-sea">
                  <span className="flex flex-col items-center gap-1 text-xs font-semibold"><Camera size={18} /> Añadir fotos</span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
                </label>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">Puedes elegir varias a la vez. La primera es la portada.</p>
          </div>
          <Field label="Nombre del barco">
            <input className={inputCls} maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Modelo">
            <input className={inputCls} maxLength={80} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} placeholder="Marca y modelo" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Eslora (m)">
              <input className={`${inputCls} tnum`} inputMode="decimal" value={f.lengthM} onChange={(e) => setF({ ...f, lengthM: e.target.value })} />
            </Field>
            <Field label="Plazas para invitados">
              <select className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Puerto base" hint="Es donde aparece tu barco en el mapa.">
            <select className={inputCls} value={f.portId} onChange={(e) => setF({ ...f, portId: e.target.value })}>
              {PORTS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.town})</option>)}
            </select>
          </Field>
          <Field label="Descripción">
            <textarea className={`${inputCls} min-h-24 resize-none`} maxLength={1000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Cómo son tus salidas, qué material llevas, qué esperas de quien venga." />
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">A bordo</p>
            <div className="flex flex-wrap gap-2">
              {BOAT_EQUIPMENT.map((t) => <Chip key={t} active={f.equipment.includes(t)} onClick={() => toggleEquipment(t)}>{t}</Chip>)}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">Marca lo que hay en el barco para que el pescador sepa qué llevar.</p>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Redes del barco</p>
            <LinksInput links={f.links} onChange={(next) => setF((x) => ({ ...x, links: next }))} placeholder="instagram.com/tu_barco" />
            <p className="mt-1.5 text-xs text-ink-soft">Instagram, TikTok, YouTube o tu web. Se verán en la ficha del barco.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Se puede reservar desde">
              <select className={inputCls} value={f.bookMaxDays} onChange={(e) => setF({ ...f, bookMaxDays: Number(e.target.value) })}>
                {MAX_DAYS.map((n) => <option key={n} value={n}>{n} días antes</option>)}
              </select>
            </Field>
            <Field label="Reservas cerradas">
              <select className={inputCls} value={f.bookMinHours} onChange={(e) => setF({ ...f, bookMinHours: Number(e.target.value) })}>
                {MIN_HOURS.map((n) => <option key={n} value={n}>{n === 0 ? 'Hasta la salida' : `${n} h antes`}</option>)}
              </select>
            </Field>
          </div>
          <div className="space-y-3 rounded-2xl border border-line bg-white p-4 text-[13px]">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={f.insuranceDeclared} onChange={(e) => setF({ ...f, insuranceDeclared: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A6CCF]" />
              <span>El barco tiene el seguro obligatorio en vigor.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={f.licenseDeclared} onChange={(e) => setF({ ...f, licenseDeclared: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A6CCF]" />
              <span>Tengo la titulación náutica que exige este barco.</span>
            </label>
          </div>
          {boat && <Link to={`/barco/${boat.id}`} className="block text-center text-[13px] font-semibold text-sea">Ver cómo ven este barco los pescadores</Link>}
          <ErrorMsg>{err}</ErrorMsg>
        </div>
        <div className="col border-t border-line bg-white p-4">
          <Button full type="submit" disabled={busy || reading > 0}>{busy ? 'Guardando…' : reading > 0 ? 'Preparando fotos…' : 'Guardar barco'}</Button>
        </div>
      </form>
    </div>
  )
}
