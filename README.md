# Pescamigo

App móvil que conecta propietarios de barco que salen a pescar con pescadores sin barco.

Publicada en https://pescamigo.es

## Cómo funciona

- **App**: Vite + React + TypeScript + Tailwind, mapa con Leaflet. Código en `src/`.
- **Servidor**: proyecto `pescamigo` de Supabase (`ebiocjvcqptaoesmwmhb`). Guarda cuentas, barcos, salidas, reservas, valoraciones, avisos y fotos.
- **Publicación**: `main` tiene el código; la rama `gh-pages` tiene la app compilada (`npm run build` y subir `dist`).

## Ver quién se ha registrado

Supabase → proyecto pescamigo → Table Editor → tabla `profiles`: correo, nombre de usuario, nombre, rol y fecha de alta. Se puede exportar a CSV desde ahí.

Las contraseñas no están en ninguna tabla legible: Supabase las guarda cifradas y nadie puede verlas, tampoco el administrador.

## Reglas que aplica el servidor

- El correo de un usuario no lo puede leer ningún otro usuario.
- Solo un propietario puede crear su barco y publicar salidas en él.
- Las reservas, cancelaciones y valoraciones pasan por funciones del servidor que comprueban plazas, fechas y permisos.
- Solo se puede valorar una salida ya terminada en la que se tuvo plaza.

## Arrancar en el ordenador

```
npm install
npm run dev
```

## Decisiones provisionales

| Decisión | Valor actual | Dónde |
|---|---|---|
| Comisión | 0 € (no hay pasarela de pago conectada) | `src/lib/format.ts` (`SERVICE_FEE`) y función `book_outing` |
| Confirmación de reserva | Automática | función `book_outing` |
| Mapa | Puerto base, no posición en directo | `src/components/MapView.tsx` |
| Roles | Uno por cuenta | `src/main.tsx` |
| Seguro y titulación | Declarados por el propietario, sin comprobar | `src/pages/owner.tsx` |
| Correo al registrarse | Se verifica con un código de 6 cifras **cuando haya servicio de envío** (ver abajo); mientras tanto la cuenta se confirma sola | función `signup` de Supabase |

## Pendiente

- Acceso con Google (`GOOGLE_ENABLED` en `src/lib/supabase.ts`): falta crear las credenciales en Google Cloud y activarlas en Supabase.
- Cobro de la comisión con tarjeta: falta una cuenta de Stripe.
- Avisos push con la app cerrada: hoy los avisos se ven dentro de la app.
- Dominio pescamigo.es, proveedor de mapas para producción, textos legales y empaquetado para las tiendas.

## Verificación del correo y cambio de contraseña

Activos desde el 14/11/2026 con Resend (dominio pescamigo.es verificado; secreto `RESEND_API_KEY` en Supabase). Al registrarse se pide un código de 6 cifras enviado al correo; en "Iniciar sesión" hay "He olvidado mi contraseña", que manda otro código para poner una contraseña nueva. Códigos: 15 minutos, 5 intentos, un reenvío por minuto.

### Cómo se configuró

La app y el servidor ya están preparados. Solo falta el servicio que envía los mensajes (Resend):

1. Crear una cuenta en resend.com y añadir el dominio `pescamigo.es`.
2. Poner en el DNS de Hostinger los registros que indique Resend y esperar a que el dominio salga como verificado.
3. Crear una clave de API en Resend y guardarla en Supabase → Edge Functions → Secrets con el nombre `RESEND_API_KEY`.

Desde ese momento, cada cuenta nueva recibe un código de 6 cifras (caduca en 15 minutos, 5 intentos) y no puede entrar hasta escribirlo. Las cuentas creadas antes siguen funcionando. El remitente es `Pescamigo <no-reply@pescamigo.es>`; se cambia con el secreto `MAIL_FROM`.
