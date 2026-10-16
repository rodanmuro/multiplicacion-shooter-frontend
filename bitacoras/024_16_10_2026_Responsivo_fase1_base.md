# Bitácora 024 - 16/10/2026

## Responsivo, fase 1: base (escalado, CSS táctil, aviso de rotación, botón de Google, menú compacto)

---

## Decisiones tomadas (usuario, 16/10/2026)
- **Orientación: solo horizontal.** El mundo sigue siendo 1200×800 (3:2); en vertical se pide girar el celular.
- **CI:** las pruebas se siguen corriendo solo en local; sin GitHub Actions por ahora.

## Resumen
Primera fase del plan responsivo (bitácora 012, sección 1). El canvas se ajusta al espacio disponible sin deformarse, la página deja de desplazarse o hacer zoom con el dedo, el login coloca el botón de Google sobre el botón dibujado aunque el canvas esté escalado, y el menú de usuario se reduce a un icono en pantallas bajas.

**Estado:** ✅ Completada. E2E 166/166 (157 anteriores sin cambios, incluidas las instantáneas, + 9 nuevas), Vitest 141/141, `tsc` y build sin errores. **No probado en un celular real** (solo en un navegador de escritorio con viewport de 844×390).

## Cambios
| Archivo | Cambio |
|---------|--------|
| `config/gameConfig.ts` | `scale: { mode: FIT, autoCenter: CENTER_BOTH, 1200×800, max: 1200×800 }`: se reduce para caber, nunca se agranda por encima de su tamaño base, así que en escritorio queda igual que antes |
| `index.html` | `viewport` con `maximum-scale=1, user-scalable=no, viewport-fit=cover`; aviso `#rotate-notice` |
| `style.css` | Se retira el maquetado heredado de la plantilla de Vite (`#app` con padding y ancho máximo, `body` flex). `html/body` al 100 %, `#app` a `100vw × 100dvh`, `overflow: hidden`, `overscroll-behavior: none`, sin selección de texto ni callout táctil (salvo en `input`/`select`), `touch-action: none` en el canvas |
| `style.css` | Aviso de rotación con `@media (orientation: portrait) and (pointer: coarse)` (solo táctiles en vertical) |
| `style.css` | `@media (max-height: 520px)`: el menú de usuario pasa a un icono 👤 (6 px del borde, desplegable de 160 px) |
| `LoginScene.ts` | El `div` del botón de Google pasa de `left/top: 50%` + `margin-top: 80px` (respecto a la página) a posición calculada con el rectángulo del canvas (`placeOverCanvas`), recalculada en cada `resize` del Scale Manager |

## Pruebas nuevas (`cypress/e2e/mobile-base.cy.ts`, 9)
Con viewport de 844×390 (horizontal) y 390×844 (vertical):
- El canvas cabe, está centrado, mide 3:2 y usa todo el alto.
- Sin desborde horizontal ni vertical de la página.
- `touch-action: none` en el canvas; `overscroll-behavior: none` y `user-select: none` en el cuerpo.
- Sin aviso de rotación en horizontal.
- Menú de usuario reducido a icono (< 80 px) que sigue abriendo y navegando.
- El botón de Google queda centrado sobre el botón del canvas.
- Un movimiento en el centro del canvas escalado llega al mundo como (600, 400): Phaser traduce bien las coordenadas.
- En vertical, el aviso existe y su regla solo aplica a `pointer: coarse`. Cypress no emula `pointer: coarse` (Chrome de escritorio usa ratón), por eso se comprueba la regla de CSS y no la visibilidad.

## Limitaciones conocidas
- **Pantalla vertical:** solo se tapa con el aviso; la partida sigue corriendo detrás (el tiempo de sesión se calcula por reloj, así que no se detiene).
- **Aviso de navegador incrustado** (WhatsApp/Instagram/Facebook, donde Google bloquea el login): pendiente (fase 3).
- **Filtros HTML de Estadísticas y Admin** siguen posicionados respecto a la página, no al canvas (fase 3).
- El tamaño de las tarjetas, los textos del HUD y la puntería táctil son la fase 2: con el canvas a ~0,49× las tarjetas de 120×80 miden ~58×39 px y la tolerancia de impacto sigue siendo exacta.
- Defecto 2 (el menú tapa "Cargar CSV"): en escritorio sigue igual; en celular el panel admin pasará a "solo escritorio" (fase 3).

## Próximo paso
Fase 2, jugabilidad táctil: `layout.ts` con la escala del canvas, tarjetas y fuentes del HUD compensadas por la escala, tolerancia en `checkHit`, mira en el punto del toque.
