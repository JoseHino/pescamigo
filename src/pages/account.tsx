import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Anchor, Bell, ChevronRight, Fish, LayoutDashboard, LogOut, Smartphone } from 'lucide-react'
import { Button, Chip, Empty, ErrorMsg, Header } from '../components/ui'
import { markNoticesRead, myBoats, setNotifyEmail, signOut, updatePrefs, useAppState, useMe } from '../data/store'
import { PORTS } from '../data/seed'
import { FISHING_TYPES, ago } from '../lib/format'
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
        <p className="-mt-2 px-1 text-xs text-ink-soft">Los demás solo ven tu nombre. Tu correo no se muestra a nadie.</p>

        {me.role === 'owner' && (
          <Link to="/panel" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <LayoutDashboard size={20} className="shrink-0 text-sea" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{boats.length ? `Mis barcos (${boats.length})` : 'Da de alta tu barco'}</span>
              <span className="block truncate text-xs text-ink-soft">Barcos, salidas, solicitudes e ingresos en el panel</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-soft" />
          </Link>
        )}

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
                    {PORTS.map((p) => <Chip key={p.id} active={me.prefs.ports.includes(p.id)} onClick={() => toggle('ports', p.id)}>{p.name}</Chip>)}
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

        <Button variant="outline" full onClick={async () => { await signOut(); nav('/') }}><LogOut size={16} /> Cerrar sesión</Button>
      </div>
    </div>
  )
}
