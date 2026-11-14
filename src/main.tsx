import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Map as MapIcon, MessageCircle, Ticket, User as UserIcon, CalendarRange } from 'lucide-react'
import './index.css'
import { isPast, isUnread, useAppState, useMe } from './data/store'
import { Auth, RoleSetup, Welcome } from './pages/auth'
import { BoatProfile, MapPage, OutingDetail, OutingsPage } from './pages/explore'
import { Checkout, ReviewForm, Trips } from './pages/booking'
import { BoatEdit, CalendarPage, Income, OutingEdit, Panel, Publish } from './pages/owner'
import { Chat, Inbox } from './pages/chat'
import { Alerts, Profile } from './pages/account'
import type { Role } from './types'

function Frame({ children }: { children: ReactNode }) {
  return <div className="relative mx-auto h-full max-w-[440px] overflow-hidden bg-foam shadow-2xl lg:max-w-none lg:shadow-none">{children}</div>
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

function Badge({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="tnum absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-buoy px-1 text-[10px] font-bold text-white">{n > 9 ? '9+' : n}</span>
  )
}

/** Menú principal: barra inferior en el móvil, columna lateral en el ordenador.
 *  En las pantallas de detalle el móvil no lo muestra (tienen su propio botón de volver). */
function Tabs({ detail = false }: { detail?: boolean }) {
  const s = useAppState()
  const me = useMe()
  const unreadChats = s.conversations.filter((c) => me && isUnread(c, me.id)).length
  const myOutings = new Set(s.outings.filter((o) => s.boats.some((b) => b.id === o.boatId && b.ownerId === me?.id) && !isPast(o)).map((o) => o.id))
  const pending = s.bookings.filter((b) => b.status === 'pending' && myOutings.has(b.outingId)).length
  const tabs =
    me?.role === 'owner'
      ? [
          { to: '/panel', icon: LayoutDashboard, label: 'Panel', badge: pending },
          { to: '/calendario', icon: CalendarRange, label: 'Calendario', badge: 0 },
          { to: '/mensajes', icon: MessageCircle, label: 'Mensajes', badge: unreadChats },
          { to: '/mapa', icon: MapIcon, label: 'Mapa', badge: 0 },
          { to: '/perfil', icon: UserIcon, label: 'Perfil', badge: 0 },
        ]
      : [
          { to: '/mapa', icon: MapIcon, label: 'Mapa', badge: 0 },
          { to: '/salidas', icon: CalendarDays, label: 'Salidas', badge: 0 },
          { to: '/reservas', icon: Ticket, label: 'Reservas', badge: 0 },
          { to: '/mensajes', icon: MessageCircle, label: 'Mensajes', badge: unreadChats },
          { to: '/perfil', icon: UserIcon, label: 'Perfil', badge: 0 },
        ]
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <nav
        aria-label="Principal"
        className={`${detail ? 'hidden lg:flex' : 'grid lg:flex'} order-last shrink-0 grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:order-first lg:w-60 lg:flex-col lg:gap-1 lg:border-r lg:border-t-0 lg:p-4`}
      >
        <div className="mb-6 hidden items-center gap-2.5 px-2 pt-2 lg:flex">
          <img src="./logo-192.png" alt="" className="h-10 w-10" />
          <span className="text-lg font-extrabold tracking-tight">Pescamigo</span>
        </div>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `relative flex min-w-0 flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold sm:text-[11px] lg:flex-row lg:gap-3 lg:rounded-xl lg:px-3 lg:py-2.5 lg:text-sm ${
                isActive ? 'text-sea lg:bg-sea-50' : 'text-ink-soft lg:hover:bg-foam'
              }`
            }
          >
            <span className="relative">
              <t.icon size={22} />
              <Badge n={t.badge} />
            </span>
            <span className="max-w-full truncate">{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function Home() {
  const me = useMe()
  if (!me) return <Navigate to="/bienvenida" replace />
  if (!me.role) return <Navigate to="/rol" replace />
  return <Navigate to={me.role === 'owner' ? '/panel' : '/mapa'} replace />
}

function NeedsRole() {
  const me = useMe()
  if (!me) return <Navigate to="/bienvenida" replace />
  // Recién elegido el rol: el propietario pasa a dar de alta su barco.
  if (me.role) return <Navigate to={me.role === 'owner' ? '/barco-editar/nuevo' : '/'} replace />
  return <RoleSetup />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Frame>
        <Boot />
      </Frame>
    </HashRouter>
  </StrictMode>,
)

function Boot() {
  const ready = useAppState().ready
  if (!ready) {
    return (
      <div className="grid h-full place-items-center bg-ink text-white" role="status">
        <img src="./logo-192.png" alt="Pescamigo" className="h-28 w-28" />
      </div>
    )
  }
  return (
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
          <Route path="/mensajes" element={<Inbox />} />
          <Route path="/perfil" element={<Profile />} />
        </Route>
        <Route element={<Tabs detail />}>
          <Route path="/avisos" element={<Alerts />} />
          <Route path="/salida/:id" element={<OutingDetail />} />
          <Route path="/barco/:id" element={<BoatProfile />} />
          <Route path="/chat/:id" element={<Chat />} />
        </Route>
      </Route>

      <Route element={<Private role="fisher" />}>
        <Route element={<Tabs />}>
          <Route path="/salidas" element={<OutingsPage />} />
          <Route path="/reservas" element={<Trips />} />
        </Route>
        <Route element={<Tabs detail />}>
          <Route path="/reservar/:id" element={<Checkout />} />
          <Route path="/valorar/:id" element={<ReviewForm />} />
        </Route>
      </Route>

      <Route element={<Private role="owner" />}>
        <Route element={<Tabs />}>
          <Route path="/panel" element={<Panel />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/publicar" element={<Publish />} />
        </Route>
        <Route element={<Tabs detail />}>
          <Route path="/barco-editar/:id" element={<BoatEdit />} />
          <Route path="/salida-editar/:id" element={<OutingEdit />} />
          <Route path="/ingresos" element={<Income />} />
        </Route>
        {/* Enlaces de avisos anteriores */}
        <Route path="/mis-salidas" element={<Navigate to="/panel" replace />} />
        <Route path="/mi-barco" element={<Navigate to="/panel" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
