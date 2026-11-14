# Pescamigo

App que conecta propietarios de barco que salen a pescar con pescadores sin barco. Publicada en https://pescamigo.es

## Cómo funciona

- **App**: Vite + React + TypeScript + Tailwind, mapa con Leaflet. Código en `src/`. Se adapta a móvil y ordenador.
- **Servidor**: proyecto `pescamigo` de Supabase (`ebiocjvcqptaoesmwmhb`): cuentas, barcos, salidas, reservas, chat, avisos y fotos.
- **Correo**: Resend con el dominio `pescamigo.es` (secreto `RESEND_API_KEY` en Supabase).
- **Publicación**: `main` tiene el código; la rama `gh-pages` tiene la app compilada (`npm run build` y subir `dist`).

## Ver quién se ha registrado

Supabase → proyecto pescamigo → Table Editor → tabla `profiles`: correo, nombre de usuario, nombre, rol y fecha de alta. Se puede exportar a CSV. Las contraseñas las guarda Supabase cifradas y nadie puede verlas.

## Reservas

1. El pescador solicita plaza (puede dejar un mensaje). Queda **pendiente de confirmación** y no ocupa plaza.
2. El patrón la **acepta** o la **rechaza** (con motivo opcional) desde el panel o desde la salida.
3. Al aceptar se comprueba que quedan plazas, con bloqueo en la base de datos: dos aceptaciones simultáneas no pueden pasarse de la capacidad.
   - Sin pagos en la app: pasa a **confirmada** y el reparto se paga en efectivo.
   - Con pagos en la app: pasa a **aceptada, pendiente de pago** (el cobro aún no está construido, ver abajo).
4. Si la salida se llena, las demás solicitudes pendientes se rechazan solas con aviso.
5. Cualquiera de los dos puede cancelar; se avisa al otro.

Estados: `pending`, `accepted`, `confirmed`, `rejected`, `cancelled`.

## Chat

Se abre solo al confirmarse una reserva, con un mensaje automático (barco, fecha, hora, puerto, plazas y reparto). Si la reserva se cancela, la conversación queda guardada solo para consulta.

## Calendario y salidas habituales

- Salidas de **una fecha** o **habituales** (días de la semana, horario, plazas, puerto, hasta una fecha opcional).
- Las fechas habituales se generan dentro del periodo de reserva del barco y cada noche (03:15 UTC, `pg_cron`) se añaden las nuevas.
- Cada fecha se puede cambiar o cancelar sin tocar las demás; una fecha cancelada no vuelve a aparecer.
- **Días bloqueados**: cancelan las salidas de ese día (avisando a quien tenía plaza) y no se publica nada en ellos.
- **Antelación** por barco: desde cuántos días antes se puede pedir plaza y cuántas horas antes se cierran las reservas.

## Avisos

Cada aviso se guarda en la app y, según el caso, se envía por correo y por notificación push (función `notify`). Cada canal se marca al enviarse, así que un aviso nunca sale dos veces.

| Evento | Quién | App | Correo | Push |
|---|---|---|---|---|
| Nueva solicitud | patrón | sí | sí | sí |
| Aceptada / rechazada / salida completa | pescador | sí | sí | sí |
| Cambio de horario, salida cancelada | pescador | sí | sí | sí |
| Reserva cancelada por el pescador | patrón | sí | sí | sí |
| Solicitud retirada | patrón | sí | no | sí |
| Salida nueva o habitual que encaja | pescador | sí | no | sí |
| Mensaje de chat | el otro | insignia | no | sí |

El push funciona en Android y ordenador; en iPhone solo con la app añadida a la pantalla de inicio (iOS 16.4 o posterior). Cada usuario puede desactivar el correo y activar el push en su perfil.

## Privacidad

- El correo de un usuario no lo puede leer ningún otro: la columna `email` no tiene permiso de lectura para la app y cada uno ve el suyo solo con `my_profile()`.
- Barcos, salidas, chats y valoraciones muestran solo el nombre público.
- Reservas, chats, calendarios internos y dispositivos solo los ven sus participantes (políticas RLS en cada tabla).
- Reservas, chat y calendario solo se modifican con funciones del servidor que comprueban permisos y plazas.
- Las claves internas (avisos y push) están en `app_secrets`, sin acceso para usuarios.

## Pagos y comisión (preparado, sin cobro real)

- `app_settings.commission_pct` (20 %) y `app_settings.payments_enabled` (desactivado) se cambian en Supabase → Table Editor.
- Con los pagos desactivados el reparto es en efectivo y la comisión es 0.
- Cada reserva guarda su importe, el porcentaje y la comisión aplicados, lo que recibe el patrón y el estado del pago. La tabla `payments` está lista para registrar cada movimiento.
- **Falta**: integrar Stripe Connect (alta y verificación de cada patrón, cobro autorizado al solicitar y capturado al aceptar, devoluciones y webhook). Requiere cuenta de Stripe y revisión legal y fiscal antes de activar `payments_enabled`.

## Arrancar en el ordenador

```
npm install
npm run dev
```

## Pendiente

- Pagos con Stripe Connect (ver arriba).
- Acceso con Google (`GOOGLE_ENABLED` en `src/lib/supabase.ts`).
- Proveedor de mapas para producción, textos legales y empaquetado para las tiendas.
