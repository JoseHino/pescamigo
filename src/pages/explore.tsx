import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BadgeCheck, Banknote, CalendarX, Check, ChevronLeft, ChevronRight, Clock, Images, MapPin, MessageCircle, Repeat, Ruler, ShieldCheck, Users, X,
} from 'lucide-react'
import MapView from '../components/MapView'
import {
  Button, Chip, Empty, Header, OutingTicket, OwnerBadge, Photo, PhotoViewer, Rating, SectionTitle, SocialLinks, Stars, StatusBadge,
} from '../components/ui'
import {
  boatRating, bookingWindow, canBook, conversationFor, fisherOutings, myActiveBooking, paysByCard, seatsLeft, upcomingOutings, useAppState, useMe,
} from '../data/store'
import { Guarantee } from './legal'
import { PORTS, portById } from '../data/seed'
import { BOAT_EQUIPMENT, FISHING_TYPES, WEEKDAYS, dayLabel, duration, euro, isoDate, longDate, monthLabel, shortDate } from '../lib/format'
import type { Outing } from '../types'

export function MapPage() {
  const s = useAppState()
  const me = useMe()
  const [sel, setSel] = useState<string | null>(null)
  // Al pescador solo le cuentan las salidas en las que puede pedir plaza.
  const upcoming = me?.role === 'fisher' ? fisherOutings(s, me.id) : upcomingOutings(s)
  const items = useMemo(
    () => s.boats.map((boat) => ({ boat, hasOuting: upcoming.some((o) => o.boatId === boat.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.boats, s.outings, s.bookings],
  )
  const boat = s.boats.find((b) => b.id === sel)
  const next = boat ? upcoming.find((o) => o.boatId === boat.id) : null

  return (
    <div className="relative h-full">
      <MapView items={items} selectedId={sel} onSelect={setSel} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold shadow-md">
          <span className="h-2.5 w-2.5 rounded-full bg-buoy" /> Con salida publicada
        </div>
      </div>
      {s.boats.length === 0 && (
        <div className="absolute inset-x-3 bottom-3 z-[500] rounded-2xl bg-white p-4 shadow-xl lg:inset-x-auto lg:bottom-5 lg:left-5 lg:w-[380px]">
          <p className="text-[15px] font-bold">Todavía no hay barcos en el mapa</p>
          <p className="mt-1 text-sm text-ink-soft">
            {me?.role === 'owner' ? 'Da de alta el tuyo desde Perfil y aparecerá aquí.' : 'En cuanto un propietario dé de alta su barco lo verás aquí.'}
          </p>
        </div>
      )}
      {boat && (
        <div className="sheet-in absolute inset-x-3 bottom-3 z-[500] rounded-2xl bg-white p-3 shadow-xl lg:inset-x-auto lg:bottom-5 lg:left-5 lg:w-[380px]">
          <button onClick={() => setSel(null)} aria-label="Cerrar" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-soft hover:bg-foam">
            <X size={16} />
          </button>
          <Link to={`/barco/${boat.id}`} className="flex gap-3">
            <Photo src={boat.photos[0]} className="max-h-20 max-w-[7.5rem] shrink-0 self-center rounded-xl" />
            <div className="min-w-0 flex-1 pr-7">
              <p className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-base font-bold">{boat.name}</span>
                <OwnerBadge ownerId={boat.ownerId} size="sm" />
              </p>
              <p className="truncate text-xs text-ink-soft">{boat.model}</p>
              <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-ink-soft">
                <MapPin size={12} className="shrink-0" /> <span className="truncate">{portById(boat.portId).name}</span>
              </p>
              <div className="mt-1"><Rating boatId={boat.id} /></div>
            </div>
          </Link>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-[13px]">
              {next ? (
                <>
                  <span className="text-ink-soft">Próxima salida: </span>
                  <b>{dayLabel(next.date)}, {next.start}</b>
                </>
              ) : (
                <span className="text-ink-soft">Sin salidas publicadas</span>
              )}
            </p>
            <Link to={`/barco/${boat.id}`} className="flex items-center gap-0.5 text-[13px] font-semibold text-sea">
              Ver barco <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export function OutingsPage() {
  const s = useAppState()
  const me = useMe()
  // Filtros y día elegido van en la dirección: al volver de una salida se recupera lo que se estaba mirando.
  const [q, setQ] = useSearchParams()
  const port = q.get('puerto')
  const type = q.get('tipo')
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(q)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setQ(next, { replace: true })
  }
  // Al cambiar un filtro se salta al primer día que tenga salidas de ese filtro.
  const setPort = (v: string | null) => set({ puerto: v, dia: null })
  const setType = (v: string | null) => set({ tipo: v, dia: null })
  // Solo salidas en las que se puede pedir plaza (y las que el pescador ya ha pedido): nunca una sin opción de reservar.
  const list = (me ? fisherOutings(s, me.id) : []).filter((o) => {
    return (!port || o.portId === port) && (!type || o.type === type)
  })
  return (
    <div className="flex h-full flex-col">
      <Header title="Salidas publicadas" />
      <div className="border-b border-line bg-white py-2.5">
        {/* Todos los puertos, tengan o no salidas ahora: así el pescador ve dónde puede salir. */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:flex-wrap lg:px-6">
          <Chip active={!port} onClick={() => setPort(null)}>Todos los puertos</Chip>
          {PORTS.map((p) => (
            <Chip key={p.id} active={port === p.id} onClick={() => setPort(port === p.id ? null : p.id)} label={`${p.name} (${p.town})`}>{p.short}</Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:flex-wrap lg:px-6">
          <Chip active={!type} onClick={() => setType(null)}>Cualquier pesca</Chip>
          {FISHING_TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>{t}</Chip>
          ))}
        </div>
      </div>
      <OutingsCalendar list={list} filtered={!!(port || type)} day={q.get('dia')} onDay={(d) => set({ dia: d })} />
    </div>
  )
}

/** Pie de cada salida para el pescador: pedir plaza sin tener que abrir la salida, o cómo va su solicitud. */
function BookFooter({ o }: { o: Outing }) {
  const s = useAppState()
  const me = useMe()
  const nav = useNavigate()
  const boat = s.boats.find((b) => b.id === o.boatId)
  if (!me || !boat) return null
  const mine = myActiveBooking(s, o.id, me.id)
  if (mine) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-semibold">Tu solicitud <StatusBadge status={mine.status} /></span>
        <Link to="/reservas" className="text-[13px] font-semibold text-sea">Mis reservas</Link>
      </div>
    )
  }
  const win = bookingWindow(boat, o)
  if (!win.open) return <p className="text-center text-[13px] font-semibold text-ink-soft">{win.reason}</p>
  if (seatsLeft(s, o) === 0) return <p className="text-center text-[13px] font-semibold text-ink-soft">Salida completa</p>
  return <Button full variant="accent" onClick={() => nav(`/reservar/${o.id}`)}>Solicitar plaza</Button>
}

/** Vista de calendario de las salidas publicadas: el mes con los días que tienen salida y, debajo, las del día elegido. */
function OutingsCalendar({ list, filtered, day, onDay }: { list: Outing[]; filtered: boolean; day: string | null; onDay: (d: string) => void }) {
  const s = useAppState()
  const now = new Date()
  const todayIso = isoDate(now)
  const byDay = new Map<string, Outing[]>()
  for (const o of list) byDay.set(o.date, [...(byDay.get(o.date) ?? []), o])
  // En la lista solo hay salidas reservables o ya solicitadas por el pescador.
  const me = useMe()
  const bookable = (o: Outing) => canBook(s, o)
  const requested = (o: Outing) => !!me && !!myActiveBooking(s, o.id, me.id)

  // Día elegido: el de la dirección o, si no hay, el primero en el que se puede pedir plaza.
  const firstDay = (list.find(bookable) ?? list[0])?.date ?? todayIso
  const sel = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= todayIso ? day : firstDay
  const pick = (d: string, hasOutings: boolean) => {
    onDay(d)
    // En el móvil las salidas del día quedan debajo del calendario: se baja hasta ellas.
    if (hasOutings && window.innerWidth < 1024) {
      requestAnimationFrame(() => document.getElementById('salidas-del-dia')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }
  const y = Number(sel.slice(0, 4))
  const m = Number(sel.slice(5, 7)) - 1
  const monthsAhead = (y - now.getFullYear()) * 12 + (m - now.getMonth())
  const move = (delta: number) => {
    const first = new Date(y, m + delta, 1)
    const prefix = isoDate(first).slice(0, 7)
    const inPrefix = (o: Outing) => o.date.startsWith(prefix)
    const firstWithOuting = (list.find((o) => inPrefix(o) && bookable(o)) ?? list.find(inPrefix))?.date
    onDay(firstWithOuting ?? (prefix === todayIso.slice(0, 7) ? todayIso : isoDate(first)))
  }

  // Rejilla del mes empezando en lunes.
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(new Date(y, m, i + 1))),
  ]
  const inMonth = list.filter((o) => o.date.startsWith(sel.slice(0, 7))).length
  const dayList = byDay.get(sel) ?? []
  const next = list.find((o) => o.date > sel)

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="rounded-2xl border border-line bg-white p-3 sm:p-4 lg:sticky lg:top-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => move(-1)} disabled={monthsAhead <= 0} aria-label="Mes anterior" className="grid h-9 w-9 place-items-center rounded-full hover:bg-foam disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-[15px] font-bold">{monthLabel(y, m)}</p>
              <p className="text-[11px] text-ink-soft">{inMonth ? `${inMonth} ${inMonth === 1 ? 'salida' : 'salidas'} este mes` : 'Sin salidas este mes'}</p>
            </div>
            <button type="button" onClick={() => move(1)} disabled={monthsAhead >= 12} aria-label="Mes siguiente" className="grid h-9 w-9 place-items-center rounded-full hover:bg-foam disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-soft">
            {WEEKDAYS.map((d) => <span key={d.v} aria-hidden="true">{d.short}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={`x${i}`} />
              const os = byDay.get(d) ?? []
              const free = os.some((o) => bookable(o) && !requested(o))
              const past = d < todayIso
              const isSel = d === sel
              return (
                <button
                  key={d}
                  type="button"
                  disabled={past}
                  onClick={() => pick(d, os.length > 0)}
                  aria-pressed={isSel}
                  aria-label={`${longDate(d)}, ${os.length ? `${os.length} ${os.length === 1 ? 'salida' : 'salidas'}${free ? '' : ', ya solicitada'}` : 'sin salidas'}`}
                  className={`flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg text-[13px] font-semibold transition ${
                    isSel ? 'bg-ink text-white'
                      : past ? 'text-ink-soft/40'
                      : os.length ? (free ? 'bg-sea-50 text-sea-dark hover:brightness-95' : 'bg-buoy-50 text-buoy-dark hover:brightness-95')
                      : 'text-ink-soft hover:bg-foam'
                  } ${d === todayIso && !isSel ? 'ring-1 ring-sea' : ''}`}
                >
                  <span className="tnum">{Number(d.slice(8))}</span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {os.slice(0, 3).map((o) => (
                      <span key={o.id} className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : requested(o) ? 'bg-buoy' : 'bg-sea'}`} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sea" /> Puedes pedir plaza</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-buoy" /> Ya la has pedido</span>
          </div>
        </div>

        <section id="salidas-del-dia" className="min-w-0 scroll-mt-3 space-y-3">
          <SectionTitle count={dayList.length || undefined}>{longDate(sel)}</SectionTitle>
          {dayList.length ? (
            <div className="grid gap-3 [&>*]:min-w-0">
              {dayList.map((o) => <OutingTicket key={o.id} outing={o} footer={<BookFooter o={o} />} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">
              {list.length === 0 ? (
                <p className="flex items-start gap-2">
                  <CalendarX size={18} className="mt-px shrink-0 text-sea" />
                  <span>
                    {filtered ? 'No hay salidas publicadas con estos filtros. Prueba con otro tipo de pesca o puerto' : 'Todavía no hay salidas publicadas'}
                    , o activa en tu perfil los avisos de salidas nuevas.
                  </span>
                </p>
              ) : (
                <p>Ese día no hay salidas publicadas.</p>
              )}
              {next && (
                <button type="button" onClick={() => onDay(next.date)} className="mt-2 flex items-center gap-1 font-semibold text-sea">
                  Ver la siguiente: {shortDate(next.date)} <ChevronRight size={15} />
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export function OutingDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useAppState()
  const me = useMe()
  const o = s.outings.find((x) => x.id === id)
  const boat = o ? s.boats.find((b) => b.id === o.boatId) : null
  if (!o || !boat || !me) return <NotFound what="Esta salida ya no está disponible." />
  const port = portById(o.portId)
  const owner = s.users.find((u) => u.id === boat.ownerId)
  const left = seatsLeft(s, o)
  const mine = myActiveBooking(s, o.id, me.id)
  const chat = mine ? conversationFor(s, mine.id) : null
  const win = bookingWindow(boat, o)
  const isOwner = boat.ownerId === me.id
  const { commissionPct } = s.settings
  const card = paysByCard(s, boat)

  const rows = [
    { icon: Clock, label: 'Horario', value: `${o.start} – ${o.end} (${duration(o.start, o.end)})` },
    { icon: MapPin, label: 'Puerto de salida', value: `${port.name}, ${port.town}` },
    { icon: Users, label: 'Plazas', value: o.status === 'cancelled' ? 'Salida cancelada' : left === 0 ? 'Completa' : `${left} libres de ${o.seats}` },
  ]

  return (
    <div className="flex h-full flex-col">
      <Header title={longDate(o.date)} back />
      <div className="flex-1 overflow-y-auto">
        <div className="col p-4 pb-0 lg:pt-6">
          <Photo src={boat.photos[0]} eager className="mx-auto max-h-[45vh] max-w-full rounded-2xl lg:max-h-80" />
        </div>
        <div className="col space-y-4 p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sea-50 px-2.5 py-1 text-xs font-semibold text-sea-dark">{o.type}</span>
              {/* Que la salida sea habitual solo le interesa al patrón. */}
              {o.ruleId && isOwner && (
                <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft ring-1 ring-line">
                  <Repeat size={12} /> Salida habitual
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              <span className="tnum">{o.start}</span> <span className="text-ink-soft">→</span> <span className="tnum">{o.end}</span>
            </h2>
            <p className="mt-1 text-[13px] text-ink-soft">El patrón confirma cada solicitud de plaza.</p>
          </div>

          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center gap-3 px-4 py-3">
                <r.icon size={18} className="shrink-0 text-sea" />
                <span className="shrink-0 text-[13px] text-ink-soft">{r.label}</span>
                <span className="min-w-0 flex-1 text-right text-[13px] font-semibold">{r.value}</span>
              </li>
            ))}
          </ul>

          {o.notes && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Nota del patrón</p>
              <p className="wrap-anywhere mt-1 whitespace-pre-line text-sm">{o.notes}</p>
            </div>
          )}

          <Link to={`/barco/${boat.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
            <Photo src={boat.photos[boat.photos.length > 1 ? 1 : 0]} className="max-h-14 max-w-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[15px] font-bold">{boat.name}</span>
                <OwnerBadge ownerId={boat.ownerId} size="sm" />
              </p>
              <p className="truncate text-xs text-ink-soft">Patrón: {owner?.name ?? '—'}</p>
              <Rating boatId={boat.id} />
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-soft" />
          </Link>

          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Lo que pagas por plaza</p>
            <div className="mt-3 flex items-center gap-3">
              <Banknote size={18} className="shrink-0 text-ok" />
              <span className="min-w-0 flex-1 text-sm">
                {card ? 'Pago con tarjeta en la app cuando el patrón acepte' : 'Reparto de gastos, en efectivo al patrón el día de la salida'}
              </span>
              <b className="tnum shrink-0">{euro(o.costShare)}</b>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {card
                ? `Precio final, sin gastos añadidos. Incluye la comisión de Pescamigo (${String(commissionPct).replace('.', ',')} %). Pedir plaza es gratis.`
                : 'Solicitar plaza en Pescamigo es gratis.'}
            </p>
          </div>

          {me.role === 'fisher' && <Guarantee card={card} />}
        </div>
      </div>

      {me.role === 'fisher' && (
        <div className="col border-t border-line bg-white p-4">
          {mine ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">Tu solicitud</span>
                <StatusBadge status={mine.status} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => nav('/reservas')}>Mis reservas</Button>
                {chat ? (
                  <Button onClick={() => nav(`/chat/${chat.id}`)}><MessageCircle size={16} /> Chat</Button>
                ) : (
                  <Button disabled title="El chat se abre cuando el patrón confirma la reserva">Chat</Button>
                )}
              </div>
            </div>
          ) : !win.open ? (
            <p className="rounded-xl bg-foam px-4 py-3 text-center text-sm font-semibold text-ink-soft">{win.reason}</p>
          ) : left === 0 ? (
            <p className="rounded-xl bg-foam px-4 py-3 text-center text-sm font-semibold text-ink-soft">Salida completa</p>
          ) : (
            <Button full variant="accent" onClick={() => nav(`/reservar/${o.id}`)}>Solicitar plaza</Button>
          )}
        </div>
      )}
      {isOwner && (
        <div className="col border-t border-line bg-white p-4">
          <Button full variant="outline" onClick={() => nav(`/salida-editar/${o.id}`)}>Gestionar esta salida</Button>
        </div>
      )}
    </div>
  )
}

export function BoatProfile() {
  const { id } = useParams()
  const s = useAppState()
  const [viewer, setViewer] = useState<number | null>(null)
  const [allOutings, setAllOutings] = useState(false)
  const isFisher = s.me?.role === 'fisher'
  const boat = s.boats.find((b) => b.id === id)
  if (!boat) return <NotFound what="No encontramos este barco." />
  const port = portById(boat.portId)
  const owner = s.users.find((u) => u.id === boat.ownerId)
  const reviews = s.reviews.filter((r) => r.boatId === boat.id).sort((a, b) => b.date.localeCompare(a.date))
  const r = boatRating(s, boat.id)
  const trips = s.tripCounts[boat.ownerId] ?? 0
  // El pescador solo ve las salidas en las que puede pedir plaza (o que ya ha pedido); el patrón, todas.
  const outings = (isFisher && s.me ? fisherOutings(s, s.me.id) : upcomingOutings(s)).filter((o) => o.boatId === boat.id)
  const gallery = [...boat.photos, ...reviews.flatMap((x) => (x.photo ? [x.photo] : []))]
  const since = boat.createdAt ? new Date(boat.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''
  const equipment = BOAT_EQUIPMENT.filter((t) => boat.equipment.includes(t))

  return (
    <div className="flex h-full flex-col">
      <Header title={boat.name} back />
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Cada foto con su forma: el recuadro es la propia foto (todas a la misma altura salvo las muy panorámicas). */}
        <div className={`col flex snap-x snap-mandatory items-center gap-2 overflow-x-auto p-4 pb-0 [scrollbar-width:none] lg:pt-6 ${gallery.length === 1 ? 'justify-center' : ''}`}>
          {gallery.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setViewer(i)}
              aria-label={`Ver la foto ${i + 1} de ${gallery.length} a pantalla completa`}
              className="shrink-0 snap-center overflow-hidden rounded-2xl"
            >
              <Photo src={src} alt={`Foto ${i + 1} de ${boat.name}`} eager className="max-h-64 max-w-[85vw] lg:max-h-80 lg:max-w-[36rem]" />
            </button>
          ))}
        </div>
        {gallery.length > 1 && (
          <div className="col mt-2 flex justify-end px-4">
            <button type="button" onClick={() => setViewer(0)} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold hover:bg-foam">
              <Images size={14} /> Ver las {gallery.length} fotos
            </button>
          </div>
        )}
        {viewer !== null && <PhotoViewer photos={gallery} start={viewer} alt={boat.name} onClose={() => setViewer(null)} />}

        <div className="col space-y-5 p-4">
          <div>
            <h2 className="wrap-anywhere text-2xl font-extrabold tracking-tight">{boat.name}</h2>
            <p className="wrap-anywhere text-sm text-ink-soft">{boat.model ? `${boat.model} · ` : ''}Patrón: {owner?.name ?? '—'}</p>
            {since && <p className="text-xs text-ink-soft">En Pescamigo desde {since}</p>}
            <div className="mt-2 flex items-center gap-2">
              <Stars value={r.avg} size={16} />
              <span className="text-sm font-semibold">
                {r.count ? `${r.avg.toFixed(1).replace('.', ',')} · ${r.count} ${r.count === 1 ? 'valoración' : 'valoraciones'}` : 'Sin valoraciones todavía'}
              </span>
            </div>
            {trips > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <OwnerBadge ownerId={boat.ownerId} />
                <span className="text-[13px] text-ink-soft">{trips} {trips === 1 ? 'salida hecha' : 'salidas hechas'} con pescadores a bordo</span>
              </div>
            )}
            {boat.links.length > 0 && <div className="mt-3"><SocialLinks links={boat.links} /></div>}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Ruler, v: `${String(boat.lengthM).replace('.', ',')} m`, l: 'Eslora' },
              { icon: Users, v: String(boat.capacity), l: 'Plazas' },
              { icon: MapPin, v: port.town, l: 'Puerto base' },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl border border-line bg-white px-2 py-3">
                <x.icon size={18} className="mx-auto text-sea" />
                <p className="mt-1 truncate text-sm font-bold">{x.v}</p>
                <p className="text-[11px] text-ink-soft">{x.l}</p>
              </div>
            ))}
          </div>

          <p className="wrap-anywhere whitespace-pre-line text-sm leading-relaxed">{boat.description}</p>

          {equipment.length > 0 && (
            <section>
              <h3 className="mb-2.5 text-base font-bold">A bordo</h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {equipment.map((t) => (
                  <li key={t} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[13px] font-semibold">
                    <Check size={15} className="shrink-0 text-ok" /> <span className="truncate">{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="rounded-2xl border border-line bg-white p-4 text-[13px]">
            <p className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck size={16} className="text-sea" /> Declarado por el propietario</p>
            <p className={boat.insuranceDeclared ? '' : 'text-ink-soft'}>{boat.insuranceDeclared ? 'Seguro de la embarcación en vigor' : 'No ha indicado si tiene seguro en vigor'}</p>
            <p className={boat.licenseDeclared ? '' : 'text-ink-soft'}>{boat.licenseDeclared ? 'Titulación náutica para este barco' : 'No ha indicado su titulación náutica'}</p>
            <p className="mt-2 text-xs text-ink-soft">Pescamigo todavía no comprueba esta documentación.</p>
          </div>

          <section>
            <h3 className="mb-2.5 text-base font-bold">Próximas salidas</h3>
            {outings.length ? (
              <div className="space-y-3">
                {(allOutings ? outings : outings.slice(0, 5)).map((o) => (
                  <OutingTicket key={o.id} outing={o} footer={isFisher ? <BookFooter o={o} /> : undefined} />
                ))}
                {outings.length > 5 && (
                  <button type="button" onClick={() => setAllOutings(!allOutings)} className="w-full rounded-xl border border-line bg-white py-2.5 text-[13px] font-semibold text-sea hover:bg-foam">
                    {allOutings ? 'Ver menos' : `Ver las ${outings.length} salidas`}
                  </button>
                )}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">Este barco no tiene salidas publicadas ahora mismo.</p>
            )}
          </section>

          <section>
            <h3 className="text-base font-bold">Comentarios y valoraciones</h3>
            <p className="mb-3 mt-0.5 text-[13px] text-ink-soft">Solo pueden opinar quienes han salido a pescar en este barco con una reserva confirmada.</p>
            {reviews.length ? (
              <ul className="space-y-3">
                {reviews.map((x) => (
                  <li key={x.id} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold">{x.authorName}</span>
                      <span className="shrink-0"><Stars value={x.rating} /></span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-sea-dark">
                      <BadgeCheck size={14} className="shrink-0" />
                      {x.outingDay ? `Salida verificada · ${shortDate(x.outingDay)}` : 'Salida verificada'}
                    </p>
                    <p className="wrap-anywhere mt-2 text-sm leading-relaxed">{x.comment}</p>
                    {x.photo && <Photo src={x.photo} alt="Foto de la salida" className="mt-3 max-h-80 max-w-full rounded-xl" />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">Nadie ha valorado este barco todavía.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export function NotFound({ what }: { what: string }) {
  const nav = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <Header title="No disponible" back />
      <Empty icon={<CalendarX size={24} />} title={what} text="Puede que se haya cancelado o eliminado." action={<Button onClick={() => nav('/')}>Ir al inicio</Button>} />
    </div>
  )
}
