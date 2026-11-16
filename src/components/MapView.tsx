import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Boat } from '../types'
import { portById } from '../data/seed'
import { LIVE_MAX_AGE } from '../lib/live'

const boatSvg =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11H5z"/><path d="M14.5 7v7H19z"/><path d="M3 17h18l-2.5 4h-13z"/></svg>'

// Varios barcos del mismo puerto sin pantalán marcado se colocan en anillo alrededor del puerto, separados en píxeles
// para que no se tapen sea cual sea el zoom.
function ringOffset(n: number): [number, number] {
  if (n === 0) return [0, 0]
  const ring = Math.ceil(n / 6)
  const angle = ((n - 1) % 6) * (Math.PI / 3) + (ring % 2 ? 0 : Math.PI / 6)
  return [Math.round(Math.cos(angle) * 44 * ring), Math.round(Math.sin(angle) * 44 * ring)]
}

function pin(active: boolean, hasOuting: boolean, [dx, dy]: [number, number] = [0, 0], live = false) {
  const bg = active ? '#F26B21' : live ? '#16855B' : '#0B2A4A'
  const dot = hasOuting && !active
    ? '<span style="position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:#F26B21;border:2px solid #fff"></span>'
    : ''
  return L.divIcon({
    className: 'pin',
    iconSize: [40, 40],
    iconAnchor: [20 - dx, 20 - dy],
    html: `<div style="position:relative;width:40px;height:40px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:${live ? '0 0 0 6px rgba(22,133,91,.25),' : ''}0 2px 8px rgba(11,42,74,.35);display:grid;place-items:center">${boatSvg}${dot}</div>`,
  })
}

export interface MapBoat { boat: Boat; hasOuting: boolean }

// Capas del fondo del mapa (datos públicos y gratuitos):
//  - Satélite: ortofoto PNOA del Instituto Geográfico Nacional + líneas de profundidad de EMODnet.
//  - Profundidad: batimetría de EMODnet (Unión Europea) en tonos azules con el relieve del fondo + líneas.
export type MapStyle = 'satelite' | 'profundidad'
const PNOA = 'https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&version=1.0.0&layer=OI.OrthoimageCoverage&style=default&format=image/jpeg&tilematrixset=GoogleMapsCompatible&tilematrix={z}&tilerow={y}&tilecol={x}'
const EMOD = 'https://ows.emodnet-bathymetry.eu/wms'
const ATTR = 'Ortofoto &copy; <a href="https://www.ign.es">IGN PNOA</a> · Batimetría &copy; <a href="https://emodnet.ec.europa.eu">EMODnet</a>'
export function baseLayers(style: MapStyle): L.Layer[] {
  const contours = L.tileLayer.wms(EMOD, { layers: 'emodnet:contours', format: 'image/png', transparent: true, version: '1.3.0', attribution: ATTR } as L.WMSOptions)
  if (style === 'profundidad') {
    return [L.tileLayer.wms(EMOD, { layers: 'emodnet:mean_atlas_land', format: 'image/png', transparent: true, version: '1.3.0', attribution: ATTR } as L.WMSOptions), contours]
  }
  return [L.tileLayer(PNOA, { maxZoom: 19, attribution: ATTR }), contours]
}

export default function MapView({ items, selectedId, onSelect, style = 'satelite' }: { items: MapBoat[]; selectedId: string | null; onSelect: (id: string | null) => void; style?: MapStyle }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const base = useRef<L.LayerGroup | null>(null)
  const fitted = useRef(false)

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, maxZoom: 18 }).setView([36.5, -4.85], 10)
    base.current = L.layerGroup().addTo(m)
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

  // Fondo del mapa: se cambia sin rehacer el mapa
  useEffect(() => {
    const g = base.current
    if (!g) return
    g.clearLayers()
    for (const l of baseLayers(style)) g.addLayer(l)
  }, [style])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const perPort = new Map<string, number>()
    const pts: L.LatLngExpression[] = []
    for (const { boat, hasOuting } of items) {
      const port = portById(boat.portId)
      // Posición en directo si el patrón la comparte (y es reciente); si no, el puerto base.
      const live = !!boat.live && Date.now() - new Date(boat.live.at).getTime() < LIVE_MAX_AGE
      // En directo > su pantalán exacto > el puerto (varios barcos sin pantalán se reparten en anillo)
      const berth = !live && boat.berthLat != null && boat.berthLng != null
      const n = live || berth ? 0 : perPort.get(port.id) ?? 0
      if (!live && !berth) perPort.set(port.id, n + 1)
      const pos: L.LatLngExpression = live ? [boat.live!.lat, boat.live!.lng] : berth ? [boat.berthLat!, boat.berthLng!] : [port.lat, port.lng]
      pts.push(pos)
      L.marker(pos, { icon: pin(boat.id === selectedId, hasOuting, ringOffset(n), live), title: live ? `${boat.name} (en directo)` : boat.name, keyboard: true, zIndexOffset: boat.id === selectedId ? 1000 : 0 })
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

/** Selector del punto exacto del amarre: se toca el mapa o se arrastra la chincheta. Fondo de foto aérea. */
export function BerthPicker({ lat, lng, center, onChange }: {
  lat: number | null
  lng: number | null
  center: [number, number]
  onChange: (lat: number, lng: number) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const cb = useRef(onChange)
  cb.current = onChange
  useEffect(() => {
    if (!el.current || map.current) return
    const start: [number, number] = lat != null && lng != null ? [lat, lng] : center
    const m = L.map(el.current, { zoomControl: true, attributionControl: false, maxZoom: 19 }).setView(start, lat != null ? 18 : 16)
    for (const l of baseLayers('satelite')) l.addTo(m)
    const icon = pin(true, false)
    const place = (p: L.LatLng) => {
      if (!marker.current) {
        marker.current = L.marker(p, { icon, draggable: true }).addTo(m)
        marker.current.on('dragend', () => { const q = marker.current!.getLatLng(); cb.current(q.lat, q.lng) })
      } else marker.current.setLatLng(p)
      cb.current(p.lat, p.lng)
    }
    if (lat != null && lng != null) {
      marker.current = L.marker([lat, lng], { icon, draggable: true }).addTo(m)
      marker.current.on('dragend', () => { const q = marker.current!.getLatLng(); cb.current(q.lat, q.lng) })
    }
    m.on('click', (e: L.LeafletMouseEvent) => place(e.latlng))
    map.current = m
    return () => { m.remove(); map.current = null; marker.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Si cambia el puerto y no hay punto marcado, se centra en el nuevo puerto
  useEffect(() => {
    if (map.current && lat == null) map.current.setView(center, 16)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]])
  return <div ref={el} className="h-64 w-full overflow-hidden rounded-2xl border border-line" />
}
