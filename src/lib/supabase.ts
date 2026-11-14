import { createClient } from '@supabase/supabase-js'

// La URL y la clave pública son las que usa cualquier navegador: lo que protege los datos
// son las reglas de seguridad de la base de datos, no ocultar estos valores.
export const SUPABASE_URL = 'https://ebiocjvcqptaoesmwmhb.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_kTredqiYAP3TSHe8nIFrdA_W_p0Z1dq'

// Ponlo a true cuando el acceso con Google esté configurado en Supabase (Authentication > Providers).
export const GOOGLE_ENABLED = false

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
