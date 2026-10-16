# Bitácora 026 - 16/10/2026

## Responsivo: ajustes tras la primera prueba en un celular real (Samsung Galaxy A55)

---

## Cómo se probó
El computador y el celular estaban en la misma red (punto de acceso del celular). Se arrancó `npm run dev:lan` y se abrió en el celular `http://<IP del equipo>:5173/multiplicacion/?demo=1`. Como el login de Google no funciona por IP, se añadió un **modo demostración solo para desarrollo**.

- `src/devDemo.ts`: con `?demo=1` guarda una sesión ficticia en `localStorage` (se importa primero en `main.ts`). Está dentro de `if (import.meta.env.DEV)`: verificado que `npm run build` **no** lo incluye. Sin backend, no se guardan sesiones ni disparos.
- `npm run dev:lan` = `vite --host --no-open`.
- Nota: la recarga automática de Vite se pierde si el celular apaga la pantalla o deja la pestaña en segundo plano; hay que recargar a mano.

## Lo que se vio en el A55 (gama media)
Funciona: carga, se juega, suena el disparo, no hace zoom al tocar y va fluido. Observaciones: (1) la barra del navegador reduce el área del juego a ~60 % de la pantalla; (2) las tarjetas a 1,6× saturan el campo y se solapan; (3) los textos del HUD se ven algo borrosos.

## Ajustes
| Problema | Cambio |
|----------|--------|
| Poco espacio | **Pantalla completa** (`src/ui/fullscreen.ts`): botón ⛶ visible (esquina superior izquierda, solo en táctiles que admiten la API) y primer toque en la página (una sola vez); pide `documentElement` para que el HTML superpuesto siga visible y bloquea la orientación en horizontal si el navegador lo permite. En iPhone no existe la API: no hace nada |
| Saturación | `cardScale` máximo 1,6 → **1,35**; nuevo `maxCardsFactor` en `layout.ts`: máximo de tarjetas simultáneas = 20 × factor (**12** a ≈ 0,49×; 20 en escritorio). `CardSpawner.getMaxCards()` |
| Borrosidad | `setResolution(escala)` en el texto de tarjetas, pregunta, puntaje y temporizador: se dibujan a mayor resolución en vez de agrandar la textura |

`layout.ts` suma `isTouchDevice()` (`matchMedia('(pointer: coarse)')`), la única detección de dispositivo del código.

## Pruebas
- Vitest 158/158: `fullscreen.test.ts` (11: táctil/ratón/sin soporte, una sola vez, rechazo del navegador, fallo del bloqueo, botón que se muestra/oculta con `fullscreenchange`, desactivación) y `layout.test.ts` actualizado.
- E2E 175/175 (+2: máximo de tarjetas 12/20 y resolución del texto de las tarjetas). Instantáneas sin cambios.

## Pendiente / límites
- **Pantalla completa sin confirmar en el celular**: tras el primer ajuste la barra del navegador seguía visible; se añadió el botón ⛶ como vía directa. Falta que se pruebe.
- **La pantalla completa no llena el ancho**: el juego es 3:2 y el A55 ≈ 20:9, así que el canvas se ajusta al alto y quedan franjas laterales. Llenarlo exigiría que el mundo se ensanche según la proporción de cada pantalla (HUD y generación de tarjetas según el ancho real): cambio de diseño no decidido.
- El temporizador a veces queda tapado por tarjetas que pasan por detrás de la caja de la pregunta (ya ocurría en escritorio; a esta escala se nota más).
- Sin revisar: el aviso de rotación en un celular real (Cypress no emula `pointer: coarse`).

## Próximo paso
Fase 3 (pantallas secundarias): resumen y confirmación de reinicio, filtros HTML de Estadísticas anclados al canvas, panel admin solo escritorio (defecto 2), aviso de navegador incrustado para el login.
