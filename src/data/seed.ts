import type { Port, State } from '../types'
import { addDays, demoHash } from '../lib/format'

export const PORTS: Port[] = [
  { id: 'banus', name: 'Puerto Banús', town: 'Marbella', lat: 36.4853, lng: -4.9527 },
  { id: 'marbella', name: 'Puerto Deportivo Virgen del Carmen', town: 'Marbella', lat: 36.5072, lng: -4.8893 },
  { id: 'bajadilla', name: 'Puerto Pesquero La Bajadilla', town: 'Marbella', lat: 36.5069, lng: -4.8748 },
  { id: 'cabopino', name: 'Puerto de Cabopino', town: 'Marbella', lat: 36.4846, lng: -4.7421 },
  { id: 'estepona', name: 'Puerto de Estepona', town: 'Estepona', lat: 36.4142, lng: -5.1603 },
  { id: 'fuengirola', name: 'Puerto de Fuengirola', town: 'Fuengirola', lat: 36.5423, lng: -4.6163 },
  { id: 'benalmadena', name: 'Puerto Marina', town: 'Benalmádena', lat: 36.5955, lng: -4.5126 },
]

export const portById = (id: string) => PORTS.find((p) => p.id === id) ?? PORTS[0]

// Ilustraciones de muestra para la demo (las fotos reales las suben los usuarios).
const SKIES = [
  ['#FFD9A8', '#F7A072', '#1F5F99', '#0B2A4A'],
  ['#CFE8FF', '#8CC4F2', '#0A6CCF', '#0B2A4A'],
  ['#FBE3C2', '#F49B6B', '#27548A', '#12325A'],
  ['#D8F0F2', '#9BD3DC', '#1479A8', '#0B2A4A'],
  ['#E9E4F5', '#B9B4E0', '#2C5C9E', '#132F57'],
]
export function scenePhoto(i: number) {
  const [a, b, sea, hull] = SKIES[i % SKIES.length]
  const sunX = 80 + ((i * 97) % 240)
  const boatX = 120 + ((i * 53) % 140)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="400" height="260" fill="url(#s)"/>
<circle cx="${sunX}" cy="118" r="34" fill="#fff" opacity=".75"/>
<path d="M0 150h400v110H0z" fill="${sea}"/>
<path d="M0 150q50-8 100 0t100 0 100 0 100 0v14H0z" fill="#fff" opacity=".18"/>
<g transform="translate(${boatX} 0)">
<path d="M10 172h120l-18 26H26z" fill="${hull}"/>
<path d="M46 150h44l8 22H40z" fill="#fff"/>
<path d="M66 112v38" stroke="${hull}" stroke-width="3"/>
<path d="M112 172l34-52" stroke="${hull}" stroke-width="2" fill="none"/>
</g>
<path d="M0 214q50-10 100 0t100 0 100 0 100 0v46H0z" fill="#fff" opacity=".12"/>
</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export function seedState(): State {
  const now = new Date().toISOString()
  const pass = demoHash('demo1234')
  const user = (id: string, name: string, username: string, role: 'owner' | 'fisher') => ({
    id,
    email: `${username}@enrola.demo`,
    username,
    name,
    passHash: pass,
    provider: 'email' as const,
    role,
    createdAt: now,
    prefs: { ports: [], types: [], push: true },
  })

  return {
    sessionUserId: null,
    users: [
      user('u-owner', 'Antonio Ruiz', 'patron.demo', 'owner'),
      user('u-fisher', 'Lucía Moreno', 'pescador.demo', 'fisher'),
      user('u-o2', 'Paco Gámez', 'paco.gamez', 'owner'),
      user('u-o3', 'Marta Salas', 'marta.salas', 'owner'),
      user('u-o4', 'Julián Ortega', 'julian.ortega', 'owner'),
      user('u-o5', 'Rocío Vera', 'rocio.vera', 'owner'),
      user('u-o6', 'Diego Luna', 'diego.luna', 'owner'),
    ],
    boats: [
      {
        id: 'b1', ownerId: 'u-owner', name: 'Levante', model: 'Quicksilver 675 Pilothouse', lengthM: 6.5, capacity: 3,
        portId: 'bajadilla', photos: [scenePhoto(0), scenePhoto(1), scenePhoto(2)], insuranceDeclared: true, licenseDeclared: true,
        description: 'Salgo casi todos los fines de semana a fondo y curricán costero. Llevo cañas de sobra y nevera. Se agradece puntualidad.',
      },
      {
        id: 'b2', ownerId: 'u-o2', name: 'Mar de Alborán', model: 'Rodman 800', lengthM: 8, capacity: 4,
        portId: 'banus', photos: [scenePhoto(3), scenePhoto(4)], insuranceDeclared: true, licenseDeclared: true,
        description: 'Curricán de altura cuando el tiempo acompaña. Barco cómodo, con cabina y baño.',
      },
      {
        id: 'b3', ownerId: 'u-o3', name: 'Salitre', model: 'Jeanneau Merry Fisher 605', lengthM: 6, capacity: 2,
        portId: 'estepona', photos: [scenePhoto(5), scenePhoto(6)], insuranceDeclared: true, licenseDeclared: true,
        description: 'Jigging y spinning a primera hora. Salidas cortas, ideal para probar.',
      },
      {
        id: 'b4', ownerId: 'u-o4', name: 'Tramontana', model: 'Astinor 740', lengthM: 7.4, capacity: 3,
        portId: 'fuengirola', photos: [scenePhoto(7)], insuranceDeclared: true, licenseDeclared: true,
        description: 'Fondo clásico frente a Fuengirola. Llevo cebo; cada uno su bocadillo.',
      },
      {
        id: 'b5', ownerId: 'u-o5', name: 'Brisa', model: 'Beneteau Antares 7', lengthM: 7, capacity: 3,
        portId: 'cabopino', photos: [scenePhoto(8), scenePhoto(9)], insuranceDeclared: true, licenseDeclared: false,
        description: 'Calamar al atardecer en temporada y fondo el resto del año.',
      },
      {
        id: 'b6', ownerId: 'u-o6', name: 'Poniente', model: 'Faeton 780 Moraga', lengthM: 7.8, capacity: 4,
        portId: 'benalmadena', photos: [scenePhoto(10), scenePhoto(11)], insuranceDeclared: true, licenseDeclared: true,
        description: 'Curricán y jigging. Salimos temprano y volvemos antes de comer.',
      },
    ],
    outings: [
      { id: 'o1', boatId: 'b1', date: addDays(1), start: '07:00', end: '13:00', seats: 3, type: 'Fondo', costShare: 20, notes: 'Zona de las piedras de Río Real. Traed agua y gorra.', status: 'open' },
      { id: 'o2', boatId: 'b1', date: addDays(6), start: '06:30', end: '12:00', seats: 2, type: 'Curricán', costShare: 25, notes: '', status: 'open' },
      { id: 'o3', boatId: 'b2', date: addDays(2), start: '06:00', end: '14:00', seats: 4, type: 'Curricán', costShare: 35, notes: 'Salida larga, hasta 12 millas si el parte es bueno.', status: 'open' },
      { id: 'o4', boatId: 'b3', date: addDays(1), start: '07:30', end: '11:00', seats: 2, type: 'Jigging', costShare: 15, notes: '', status: 'open' },
      { id: 'o5', boatId: 'b4', date: addDays(3), start: '08:00', end: '13:30', seats: 3, type: 'Fondo', costShare: 18, notes: '', status: 'open' },
      { id: 'o6', boatId: 'b5', date: addDays(4), start: '17:30', end: '21:30', seats: 3, type: 'Calamar', costShare: 15, notes: 'Volvemos ya de noche.', status: 'open' },
      { id: 'o7', boatId: 'b6', date: addDays(8), start: '06:30', end: '12:30', seats: 4, type: 'Jigging', costShare: 22, notes: '', status: 'open' },
      { id: 'o-past', boatId: 'b1', date: addDays(-9), start: '07:00', end: '13:00', seats: 3, type: 'Fondo', costShare: 20, notes: '', status: 'open' },
    ],
    bookings: [
      { id: 'bk-past', outingId: 'o-past', fisherId: 'u-fisher', seats: 1, fee: 3, cardLast4: '4242', status: 'confirmed', createdAt: now },
    ],
    reviews: [
      { id: 'r1', boatId: 'b1', bookingId: null, authorName: 'Javier P.', rating: 5, comment: 'Antonio conoce la zona como nadie. Sacamos pargos y un par de sargos buenos.', photo: scenePhoto(12), date: addDays(-30) },
      { id: 'r2', boatId: 'b1', bookingId: null, authorName: 'Elena R.', rating: 4, comment: 'Muy buen ambiente y barco limpio. Salimos con diez minutos de retraso.', photo: null, date: addDays(-52) },
      { id: 'r3', boatId: 'b2', bookingId: null, authorName: 'Sergio M.', rating: 5, comment: 'Barco muy cómodo. Dos bonitos al curricán antes de las diez.', photo: scenePhoto(13), date: addDays(-18) },
      { id: 'r4', boatId: 'b3', bookingId: null, authorName: 'Nuria T.', rating: 4, comment: 'Salida corta y bien explicada para quien empieza con el jigging.', photo: null, date: addDays(-25) },
      { id: 'r5', boatId: 'b4', bookingId: null, authorName: 'Andrés L.', rating: 5, comment: 'Reparto de gastos claro desde el principio. Repetiré.', photo: null, date: addDays(-40) },
      { id: 'r6', boatId: 'b6', bookingId: null, authorName: 'Carmen D.', rating: 4, comment: 'Buen patrón y puntual. El mar estaba algo movido.', photo: scenePhoto(14), date: addDays(-12) },
    ],
    notices: [
      { id: 'n1', userId: 'u-fisher', title: 'Nueva salida: Levante', body: 'Fondo desde La Bajadilla, mañana de 07:00 a 13:00.', link: '/salida/o1', createdAt: now, read: false },
    ],
  }
}
