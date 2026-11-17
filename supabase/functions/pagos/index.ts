import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SITE, admin, cents, secret, stripe } from "./stripe.ts";

// Pagos desde la app (con la sesión del usuario):
//   { action: 'checkout', booking_id } -> enlace de pago de Stripe para una reserva aceptada (pescador)
//   { action: 'onboard' }              -> enlace para que el patrón cree o complete su cuenta de cobro
//   { action: 'status' }               -> comprueba si la cuenta de cobro del patrón ya puede recibir pagos
//   { action: 'dashboard' }            -> enlace al panel de Stripe del patrón (sus cobros y su cuenta bancaria)
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (error: string, status = 400) => json({ error }, status);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Método no permitido", 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return fail("Inicia sesión de nuevo.", 401);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* cuerpo vacío */ }

  const { data: settings } = await admin.from("app_settings").select("payments_enabled").maybeSingle();
  const key = await secret("STRIPE_SECRET_KEY", "stripe_secret_key");
  if (!settings?.payments_enabled || !key) return fail("Los pagos con tarjeta todavía no están activados.", 503);
  const { data: me } = await admin.from("profiles").select("id, role, email, full_name, stripe_account_id").eq("id", user.id).maybeSingle();
  if (!me) return fail("No se ha encontrado tu perfil.", 404);

  try {
    if (body.action === "checkout") {
      const { data: bk } = await admin.from("bookings").select("*").eq("id", String(body.booking_id ?? "")).maybeSingle();
      if (!bk || bk.fisher_id !== me.id) return fail("No se ha encontrado la reserva.", 404);
      if (bk.payment_status === "paid") return fail("Esta reserva ya está pagada.");
      if (bk.status !== "accepted" || bk.payment_method !== "card") return fail("Esta reserva no está pendiente de pago.");
      const payBy = bk.pay_by ? new Date(bk.pay_by).getTime() : Date.now() + 86400000;
      if (payBy < Date.now()) return fail("Se ha pasado el plazo para pagar esta plaza.");
      const { data: o } = await admin.from("outings").select("day, start_time, boat_id").eq("id", bk.outing_id).single();
      const { data: boat } = await admin.from("boats").select("name").eq("id", o.boat_id).single();
      // Stripe pide que el enlace caduque entre 30 min y 24 h después de crearlo.
      const expires = Math.floor(Math.min(Math.max(payBy, Date.now() + 31 * 60000), Date.now() + 23.9 * 3600000) / 1000);
      const session = await stripe(key, "POST", "checkout/sessions", {
        mode: "payment",
        locale: "es",
        customer_email: me.email,
        client_reference_id: bk.id,
        metadata: { booking_id: bk.id },
        payment_intent_data: { transfer_group: bk.id, metadata: { booking_id: bk.id }, description: `Pescamigo · ${boat.name} · ${o.day}` },
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: cents(bk.amount_total),
            product_data: {
              name: `${bk.seats === 1 ? "Plaza" : `${bk.seats} plazas`} en ${boat.name}`,
              description: `Salida del ${o.day.split("-").reverse().join("/")} a las ${String(o.start_time).slice(0, 5)}. Si la salida no se hace, te devolvemos el 100 %.`,
            },
          },
        }],
        expires_at: expires,
        success_url: `${SITE}#/reservas?pago=ok`,
        cancel_url: `${SITE}#/reservas?pago=cancelado`,
      }, `checkout-${bk.id}-${expires}`);
      await admin.from("bookings").update({ stripe_session_id: session.id }).eq("id", bk.id);
      return json({ url: session.url });
    }

    if (body.action === "dashboard") {
      if (me.role !== "owner" || !me.stripe_account_id) return fail("Primero da de alta tu cuenta de cobro.", 403);
      const link = await stripe(key, "POST", `accounts/${me.stripe_account_id}/login_links`, {});
      return json({ url: link.url });
    }

    if (body.action === "onboard" || body.action === "status") {
      if (me.role !== "owner") return fail("Solo los patrones tienen cuenta de cobro.", 403);
      let account = me.stripe_account_id as string | null;
      if (!account) {
        if (body.action === "status") return json({ ready: false, connected: false });
        const acct = await stripe(key, "POST", "accounts", {
          type: "express",
          country: "ES",
          email: me.email,
          capabilities: { transfers: { requested: true } },
          business_profile: { product_description: "Salidas de pesca con gastos compartidos en Pescamigo" },
          metadata: { profile_id: me.id },
        }, `account-${me.id}`);
        account = acct.id as string;
        await admin.from("profiles").update({ stripe_account_id: account }).eq("id", me.id);
      }
      const acct = await stripe(key, "GET", `accounts/${account}`);
      const ready = !!acct.payouts_enabled && acct.capabilities?.transfers === "active";
      await admin.from("profiles").update({ stripe_ready: ready }).eq("id", me.id);
      if (body.action === "status") return json({ ready, connected: true, pending: (acct.requirements?.currently_due ?? []).length });
      const link = await stripe(key, "POST", "account_links", {
        account,
        type: "account_onboarding",
        refresh_url: `${SITE}#/perfil?cobros=reintentar`,
        return_url: `${SITE}#/perfil?cobros=vuelta`,
      });
      return json({ url: link.url, ready });
    }
    return fail("Acción no válida.");
  } catch (e) {
    console.error(e);
    return fail("No se ha podido conectar con el sistema de pagos. Inténtalo de nuevo en un momento.", 502);
  }
});
