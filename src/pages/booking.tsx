import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Camera, CheckCircle2, MessageCircle, Minus, Plus, Send, Star, Ticket } from 'lucide-react'
import { Button, Empty, ErrorMsg, Field, Header, OutingTicket, SectionTitle, StatusBadge, inputCls } from '../components/ui'
import { NotFound } from './explore'
import {
  addReview, bookingWindow, cancelBooking, conversationFor, isPast, myActiveBooking, requestBooking, seatsLeft, useAppState, useMe,
} from '../data/store'
import { portById } from '../data/seed'
import { euro, longDate } from '../lib/format'
import { fileToDataUrl } from '../lib/image'
import type { Booking, Outing } from '../types'

/** Desglose de lo que se paga. Con pagos en la app muestra la comisión; si no, el pago en efectivo. */
export function PriceBreakdown({ total, pct, paymentsEnabled }: { total: number; pct: number; paymentsEnabled: boolean }) {
  if (!paymentsEnabled) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span>Reparto de gastos</span>
          <b className="tnum shrink-0">{euro(total)}</b>
        </div>
        <p className="text-xs text-ink-soft">Se paga en efectivo al patrón el día de la salida. Solicitar plaza en Pescamigo es gratis.</p>
      </div>
    )
  }
  const commission = Math.round(total * pct) / 100
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <span>Total que pagas</span>
        <b className="tnum shrink-0">{euro(total)}</b>
      </div>
      <div className="flex justify-between gap-3 text-ink-soft">
        <span>Comisión de Pescamigo ({String(pct).replace('.', ',')} %)</span>
        <span className="tnum shrink-0">{euro(commission)}</span>
      </div>
      <div className="flex justify-between gap-3 text-ink-soft">
        <span>Recibe el patrón</span>
        <span className="tnum shrink-0">{euro(total - commission)}</span>
      </div>
    </div>
  )
}

