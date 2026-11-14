import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Camera, CheckCircle2, Minus, Plus, Star, Ticket } from 'lucide-react'
import { Button, Empty, ErrorMsg, Field, Header, OutingTicket, inputCls } from '../components/ui'
import { NotFound } from './explore'
import { addReview, book, cancelBooking, isPast, seatsLeft, useAppState, useMe } from '../data/store'
import { portById } from '../data/seed'
import { SERVICE_FEE, euro, longDate } from '../lib/format'
import { fileToDataUrl } from '../lib/image'

export function Checkout() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useAppState()
  const o = s.outings.find((x) => x.id === id)
  const boat = o ? s.boats.find((b) => b.id === o.boatId) : null
  const [seats, setSeats] = useState(1)
  const [accept, setAccept] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  if (!o || !boat) return <NotFound what="Esta salida ya no está disponible." />
  const left = seatsLeft(s, o)
  const port = portById(boat.portId)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!accept) return setErr('Marca la casilla para confirmar que lo has entendido.')
    setBusy(true)
    const error = await book(o.id, seats)
    setBusy(false)
    if (error) return setErr(error)
    setDone(true)
  }

  if (done) {
    return (
      <div className="col-narrow flex h-full flex-col items-center justify-center bg-foam px-6 text-center">
        <CheckCircle2 size={56} className="text-ok" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Reserva confirmada</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Tienes {seats} {seats === 1 ? 'plaza' : 'plazas'} en el {boat.name}. {longDate(o.date)}, a las {o.start} en {port.name}.
        </p>
        <p className="mt-4 rounded-xl bg-buoy-50 px-4 py-3 text-sm font-semibold text-ink">
          Lleva {euro(o.costShare * seats)} en efectivo para el reparto de gastos.
        </p>
        <Button className="mt-6" full onClick={() => nav('/reservas', { replace: true })}>Ver mis reservas</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Confirmar reserva" back />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="col flex-1 space-y-4 overflow-y-auto p-4 lg:py-6">
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[15px] font-bold">{boat.name} · {o.type}</p>
            <p className="text-sm text-ink-soft">{longDate(o.date)}, {o.start} – {o.end}</p>
            <p className="text-sm text-ink-soft">{port.name}</p>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
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

          <div className="rounded-2xl border border-line bg-white p-4 text-sm">
            <div className="flex justify-between">
              <span>Reparto de gastos ({seats} × {euro(o.costShare)})</span>
              <b className="tnum">{euro(o.costShare * seats)}</b>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">Se paga en efectivo al propietario el día de la salida.</p>
            <div className="mt-3 flex justify-between border-t border-line pt-3">
              <span>Reservar en Pescamigo</span>
              <b className="tnum">{SERVICE_FEE > 0 ? euro(SERVICE_FEE * seats) : 'Gratis'}</b>
            </div>
          </div>

          <label className="flex items-start gap-3 text-[13px] leading-snug">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A6CCF]" />
            <span>Entiendo que es una salida privada con gastos compartidos, no un servicio profesional, y que a bordo sigo las indicaciones del patrón.</span>
          </label>
          <ErrorMsg>{err}</ErrorMsg>
        </div>
        <div className="col border-t border-line bg-white p-4">
          <Button full variant="accent" type="submit" disabled={busy}>
            {busy ? 'Reservando…' : seats === 1 ? 'Reservar plaza' : `Reservar ${seats} plazas`}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function Trips() {
  const s = useAppState()
  const me = useMe()
  const mine = s.bookings
    .filter((b) => b.fisherId === me?.id)
    .map((b) => ({ b, o: s.outings.find((o) => o.id === b.outingId) }))
    .filter((x): x is { b: typeof x.b; o: NonNullable<typeof x.o> } => !!x.o)
    .sort((a, z) => z.o.date.localeCompare(a.o.date))
  const next = mine.filter((x) => !isPast(x.o) && x.b.status === 'confirmed').reverse()
  const past = mine.filter((x) => isPast(x.o) || x.b.status === 'cancelled')

  return (
    <div className="flex h-full flex-col">
      <Header title="Mis reservas" />
      <div className="col flex-1 overflow-y-auto p-4 lg:py-6">
        {mine.length === 0 ? (
          <Empty icon={<Ticket size={24} />} title="Todavía no has reservado" text="Cuando reserves plaza en una salida aparecerá aquí."
            action={<Link to="/salidas" className="font-semibold text-sea">Ver salidas publicadas</Link>} />
        ) : (
          <div className="space-y-6">
            {next.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Próximas</h2>
                {next.map(({ b, o }) => (
                  <OutingTicket key={b.id} outing={o} footer={
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px]">
                        <b>{b.seats} {b.seats === 1 ? 'plaza' : 'plazas'}</b>
                        <span className="text-ink-soft"> · lleva {euro(o.costShare * b.seats)} en efectivo</span>
                      </p>
                      <button onClick={async () => { if (window.confirm('¿Cancelar esta reserva?')) { const e = await cancelBooking(b.id); if (e) window.alert(e) } }} className="text-[13px] font-semibold text-red-700">
                        Cancelar
                      </button>
                    </div>
                  } />
                ))}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Anteriores</h2>
                {past.map(({ b, o }) => {
                  const reviewed = s.reviews.some((r) => r.bookingId === b.id)
                  return (
                    <OutingTicket key={b.id} outing={o} footer={
                      b.status === 'cancelled' ? (
                        <p className="text-[13px] text-ink-soft">Reserva cancelada</p>
                      ) : reviewed ? (
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ok"><CheckCircle2 size={15} /> Valorada</p>
                      ) : (
                        <Link to={`/valorar/${b.id}`} className="flex items-center justify-center gap-2 rounded-xl bg-sea-50 py-2.5 text-[13px] font-semibold text-sea-dark">
                          <Star size={15} /> Valorar la salida
                        </Link>
                      )
                    } />
                  )
                })}
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
          <p className="text-lg font-bold">{boat.name}</p>
          <p className="text-sm text-ink-soft">{longDate(o.date)} · {o.type}</p>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold">Puntuación</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} de 5`} aria-pressed={rating === i} className="rounded-lg p-1">
                <Star size={36} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-line'} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Comentario" hint="Lo verá cualquiera que abra la ficha del barco.">
          <textarea className={`${inputCls} min-h-28 resize-none`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="¿Cómo fue la salida? ¿Qué tal el barco y el patrón?" />
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
