import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Anchor, Bell, ChevronRight, Fish, LogOut, Sailboat } from 'lucide-react'
import { Button, Chip, Empty, Header } from '../components/ui'
import { markNoticesRead, myBoat, signOut, updatePrefs, useAppState, useMe } from '../data/store'
import { PORTS } from '../data/seed'
import { FISHING_TYPES, ago } from '../lib/format'

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
      <Header title="Avisos" />
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <Empty icon={<Bell size={24} />} title="Sin avisos por ahora"
            text={me?.role === 'fisher' ? 'Te avisaremos cuando un barco publique una salida que encaje con tus preferencias.' : 'Aquí verás las reservas y valoraciones de tus salidas.'} />
        ) : (
          <ul className="divide-y divide-line bg-white">
            {list.map((n) => (
              <li key={n.id}>
                <Link to={n.link} className="flex gap-3 px-4 py-3.5">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-buoy'}`} aria-label={n.read ? undefined : 'Nuevo'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`truncate text-sm ${n.read ? 'font-semibold' : 'font-bold'}`}>{n.title}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{ago(n.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink-soft">{n.body}</span>
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

export function Profile() {
  const nav = useNavigate()
  const s = useAppState()
  const me = useMe()
  if (!me) return null
  const boat = myBoat(s, me.id)
  const toggle = (key: 'ports' | 'types', v: string) => {
    const cur = me.prefs[key]
    updatePrefs({ ...me.prefs, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }
  return (
    <div className="flex h-full flex-col">
      <Header title="Perfil" />
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-white">
            {me.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{me.name}</p>
            <p className="truncate text-[13px] text-ink-soft">@{me.username} · {me.email}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-sea-50 px-2.5 py-0.5 text-xs font-semibold text-sea-dark">
              {me.role === 'owner' ? <Anchor size={12} /> : <Fish size={12} />}
              {me.role === 'owner' ? 'Propietario de barco' : 'Pescador'}
            </p>
          </div>
        </div>

        {me.role === 'owner' && (
          <Link to="/mi-barco" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <Sailboat size={20} className="text-sea" />
            <span className="flex-1">
              <span className="block text-sm font-bold">{boat ? boat.name : 'Da de alta tu barco'}</span>
              <span className="block text-xs text-ink-soft">{boat ? 'Editar ficha, fotos y puerto base' : 'Lo necesitas para publicar salidas'}</span>
            </span>
            <ChevronRight size={18} className="text-ink-soft" />
          </Link>
        )}
        {me.role === 'owner' && boat && (
          <Link to={`/barco/${boat.id}`} className="-mt-2 block text-center text-[13px] font-semibold text-sea">Ver cómo ven mi barco los pescadores</Link>
        )}

        {me.role === 'fisher' && (
          <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold">Avisos de salidas nuevas</h2>
                <p className="text-xs text-ink-soft">Cuando un barco publique una salida la verás en la pestaña Avisos.</p>
              </div>
              <button role="switch" aria-checked={me.prefs.push} aria-label="Avisos de salidas nuevas" onClick={() => updatePrefs({ ...me.prefs, push: !me.prefs.push })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${me.prefs.push ? 'bg-sea' : 'bg-line'}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${me.prefs.push ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            {me.prefs.push && (
              <>
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Puertos que me interesan</p>
                  <div className="flex flex-wrap gap-2">
                    {PORTS.map((p) => <Chip key={p.id} active={me.prefs.ports.includes(p.id)} onClick={() => toggle('ports', p.id)}>{p.name}</Chip>)}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-soft">{me.prefs.ports.length ? '' : 'Sin elegir ninguno recibes las de todos los puertos.'}</p>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Tipos de pesca</p>
                  <div className="flex flex-wrap gap-2">
                    {FISHING_TYPES.map((t) => <Chip key={t} active={me.prefs.types.includes(t)} onClick={() => toggle('types', t)}>{t}</Chip>)}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-soft">{me.prefs.types.length ? '' : 'Sin elegir ninguno recibes cualquier tipo.'}</p>
                </div>
              </>
            )}
          </section>
        )}

        <div className="space-y-2">
          <Button variant="outline" full onClick={async () => { await signOut(); nav('/') }}><LogOut size={16} /> Cerrar sesión</Button>
        </div>
      </div>
    </div>
  )
}
