# Pescamigo

App móvil que conecta propietarios de barco que salen a pescar con pescadores sin barco.

Publicada en https://josehino.github.io/pescamigo/

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
| Correo al registrarse | No se verifica con un mensaje de confirmación | función `signup` de Supabase |

## Pendiente

- Acceso con Google (`GOOGLE_ENABLED` en `src/lib/supabase.ts`): falta crear las credenciales en Google Cloud y activarlas en Supabase.
- Cobro de la comisión con tarjeta: falta una cuenta de Stripe.
- Avisos push con la app cerrada: hoy los avisos se ven dentro de la app.
- Recuperar contraseña olvidada y verificación del correo: necesitan un servicio de envío de correo.
- Dominio pescamigo.es, proveedor de mapas para producción, textos legales y empaquetado para las tiendas.
