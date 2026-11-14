import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BadgeCheck, Banknote, CalendarDays, CalendarX, ChevronLeft, ChevronRight, Clock, List, MapPin, MessageCircle, Repeat, Ruler, ShieldCheck, Users, X,
} from 'lucide-react'
import MapView from '../components/MapView'
import { Button, Chip, Empty, Header, OutingTicket, Rating, SectionTitle, Stars, StatusBadge } from '../components/ui'
import { boatRating, bookingWindow, conversationFor, myActiveBooking, seatsLeft, upcomingOutings, useAppState, useMe } from '../data/store'
import { PORTS, portById } from '../data/seed'
import { FISHING_TYPES, WEEKDAYS, dayLabel, duration, euro, isoDate, longDate, monthLabel, shortDate } from '../lib/format'
import type { Outing } from '../types'

export function MapPage() {
  const s = useAppState()
  const me = useMe()
  const [sel, setSel] = useState<string | null>(null)
  const upcoming = upcomingOutings(s)
  const items = useMemo(
    () => s.boats.map((boat) => ({ boat, hasOuting: upcoming.some((o) => o.boatId === boat.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.boats, s.outings],
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
            <img src={boat.photos[0]} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1 pr-7">
              <p className="truncate text-base font-bold">{boat.name}</p>
              <p className="truncate text-xs text-ink-soft">{boat.model}</p>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-soft">
                <MapPin size={12} /> {portById(boat.portId).name}
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
  // La vista y el día elegido van en la dirección: al volver de una salida se recupera lo que se estaba mirando.
  const [q, setQ] = useSearchParams()
  const view = q.get('vista') === 'calendario' ? 'calendario' : 'lista'
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(q)
    if (value) next.set(key, value)
    else next.delete(key)
    setQ(next, { replace: true })
  }
  const [port, setPort] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const list = upcomingOutings(s).filter((o) => {
    return (!port || o.portId === port) && (!type || o.type === type)
  })
  const usedPorts = PORTS.filter((p) => upcomingOutings(s).some((o) => o.portId === p.id))
  const views = [
    { v: 'lista', label: 'Lista', Icon: List },
    { v: 'calendario', label: 'Calendario', Icon: CalendarDays },
  ] as const
  const empty = <Empty icon={<CalendarX size={24} />} title="Ninguna salida con esos filtros" text="Quita algún filtro o activa los avisos para enterarte cuando se publique una." />
  return (
    <div className="flex h-full flex-col">
      <Header title="Salidas publicadas" />
      <div className="border-b border-line bg-white py-2.5">
        <div className="px-4 pb-2.5 lg:px-6">
          <div role="group" aria-label="Cómo ver las salidas" className="grid grid-cols-2 rounded-xl bg-foam p-1 sm:inline-grid sm:w-72">
            {views.map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setParam('vista', v === 'lista' ? null : v)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[13px] font-semibold transition ${
                  view === v ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:flex-wrap lg:px-6">
          <Chip active={!port} onClick={() => setPort(null)}>Todos los puertos</Chip>
          {usedPorts.map((p) => (
            <Chip key={p.id} active={port === p.id} onClick={() => setPort(port === p.id ? null : p.id)}>{p.name}</Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:flex-wrap lg:px-6">
          <Chip active={!type} onClick={() => setType(null)}>Cualquier pesca</Chip>
          {FISHING_TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>{t}</Chip>
          ))}
        </div>
      </div>
      {view === 'lista' ? (
        <div className="cards flex-1 space-y-3 overflow-y-auto p-4">
          {list.length === 0 ? empty : list.map((o) => <OutingTicket key={o.id} outing={o} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-4">{empty}</div>
      ) : (
        <OutingsCalendar list={list} day={q.get('dia')} onDay={(d) => setParam('dia', d)} />
      )}
    </div>
  )
}

/** Vista de calendario de las salidas publicadas: el mes con los días que tienen salida y, debajo, las del día elegido. */
function OutingsCalendar({ list, day, onDay }: { list: Outing[]; day: string | null; onDay: (d: string) => void }) {
  const s = useAppState()
  const now = new Date()
  const todayIso = isoDate(now)
  const byDay = new Map<string, Outing[]>()
  for (const o of list) byDay.set(o.date, [...(byDay.get(o.date) ?? []), o])

  // Día elegido: el de la dirección o, si no hay, el primero con salida.
  const sel = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= todayIso ? day : list[0].date
  const y = Number(sel.slice(0, 4))
  const m = Number(sel.slice(5, 7)) - 1
  const monthsAhead = (y - now.getFullYear()) * 12 + (m - now.getMonth())
  const move = (delta: number) => {
    const first = new Date(y, m + delta, 1)
    const prefix = isoDate(first).slice(0, 7)
    const firstWithOuting = list.find((o) => o.date.startsWith(prefix))?.date
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
              const free = os.some((o) => seatsLeft(s, o) > 0)
              const past = d < todayIso
              const isSel = d === sel
              return (
                <button
                  key={d}
                  type="button"
                  disabled={past}
                  onClick={() => onDay(d)}
                  aria-pressed={isSel}
                  aria-label={`${longDate(d)}, ${os.length ? `${os.length} ${os.length === 1 ? 'salida' : 'salidas'}${free ? '' : ', completo'}` : 'sin salidas'}`}
                  className={`flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg text-[13px] font-semibold transition ${
                    isSel ? 'bg-ink text-white'
                      : past ? 'text-ink-soft/40'
                      : os.length ? (free ? 'bg-sea-50 text-sea-dark hover:brightness-95' : 'bg-foam text-ink hover:brightness-95')
                      : 'text-ink-soft hover:bg-foam'
                  } ${d === todayIso && !isSel ? 'ring-1 ring-sea' : ''}`}
                >
                  <span className="tnum">{Number(d.slice(8))}</span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {os.slice(0, 3).map((o) => (
                      <span key={o.id} className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : seatsLeft(s, o) > 0 ? 'bg-sea' : 'bg-ink-soft/40'}`} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sea" /> Salida con plazas</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink-soft/40" /> Salida completa</span>
          </div>
        </div>

        <section className="min-w-0 space-y-3">
          <SectionTitle count={dayList.length || undefined}>{longDate(sel)}</SectionTitle>
          {dayList.length ? (
            <div className="grid gap-3 [&>*]:min-w-0">
              {dayList.map((o) => <OutingTicket key={o.id} outing={o} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">
              <p>Ese día no hay salidas publicadas.</p>
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
  const { paymentsEnabled, commissionPct } = s.settings

  const rows = [
    { icon: Clock, label: 'Horario', value: `${o.start} – ${o.end} (${duration(o.start, o.end)})` },
    { icon: MapPin, label: 'Puerto de salida', value: `${port.name}, ${port.town}` },
    { icon: Users, label: 'Plazas', value: o.status === 'cancelled' ? 'Salida cancelada' : left === 0 ? 'Completa' : `${left} libres de ${o.seats}` },
  ]

  return (
    <div className="flex h-full flex-col">
      <Header title={longDate(o.date)} back />
      <div className="flex-1 overflow-y-auto">
        <img src={boat.photos[0]} alt="" className="h-44 w-full bg-sea-50 object-cover lg:mx-auto lg:mt-6 lg:h-80 lg:max-w-[42rem] lg:rounded-2xl" />
        <div className="col space-y-4 p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sea-50 px-2.5 py-1 text-xs font-semibold text-sea-dark">{o.type}</span>
              {o.ruleId && (
                <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft ring-1 ring-line">
                  <Repeat size={12} /> Salida habitual
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              <span className="tnum">{o.start}</span> <span className="text-ink-soft">→</span> <span className="tnum">{o.end}</span>
            </h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              {o.ruleId
                ? 'Es una fecha prevista del calendario habitual del patrón: la plaza queda confirmada cuando el patrón acepta tu solicitud.'
                : 'El patrón confirma cada solicitud de plaza.'}
            </p>
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
            <img src={boat.photos[boat.photos.length > 1 ? 1 : 0]} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-sea-50 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{boat.name}</p>
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
                {paymentsEnabled ? 'Reparto de gastos, con tarjeta en la app' : 'Reparto de gastos, en efectivo al patrón el día de la salida'}
              </span>
              <b className="tnum shrink-0">{euro(o.costShare)}</b>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {paymentsEnabled
                ? `Incluye la comisión de Pescamigo (${String(commissionPct).replace('.', ',')} %). Verás el desglose antes de enviar la solicitud.`
                : 'Solicitar plaza en Pescamigo es gratis.'}
            </p>
          </div>
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
  const boat = s.boats.find((b) => b.id === id)
  if (!boat) return <NotFound what="No encontramos este barco." />
  const port = portById(boat.portId)
  const owner = s.users.find((u) => u.id === boat.ownerId)
  const reviews = s.reviews.filter((r) => r.boatId === boat.id).sort((a, b) => b.date.localeCompare(a.date))
  const r = boatRating(s, boat.id)
  const outings = upcomingOutings(s).filter((o) => o.boatId === boat.id)
  const gallery = [...boat.photos, ...reviews.flatMap((x) => (x.photo ? [x.photo] : []))]

  return (
    <div className="flex h-full flex-col">
      <Header title={boat.name} back />
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="col flex snap-x snap-mandatory gap-2 overflow-x-auto p-4 pb-0 [scrollbar-width:none] lg:pt-6">
          {gallery.map((src, i) => (
            <img key={i} src={src} alt={`Foto ${i + 1} de ${boat.name}`} className="h-48 w-[82%] shrink-0 snap-center rounded-2xl object-cover lg:h-72 lg:w-[70%]" />
          ))}
        </div>

        <div className="col space-y-5 p-4">
          <div>
            <h2 className="wrap-anywhere text-2xl font-extrabold tracking-tight">{boat.name}</h2>
            <p className="wrap-anywhere text-sm text-ink-soft">{boat.model} · Patrón: {owner?.name ?? '—'}</p>
            <div className="mt-2 flex items-center gap-2">
              <Stars value={r.avg} size={16} />
              <span className="text-sm font-semibold">
                {r.count ? `${r.avg.toFixed(1).replace('.', ',')} · ${r.count} ${r.count === 1 ? 'valoración' : 'valoraciones'}` : 'Sin valoraciones todavía'}
              </span>
            </div>
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

          <div className="rounded-2xl border border-line bg-white p-4 text-[13px]">
            <p className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck size={16} className="text-sea" /> Declarado por el propietario</p>
            <p className={boat.insuranceDeclared ? '' : 'text-ink-soft'}>{boat.insuranceDeclared ? 'Seguro de la embarcación en vigor' : 'No ha indicado si tiene seguro en vigor'}</p>
            <p className={boat.licenseDeclared ? '' : 'text-ink-soft'}>{boat.licenseDeclared ? 'Titulación náutica para este barco' : 'No ha indicado su titulación náutica'}</p>
            <p className="mt-2 text-xs text-ink-soft">Pescamigo todavía no comprueba esta documentación.</p>
          </div>

          <section>
            <h3 className="mb-2.5 text-base font-bold">Próximas salidas</h3>
            {outings.length ? (
              <div className="space-y-3">{outings.map((o) => <OutingTicket key={o.id} outing={o} />)}</div>
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
                    {x.photo && <img src={x.photo} alt="Foto de la salida" className="mt-3 h-36 w-full rounded-xl object-cover" />}
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
