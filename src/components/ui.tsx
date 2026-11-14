import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Banknote, MapPin, Star, Users } from 'lucide-react'
import type { Outing } from '../types'
import { boatRating, seatsLeft, useAppState } from '../data/store'
import { portById } from '../data/seed'
import { dayLabel, duration, euro } from '../lib/format'

export const inputCls =
  'w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/20'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'outline' | 'danger'
  full?: boolean
}
export function Button({ variant = 'primary', full, className = '', ...p }: BtnProps) {
  const v = {
    primary: 'bg-sea text-white hover:bg-sea-dark',
    accent: 'bg-buoy text-white hover:brightness-95',
    outline: 'border border-line bg-white text-ink hover:bg-foam',
    danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  }[variant]
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold transition disabled:opacity-50 ${v} ${full ? 'w-full' : ''} ${className}`}
    />
  )
}

export function Header({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3 lg:h-16 lg:px-6">
      {back && (
        <button onClick={() => nav(-1)} aria-label="Volver" className="grid h-10 w-10 place-items-center rounded-full hover:bg-foam">
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className={`flex-1 truncate text-[17px] font-bold ${back ? '' : 'pl-2'}`}>{title}</h1>
      {right}
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
  if (!r.count) return <span className="text-xs text-ink-soft">Sin valoraciones</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold">
      <Star size={13} className="fill-amber-400 text-amber-400" />
      <span className="tnum">{r.avg.toFixed(1).replace('.', ',')}</span>
      <span className="font-normal text-ink-soft">({r.count})</span>
    </span>
  )
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink-soft'
      }`}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

export function ErrorMsg({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-800">
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

/** Billete de salida: la hora de salida y de vuelta mandan, como en una tarjeta de embarque. */
export function OutingTicket({ outing, footer }: { outing: Outing; footer?: ReactNode }) {
  const s = useAppState()
  const boat = s.boats.find((b) => b.id === outing.boatId)
  if (!boat) return null
  const port = portById(boat.portId)
  const left = seatsLeft(s, outing)
  const cancelled = outing.status === 'cancelled'
  return (
    <article className={`rounded-2xl border border-line bg-white ${cancelled ? 'opacity-60' : ''}`}>
      <Link to={`/salida/${outing.id}`} className="block rounded-t-2xl p-4">
        <div className="flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide">
          <span className="text-sea">{dayLabel(outing.date)}</span>
          <span className="rounded-full bg-sea-50 px-2.5 py-0.5 normal-case tracking-normal text-sea-dark">{outing.type}</span>
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="tnum text-[30px] font-extrabold leading-none">{outing.start}</span>
          <span className="mb-1 flex flex-1 items-center gap-2 text-ink-soft">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] font-semibold">{duration(outing.start, outing.end)}</span>
            <ArrowRight size={14} />
          </span>
          <span className="tnum text-[30px] font-extrabold leading-none text-ink-soft">{outing.end}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{boat.name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
              <MapPin size={12} /> {port.name}
            </p>
          </div>
          <Rating boatId={boat.id} />
        </div>
      </Link>
      <div className="ticket-cut flex items-center justify-between border-t border-dashed border-line px-4 py-3 text-[13px]">
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
              <b className="tnum text-ink">{euro(outing.costShare)}</b> en efectivo
            </span>
          </>
        )}
      </div>
      {footer && <div className="border-t border-line p-3">{footer}</div>}
    </article>
  )
}
