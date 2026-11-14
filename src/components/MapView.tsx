import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Boat } from '../types'
import { portById } from '../data/seed'

const boatSvg =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11H5z"/><path d="M14.5 7v7H19z"/><path d="M3 17h18l-2.5 4h-13z"/></svg>'

// Varios barcos del mismo puerto se colocan en anillo alrededor del puerto, separados en píxeles
// para que no se tapen sea cual sea el zoom.
function ringOffset(n: number): [number, number] {
  if (n === 0) return [0, 0]
  const ring = Math.ceil(n / 6)
  const angle = ((n - 1) % 6) * (Math.PI / 3) + (ring % 2 ? 0 : Math.PI / 6)
  return [Math.round(Math.cos(angle) * 44 * ring), Math.round(Math.sin(angle) * 44 * ring)]
}

function pin(active: boolean, hasOuting: boolean, [dx, dy]: [number, number] = [0, 0]) {
  const bg = active ? '#F26B21' : '#0B2A4A'
  const dot = hasOuting && !active
    ? '<span style="position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:#F26B21;border:2px solid #fff"></span>'
    : ''
  return L.divIcon({
    className: 'pin',
    iconSize: [40, 40],
    iconAnchor: [20 - dx, 20 - dy],
    html: `<div style="position:relative;width:40px;height:40px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:0 2px 8px rgba(11,42,74,.35);display:grid;place-items:center">${boatSvg}${dot}</div>`,
  })
}

export interface MapBoat { boat: Boat; hasOuting: boolean }

export default function MapView({ items, selectedId, onSelect }: { items: MapBoat[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const fitted = useRef(false)

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([36.5, -4.85], 10)
    // Teselas públicas de OpenStreetMap: válidas para la demo; en producción hay que contratar un proveedor de mapas.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; colaboradores de OpenStreetMap',
    }).addTo(m)
    L.control.zoom({ position: 'topright' }).addTo(m)
    m.on('click', () => onSelect(null))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const perPort = new Map<string, number>()
    const pts: L.LatLngExpression[] = []
    for (const { boat, hasOuting } of items) {
      const port = portById(boat.portId)
      // Se muestra el puerto base, no la posición en directo.
      const n = perPort.get(port.id) ?? 0
      perPort.set(port.id, n + 1)
      const pos: L.LatLngExpression = [port.lat, port.lng]
      pts.push(pos)
      L.marker(pos, { icon: pin(boat.id === selectedId, hasOuting, ringOffset(n)), title: boat.name, keyboard: true, zIndexOffset: boat.id === selectedId ? 1000 : 0 })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          onSelect(boat.id)
        })
        .addTo(g)
    }
    if (!fitted.current && pts.length) {
      m.fitBounds(L.latLngBounds(pts), { padding: [48, 48], animate: false, maxZoom: 11 })
      fitted.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedId])

  return <div ref={el} className="h-full w-full" />
}
