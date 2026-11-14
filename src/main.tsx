import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Bell, CalendarDays, CirclePlus, Map as MapIcon, Ticket, User as UserIcon, Waves } from 'lucide-react'
import './index.css'
import { useAppState, useMe } from './data/store'
import { Auth, RoleSetup, Welcome } from './pages/auth'
import { BoatProfile, MapPage, OutingDetail, OutingsPage } from './pages/explore'
import { Checkout, ReviewForm, Trips } from './pages/booking'
import { BoatEdit, OwnerOutings, Publish } from './pages/owner'
import { Alerts, Profile } from './pages/account'
import type { Role } from './types'

function Frame({ children }: { children: ReactNode }) {
  return <div className="relative mx-auto h-full max-w-[440px] overflow-hidden bg-foam shadow-2xl">{children}</div>
}

/** Solo para quien no ha iniciado sesión. */
function Guest() {
  const me = useMe()
  return me ? <Navigate to="/" replace /> : <Outlet />
}

/** Exige sesión y rol elegido; opcionalmente un rol concreto. */
function Private({ role }: { role?: Role }) {
  const me = useMe()
  if (!me) return <Navigate to="/bienvenida" replace />
  if (!me.role) return <Navigate to="/rol" replace />
  if (role && me.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}

function Tabs() {
  const s = useAppState()
  const me = useMe()
  const unread = s.notices.filter((n) => n.userId === me?.id && !n.read).length
  const tabs =
    me?.role === 'owner'
      ? [
          { to: '/mapa', icon: MapIcon, label: 'Mapa' },
          { to: '/mis-salidas', icon: Waves, label: 'Mis salidas' },
          { to: '/publicar', icon: CirclePlus, label: 'Publicar' },
          { to: '/avisos', icon: Bell, label: 'Avisos' },
          { to: '/perfil', icon: UserIcon, label: 'Perfil' },
        ]
      : [
          { to: '/mapa', icon: MapIcon, label: 'Mapa' },
          { to: '/salidas', icon: CalendarDays, label: 'Salidas' },
          { to: '/reservas', icon: Ticket, label: 'Reservas' },
          { to: '/avisos', icon: Bell, label: 'Avisos' },
          { to: '/perfil', icon: UserIcon, label: 'Perfil' },
        ]
  return (
    <div className="flex h-full flex-col">
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
      <nav aria-label="Principal" className="grid shrink-0 grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-sea' : 'text-ink-soft'}`}>
            <span className="relative">
              <t.icon size={22} />
              {t.to === '/avisos' && unread > 0 && (
                <span className="tnum absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-buoy px-1 text-[10px] font-bold text-white">{unread}</span>
              )}
            </span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function Home() {
  const me = useMe()
  if (!me) return <Navigate to="/bienvenida" replace />
  if (!me.role) return <Navigate to="/rol" replace />
  return <Navigate to="/mapa" replace />
}

function NeedsRole() {
  const me = useMe()
  if (!me) return <Navigate to="/bienvenida" replace />
  // Recién elegido el rol: el propietario pasa a dar de alta su barco.
  if (me.role) return <Navigate to={me.role === 'owner' ? '/mi-barco' : '/'} replace />
  return <RoleSetup />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Frame>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<Guest />}>
            <Route path="/bienvenida" element={<Welcome />} />
            <Route path="/acceso" element={<Auth />} />
          </Route>
          <Route path="/rol" element={<NeedsRole />} />

          <Route element={<Private />}>
            <Route element={<Tabs />}>
              <Route path="/mapa" element={<MapPage />} />
              <Route path="/avisos" element={<Alerts />} />
              <Route path="/perfil" element={<Profile />} />
            </Route>
            <Route path="/salida/:id" element={<OutingDetail />} />
            <Route path="/barco/:id" element={<BoatProfile />} />
          </Route>

          <Route element={<Private role="fisher" />}>
            <Route element={<Tabs />}>
              <Route path="/salidas" element={<OutingsPage />} />
              <Route path="/reservas" element={<Trips />} />
            </Route>
            <Route path="/reservar/:id" element={<Checkout />} />
            <Route path="/valorar/:id" element={<ReviewForm />} />
          </Route>

          <Route element={<Private role="owner" />}>
            <Route element={<Tabs />}>
              <Route path="/mis-salidas" element={<OwnerOutings />} />
              <Route path="/publicar" element={<Publish />} />
            </Route>
            <Route path="/mi-barco" element={<BoatEdit />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Frame>
    </HashRouter>
  </StrictMode>,
)
