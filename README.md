# Pescamigo

App móvil que conecta propietarios de barco que salen a pescar con pescadores sin barco.

Esta versión es una **demo funcional**: toda la app se puede recorrer, pero los datos viven en el propio dispositivo (no hay servidor, no se cobra nada y el acceso con Google está simulado).

## Arrancar

```
npm install
npm run dev
```

Cuentas de demostración (contraseña `demo1234`): `pescador.demo` y `patron.demo`. También hay dos botones en la portada para entrar sin escribir nada.

## Qué incluye

- Registro con correo, nombre de usuario y contraseña, o con Google (simulado). Elección de rol.
- Mapa con los barcos en su puerto base; al pulsar uno, ficha con fotos, comentarios y valoraciones.
- Propietario: ficha del barco, publicar salida con fecha y horario, calculadora de reparto de gastos, ver quién ha reservado, cancelar.
- Pescador: lista de salidas con filtros, reserva con cobro de la comisión con tarjeta (simulado), mis reservas, valorar con foto.
- Avisos: al publicarse una salida se avisa a los pescadores según sus puertos y tipos de pesca.

## Decisiones provisionales (cámbialas en un sitio)

| Decisión | Valor actual | Dónde |
|---|---|---|
| Comisión | 3 € por plaza, la paga el pescador | `src/lib/format.ts` (`SERVICE_FEE`) |
| Confirmación de reserva | Automática al pagar | `src/data/store.ts` (`book`) |
| Mapa | Puerto base, no posición en directo | `src/components/MapView.tsx` |
| Roles | Uno por cuenta | `src/main.tsx` |
| Valoraciones | Del pescador al barco, tras la salida | `src/data/store.ts` (`addReview`) |
| Seguro y titulación | Declarados por el propietario, sin comprobar | `src/pages/owner.tsx` |

## Pendiente para pasar a producción

- Backend real: `supabase/schema.sql` es un borrador sin ejecutar.
- Acceso con Google de verdad, cobro real de la comisión, avisos push con la app cerrada.
- Proveedor de mapas (las teselas públicas de OpenStreetMap solo valen para pruebas).
- Empaquetado para App Store y Google Play.
- Textos legales y respuesta a las dudas de seguro y responsabilidad.
