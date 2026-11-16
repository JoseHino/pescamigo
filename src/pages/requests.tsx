import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BellRing, Megaphone, Minus, Plus, Sailboat, Send } from 'lucide-react'
import { Button, Chip, ErrorMsg, Field, Header, OutingTicket, SectionTitle, inputCls } from '../components/ui'
import { closeTripRequest, createTripRequest, myBoats, useAppState, useMe } from '../data/store'
import { PORTS, portById } from '../data/seed'
import { FISHING_TYPES, addDays, longDate } from '../lib/format'
import type { TripRequest } from '../types'

const portsLabel = (ids: string[]) => (ids.length ? ids.map((id) => portById(id).short).join(', ') : 'Cualquier puerto')
const typesLabel = (t: string[]) => (t.length ? t.join(', ') : 'Cualquier pesca')

/** "Pide tu salida": el pescador elige día, puertos y tipos de pesca; se avisa a los patrones. */
export function RequestTrip() {
  const nav = useNavigate()
  const [day, setDay] = useState(addDays(3))
  const [ports, setPorts] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [seats, setSeats] = useState(1)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    const r = await createTripRequest({ day, ports, types, seats, message: message.trim() })
    setBusy(false)
    if (r.error) return setErr(r.error)
    setDone(r.notified ?? 0)
  }

  if (done !== null) {
    return (
      <div className="col-narrow flex h-full flex-col items-center justify-center bg-foam px-6 text-center">
        <Send size={48} className="text-sea" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Petición enviada</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          {done > 0
            ? `Hemos avisado a ${done} ${done === 1 ? 'patrón' : 'patrones'}. Cuando alguno te ofrezca una salida te llegará un aviso y podrás pedir plaza.`
            : 'Ahora mismo no hay patrones en esos puertos, pero tu petición queda guardada y la verán los que se den de alta.'}
        </p>
        <Button className="mt-6" full onClick={() => nav('/reservas', { replace: true })}>Ver mis peticiones</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Pide tu salida" back />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="col flex-1 space-y-5 overflow-y-auto p-4 lg:py-6">
          <p className="rounded-2xl bg-sea-50 p-4 text-[15px] leading-snug text-sea-dark">
            ¿No encuentras salida el día que quieres? Dinos cuándo y dónde, y avisamos a los patrones. Si alguno puede, te ofrecerá una salida.
          </p>
          <Field label="¿Qué día quieres salir?">
            <input type="date" className={inputCls} value={day} min={addDays(0)} max={addDays(180)} onChange={(e) => setDay(e.target.value)} required />
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-semibold">¿Desde qué puerto? <span className="font-normal text-ink-soft">(puedes elegir varios)</span></p>
            <div className="flex flex-wrap gap-2">
              {PORTS.map((p) => <Chip key={p.id} active={ports.includes(p.id)} onClick={() => toggle(ports, setPorts, p.id)} label={`${p.name} (${p.town})`}>{p.short}</Chip>)}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{ports.length ? '' : 'Si no eliges ninguno, avisamos a todos los patrones.'}</p>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold">¿Qué pesca te interesa? <span className="font-normal text-ink-soft">(puedes elegir varias)</span></p>
            <div className="flex flex-wrap gap-2">
              {FISHING_TYPES.map((t) => <Chip key={t} active={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>{t}</Chip>)}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <span className="text-[15px] font-semibold">¿Cuántas plazas?</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Quitar una plaza" disabled={seats <= 1} onClick={() => setSeats(seats - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-line disabled:opacity-40"><Minus size={17} /></button>
              <span className="tnum w-6 text-center text-lg font-bold">{seats}</span>
              <button type="button" aria-label="Añadir una plaza" disabled={seats >= 8} onClick={() => setSeats(seats + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-line disabled:opacity-40"><Plus size={17} /></button>
            </div>
          </div>
          <Field label="Mensaje para los patrones (opcional)" hint="Por ejemplo, a qué hora prefieres o tu experiencia. Los teléfonos y correos se ocultan.">
            <textarea className={`${inputCls} min-h-20 resize-none`} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <ErrorMsg>{err}</ErrorMsg>
        </div>
        <div className="col border-t border-line bg-white p-4">
          <Button full variant="accent" type="submit" disabled={busy}><Megaphone size={18} /> {busy ? 'Enviando…' : 'Avisar a los patrones'}</Button>
        </div>
      </form>
    </div>
  )
}

/** Peticiones del pescador, con las salidas que le han ofrecido. Va en "Mis reservas". */
export function MyTripRequests() {
  const s = useAppState()
  const me = useMe()
  const [busy, setBusy] = useState<string | null>(null)
  if (!me) return null
  const today = addDays(0)
  const mine = s.tripRequests.filter((r) => r.fisherId === me.id && r.status === 'open' && r.day >= today)
  if (!mine.length) return null
  const close = async (r: TripRequest) => {
    if (!window.confirm('¿Cancelar esta petición? Los patrones dejarán de verla.')) return
    setBusy(r.id)
    await closeTripRequest(r.id)
    setBusy(null)
  }
  return (
    <section className="space-y-3">
      <SectionTitle count={mine.length}>Tus peticiones de salida</SectionTitle>
      {mine.map((r) => {
        const offers = s.tripOffers.filter((x) => x.requestId === r.id).map((x) => s.outings.find((o) => o.id === x.outingId)).filter((o) => !!o && o.status === 'open')
        return (
          <article key={r.id} className="space-y-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <p className="text-[15px] font-bold">{longDate(r.day)}</p>
              <p className="text-[13px] text-ink-soft">{portsLabel(r.ports)} · {typesLabel(r.types)} · {r.seats} {r.seats === 1 ? 'plaza' : 'plazas'}</p>
            </div>
            {offers.length ? (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ok"><BellRing size={15} /> {offers.length === 1 ? 'Te han ofrecido una salida' : `Te han ofrecido ${offers.length} salidas`}</p>
                {offers.map((o) => <OutingTicket key={o!.id} outing={o!} />)}
              </div>
            ) : (
              <p className="text-[13px] text-ink-soft">Esperando a que un patrón te ofrezca una salida. Te avisaremos.</p>
            )}
            <Button size="sm" variant="danger" disabled={busy === r.id} onClick={() => close(r)}>Cancelar petición</Button>
          </article>
        )
      })}
    </section>
  )
}

/** Peticiones de pescadores para el patrón (las de sus puertos o sin puerto). Va en el Panel. */
export function OwnerTripRequests() {
  const s = useAppState()
  const me = useMe()
  const nav = useNavigate()
  if (!me) return null
  const boats = myBoats(s, me.id)
  if (!boats.length) return null
  const myPorts = new Set(boats.map((b) => b.portId))
  const today = addDays(0)
  const list = s.tripRequests
    .filter((r) => r.status === 'open' && r.day >= today && r.fisherId !== me.id && (!r.ports.length || r.ports.some((p) => myPorts.has(p))))
    .sort((a, z) => a.day.localeCompare(z.day))
  return (
    <section className="space-y-3">
      <SectionTitle count={list.length}>Pescadores que buscan salida</SectionTitle>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">Ahora mismo nadie busca salida en tus puertos. Te avisaremos cuando alguien lo pida.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
          {list.map((r) => {
            const fisher = s.users.find((u) => u.id === r.fisherId)
            const offered = s.tripOffers.some((x) => x.requestId === r.id && x.ownerId === me.id)
            const port = r.ports.find((p) => myPorts.has(p)) ?? boats[0].portId
            const boat = boats.find((b) => b.portId === port) ?? boats[0]
            const q = new URLSearchParams({ fecha: r.day, peticion: r.id, barco: boat.id, puerto: port, plazas: String(Math.min(r.seats, boat.capacity)), ...(r.types[0] ? { tipo: r.types[0] } : {}) })
            return (
              <article key={r.id} className="space-y-3 rounded-2xl border border-line bg-white p-4">
                <div>
                  <p className="text-[15px] font-bold">{fisher?.name ?? 'Un pescador'} busca salida</p>
                  <p className="text-[13px] font-semibold text-sea-dark">{longDate(r.day)} · {r.seats} {r.seats === 1 ? 'plaza' : 'plazas'}</p>
                  <p className="text-[13px] text-ink-soft">{portsLabel(r.ports)} · {typesLabel(r.types)}</p>
                </div>
                {r.message && <p className="wrap-anywhere rounded-xl border border-line px-3 py-2 text-[13px]">«{r.message}»</p>}
                {offered ? (
                  <p className="text-[13px] font-semibold text-ok">Ya le has ofrecido una salida.</p>
                ) : (
                  <Button full onClick={() => nav(`/publicar?${q.toString()}`)}><Sailboat size={17} /> Ofrecer una salida</Button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** Acceso desde Salidas: "¿No encuentras salida? Pide la tuya". */
export function RequestTripLink() {
  return (
    <Link to="/pedir-salida" className="flex items-center gap-3 rounded-2xl border border-buoy/30 bg-buoy-50 p-4">
      <Megaphone size={22} className="shrink-0 text-buoy-dark" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-buoy-dark">¿No encuentras salida?</span>
        <span className="block text-[13px] text-ink">Pide un día y avisamos a los patrones.</span>
      </span>
    </Link>
  )
}
