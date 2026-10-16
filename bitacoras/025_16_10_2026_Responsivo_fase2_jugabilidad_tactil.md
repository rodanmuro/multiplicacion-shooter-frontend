# Bitácora 025 - 16/10/2026

## Responsivo, fase 2: jugabilidad táctil

---

## Resumen
Con el canvas mostrado a ≈ 0,49× en un celular horizontal (844×390), las tarjetas medían ~58×39 px, el HUD quedaba ilegible y el impacto exigía el punto exacto. Ahora todo se compensa desde **un único módulo**, `src/ui/layout.ts`, y con escala 1 (escritorio) cada valor es neutro: el juego de escritorio queda igual.

**Estado:** ✅ Completada. E2E 173/173 (166 anteriores sin cambios + 7 nuevas, instantáneas incluidas), Vitest 147/147 (6 nuevas), `tsc` y build sin errores. Revisado visualmente en una captura a 844×390. **No probado en un celular real.**

## `src/ui/layout.ts`
`computeLayout(displayScale)` es una **función pura** (probada con Vitest) que devuelve:

| Valor | Fórmula | A escala 1 | A ≈ 0,49 |
|-------|---------|-----------|---------|
| `cardScale` | `56 / (80·s)` acotado a 1–1,6 (alto mínimo de tarjeta en pantalla: 56 px) | 1 | 1,6 |
| `hudScale` | `0,7 / s` acotado a 1–1,6 (el HUD no baja de 0,7× su tamaño) | 1 | 1,43 |
| `hitSlop` | `24·(1−s)/s` px del mundo (continuo: 0 a escala 1) | 0 | ≈ 25 |
| `crosshairScale` | `1 / (1,2·s)` acotado a 1–1,8 | 1 | 1,7 |

`getDisplayScale(scene)` = tamaño mostrado del canvas / tamaño del mundo (del Scale Manager de Phaser, sin tocar el DOM). Ningún otro archivo decide por tipo de dispositivo.

## Dónde se aplica
- `Card`: `setScale(cardScale)` al crearse. `CardSpawner.checkHit` usa el tamaño escalado de cada tarjeta más `hitSlop`.
- `Crosshair`: escala base `crosshairScale`; el pulso anima relativo a ella.
- `QuestionDisplay`: escala fondo y texto (no el contenedor, cuya animación de entrada anima de 0 a 1).
- `ScoreDisplay`: escala el contenedor (los efectos animan solo el texto).
- `SessionTimer`: escala el texto y su posición baja con la caja de la pregunta (`50 + 40·hudScale`; 90 px a escala 1, como antes). Esto además evita que el temporizador pise la caja de la pregunta.
- `style.css`: `html/body` con el color de fondo del juego (`#1a1a2e`), para que las franjas laterales del canvas reducido no se vean como un marco blanco. **Único cambio visible en escritorio**: el fondo de la página, fuera del canvas, pasa de blanco/gris a azul oscuro.

## Pruebas nuevas
- `tests/unit/layout.test.ts` (6): neutro a escala 1, no agranda por encima de 1, alto mínimo de tarjeta, valores a escala de celular, monotonía, topes.
- `cypress/e2e/mobile-play.cy.ts` (7), a 844×390: tarjetas agrandadas; un toque 8 px (mundo) fuera del borde acierta; uno a 120 px no; HUD agrandado con el temporizador bajo la caja; acertar con un toque suma 10. A 1280×900: tarjetas, HUD y mira a tamaño natural, temporizador en y = 90 y el impacto sigue siendo exacto.

## Decisiones y límites
- **No se implementó "mira con retardo" ni desplazada del dedo.** Disparar en el punto del toque con una tolerancia generosa resuelve el problema principal; un retardo cambiaría el ritmo del juego. Se evaluará tras probar en un celular real.
- Las tarjetas ya creadas conservan su tamaño si el canvas cambia de escala a media partida (giro del celular); las nuevas toman el valor actual. El HUD tampoco se recalcula al instante.
- Con `cardScale` 1,6 a 20 tarjetas máximas en pantalla, el campo se siente más lleno; ajustar tras probar en un celular real.
- Sin revisar: audio en móvil (exige un gesto previo del usuario; el login aporta uno), rendimiento en gama baja.

## Próximo paso
Fase 3, pantallas secundarias: resumen de sesión y confirmación de reinicio adaptados a la escala; Estadísticas (filtros HTML anclados al canvas); Panel de administración como solo escritorio con aviso en celular (resuelve el defecto 2); aviso de navegador incrustado (WhatsApp/Instagram/Facebook) para el login con Google.
