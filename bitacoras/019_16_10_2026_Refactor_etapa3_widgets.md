# Bitácora 019 - 16/10/2026

## Refactor, etapa 3: widgets `Button`, `Pagination` y `Modal`

---

## Resumen

Los botones, la paginación y el marco de los modales, que estaban escritos a mano en cada escena con pequeñas variaciones, pasan a tres funciones en `src/ui/widgets/`. Es un cambio sin efecto visible: cada llamada reproduce exactamente el estilo que tenía el código anterior.

**Estado:** ✅ Completada. E2E 155/155 (las 8 instantáneas sin regenerar), Vitest 141/141, `tsc` y `npm run build` sin errores.

## Widgets nuevos (`src/ui/widgets/`)
| Archivo | API | Notas |
|---------|-----|-------|
| `Button.ts` | `createButton(scene, {x, y, text, fontSize, bg, padding, color?, origin?, hover?, extra?, depth?, onClick?})` | `hover` admite `bg`, `alpha` y `scale` (cada sitio usaba uno distinto). `extra` lleva `fontStyle`/`stroke` |
| `Pagination.ts` | `createPagination(scene, {centerX, y, currentPage, lastPage, onChange, label, buttonOffset, button, labelFontSize})` | Devuelve los textos creados; la escena los registra (contenedor en Stats, `clearable` en Admin) |
| `Modal.ts` | `createModalFrame(scene, {…, backdrop?})` → `{backdrop?, panel}` | Solo el marco (capa oscura bloqueante + panel con borde). El contenido sigue en cada escena |

## Dónde se aplicó
- **StatsScene:** "← Volver", "Ver detalle", paginación, "Cerrar" y el marco del modal de detalle.
- **AdminScene:** `createButton` y `createPagination` privados ahora delegan en los widgets (`buttonStyle()` concentra el estilo común del panel); el marco del aviso de error usa `createModalFrame`.
- **GameScene:** botones SÍ/NO de la confirmación de reinicio (hover por escala, trazo y profundidad vía `extra`/`depth`).
- **UserDisplay:** botón "Salir".

Se eliminaron ~130 líneas repetidas en Stats y GameScene.

## Qué no se unificó (a propósito)
- Los **dos estilos de botón** (Admin: sm, gris oscuro, hover por transparencia; Stats: lg/xl, `slateBtn`, hover por color) y los dos estilos de paginación siguen distintos; el widget los admite como opciones. Unificarlos es una decisión de diseño (responsivo).
- El contenido de los modales: el de detalle, el de error y la confirmación de reinicio tienen formas demasiado distintas; un `Modal` genérico sería una abstracción sin uso real. La confirmación de reinicio no usa marco.
- `LoginScene` (botón de Google, en el DOM) y los encabezados ordenables de Admin.

## Nota
`AdminScene.ts` queda en 1008 líneas (+4): los envoltorios nuevos compensan lo retirado. Su reducción real llega en las etapas 4, 5 y 7 (filtros HTML, tabla y división en vistas).

## Próximo paso
Etapa 4: filtros HTML a clases CSS + `FilterBar`, y corrección del defecto 1 (barras de filtros que quedan en pantalla al salir por el menú), invirtiendo las dos pruebas que hoy lo fijan.
