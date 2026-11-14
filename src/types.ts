export type Role = 'owner' | 'fisher'

export interface User {
  id: string
  email: string
  username: string
  name: string
  passHash: string | null // null si entra con Google
  provider: 'email' | 'google'
  role: Role | null
  createdAt: string
  prefs: { ports: string[]; types: string[]; push: boolean }
}

export interface Port { id: string; name: string; town: string; lat: number; lng: number }

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
}

export interface Outing {
  id: string
  boatId: string
  date: string // YYYY-MM-DD
  start: string // HH:mm
  end: string
  seats: number
  type: string
  costShare: number // € por persona, en efectivo al propietario
  notes: string
  status: 'open' | 'cancelled'
}

export interface Booking {
  id: string
  outingId: string
  fisherId: string
  seats: number
  fee: number
  cardLast4: string
  status: 'confirmed' | 'cancelled'
  createdAt: string
}

export interface Review {
  id: string
  boatId: string
  bookingId: string | null
  authorName: string
  rating: number
  comment: string
  photo: string | null
  date: string
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

export interface State {
  users: User[]
  boats: Boat[]
  outings: Outing[]
  bookings: Booking[]
  reviews: Review[]
  notices: Notice[]
  sessionUserId: string | null
}
