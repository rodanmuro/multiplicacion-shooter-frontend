# Bitácora 027 - 16/10/2026

## Responsivo, fase 3: pantallas secundarias

---

## Resumen
Última fase del plan responsivo (bitácora 012). Cuatro frentes: navegador incrustado, panel de administración, resumen de sesión y Estadísticas. Se revisó el resultado en capturas a 844×390 (celular horizontal) y se midió con pruebas de geometría; **no probado aún en el celular real**.

**Estado:** ✅ Completada. E2E 191/191 (175 anteriores + 16 nuevas), Vitest 175/175, `tsc` y build sin errores.

## 1. Aviso de navegador incrustado (login con Google)
Google bloquea el inicio de sesión en el navegador incrustado de WhatsApp, Instagram, Facebook… (`disallowed_useragent`).
- `src/utils/environment.ts`: `detectInAppBrowser(userAgent)` (Instagram, Facebook, WhatsApp, TikTok, Snapchat, LinkedIn, Line, WeChat, Twitter, Telegram, y WebView genérico de Android `; wv)` / iOS sin "Safari") e `isTouchDevice()` (movido desde `layout.ts`). Probado con User-Agents reales (Chrome/Safari/Firefox no se confunden).
- `LoginScene`: en ese caso no inicializa Google Sign-In; muestra "Google no permite iniciar sesión dentro de {app}", "Abre este enlace en Chrome o Safari" y un botón **Copiar enlace** (portapapeles).

## 2. Panel de administración solo en escritorio + defecto 2
- `layout.compact` (escala de visualización < 0,75). Con el canvas así de reducido, `AdminScene` muestra "El panel de administración está disponible solo en computador." con botón para volver y **no pide datos** al backend. En pantallas bajas el menú de usuario oculta además la opción "Panel Admin" (CSS `max-height: 520px`).
- **Defecto 2 corregido** (el menú de usuario tapaba "Cargar CSV"): en `UsersView` "Exportar" y "Cargar CSV" pasan de x = 860/1020 a 700/860. Prueba invertida: ningún botón de la cabecera se superpone con el menú. Instantáneas `admin-usuarios` y `admin-usuarios-ordenada` actualizadas (solo cambian esas dos líneas).

## 3. Resumen de sesión y confirmación de reinicio
`SessionSummaryOverlay` calcula cuánto crece el HUD (`hudScale − 1`, 0 en escritorio): el título, las estadísticas y "Haz clic…" se agrandan y se separan para no pisarse; SÍ/NO crecen a ≥ 48 px en pantalla y se alejan entre sí. En escritorio las posiciones y tamaños son exactamente los de antes (probado). `Button` gana la opción `scale` (el hover se aplica sobre ella).

## 4. Estadísticas
En pantallas compactas:
- La tabla pierde la columna "Disparos", usa fecha corta (`28/03 10:30`, `formatDateTimeShort`), texto agrandado y filas más juntas (siguen cabiendo las 9 filas). `DataTable` gana `textScale`; `Pagination`, `labelScale`.
- La barra de filtros HTML pasa a variante `filter-bar--compact` (letra 12 px), con "Total: 12" en vez de "Total sesiones encontradas: 12".
- El modal de detalle agranda su texto y separa las líneas. **La barra de filtros se oculta mientras el modal está abierto** (es HTML y quedaba por encima, tapando el título del modal también en escritorio).
- **Las barras de filtros HTML se anclan al canvas** (`FilterBar.anchorToCanvas`): su posición se calcula con el rectángulo del canvas y se recalcula al cambiar el tamaño. Antes estaban fijas respecto a la página y, con el canvas centrado o escalado, no coincidían con él (p. ej. en una ventana de 900 px de alto la barra de Estadísticas caía sobre el título). Se aplica también a las barras de Admin.
  - Consecuencia en pruebas: `top` y `left` de las barras ya no entran en las instantáneas del DOM (dependen de la ventana). Se comprueban en pruebas de geometría contra el canvas (escritorio: a 70 del borde superior; celular: a 62, y la barra termina antes del encabezado).

## Pruebas nuevas
- `tests/unit/environment.test.ts` (15), ampliaciones de `format` y `layout`.
- `cypress/e2e/login.cy.ts` (+3): aviso en Instagram, copia del enlace, navegador normal sin cambios. `visitApp` admite `userAgent`.
- `cypress/e2e/mobile-secondary.cy.ts` (13): panel admin (menú sin opción, aviso sin pedir datos, escritorio intacto), resumen (no se pisa, botones ≥ 48 px, escritorio idéntico), Estadísticas (columnas, filas sin solapes, barra anclada y sin tapar el encabezado, paginación, modal con barra oculta; en escritorio todo igual salvo el anclaje).

## Observaciones / pendiente
- **Texto provisional visible en el juego**: `GameScene.create()` dibuja "Multiplication Shooter / Game Scene Active" en el centro durante toda la partida (comentario: "Texto temporal para verificar que la escena funciona"). Se ve detrás de las tarjetas y del resumen. No se tocó; conviene quitarlo (decisión del usuario).
- El aviso de rotación y el aviso de navegador incrustado no se han visto en un celular real.
- `Admin` en tableta pequeña (escala < 0,75) muestra el aviso de solo escritorio.
- Las pantallas de login y `AdminScene` siguen sin variante compacta propia (login se ve bien a 0,49×).

## Cierre del plan
Quedan hechos: pruebas (A–C), refactor (7 etapas), responsivo (fases 1–3) con ajustes tras la prueba en el A55. Pendiente a criterio del usuario: probar fase 3 en el celular, quitar el texto provisional, y decidir si el mundo se ensancha para llenar pantallas alargadas.
