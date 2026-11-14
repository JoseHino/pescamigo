import type { Port } from '../types'

// Puertos disponibles. El barco aparece en el mapa en su puerto base.
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
