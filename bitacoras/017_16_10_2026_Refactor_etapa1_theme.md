# Bitácora 017 - 16/10/2026

## Refactor, etapa 1: `theme.ts` (tamaños de fuente y colores)

---

## Resumen

Primera etapa del refactor de la bitácora 012. Los `fontSize` y los colores que estaban repartidos como literales por escenas y componentes pasan a tokens de un único módulo, `src/ui/theme.ts`. Es un cambio mecánico: **los valores son exactamente los mismos**, así que la salida visual no cambia (las instantáneas de la fase C lo comprueban).

**Estado:** ✅ Completada. E2E 155/155 (incluidas las 8 instantáneas, sin regenerarlas), Vitest 121/121, `npm run build` sin errores.

## Cambios

- Nuevo `src/ui/theme.ts`:
  - `FONT_SIZE`: 15 tamaños (`xs` 14 px … `logo` 72 px). Se conservaron los valores "raros" (15, 22, 36, 42, 56, 72 px) para no alterar nada; unificarlos es decisión de diseño y se toma en el plan responsivo.
  - `COLOR`: 17 colores CSS que se repetían (`white`, `black`, `yellow`, `red`, `green`, grises, `teal`, `mint`, `navy`, colores de botones…).
- Sustituidos en 11 archivos: `QuestionDisplay`, `QuestionTimer`, `ScoreDisplay`, `SessionTimer`, `UserDisplay`, `Card`, `gameConfig`, `GameScene`, `LoginScene`, `StatsScene`, `AdminScene`.
- Hecho con un script (regex sobre `fontSize: 'NNpx'` y `'#rrggbb'` entre comillas), no a mano.

## Qué NO se tocó (a propósito)

- Los colores usados una sola vez (p. ej. `#0066cc`, `#c53030`, `#757575`) y el color con alfa `#00000088` siguen como literales.
- Los colores numéricos de formas (`0xffffff`, `0x1a1a2e`…) de rectángulos y círculos.
- Los estilos HTML dentro de `cssText` (filtros, menú): pasan a clases CSS en la etapa 4.
- `utils/constants.ts` (`QUESTION_COLOR`, etc.).
- No se creó aún `textStyle('title'|'body'|'hud')` de la bitácora 012: con 15 tamaños sin patrón claro, agruparlos en roles ahora sería inventar diseño. Se hará junto con los tokens de `layout.ts` en el plan responsivo.

## Verificación

- `tsc --noEmit`, `npm run build` y `npm test` sin errores.
- `npm run e2e`: 155/155 en 4 min. Las instantáneas de la escena (que guardan `fontSize` y `color` de cada texto) pasaron sin cambios, lo que confirma que los valores no se alteraron.

## Próximo paso

Etapa 2: `utils/format.ts` (duración y fechas, corrigiendo la inconsistencia de formato, con prueba previa) y `utils/download.ts`.
