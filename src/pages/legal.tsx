import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CalendarX, CreditCard, HandCoins, LifeBuoy, ShieldCheck, Star, Users } from 'lucide-react'
import { Header } from '../components/ui'
import { useAppState } from '../data/store'

const fmtPct = (n: number) => String(n).replace('.', ',')

/** Recuadro corto de la garantía, para la ficha de la salida y el formulario de solicitud. */
export function Guarantee({ card }: { card: boolean }) {
  const s = useAppState()
  const h = s.settings.refundCutoffHours
  const items = [
    { icon: Users, text: 'Patrones conocidos: solo trabajamos con pescadores de la zona que ya conocemos.' },
    card
      ? { icon: ShieldCheck, text: 'Si la salida no se hace, por mal tiempo o por lo que sea, te devolvemos el 100 %.' }
      : { icon: ShieldCheck, text: 'Pagas al patrón el día de la salida: si no se sale, no pagas nada.' },
    ...(card ? [{ icon: CalendarX, text: `Cancela gratis hasta ${h} horas antes de salir.` }] : []),
  ]
  return (
    <div className="rounded-2xl border border-sea/20 bg-sea-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-sea-dark"><BadgeCheck size={17} /> Garantía Pescamigo</p>
      <ul className="mt-2.5 space-y-2">
        {items.map((x) => (
          <li key={x.text} className="flex items-start gap-2 text-[13px] leading-snug text-ink">
            <x.icon size={15} className="mt-0.5 shrink-0 text-sea" /> <span>{x.text}</span>
          </li>
        ))}
      </ul>
      <Link to="/condiciones" className="mt-3 inline-block text-[13px] font-semibold text-sea">Ver condiciones y garantía</Link>
    </div>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="flex items-center gap-2.5 text-base font-bold"><span className="text-sea">{icon}</span> {title}</h2>
      <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{children}</div>
    </section>
  )
}

/** Condiciones de uso y garantía, en lenguaje claro. Pública: se puede leer sin cuenta. */
export function Terms() {
  const s = useAppState()
  const pct = s.settings.commissionPct
  const h = s.settings.refundCutoffHours
  return (
    <div className="flex h-full flex-col bg-foam">
      <Header title="Condiciones y garantía" back />
      <div className="col flex-1 space-y-4 overflow-y-auto p-4 pb-10 lg:py-6">
        <div className="px-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Así funciona Pescamigo</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Pescamigo pone en contacto a patrones que salen a pescar con su barco y a pescadores que quieren acompañarles.
            Son salidas privadas en las que se comparten los gastos (combustible, cebo, mantenimiento…): ni el patrón ni el
            pescador ganan dinero con ellas. No es un servicio profesional de alquiler de barcos.
          </p>
        </div>

        <Section icon={<Users size={19} />} title="Nuestra garantía: gente de confianza">
          <p>
            Solo trabajamos con pescadores que ya conocemos: patrones de la zona, con experiencia en el mar, que disfrutan
            conociendo a gente nueva con su misma pasión. Antes de que un barco aparezca en Pescamigo, hablamos con su patrón.
          </p>
          <ul>
            <li>Solo pueden valorar un barco quienes han salido en él con una reserva confirmada.</li>
            <li>Las marcas Patrón habitual y Superpatrón se ganan con salidas reales hechas con pescadores a bordo.</li>
          </ul>
        </Section>

        <Section icon={<CalendarX size={19} />} title="Cómo se reserva">
          <ul>
            <li>Eliges una salida y pides plaza. Pedir plaza es gratis.</li>
            <li>El patrón acepta o rechaza tu solicitud. Te avisamos por correo y en la app.</li>
            <li>Si el barco cobra con tarjeta, cuando el patrón acepta tienes hasta 24 horas para pagar (nunca más tarde de una hora antes de salir). Si no pagas, la plaza se libera y no se te cobra nada.</li>
            <li>Con la plaza confirmada se abre un chat con el patrón para organizar la salida.</li>
          </ul>
        </Section>

        <Section icon={<HandCoins size={19} />} title="Precio y gestión de la plataforma">
          <p>
            El precio por plaza que ves es lo que pagas: no hay gastos añadidos. De ese importe, el {fmtPct(100 - pct)} % es para el patrón,
            como reparto de los gastos de la salida, y el {fmtPct(pct)} % es para Pescamigo por la gestión de la plataforma: la app,
            el pago seguro, la garantía de devolución y la atención. Pescamigo es la única parte que cobra por su trabajo.
          </p>
          <p className="text-ink-soft">
            Ejemplo: en una plaza de 30 €, el patrón recibe {(30 * (100 - pct) / 100).toFixed(2).replace('.', ',')} € y Pescamigo {(30 * pct / 100).toFixed(2).replace('.', ',')} €.
          </p>
          <p className="text-ink-soft">
            En los barcos que todavía no cobran con tarjeta, el reparto de gastos se paga en efectivo al patrón el día de la salida y Pescamigo no cobra nada.
          </p>
        </Section>

        <Section icon={<CreditCard size={19} />} title="Tu dinero está protegido">
          <ul>
            <li>Pagas con tarjeta a través de Stripe, una plataforma de pagos segura. Pescamigo no ve ni guarda los datos de tu tarjeta.</li>
            <li>Guardamos tu pago hasta que la salida se hace. Solo entonces pagamos al patrón.</li>
          </ul>
        </Section>

        <Section icon={<ShieldCheck size={19} />} title="Garantía de devolución">
          <ul>
            <li><b>Si la salida no se hace</b> —por mal tiempo, por el estado del mar, por una avería o por cualquier otro motivo— y el patrón la cancela, <b>te devolvemos el 100 %</b> automáticamente.</li>
            <li><b>Si cancelas tú con al menos {h} horas</b> de antelación, te devolvemos el 100 %.</li>
            <li>Si cancelas con menos de {h} horas, el importe no se devuelve, porque el patrón ya contaba con tu plaza. Si después la salida se cancela, sí se devuelve.</li>
            <li>Si el patrón rechaza tu solicitud o no llegas a pagar, no se te cobra nada.</li>
          </ul>
          <p className="text-ink-soft">Hacemos la devolución en el momento. Según tu banco, la verás en la tarjeta en 5 a 10 días hábiles.</p>
        </Section>

        <Section icon={<LifeBuoy size={19} />} title="A bordo">
          <ul>
            <li>El patrón es responsable de su barco: documentación, seguro, titulación y medidas de seguridad. A bordo se siguen sus indicaciones.</li>
            <li>Cada pescador lleva la licencia de pesca recreativa que le corresponda y respeta las tallas, los cupos y las zonas de pesca.</li>
            <li>El patrón puede cancelar o acortar una salida si las condiciones del mar no son seguras. Tu seguridad va primero.</li>
          </ul>
        </Section>

        <Section icon={<Star size={19} />} title="Para patrones">
          <ul>
            <li>Recibes el {fmtPct(100 - pct)} % del precio de cada plaza en tu cuenta bancaria después de cada salida, como reparto de los gastos. Pon un precio que cubra tus gastos, no una tarifa con beneficio.</li>
            <li>Para cobrar con tarjeta, completa tu cuenta de cobro desde tu perfil. Es un alta segura con Stripe que se hace una sola vez.</li>
            <li>Si cancelas una salida, devolvemos el dinero a los pescadores y esa salida no se cobra.</li>
          </ul>
        </Section>

        <p className="px-1 text-xs text-ink-soft">Última actualización: 16 de noviembre de 2026.</p>
      </div>
    </div>
  )
}
