import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MessageCircle, SendHorizontal } from 'lucide-react'
import { Empty, ErrorMsg, Header, SocialLinks } from '../components/ui'
import { NotFound } from './explore'
import { isUnread, loadMessages, markConversationRead, sendMessage, useAppState, useMe } from '../data/store'
import { ago, clock, dayLabel } from '../lib/format'
import type { Conversation, State } from '../types'

function context(s: State, c: Conversation, meId: string) {
  const booking = s.bookings.find((b) => b.id === c.bookingId)
  const outing = booking ? s.outings.find((o) => o.id === booking.outingId) : undefined
  const boat = outing ? s.boats.find((b) => b.id === outing.boatId) : undefined
  const otherId = meId === c.ownerId ? c.fisherId : c.ownerId
  const other = s.users.find((u) => u.id === otherId)
  return { booking, outing, boat, other }
}

export function Inbox() {
  const s = useAppState()
  const me = useMe()
  if (!me) return null
  const list = [...s.conversations].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
  return (
    <div className="flex h-full flex-col">
      <Header title="Mensajes" />
      <div className="col flex-1 overflow-y-auto lg:py-6">
        {list.length === 0 ? (
          <Empty
            icon={<MessageCircle size={24} />}
            title="Sin conversaciones"
            text={me.role === 'owner'
              ? 'Cuando aceptes una solicitud se abrirá un chat con ese pescador.'
              : 'Cuando un patrón confirme tu reserva se abrirá un chat con él.'}
          />
        ) : (
          <ul className="divide-y divide-line bg-white lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line">
            {list.map((c) => {
              const { outing, boat, other } = context(s, c, me.id)
              const unread = isUnread(c, me.id)
              return (
                <li key={c.id}>
                  <Link to={`/chat/${c.id}`} className="flex gap-3 px-4 py-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">
                      {(other?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={`truncate text-sm ${unread ? 'font-bold' : 'font-semibold'}`}>{other?.name ?? 'Usuario'}</span>
                        <span className="shrink-0 text-xs text-ink-soft">{ago(c.lastMessageAt)}</span>
                      </span>
                      <span className="block truncate text-xs text-ink-soft">
                        {boat?.name ?? 'Salida'}{outing ? ` · ${dayLabel(outing.date)} ${outing.start}` : ''}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${unread ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{c.lastMessage}</span>
                        {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-buoy" aria-label="Sin leer" />}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export function Chat() {
  const { id } = useParams()
  const s = useAppState()
  const me = useMe()
  const c = s.conversations.find((x) => x.id === id)
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const messages = (id && s.messages[id]) || []

  // Mensajes nuevos cada 4 segundos mientras el chat está abierto.
  useEffect(() => {
    if (!id) return
    void loadMessages(id)
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages(id)
    }, 4000)
    return () => clearInterval(t)
  }, [id])

  useEffect(() => {
    if (id) markConversationRead(id)
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [id, messages.length, c?.lastMessageAt])

  if (!c || !me) return <NotFound what="No encontramos esta conversación." />
  const { booking, outing, boat, other } = context(s, c, me.id)
  const open = booking?.status === 'confirmed'

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy || !text.trim()) return
    setBusy(true)
    setErr(null)
    const error = await sendMessage(c.id, text)
    setBusy(false)
    if (error) return setErr(error)
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Intro envía en el ordenador; Mayús+Intro hace salto de línea.
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 1024px)').matches) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title={other?.name ?? 'Conversación'}
        sub={boat ? `${boat.name}${outing ? ` · ${dayLabel(outing.date)} ${outing.start}` : ''}` : undefined}
        back
        right={outing ? <Link to={`/salida/${outing.id}`} className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-sea">Ver salida</Link> : undefined}
      />
      {other?.role === 'fisher' && other.links.length > 0 && (
        <div className="shrink-0 border-b border-line bg-white px-4 py-2 lg:px-6">
          <SocialLinks links={other.links} />
        </div>
      )}
      <div className="col flex-1 space-y-2.5 overflow-y-auto bg-foam px-3 py-4">
        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <div key={m.id} className="mx-auto max-w-md rounded-2xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft">
                <p className="wrap-anywhere whitespace-pre-line">{m.body}</p>
                <p className="mt-1 text-right text-[11px]">{clock(m.createdAt)}</p>
              </div>
            )
          }
          const mine = m.senderId === me.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug sm:max-w-[70%] ${mine ? 'rounded-br-md bg-sea text-white' : 'rounded-bl-md bg-white text-ink ring-1 ring-line'}`}>
                <p className="wrap-anywhere whitespace-pre-line">{m.body}</p>
                <p className={`mt-0.5 text-right text-[11px] ${mine ? 'text-white/75' : 'text-ink-soft'}`}>{clock(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      <div className="col border-t border-line bg-white p-3">
        {open ? (
          <form onSubmit={submit} className="space-y-2">
            <ErrorMsg>{err}</ErrorMsg>
            <div className="flex items-end gap-2">
              <textarea
                className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/20"
                rows={1}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKey}
                placeholder="Escribe un mensaje"
                aria-label="Mensaje"
              />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sea text-white disabled:opacity-40">
                <SendHorizontal size={19} />
              </button>
            </div>
          </form>
        ) : (
          <p className="px-1 py-2 text-center text-[13px] text-ink-soft">
            Esta reserva ya no está activa. La conversación queda guardada solo para consulta.
          </p>
        )}
      </div>
    </div>
  )
}
