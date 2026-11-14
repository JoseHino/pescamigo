import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Banknote, Bell, ExternalLink, MapPin, Repeat, Star, Users } from 'lucide-react'
import type { BookingStatus, Outing } from '../types'
import { boatRating, seatsLeft, useAppState } from '../data/store'
import { portById } from '../data/seed'
import { STATUS, dayLabel, duration, euro, linkLabel } from '../lib/format'

export const inputCls =
  'w-full min-w-0 rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/20 disabled:bg-foam disabled:text-ink-soft'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'outline' | 'danger'
  full?: boolean
  size?: 'md' | 'sm'
}
export function Button({ variant = 'primary', full, size = 'md', className = '', ...p }: BtnProps) {
  const v = {
    primary: 'bg-sea text-white hover:bg-sea-dark',
    accent: 'bg-buoy text-white hover:brightness-95',
    outline: 'border border-line bg-white text-ink hover:bg-foam',
    danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  }[variant]
  const s = size === 'sm' ? 'px-3 py-2 text-[13px]' : 'px-4 py-3 text-[15px]'
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 ${s} ${v} ${full ? 'w-full' : ''} ${className}`}
    />
  )
}

/** Campana de avisos con el número de avisos sin leer. */
function AlertsBell() {
  const s = useAppState()
  const unread = s.notices.filter((n) => n.userId === s.me?.id && !n.read).length
  if (!s.me) return null
  return (
    <Link to="/avisos" aria-label={unread ? `Avisos, ${unread} sin leer` : 'Avisos'} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink hover:bg-foam">
      <Bell size={21} />
      {unread > 0 && (
        <span className="tnum absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-buoy px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
      )}
    </Link>
  )
}

export function Header({ title, back, right, sub }: { title: string; back?: boolean; right?: ReactNode; sub?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3 lg:h-16 lg:px-6">
      {back && (
        <button onClick={() => nav(-1)} aria-label="Volver" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-foam">
          <ArrowLeft size={20} />
        </button>
      )}
      <div className={`min-w-0 flex-1 ${back ? '' : 'pl-2'}`}>
        <h1 className="truncate text-[17px] font-bold leading-tight">{title}</h1>
        {sub && <p className="truncate text-xs text-ink-soft">{sub}</p>}
      </div>
      {right}
      {!back && <AlertsBell />}
    </header>
  )
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-line'} />
      ))}
    </span>
  )
}

export function Rating({ boatId }: { boatId: string }) {
  const s = useAppState()
  const r = boatRating(s, boatId)
  if (!r.count) return <span className="shrink-0 text-xs text-ink-soft">Sin valoraciones</span>
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
      <Star size={13} className="fill-amber-400 text-amber-400" />
      <span className="tnum">{r.avg.toFixed(1).replace('.', ',')}</span>
      <span className="font-normal text-ink-soft">({r.count})</span>
    </span>
  )
}

/** Enlaces del perfil de alguien (Instagram, TikTok…) como pastillas que abren en otra pestaña. */
export function SocialLinks({ links }: { links: string[] }) {
  if (!links.length) return null
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {links.map((l) => (
        <a
          key={l}
          href={l}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-sea-dark hover:bg-foam"
        >
          <span className="truncate">{linkLabel(l)}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`max-w-full shrink-0 truncate rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink-soft'
      }`}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

export function ErrorMsg({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="wrap-anywhere rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-800">
      {children}
    </p>
  )
}

export function Notice({ children, tone = 'ok' }: { children: ReactNode; tone?: 'ok' | 'info' }) {
  if (!children) return null
  return (
    <p role="status" className={`wrap-anywhere rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${tone === 'ok' ? 'bg-ok-50 text-ok' : 'bg-sea-50 text-sea-dark'}`}>
      {children}
    </p>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="cards-full mx-auto flex max-w-xs flex-col items-center px-4 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-sea-50 text-sea">{icon}</div>
      <h2 className="text-base font-bold">{title}</h2>
      <p className="mt-1.5 text-sm text-ink-soft">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const st = STATUS[status]
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
}

export function SectionTitle({ children, count, action }: { children: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {children}
        {count !== undefined && <span className="tnum ml-1.5 rounded-full bg-line/70 px-1.5 py-px text-[11px] text-ink">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

/** Billete de salida: la hora de salida y de vuelta mandan, como en una tarjeta de embarque. */
export function OutingTicket({ outing, footer, to }: { outing: Outing; footer?: ReactNode; to?: string }) {
  const s = useAppState()
  const boat = s.boats.find((b) => b.id === outing.boatId)
  if (!boat) return null
  const port = portById(outing.portId)
  const left = seatsLeft(s, outing)
  const cancelled = outing.status === 'cancelled'
  return (
    <article className={`min-w-0 rounded-2xl border border-line bg-white ${cancelled ? 'opacity-70' : ''}`}>
      <Link to={to ?? `/salida/${outing.id}`} className="block rounded-t-2xl p-4">
        <div className="flex items-center justify-between gap-2 text-[12px] font-semibold uppercase tracking-wide">
          <span className="truncate text-sea">{dayLabel(outing.date)}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {/* Que la salida sea habitual solo le interesa al patrón. */}
            {outing.ruleId && s.me?.id === boat.ownerId && (
              <span className="flex items-center gap-1 rounded-full bg-foam px-2 py-0.5 normal-case tracking-normal text-ink-soft" title="Salida habitual">
                <Repeat size={11} /> Habitual
              </span>
            )}
            <span className="rounded-full bg-sea-50 px-2.5 py-0.5 normal-case tracking-normal text-sea-dark">{outing.type}</span>
          </span>
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="tnum text-[28px] font-extrabold leading-none sm:text-[30px]">{outing.start}</span>
          <span className="mb-1 flex min-w-0 flex-1 items-center gap-2 text-ink-soft">
            <span className="h-px flex-1 bg-line" />
            <span className="shrink-0 text-[11px] font-semibold">{duration(outing.start, outing.end)}</span>
            <ArrowRight size={14} className="shrink-0" />
          </span>
          <span className="tnum text-[28px] font-extrabold leading-none text-ink-soft sm:text-[30px]">{outing.end}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{boat.name}</p>
            <p className="flex items-center gap-1 text-xs text-ink-soft">
              <MapPin size={12} className="shrink-0" /> <span className="truncate">{port.name}</span>
            </p>
          </div>
          <Rating boatId={boat.id} />
        </div>
      </Link>
      <div className="ticket-cut flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-line px-4 py-3 text-[13px]">
        {cancelled ? (
          <span className="font-semibold text-red-700">Salida cancelada</span>
        ) : (
          <>
            <span className={`flex items-center gap-1.5 font-semibold ${left === 0 ? 'text-ink-soft' : 'text-ok'}`}>
              <Users size={14} />
              {left === 0 ? 'Completa' : `${left} ${left === 1 ? 'plaza libre' : 'plazas libres'}`}
            </span>
            <span className="flex items-center gap-1.5 text-ink-soft">
              <Banknote size={14} />
              <b className="tnum text-ink">{euro(outing.costShare)}</b> por plaza
            </span>
          </>
        )}
      </div>
      {footer && <div className="border-t border-line p-3">{footer}</div>}
    </article>
  )
}
