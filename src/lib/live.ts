import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/** Compartir la ubicación del barco en directo (patrón). Sigue activa mientras la app esté abierta,
 *  aunque se cambie de pantalla; se envía como mucho cada 30 s. Al pararla, el barco vuelve a su puerto base. */
type LiveState = { boatId: string | null; error: string | null; lastSent: number | null }
let st: LiveState = { boatId: null, error: null, lastSent: null }
const subs = new Set<() => void>()
const set = (p: Partial<LiveState>) => {
  st = { ...st, ...p }
  subs.forEach((f) => f())
}
let watchId: number | null = null
let lastSentAt = 0

export function useLive() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => st)
}

export function startLive(boatId: string) {
  if (!('geolocation' in navigator)) return set({ error: 'Este móvil no permite compartir la ubicación.' })
  stopWatch()
  set({ boatId, error: null })
  lastSentAt = 0
  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      if (Date.now() - lastSentAt < 30000) return
      lastSentAt = Date.now()
      const { error } = await supabase.rpc('set_boat_location', { p_boat: boatId, p_lat: pos.coords.latitude, p_lng: pos.coords.longitude })
      set(error ? { error: 'No se ha podido enviar la ubicación. Comprueba la conexión.' } : { error: null, lastSent: Date.now() })
    },
    (err) => {
      // Sin permiso no hay nada que compartir: se para y se explica cómo activarlo.
      if (err.code === err.PERMISSION_DENIED) stopWatch()
      set({
        ...(err.code === err.PERMISSION_DENIED ? { boatId: null } : {}),
        error: err.code === err.PERMISSION_DENIED
          ? 'Has denegado el permiso de ubicación. Actívalo en los ajustes del navegador para pescamigo.es.'
          : 'No se ha podido obtener la ubicación. Prueba al aire libre.',
      })
    },
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
  )
}

function stopWatch() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  watchId = null
}

export async function stopLive() {
  const boatId = st.boatId
  stopWatch()
  set({ boatId: null, error: null, lastSent: null })
  if (boatId) await supabase.rpc('stop_boat_location', { p_boat: boatId })
}

/** La posición en directo solo cuenta si se ha actualizado en los últimos 15 minutos. */
export const LIVE_MAX_AGE = 15 * 60 * 1000
