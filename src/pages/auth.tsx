import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Anchor, Fish } from 'lucide-react'
import { Button, ErrorMsg, Field, Header, inputCls } from '../components/ui'
import { NEEDS_CODE, confirmPasswordReset, requestPasswordReset, resendCode, setRole, signIn, signInGoogle, signUp, verifyEmail } from '../data/store'
import { GOOGLE_ENABLED } from '../lib/supabase'
import type { Role } from '../types'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export function Welcome() {
  const nav = useNavigate()
  return (
    <div className="flex h-full flex-col bg-ink text-white lg:flex-row">
      <div className="relative flex flex-1 flex-col justify-end overflow-hidden px-6 pb-8 lg:px-16 lg:pb-20">
        {/* Foto de portada (barco saliendo a pescar) con degradado para que el texto se lea */}
        <img src="./bienvenida.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/10 to-ink/90" aria-hidden="true" />
        <img
          src="./logo-512.png"
          alt="Pescamigo"
          className="absolute inset-x-0 top-[6%] mx-auto w-[34%] max-w-[150px] rounded-[22%] shadow-2xl lg:inset-x-auto lg:right-12 lg:top-12 lg:mx-0 lg:w-[140px] lg:max-w-none"
        />
        <div className="relative lg:max-w-xl">
          <h1 className="text-[34px] font-extrabold leading-[1.08] tracking-tight lg:text-[52px]">
            Hay un barco que sale a pescar <span className="text-buoy">y le sobra sitio.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75 lg:text-lg">
            Los propietarios publican sus salidas. Los pescadores sin barco reciben el aviso, reservan plaza y comparten gastos a bordo.
          </p>
        </div>
      </div>
      <div className="space-y-3 rounded-t-3xl bg-foam px-6 pb-8 pt-6 text-ink lg:flex lg:w-[440px] lg:flex-col lg:justify-center lg:rounded-none lg:px-12">
        <div className="mb-3 hidden lg:block">
          <p className="text-2xl font-extrabold tracking-tight">Entra en Pescamigo</p>
          <p className="mt-1 text-sm text-ink-soft">Crea tu cuenta y elige si tienes barco o buscas plaza.</p>
        </div>
        <Button full onClick={() => nav('/acceso?modo=registro')}>Crear cuenta</Button>
        <Button full variant="outline" onClick={() => nav('/acceso')}>Ya tengo cuenta</Button>
      </div>
    </div>
  )
}

