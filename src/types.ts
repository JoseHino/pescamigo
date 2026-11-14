export type Role = 'owner' | 'fisher'

/** Lo que cualquier usuario ve de otro. El correo nunca sale de la base de datos hacia otros usuarios. */
export interface PublicUser {
  id: string
  username: string
  name: string
  role: Role | null
  /** Enlaces públicos del perfil (redes sociales), siempre https. */
  links: string[]
}

export interface User extends PublicUser {
  email: string
  notifyEmail: boolean
  prefs: { ports: string[]; types: string[]; push: boolean }
}

export interface Port {
  id: string
  name: string
  /** Nombre corto para los botones de filtro ("Banús", "Cabopino"…). */
  short: string
  town: string
  lat: number
  lng: number
}

export interface Boat {
  id: string
  ownerId: string
  name: string
  model: string
  lengthM: number
  capacity: number // plazas para invitados
  portId: string
  description: string
  photos: string[]
  insuranceDeclared: boolean
  licenseDeclared: boolean
  bookMaxDays: number // se puede reservar desde X días antes
  bookMinHours: number // las reservas se cierran X horas antes
  links: string[] // redes del barco (Instagram, TikTok, web…), siempre https
  equipment: string[] // lo que hay a bordo (sonda, vivero…)
  createdAt: string
}

export interface Outing {
  id: string
  boatId: string
  portId: string
  ruleId: string | null // salida generada por una salida habitual
  date: string // YYYY-MM-DD
  start: string // HH:mm
  end: string
  seats: number
  seatsTaken: number // plazas aceptadas o confirmadas
  type: string
  costShare: number // € por persona
  notes: string
  status: 'open' | 'cancelled'
}

export type BookingStatus = 'pending' | 'accepted' | 'confirmed' | 'rejected' | 'cancelled'

export interface Booking {
  id: string
  outingId: string
  fisherId: string
  seats: number
  status: BookingStatus
  message: string
  amountTotal: number
  commissionPct: number
  commissionAmount: number
  ownerAmount: number
  paymentMethod: 'cash' | 'card'
  paymentStatus: 'none' | 'authorized' | 'paid' | 'refunded' | 'failed'
  reason: string
  cancelledBy: 'fisher' | 'owner' | 'system' | null
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: string
  boatId: string
  bookingId: string
  authorName: string
  rating: number
  comment: string
  photo: string | null
  date: string
  /** Día de la salida valorada: prueba de que el autor salió en el barco. */
  outingDay: string | null
}

export interface Notice {
  id: string
  userId: string
  title: string
  body: string
  link: string
  createdAt: string
  read: boolean
}

export interface Rule {
  id: string
  boatId: string
  weekdays: number[] // 0 = domingo … 6 = sábado
  start: string
  end: string
  seats: number
  type: string
  costShare: number
  notes: string
  portId: string
  validUntil: string | null
  active: boolean
}

export interface BlockedDay { boatId: string; day: string }

export interface Conversation {
  id: string
  bookingId: string
  ownerId: string
  fisherId: string
  lastMessage: string
  lastMessageAt: string
  ownerReadAt: string
  fisherReadAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string | null
  isSystem: boolean
  body: string
  createdAt: string
}

export interface Settings { commissionPct: number; paymentsEnabled: boolean }

export interface State {
  ready: boolean // false mientras se comprueba la sesión
  me: User | null
  settings: Settings
  users: PublicUser[]
  boats: Boat[]
  outings: Outing[]
  bookings: Booking[]
  reviews: Review[]
  notices: Notice[]
  rules: Rule[]
  blocked: BlockedDay[]
  conversations: Conversation[]
  messages: Record<string, Message[]> // por conversación, se cargan al abrir el chat
  /** Salidas hechas con pescadores a bordo, por patrón (para las marcas de patrón habitual y superpatrón). */
  tripCounts: Record<string, number>
}
