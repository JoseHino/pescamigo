import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calculator, Camera, CalendarPlus, Sailboat, X } from 'lucide-react'
import { Button, Chip, Empty, ErrorMsg, Field, Header, OutingTicket, inputCls } from '../components/ui'
import { cancelOuting, isPast, myBoat, publishOuting, saveBoat, useAppState, useMe } from '../data/store'
import { PORTS } from '../data/seed'
import { FISHING_TYPES, addDays, euro } from '../lib/format'
import { fileToDataUrl } from '../lib/image'

export function OwnerOutings() {
  const s = useAppState()
  const me = useMe()
  const boat = me ? myBoat(s, me.id) : null
  if (!boat) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Mis salidas" />
        <Empty icon={<Sailboat size={24} />} title="Da de alta tu barco" text="Necesitas la ficha del barco para publicar salidas."
          action={<Link to="/mi-barco" className="font-semibold text-sea">Crear la ficha del barco</Link>} />
      </div>
    )
  }
  const all = s.outings.filter((o) => o.boatId === boat.id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const next = all.filter((o) => !isPast(o))
  const past = all.filter(isPast).reverse()

  const footer = (id: string, open: boolean) => {
    const bs = s.bookings.filter((b) => b.outingId === id && b.status === 'confirmed')
    return (
      <div>
        {bs.length === 0 ? (
          <p className="text-[13px] text-ink-soft">Nadie ha reservado todavía.</p>
        ) : (
          <ul className="space-y-1">
            {bs.map((b) => {
              const u = s.users.find((x) => x.id === b.fisherId)
              return (
                <li key={b.id} className="flex justify-between text-[13px]">
                  <span className="font-semibold">{u?.name ?? 'Pescador'}</span>
                  <span className="text-ink-soft">{b.seats} {b.seats === 1 ? 'plaza' : 'plazas'}</span>
                </li>
              )
            })}
          </ul>
        )}
        {open && (
          <button onClick={async () => { if (window.confirm('¿Cancelar la salida? Se avisará a quien haya reservado.')) { const e = await cancelOuting(id); if (e) window.alert(e) } }}
            className="mt-2.5 text-[13px] font-semibold text-red-700">
            Cancelar salida
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Mis salidas" />
      <div className="flex-1 overflow-y-auto p-4">
        {all.length === 0 ? (
          <Empty icon={<CalendarPlus size={24} />} title="Aún no has publicado ninguna salida" text="Publica la próxima con fecha y horario y avisaremos a los pescadores de la zona."
            action={<Link to="/publicar" className="font-semibold text-sea">Publicar salida</Link>} />
        ) : (
          <div className="space-y-6">
            {next.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Próximas</h2>
                {next.map((o) => <OutingTicket key={o.id} outing={o} footer={footer(o.id, o.status === 'open')} />)}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Anteriores</h2>
                {past.map((o) => <OutingTicket key={o.id} outing={o} footer={footer(o.id, false)} />)}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Publish() {
  const nav = useNavigate()
  const s = useAppState()
  const me = useMe()
  const boat = me ? myBoat(s, me.id) : null
  const [f, setF] = useState({ date: addDays(1), start: '07:00', end: '13:00', seats: 2, type: 'Fondo', costShare: '20', notes: '' })
  const [calc, setCalc] = useState({ open: false, fuel: '', other: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!boat) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Publicar salida" />
        <Empty icon={<Sailboat size={24} />} title="Primero, tu barco" text="Crea la ficha del barco y podrás publicar salidas."
          action={<Link to="/mi-barco" className="font-semibold text-sea">Crear la ficha del barco</Link>} />
      </div>
    )
  }

  const people = f.seats + 1 // los invitados y el propietario
  const total = (parseFloat(calc.fuel.replace(',', '.')) || 0) + (parseFloat(calc.other.replace(',', '.')) || 0)
  const suggested = Math.ceil(total / people)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const error = await publishOuting({ ...f, costShare: parseFloat(f.costShare.replace(',', '.')), notes: f.notes.trim() })
    setBusy(false)
    if (error) return setErr(error)
    nav('/mis-salidas')
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Publicar salida" />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-sm text-ink-soft">Barco: <b className="text-ink">{boat.name}</b></p>
          <Field label="Fecha">
            <input type="date" className={inputCls} min={addDays(0)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora de salida">
              <input type="time" className={inputCls} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
            </Field>
            <Field label="Hora de vuelta">
              <input type="time" className={inputCls} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Tipo de pesca</p>
            <div className="flex flex-wrap gap-2">
              {FISHING_TYPES.map((t) => <Chip key={t} active={f.type === t} onClick={() => setF({ ...f, type: t })}>{t}</Chip>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Plazas que ofreces</p>
            <div className="flex gap-2">
              {Array.from({ length: boat.capacity }, (_, i) => i + 1).map((n) => (
                <Chip key={n} active={f.seats === n} onClick={() => setF({ ...f, seats: n })}>{n}</Chip>
              ))}
            </div>
          </div>

          <Field label="Reparto de gastos por persona (€)" hint="Lo que te da cada pescador en efectivo. Solo gastos reales de la salida: combustible, cebo, hielo.">
            <input className={`${inputCls} tnum`} inputMode="decimal" value={f.costShare} onChange={(e) => setF({ ...f, costShare: e.target.value })} />
          </Field>

          <div className="rounded-2xl border border-line bg-white p-4">
            <button type="button" onClick={() => setCalc({ ...calc, open: !calc.open })} aria-expanded={calc.open} className="flex w-full items-center gap-2 text-left text-sm font-semibold text-sea">
              <Calculator size={16} /> Calcular el reparto a partir de los gastos
            </button>
            {calc.open && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Combustible (€)">
                    <input className={`${inputCls} tnum`} inputMode="decimal" value={calc.fuel} onChange={(e) => setCalc({ ...calc, fuel: e.target.value })} />
                  </Field>
                  <Field label="Cebo, hielo, otros (€)">
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
            <textarea className={`${inputCls} min-h-20 resize-none`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Zona de pesca, qué traer, punto de encuentro…" />
          </Field>
          <ErrorMsg>{err}</ErrorMsg>
        </div>
        <div className="border-t border-line bg-white p-4">
          <Button full variant="accent" type="submit" disabled={busy}>{busy ? 'Publicando…' : 'Publicar salida'}</Button>
        </div>
      </form>
    </div>
  )
}

export function BoatEdit() {
  const nav = useNavigate()
  const s = useAppState()
  const me = useMe()
  const boat = me ? myBoat(s, me.id) : null
  const [f, setF] = useState({
    name: boat?.name ?? '',
    model: boat?.model ?? '',
    lengthM: boat ? String(boat.lengthM) : '',
    capacity: boat?.capacity ?? 2,
    portId: boat?.portId ?? PORTS[0].id,
    description: boat?.description ?? '',
    photos: boat?.photos ?? ([] as string[]),
    insuranceDeclared: boat?.insuranceDeclared ?? false,
    licenseDeclared: boat?.licenseDeclared ?? false,
  })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = await fileToDataUrl(file)
      setF((x) => ({ ...x, photos: [...x.photos, url] }))
    } catch {
      setErr('No se ha podido leer la imagen. Prueba con otra.')
    }
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const lengthM = parseFloat(f.lengthM.replace(',', '.'))
    if (!f.name.trim()) return setErr('Pon el nombre del barco.')
    if (!lengthM || lengthM <= 0) return setErr('Indica la eslora en metros.')
    if (f.photos.length === 0) return setErr('Añade al menos una foto del barco.')
    setBusy(true)
    const error = await saveBoat({ ...f, name: f.name.trim(), model: f.model.trim(), description: f.description.trim(), lengthM })
    setBusy(false)
    if (error) return setErr(error)
    nav(boat ? '/perfil' : '/publicar')
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={boat ? 'Mi barco' : 'Da de alta tu barco'} back={!!boat} />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Fotos</p>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {f.photos.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={src} alt={`Foto ${i + 1}`} className="h-24 w-28 rounded-xl object-cover" />
                  <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => setF({ ...f, photos: f.photos.filter((_, j) => j !== i) })}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <label className="grid h-24 w-28 shrink-0 cursor-pointer place-items-center rounded-xl border border-dashed border-line bg-white text-sea">
                <span className="flex flex-col items-center gap-1 text-xs font-semibold"><Camera size={18} /> Añadir</span>
                <input type="file" accept="image/*" className="sr-only" onChange={addPhoto} />
              </label>
            </div>
          </div>
          <Field label="Nombre del barco">
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Modelo">
            <input className={inputCls} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} placeholder="Marca y modelo" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Eslora (m)">
              <input className={`${inputCls} tnum`} inputMode="decimal" value={f.lengthM} onChange={(e) => setF({ ...f, lengthM: e.target.value })} />
            </Field>
            <Field label="Plazas para invitados">
              <select className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Puerto base" hint="Es donde aparece tu barco en el mapa.">
            <select className={inputCls} value={f.portId} onChange={(e) => setF({ ...f, portId: e.target.value })}>
              {PORTS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.town})</option>)}
            </select>
          </Field>
          <Field label="Descripción">
            <textarea className={`${inputCls} min-h-24 resize-none`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Cómo son tus salidas, qué material llevas, qué esperas de quien venga." />
          </Field>
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
          <ErrorMsg>{err}</ErrorMsg>
        </div>
        <div className="border-t border-line bg-white p-4">
          <Button full type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar barco'}</Button>
        </div>
      </form>
    </div>
  )
}