export function Auth() {
  const [q] = useSearchParams()
  const register = q.get('modo') === 'registro'
  const [f, setF] = useState({ name: '', username: '', email: '', password: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [codeStep, setCodeStep] = useState(false)
  const [code, setCode] = useState('')
  const [info, setInfo] = useState<string | null>(null)
  // Cambio de contraseña: 'email' pide el correo, 'code' pide el código y la contraseña nueva.
  const [reset, setReset] = useState<null | 'email' | 'code'>(null)
  const [newPass, setNewPass] = useState('')
  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    const error = register ? await signUp(f) : await signIn(f.email, f.password)
    setBusy(false)
    if (error === NEEDS_CODE) {
      setCode('')
      setInfo(null)
      return setCodeStep(true)
    }
    // Si todo va bien no hay que navegar: al iniciarse la sesión la app pasa sola a la pantalla siguiente.
    setErr(error)
  }
  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    setErr(await verifyEmail(f.email, code, f.password))
    setBusy(false)
  }
  const resend = async () => {
    setErr(null)
    setInfo(null)
    const error = await resendCode(f.email)
    if (error) setErr(error)
    else setInfo('Te hemos enviado un código nuevo.')
  }
  const google = async () => setErr(await signInGoogle())

  const startReset = () => {
    setErr(null)
    setInfo(null)
    setCode('')
    setNewPass('')
    setReset('email')
  }
  const sendReset = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    const error = await requestPasswordReset(f.email)
    setBusy(false)
    if (error) return setErr(error)
    if (reset === 'code') setInfo('Te hemos enviado un código nuevo.')
    setReset('code')
  }
  const finishReset = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    setInfo(null)
    const error = await confirmPasswordReset(f.email, code, newPass)
    setBusy(false)
    // Si va bien, la sesión se inicia y la app pasa sola a la pantalla siguiente.
    setErr(error === NEEDS_CODE ? null : error)
  }

  if (reset) {
    return (
      <div className="flex h-full flex-col bg-foam">
        <Header title="Cambiar la contraseña" />
        {reset === 'email' ? (
          <form onSubmit={sendReset} className="col-narrow flex-1 space-y-4 overflow-y-auto px-5 py-6 lg:py-12">
            <p className="text-sm leading-relaxed">Escribe el correo con el que te registraste y te enviaremos un código para poner una contraseña nueva.</p>
            <Field label="Correo electrónico">
              <input className={inputCls} value={f.email} onChange={on('email')} type="email" autoCapitalize="none" autoComplete="email" autoFocus />
            </Field>
            <ErrorMsg>{err}</ErrorMsg>
            <Button full type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar código'}</Button>
            <button type="button" onClick={() => { setReset(null); setErr(null) }} className="w-full py-2 text-sm font-semibold text-ink-soft">Volver a iniciar sesión</button>
          </form>
        ) : (
          <form onSubmit={finishReset} className="col-narrow flex-1 space-y-4 overflow-y-auto px-5 py-6 lg:py-12">
            <p className="text-sm leading-relaxed">
              Si hay una cuenta con <b className="break-all">{f.email.trim().toLowerCase()}</b>, te hemos enviado un código de 6 cifras.
            </p>
            <Field label="Código" hint="Si no lo ves en unos minutos, mira en la carpeta de correo no deseado.">
              <input
                className={`${inputCls} tnum text-center text-2xl font-bold tracking-[0.4em]`}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(null) }}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
              />
            </Field>
            <Field label="Contraseña nueva" hint="Mínimo 8 caracteres.">
              <input className={inputCls} value={newPass} onChange={(e) => setNewPass(e.target.value)} type="password" autoComplete="new-password" />
            </Field>
            <ErrorMsg>{err}</ErrorMsg>
            {info && <p role="status" className="rounded-xl bg-ok-50 px-3.5 py-2.5 text-[13px] font-medium text-ok">{info}</p>}
            <Button full type="submit" disabled={busy || code.length !== 6 || newPass.length < 8}>{busy ? 'Guardando…' : 'Cambiar la contraseña'}</Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => sendReset()} className="font-semibold text-sea">Enviar otro código</button>
              <button type="button" onClick={() => { setReset('email'); setErr(null); setInfo(null) }} className="font-semibold text-ink-soft">Cambiar el correo</button>
            </div>
          </form>
        )}
      </div>
    )
  }

  if (codeStep) {
    return (
      <div className="flex h-full flex-col bg-foam">
        <Header title="Verifica tu correo" />
        <form onSubmit={verify} className="col-narrow flex-1 space-y-4 overflow-y-auto px-5 py-6 lg:py-12">
          <p className="text-sm leading-relaxed">
            Hemos enviado un código de 6 cifras a <b className="break-all">{f.email.trim().toLowerCase()}</b>. Escríbelo aquí para terminar.
          </p>
          <Field label="Código de verificación" hint="Si no lo ves en unos minutos, mira en la carpeta de correo no deseado.">
            <input
              className={`${inputCls} tnum text-center text-2xl font-bold tracking-[0.4em]`}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(null) }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
            />
          </Field>
          <ErrorMsg>{err}</ErrorMsg>
          {info && <p role="status" className="rounded-xl bg-ok-50 px-3.5 py-2.5 text-[13px] font-medium text-ok">{info}</p>}
          <Button full type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verificando…' : 'Verificar correo'}</Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={resend} className="font-semibold text-sea">Enviar otro código</button>
            <button type="button" onClick={() => { setCodeStep(false); setErr(null) }} className="font-semibold text-ink-soft">Cambiar el correo</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-foam">
      <Header title={register ? 'Crear cuenta' : 'Iniciar sesión'} back />
      <div className="col-narrow flex-1 overflow-y-auto px-5 py-6 lg:py-12">
        {GOOGLE_ENABLED && (
          <>
            <button onClick={google} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white py-3 text-[15px] font-semibold hover:bg-foam">
              <GoogleMark /> Continuar con Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold text-ink-soft">
              <span className="h-px flex-1 bg-line" /> o con tu correo <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-4">
          {register && (
            <>
              <Field label="Tu nombre" hint="Es lo que verán los demás en salidas, chats y valoraciones. Tu correo no se muestra a nadie.">
                <input className={inputCls} maxLength={80} value={f.name} onChange={on('name')} autoComplete="name" />
              </Field>
              <Field label="Nombre de usuario" hint="Entre 3 y 20 letras, números, puntos o guiones.">
                <input className={inputCls} value={f.username} onChange={on('username')} autoCapitalize="none" autoComplete="username" />
              </Field>
            </>
          )}
          <Field label="Correo electrónico">
            <input className={inputCls} value={f.email} onChange={on('email')} type="email" autoCapitalize="none" autoComplete="email" />
          </Field>
          <Field label="Contraseña" hint={register ? 'Mínimo 8 caracteres.' : undefined}>
            <input className={inputCls} value={f.password} onChange={on('password')} type="password" autoComplete={register ? 'new-password' : 'current-password'} />
          </Field>
          <ErrorMsg>{err}</ErrorMsg>
          {register && (
            <p className="text-xs text-ink-soft">
              Al crear la cuenta aceptas las <Link to="/condiciones" className="font-semibold text-sea underline">condiciones y la garantía</Link> de Pescamigo.
            </p>
          )}
          <Button full type="submit" disabled={busy}>
            {busy ? (register ? 'Creando cuenta…' : 'Entrando…') : register ? 'Crear cuenta' : 'Iniciar sesión'}
          </Button>
          {!register && (
            <button type="button" onClick={startReset} className="w-full py-1 text-sm font-semibold text-sea">
              He olvidado mi contraseña
            </button>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-ink-soft">
          {register ? '¿Ya tienes cuenta? ' : '¿Aún no tienes cuenta? '}
          <Link replace to={register ? '/acceso' : '/acceso?modo=registro'} className="font-semibold text-sea">
            {register ? 'Inicia sesión' : 'Crear cuenta'}
          </Link>
        </p>
      </div>
    </div>
  )
}

export function RoleSetup() {
  const [role, setR] = useState<Role | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const options: { id: Role; icon: typeof Fish; title: string; text: string }[] = [
    { id: 'fisher', icon: Fish, title: 'Quiero salir a pescar', text: 'No tengo barco. Recibo avisos de salidas cerca y reservo plaza.' },
    { id: 'owner', icon: Anchor, title: 'Tengo barco', text: 'Publico mis salidas con fecha y horario y comparto gastos con quien venga.' },
  ]
  return (
    <div className="col-narrow flex h-full flex-col bg-foam px-5 py-8 lg:py-16">
      <h1 className="text-2xl font-extrabold tracking-tight">¿Cómo vas a usar Pescamigo?</h1>
      <p className="mt-2 text-sm text-ink-soft">Elige uno. Define lo que ves en la app.</p>
      <div className="mt-6 flex-1 space-y-3">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setR(o.id)}
            aria-pressed={role === o.id}
            className={`flex w-full items-start gap-4 rounded-2xl border-2 bg-white p-4 text-left transition ${role === o.id ? 'border-sea' : 'border-line'}`}
          >
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${role === o.id ? 'bg-sea text-white' : 'bg-sea-50 text-sea'}`}>
              <o.icon size={22} />
            </span>
            <span>
              <span className="block text-base font-bold">{o.title}</span>
              <span className="mt-0.5 block text-sm text-ink-soft">{o.text}</span>
            </span>
          </button>
        ))}
        <ErrorMsg>{err}</ErrorMsg>
      </div>
      <Button
        full
        disabled={!role || busy}
        onClick={async () => {
          if (!role) return
          setBusy(true)
          setErr(await setRole(role)) // al guardarse el rol, la app pasa sola a la pantalla siguiente
          setBusy(false)
        }}
      >
        Continuar
      </Button>
    </div>
  )
}