export function Checkout() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useAppState()
  const me = useMe()
  const o = s.outings.find((x) => x.id === id)
  const boat = o ? s.boats.find((b) => b.id === o.boatId) : null
  const [seats, setSeats] = useState(1)
  const [message, setMessage] = useState('')
  const [accept, setAccept] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  if (!o || !boat || !me) return <NotFound what="Esta salida ya no está disponible." />
  const left = seatsLeft(s, o)
  const port = portById(o.portId)
  const { paymentsEnabled, commissionPct } = s.settings

  if (done) {
    return (
      <div className="col-narrow flex h-full flex-col items-center justify-center bg-foam px-6 text-center">
        <Send size={48} className="text-sea" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Solicitud enviada</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Has pedido {seats} {seats === 1 ? 'plaza' : 'plazas'} en el {boat.name} para el {longDate(o.date).toLowerCase()} a las {o.start}.
          Te avisaremos por correo y en la app cuando el patrón responda.
        </p>
        <Button className="mt-6" full onClick={() => nav('/reservas', { replace: true })}>Ver mis reservas</Button>
      </div>
    )
  }

  const already = myActiveBooking(s, o.id, me.id)
  const win = bookingWindow(boat, o)
  const blocked = already ? 'Ya tienes una solicitud en esta salida.' : !win.open ? win.reason : left === 0 ? 'La salida está completa.' : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || blocked) return
    if (!accept) return setErr('Marca la casilla para confirmar que lo has entendido.')
    setBusy(true)
    const error = await requestBooking(o.id, seats, message.trim())
    setBusy(false)
    if (error) return setErr(error)
    setDone(true)
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Solicitar plaza" back />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="col flex-1 space-y-4 overflow-y-auto p-4 lg:py-6">
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="wrap-anywhere text-[15px] font-bold">{boat.name} · {o.type}</p>
            <p className="text-sm text-ink-soft">{longDate(o.date)}, {o.start} – {o.end}</p>
            <p className="text-sm text-ink-soft">{port.name}</p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-sm font-semibold">Plazas</span>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Quitar una plaza" disabled={seats <= 1} onClick={() => setSeats(seats - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40">
                  <Minus size={16} />
                </button>
                <span className="tnum w-5 text-center text-lg font-bold">{seats}</span>
                <button type="button" aria-label="Añadir una plaza" disabled={seats >= left} onClick={() => setSeats(seats + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <PriceBreakdown total={o.costShare * seats} pct={commissionPct} paymentsEnabled={paymentsEnabled} />
          </div>

          <Field label="Mensaje para el patrón (opcional)" hint="Por ejemplo, tu experiencia pescando o si llevas tu propio equipo.">
            <textarea className={`${inputCls} min-h-20 resize-none`} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>

          <div className="rounded-2xl bg-sea-50 p-4 text-[13px] text-sea-dark">
            <p className="font-semibold">Cómo sigue</p>
            <p className="mt-1">
              El patrón recibe tu solicitud y la acepta o la rechaza. Te avisaremos por correo y en la app. Cuando la acepte,
              la plaza queda confirmada{paymentsEnabled ? ' al completar el pago' : ''} y se abre un chat con él.
            </p>
          </div>

          <label className="flex items-start gap-3 text-[13px] leading-snug">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A6CCF]" />
            <span>Entiendo que es una salida privada con gastos compartidos, no un servicio profesional, y que a bordo sigo las indicaciones del patrón.</span>
          </label>
          <ErrorMsg>{err ?? blocked}</ErrorMsg>
        </div>
        <div className="col border-t border-line bg-white p-4">
          <Button full variant="accent" type="submit" disabled={busy || !!blocked}>
            {busy ? 'Enviando…' : seats === 1 ? 'Enviar solicitud' : `Enviar solicitud de ${seats} plazas`}
          </Button>
        </div>
      </form>
    </div>
  )
}

function TripFooter({ b, o }: { b: Booking; o: Outing }) {
  const nav = useNavigate()
  const s = useAppState()
  const chat = conversationFor(s, b.id)
  const [busy, setBusy] = useState(false)
  const reviewed = s.reviews.some((r) => r.bookingId === b.id)
  const past = isPast(o)
  const cancel = async () => {
    const what = b.status === 'pending' ? '¿Retirar tu solicitud?' : '¿Cancelar tu reserva? El patrón recibirá un aviso.'
    if (!window.confirm(what)) return
    setBusy(true)
    const e = await cancelBooking(b.id)
    setBusy(false)
    if (e) window.alert(e)
  }
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={b.status} />
        <span className="text-[13px] text-ink-soft">
          {b.seats} {b.seats === 1 ? 'plaza' : 'plazas'} · <b className="tnum text-ink">{euro(b.amountTotal)}</b>
          {b.paymentMethod === 'cash' ? ' en efectivo' : ''}
        </span>
      </div>
      {b.reason && (b.status === 'rejected' || b.status === 'cancelled') && (
        <p className="wrap-anywhere text-[13px] text-ink-soft">Motivo: {b.reason}</p>
      )}
      {b.status === 'accepted' && (
        <p className="text-[13px] text-sea-dark">El patrón ha aceptado. Falta completar el pago para confirmar la plaza.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {chat && (
          <Button size="sm" onClick={() => nav(`/chat/${chat.id}`)}><MessageCircle size={15} /> Chat con el patrón</Button>
        )}
        {!past && ['pending', 'accepted', 'confirmed'].includes(b.status) && (
          <Button size="sm" variant="danger" disabled={busy} onClick={cancel}>
            {b.status === 'pending' ? 'Retirar solicitud' : 'Cancelar reserva'}
          </Button>
        )}
        {past && b.status === 'confirmed' && !reviewed && (
          <Link to={`/valorar/${b.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-sea-50 px-3 py-2 text-[13px] font-semibold text-sea-dark">
            <Star size={15} /> Valorar la salida
          </Link>
        )}
        {past && reviewed && (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ok"><CheckCircle2 size={15} /> Valorada</span>
        )}
      </div>
    </div>
  )
}

export function Trips() {
  const s = useAppState()
  const me = useMe()
  const mine = s.bookings
    .filter((b) => b.fisherId === me?.id)
    .map((b) => ({ b, o: s.outings.find((o) => o.id === b.outingId) }))
    .filter((x): x is { b: Booking; o: Outing } => !!x.o)
  const byDate = (a: { o: Outing }, z: { o: Outing }) => (a.o.date + a.o.start).localeCompare(z.o.date + z.o.start)
  const upcoming = (x: { o: Outing }) => !isPast(x.o)
  const pending = mine.filter((x) => (x.b.status === 'pending' || x.b.status === 'accepted') && upcoming(x)).sort(byDate)
  const confirmed = mine.filter((x) => x.b.status === 'confirmed' && upcoming(x)).sort(byDate)
  const history = mine
    .filter((x) => !pending.includes(x) && !confirmed.includes(x))
    .sort((a, z) => byDate(z, a))

  return (
    <div className="flex h-full flex-col">
      <Header title="Mis reservas" />
      <div className="col flex-1 overflow-y-auto p-4 lg:py-6">
        {mine.length === 0 ? (
          <Empty icon={<Ticket size={24} />} title="Todavía no has pedido plaza" text="Cuando solicites plaza en una salida aparecerá aquí con su estado."
            action={<Link to="/salidas" className="font-semibold text-sea">Ver salidas publicadas</Link>} />
        ) : (
          <div className="space-y-7">
            {confirmed.length > 0 && (
              <section className="space-y-3">
                <SectionTitle count={confirmed.length}>Confirmadas</SectionTitle>
                {confirmed.map(({ b, o }) => <OutingTicket key={b.id} outing={o} footer={<TripFooter b={b} o={o} />} />)}
              </section>
            )}
            {pending.length > 0 && (
              <section className="space-y-3">
                <SectionTitle count={pending.length}>Esperando al patrón</SectionTitle>
                {pending.map(({ b, o }) => <OutingTicket key={b.id} outing={o} footer={<TripFooter b={b} o={o} />} />)}
              </section>
            )}
            {history.length > 0 && (
              <section className="space-y-3">
                <SectionTitle>Anteriores, rechazadas y canceladas</SectionTitle>
                {history.map(({ b, o }) => <OutingTicket key={b.id} outing={o} footer={<TripFooter b={b} o={o} />} />)}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ReviewForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useAppState()
  const b = s.bookings.find((x) => x.id === id)
  const o = b ? s.outings.find((x) => x.id === b.outingId) : null
  const boat = o ? s.boats.find((x) => x.id === o.boatId) : null
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!b || !o || !boat) return <NotFound what="No encontramos esta reserva." />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const error = await addReview(b.id, rating, comment, photo)
    setBusy(false)
    if (error) return setErr(error)
    nav(`/barco/${boat.id}`, { replace: true })
  }
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPhoto(await fileToDataUrl(file))
    } catch {
      setErr('No se ha podido leer la imagen. Prueba con otra.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Valorar la salida" back />
      <form onSubmit={submit} className="col flex-1 space-y-5 overflow-y-auto p-4 lg:py-6">
        <div>
          <p className="wrap-anywhere text-lg font-bold">{boat.name}</p>
          <p className="text-sm text-ink-soft">{longDate(o.date)} · {o.type}</p>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold">Puntuación</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} de 5`} aria-pressed={rating === i} className="rounded-lg p-1">
                <Star size={34} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-line'} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Comentario" hint="Lo verá cualquiera que abra la ficha del barco, junto a tu nombre.">
          <textarea className={`${inputCls} min-h-28 resize-none`} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="¿Cómo fue la salida? ¿Qué tal el barco y el patrón?" />
        </Field>
        <div>
          <p className="mb-2 text-[13px] font-semibold">Foto de la salida (opcional)</p>
          {photo ? (
            <div className="relative">
              <img src={photo} alt="Foto elegida" className="h-44 w-full rounded-2xl object-cover" />
              <button type="button" onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">Quitar</button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white py-8 text-sm font-semibold text-sea">
              <Camera size={18} /> Añadir foto
              <input type="file" accept="image/*" className="sr-only" onChange={pick} />
            </label>
          )}
        </div>
        <ErrorMsg>{err}</ErrorMsg>
        <Button full type="submit" disabled={busy}>{busy ? 'Publicando…' : 'Publicar valoración'}</Button>
      </form>
    </div>
  )
}
