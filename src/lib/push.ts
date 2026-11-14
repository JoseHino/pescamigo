import { supabase } from './supabase'

// Clave pública de las notificaciones push (la privada solo la tiene el servidor).
const VAPID_PUBLIC = 'BH6fdGzL1Od9lrqcFvCtvl_CB1pUFhWm5tma8qB_EouC6AU-370_PSQNzC2-WMaZkaK8AXRt_BoyvKaalzkyevo'

export type PushState = 'unsupported' | 'denied' | 'on' | 'off'

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function keyToBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  const reg = await navigator.serviceWorker.register('./sw.js')
  await navigator.serviceWorker.ready
  return reg
}

async function save(sub: PushSubscription) {
  const j = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: j.keys?.p256dh ?? '',
    p_auth: j.keys?.auth ?? '',
  })
  return !error
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    return (await reg?.pushManager.getSubscription()) ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

/** Pide permiso y da de alta este dispositivo para recibir avisos. Devuelve un mensaje de error o null. */
export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) {
    return 'Este navegador no admite avisos. En iPhone, añade Pescamigo a la pantalla de inicio y ábrelo desde ahí.'
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'Los avisos están bloqueados. Actívalos en los ajustes del navegador para pescamigo.es.'
  try {
    const reg = await registration()
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC) }))
    return (await save(sub)) ? null : 'No se ha podido activar. Inténtalo de nuevo.'
  } catch {
    return 'No se han podido activar los avisos en este dispositivo.'
  }
}

/** Da de baja este dispositivo (al desactivar o al cerrar sesión). */
export async function disablePush() {
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
    await sub.unsubscribe()
  } catch {
    /* sin conexión: el servidor la descartará cuando deje de responder */
  }
}

/** Al iniciar sesión: si el dispositivo ya tenía avisos, pasan a la cuenta que ha entrado. */
export async function syncPush() {
  if ((await pushState()) !== 'on') return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await save(sub)
  } catch {
    /* no es imprescindible */
  }
}
