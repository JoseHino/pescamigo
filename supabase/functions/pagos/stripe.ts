// Acceso mínimo a la API de Stripe (sin SDK) y a la clave, que vive en el secreto STRIPE_SECRET_KEY
// o, si no, en la tabla app_secrets (nombre 'stripe_secret_key').
import { createClient } from "jsr:@supabase/supabase-js@2";

export const SITE = "https://pescamigo.es/";
export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function secret(envName: string, tableName: string): Promise<string | null> {
  const env = Deno.env.get(envName);
  if (env) return env;
  const { data } = await admin.from("app_secrets").select("value").eq("name", tableName).maybeSingle();
  return data?.value || null;
}

function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe(key: string, method: "GET" | "POST", path: string, body?: Record<string, unknown>, idempotency?: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" };
  if (idempotency) headers["Idempotency-Key"] = idempotency;
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body: body ? form(body).toString() : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`);
  return data;
}

export const cents = (euros: number) => Math.round(Number(euros) * 100);
