import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Anchor, Bell, ChevronRight, CreditCard, FileText, Fish, LayoutDashboard, LogOut, Pencil, Plus, Smartphone } from 'lucide-react'
import { Button, Chip, Empty, ErrorMsg, Header, OwnerBadge, Photo } from '../components/ui'
import { markNoticesRead, myBoats, payoutAccount, setNotifyEmail, signOut, updatePrefs, useAppState, useMe } from '../data/store'
import { PORTS, portById } from '../data/seed'
import { FISHING_TYPES, HABITUAL_MIN, SUPER_MIN, ago } from '../lib/format'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'

export function Alerts() {
  const s = useAppState()
  const me = useMe()
  const list = s.notices.filter((n) => n.userId === me?.id)
  // Se marcan como leídos al salir de la pantalla, para que al entrar aún se distingan los nuevos.
  useEffect(() => {
    const id = me?.id
    return () => {
      if (id) markNoticesRead(id)
    }
  }, [me?.id])

  return (
    <div className="flex h-full flex-col">
      <Header title="Avisos" back />
      <div className="col flex-1 overflow-y-auto lg:py-6">
        {list.length === 0 ? (
          <Empty icon={<Bell size={24} />} title="Sin avisos por ahora"
            text={me?.role === 'fisher' ? 'Aquí verás las respuestas a tus solicitudes y las salidas nuevas que encajen contigo.' : 'Aquí verás las solicitudes de plaza, cancelaciones y valoraciones.'} />
        ) : (
          <ul className="divide-y divide-line bg-white lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line">
            {list.map((n) => (
              <li key={n.id}>
                <Link to={n.link} className="flex gap-3 px-4 py-3.5">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-buoy'}`} aria-label={n.read ? undefined : 'Nuevo'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`min-w-0 truncate text-sm ${n.read ? 'font-semibold' : 'font-bold'}`}>{n.title}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{ago(n.createdAt)}</span>
                    </span>
                    <span className="wrap-anywhere mt-0.5 block text-[13px] text-ink-soft">{n.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-sea' : 'bg-line'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function DevicePush() {
  const [st, setSt] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    void pushState().then(setSt)
  }, [])
  const toggle = async () => {
    setBusy(true)
    setErr(null)
    if (st === 'on') await disablePush()
    else setErr(await enablePush())
    setSt(await pushState())
    setBusy(false)
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold"><Smartphone size={15} className="shrink-0" /> En este dispositivo</p>
          <p className="text-xs text-ink-soft">
            {st === 'on' ? 'Recibes notificaciones aunque tengas la app cerrada.'
              : st === 'denied' ? 'Bloqueadas en el navegador. Actívalas en los ajustes del sitio pescamigo.es.'
              : st === 'unsupported' ? 'Este navegador no las admite. En iPhone, añade Pescamigo a la pantalla de inicio y ábrelo desde ahí.'
              : 'Notificaciones aunque tengas la app cerrada.'}
          </p>
        </div>
        {st !== 'unsupported' && st !== 'denied' && st !== null && (
          <Button size="sm" variant={st === 'on' ? 'outline' : 'primary'} disabled={busy} onClick={toggle}>{st === 'on' ? 'Desactivar' : 'Activar'}</Button>
        )}
      </div>
      <ErrorMsg>{err}</ErrorMsg>
    </div>
  )
}

/** Cuenta de cobro del patrón (Stripe): para cobrar con tarjeta hay que darla de alta una vez. Solo se ve con los pagos activos. */
function PayoutCard() {
  const me = useMe()
  const [q, setQ] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const back = q.get('cobros')
  useEffect(() => {
    // vuelta del alta en Stripe: se comprueba el estado de la cuenta
    if (!back) return
    void payoutAccount('status').then((r) => {
      if (r.error) setErr(r.error)
      setQ({}, { replace: true })
    })
  }, [back, setQ])
  if (!me) return null
  const ready = me.cardReady
  const go = async () => {
    setBusy(true)
    setErr(null)
    const r = await payoutAccount('onboard')
    setBusy(false)
    if (r.error) setErr(r.error)
  }
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold"><CreditCard size={16} className="text-sea" /> Cobros con tarjeta</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ready ? 'bg-ok-50 text-ok' : 'bg-buoy-50 text-buoy-dark'}`}>
          {ready ? 'Activos' : me.stripeConnected ? 'Falta completar' : 'Sin configurar'}
        </span>
      </div>
      <p className="text-[13px] text-ink-soft">
        {ready
          ? 'Los pescadores pagan en la app y recibes tu parte en tu cuenta bancaria después de cada salida.'
          : 'Da de alta tu cuenta de cobro para que los pescadores paguen en la app. Es un alta segura con Stripe, se hace una sola vez y te pedirá tus datos y tu cuenta bancaria.'}
      </p>
      {!ready && (
        <Button full disabled={busy || !!back} onClick={go}>
          {busy ? 'Abriendo…' : me.stripeConnected ? 'Completar mi cuenta de cobro' : 'Configurar mis cobros'}
        </Button>
      )}
      <ErrorMsg>{err}</ErrorMsg>
    </section>
  )
}

/** Progreso del patrón hacia las marcas "Patrón habitual" y "Superpatrón". */
function OwnerLevelCard({ ownerId }: { ownerId: string }) {
  const s = useAppState()
  const trips = s.tripCounts[ownerId] ?? 0
  const goal = trips < HABITUAL_MIN ? { n: HABITUAL_MIN, label: 'Patrón habitual' } : trips < SUPER_MIN ? { n: SUPER_MIN, label: 'Superpatrón' } : null
  const from = trips < HABITUAL_MIN ? 0 : HABITUAL_MIN
  const pct = goal ? Math.round(((trips - from) / (goal.n - from)) * 100) : 100
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Tu marca de patrón</h2>
        <OwnerBadge ownerId={ownerId} />
      </div>
      <p className="text-[13px]">
        Llevas <b className="tnum">{trips}</b> {trips === 1 ? 'salida hecha' : 'salidas hechas'} con pescadores a bordo.
        {goal ? ` Te ${goal.n - trips === 1 ? 'falta 1' : `faltan ${goal.n - trips}`} para ser ${goal.label}.` : ' Tienes la marca más alta.'}
      </p>
      {goal && (
        <div className="h-2 overflow-hidden rounded-full bg-foam" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso hacia ${goal.label}`}>
          <div className="h-full rounded-full bg-sea" style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
      )}
      <p className="text-xs text-ink-soft">
        Con más de {HABITUAL_MIN - 1} salidas tu barco lleva la marca Patrón habitual y con más de {SUPER_MIN - 1}, Superpatrón. Solo cuentan las salidas ya hechas con algún pescador confirmado.
      </p>
    </section>
  )
}

export function Profile() {
  const nav = useNavigate()
  const s = useAppState()
  const me = useMe()
  if (!me) return null
  const boats = myBoats(s, me.id)
  const toggle = (key: 'ports' | 'types', v: string) => {
    const cur = me.prefs[key]
    updatePrefs({ ...me.prefs, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }
  return (
    <div className="flex h-full flex-col">
      <Header title="Perfil" />
      <div className="col flex-1 space-y-5 overflow-y-auto p-4 lg:py-6">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-white">
            {me.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{me.name}</p>
            <p className="truncate text-[13px] text-ink-soft">@{me.username}</p>
            <p className="truncate text-[13px] text-ink-soft" title="Solo lo ves tú">{me.email}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sea-50 px-2.5 py-0.5 text-xs font-semibold text-sea-dark">
              {me.role === 'owner' ? <Anchor size={12} /> : <Fish size={12} />}
              {me.role === 'owner' ? 'Propietario de barco' : 'Pescador'}
            </p>
          </div>
        </div>
        <p className="-mt-2 px-1 text-xs text-ink-soft">
          Los demás solo ven tu nombre. Tu correo no se muestra a nadie.
        </p>


        {me.role === 'owner' && (
          <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
            <div>
              <h2 className="text-sm font-bold">{boats.length > 1 ? 'Las fichas de tus barcos' : 'La ficha de tu barco'}</h2>
              <p className="text-xs text-ink-soft">Es lo que ven los pescadores: fotos, redes, lo que hay a bordo, valoraciones y tus próximas salidas.</p>
            </div>
            {boats.length > 0 ? (
              <ul className="space-y-2">
                {boats.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                    <Link to={`/barco/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Photo src={b.photos[0]} className="max-h-12 max-w-16 shrink-0 rounded-lg" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{b.name}</span>
                        <span className="block truncate text-xs text-ink-soft">{b.photos.length} {b.photos.length === 1 ? 'foto' : 'fotos'} · {portById(b.portId).name}</span>
                      </span>
                    </Link>
                    <Link to={`/barco-editar/${b.id}`} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-sea hover:bg-sea-50">
                      <Pencil size={14} /> Editar
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link to="/barco-editar/nuevo" className="flex items-center gap-1 text-[13px] font-semibold text-sea">
                <Plus size={14} /> {boats.length ? 'Añadir otro barco' : 'Da de alta tu barco'}
              </Link>
              <Link to="/panel" className="flex items-center gap-1 text-[13px] font-semibold text-ink-soft">
                <LayoutDashboard size={14} /> Ir al panel <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        )}
        {me.role === 'owner' && s.settings.paymentsEnabled && <PayoutCard />}
        {me.role === 'owner' && <OwnerLevelCard ownerId={me.id} />}

        <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-bold">Avisos</h2>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Por correo</p>
              <p className="text-xs text-ink-soft">
                {me.role === 'owner' ? 'Solicitudes de plaza y cancelaciones.' : 'Respuestas a tus solicitudes, cambios y cancelaciones.'}
              </p>
            </div>
            <Switch on={me.notifyEmail} onChange={() => setNotifyEmail(!me.notifyEmail)} label="Avisos por correo" />
          </div>
          <DevicePush />
        </section>

        {me.role === 'fisher' && (
          <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-bold">Salidas nuevas</h2>
                <p className="text-xs text-ink-soft">Te avisamos cuando un barco publique una salida que encaje contigo.</p>
              </div>
              <Switch on={me.prefs.push} onChange={() => updatePrefs({ ...me.prefs, push: !me.prefs.push })} label="Avisos de salidas nuevas" />
            </div>
            {me.prefs.push && (
              <>
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Puertos que me interesan</p>
                  <div className="flex flex-wrap gap-2">
                    {PORTS.map((p) => <Chip key={p.id} active={me.prefs.ports.includes(p.id)} onClick={() => toggle('ports', p.id)} label={`${p.name} (${p.town})`}>{p.short}</Chip>)}
                  </div>
                  {!me.prefs.ports.length && <p className="mt-1.5 text-xs text-ink-soft">Sin elegir ninguno recibes las de todos los puertos.</p>}
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Tipos de pesca</p>
                  <div className="flex flex-wrap gap-2">
                    {FISHING_TYPES.map((t) => <Chip key={t} active={me.prefs.types.includes(t)} onClick={() => toggle('types', t)}>{t}</Chip>)}
                  </div>
                  {!me.prefs.types.length && <p className="mt-1.5 text-xs text-ink-soft">Sin elegir ninguno recibes cualquier tipo.</p>}
                </div>
              </>
            )}
          </section>
        )}

        <Link to="/condiciones" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
          <FileText size={20} className="shrink-0 text-sea" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Condiciones y garantía</span>
            <span className="block truncate text-xs text-ink-soft">Cómo funcionan los pagos y las devoluciones</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-soft" />
        </Link>

        <Button variant="outline" full onClick={async () => { await signOut(); nav('/') }}><LogOut size={16} /> Cerrar sesión</Button>
      </div>
    </div>
  )
}
