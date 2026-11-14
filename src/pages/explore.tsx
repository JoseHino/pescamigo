import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Banknote, CalendarX, ChevronRight, Clock, MapPin, MessageCircle, Repeat, Ruler, ShieldCheck, Users, X } from 'lucide-react'
import MapView from '../components/MapView'
import { Button, Chip, Empty, Header, OutingTicket, Rating, Stars, StatusBadge } from '../components/ui'
import { boatRating, bookingWindow, conversationFor, myActiveBooking, seatsLeft, upcomingOutings, useAppState, useMe } from '../data/store'
import { PORTS, portById } from '../data/seed'
import { FISHING_TYPES, dayLabel, duration, euro, longDate, shortDate } from '../lib/format'

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
  const [port, setPort] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const list = upcomingOutings(s).filter((o) => {
    return (!port || o.portId === port) && (!type || o.type === type)
  })
  const usedPorts = PORTS.filter((p) => upcomingOutings(s).some((o) => o.portId === p.id))
  return (
    <div className="flex h-full flex-col">
      <Header title="Salidas publicadas" />
      <div className="border-b border-line bg-white py-2.5">
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
      <div className="cards flex-1 space-y-3 overflow-y-auto p-4">
        {list.length === 0 ? (
          <Empty icon={<CalendarX size={24} />} title="Ninguna salida con esos filtros" text="Quita algún filtro o activa los avisos para enterarte cuando se publique una." />
        ) : (
          list.map((o) => <OutingTicket key={o.id} outing={o} />)
        )}
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
            <h3 className="mb-2.5 text-base font-bold">Comentarios y valoraciones</h3>
            {reviews.length ? (
              <ul className="space-y-3">
                {reviews.map((x) => (
                  <li key={x.id} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold">{x.authorName}</span>
                      <span className="text-xs text-ink-soft">{shortDate(x.date)}</span>
                    </div>
                    <Stars value={x.rating} />
                    <p className="wrap-anywhere mt-1.5 text-sm leading-relaxed">{x.comment}</p>
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
