# Bitácora 012 - 15/10/2026

## Planeación: Pruebas → Refactor → Frontend responsivo (celular)

---

## Objetivo

Que el juego pueda jugarse desde un celular. Para llegar ahí sin romper lo que ya funciona en producción, el trabajo se hace en este orden:

1. **Escribir pruebas** (unitarias, integración y E2E) que fijen el comportamiento actual.
2. **Refactorizar** los archivos grandes y eliminar duplicación.
3. **Hacer el frontend responsivo** sobre el código ya ordenado.

**Estado:** solo planeación. No se ha modificado código fuente ni dependencias.

---

## 1. Evaluación del estado actual para celular

Evaluación por lectura de código (no se ejecutó en un navegador ni en un celular real).

### Lo que ya funciona
- El `viewport` de `index.html` es correcto.
- Phaser unifica mouse y táctil en `pointerdown`; un tap dispara igual que un click (`GameScene.onShoot`).
- La lógica de juego, sesiones y API no depende del dispositivo.

### Problemas que lo bloquean

| # | Problema | Dónde |
|---|----------|-------|
| 1 | Canvas fijo de 1200×800 sin Scale Manager; en celular se desborda. `#app` con `padding: 2rem` y `body` flex con `min-height:100vh` | `config/gameConfig.ts`, `style.css` |
| 2 | Al escalar (~0,4–0,5 en celular horizontal) las tarjetas de 120×80 quedan de ~50×34 px y los textos de 18–36 px quedan ilegibles | `utils/constants.ts`, escenas y componentes |
| 3 | `CardSpawner.checkHit` exige que el punto exacto caiga dentro del rectángulo; con dedo y tarjetas en movimiento casi todo se falla. La mira queda en el último toque y el dedo tapa el objetivo | `systems/CardSpawner.ts`, `entities/Crosshair.ts` |
| 4 | HTML superpuesto posicionado respecto a la página, no al canvas: botón de Google (`left:50%; top:50%; margin-top:80px`), menú de usuario (fijo, `min-width:160px`), barras de filtros de Stats y Admin (`top:70px`, inputs en px) | `LoginScene`, `UserMenu`, `StatsScene`, `AdminScene`, `style.css` |
| 5 | Faltan protecciones táctiles: `touch-action: none`, `overscroll-behavior: none`, `user-select: none`, `100dvh`, menú contextual por toque largo, zoom por doble tap | `style.css`, `index.html` |
| 6 | Las tablas de Stats y Admin son textos de Phaser con coordenadas fijas (columnas hasta ±500 px) | `StatsScene`, `AdminScene` |

### Riesgos que no son de código
- **Navegadores incrustados** (WhatsApp, Instagram, Facebook): Google bloquea el login con `disallowed_useragent`. Probablemente el mayor obstáculo real en un colegio. Se necesita un aviso de "ábrelo en Chrome/Safari".
- **Orientación y pantalla completa:** el juego es 3:2 (horizontal). iPhone no permite Fullscreen API. Se necesita aviso de "gira el celular" en vertical.
- **Audio:** los móviles exigen gesto del usuario; el login aporta uno, pero `AudioManager` no se revisó. Probar.
- **Rendimiento:** hasta 20 contenedores (Graphics + Text) y bundle de 1,5 MB; medir en un celular de gama baja.

### Plan responsivo (fases, se ejecutan al final)
1. **Base responsiva:** Scale Manager (`FIT` + centrado), CSS con `dvh` y protecciones táctiles, aviso de rotación, reubicar botón de Google y reducir el menú de usuario a un icono.
2. **Jugabilidad táctil:** tarjetas y fuentes del HUD compensadas por la escala, tolerancia en `checkHit`, mira en el punto de toque con retardo corto.
3. **Pantallas secundarias:** resumen de sesión y `StatsScene` adaptados. El panel admin queda solo para escritorio con aviso en celular.

**Pendiente de decidir:** orientación. Recomendación: **solo horizontal** (conserva el mundo 1200×800 y la lógica actual). La alternativa vertical exige rediseñar mundo, HUD y spawn.

---

## 2. Cómo evitar código espagueti al hacer responsivo

Regla: **ningún componente sabe qué dispositivo es; solo recibe medidas de un módulo central.**

- Un módulo `layout.ts` calcula "tokens" a partir de la escala del canvas y del tipo de puntero (`matchMedia('(pointer: coarse)')`): tamaño de tarjeta, fuentes, tolerancia de impacto, márgenes.
- Fórmula continua que compensa la escala (`px(n) = n / scale`), no dos versiones "móvil" y "escritorio". En escritorio la escala es 1 y los valores quedan casi iguales a los actuales.
- Los números mágicos (`fontSize: '64px'`, `'48px'`, `'32px'` repartidos en las escenas) pasan a una función `textStyle('title' | 'body' | 'hud')`.
- El HTML superpuesto se mueve de `style.cssText` incrustado en TypeScript a clases CSS con `@media` y variables CSS.
- Una pantalla realmente distinta (panel admin) se declara solo-escritorio, sin condicionales por fila.
- La detección de dispositivo vive únicamente en `layout.ts` (se puede hacer cumplir con lint o `grep`).
- `computeLayout` es una función pura, probable con tests unitarios.

---

## 3. Diagnóstico de archivos grandes y propuesta de refactor

### Diagnóstico
No son grandes por lógica compleja sino por mezclar responsabilidades.

| Archivo | Líneas | Mezcla |
|---------|--------|--------|
| `scenes/AdminScene.ts` | 1004 | Estado de dos vistas, carga de API, render Phaser de usuarios y sesiones, barras de filtros HTML (~230 líneas + 16 bloques `cssText`), subida/exportación CSV, modal de error, helpers de estilo |
| `scenes/StatsScene.ts` | 638 | Filtros HTML, tabla, paginación, modal de detalle |
| `scenes/GameScene.ts` | 617 | Resumen de sesión **duplicado** (`showSessionSummaryLocal` / `showSessionSummaryBackend`), confirmación de reinicio, envío de disparos, progresión |
| `scenes/LoginScene.ts` | 326 | Escena + DOM del botón de Google |

Duplicación entre escenas: botones, paginación, modales, encabezados de tabla, `formatDuration`, limpieza de HTML. Las columnas se posicionan con arreglos de coordenadas fijas (`centerX - 500, centerX - 430...`).

### Estructura objetivo
```
src/
  ui/
    theme.ts            colores, fuentes, textStyle(): tokens
    widgets/            Button, Modal, Pagination, DataTable<T>
    html/               FilterBar (DOM) + clases CSS en style.css
  scenes/
    admin/  AdminScene (orquestador ~150 líneas), UsersView, UserSessionsView
    stats/  StatsScene, SessionDetailModal
    game/   GameScene, SessionSummaryOverlay (una sola versión), RestartConfirm
  utils/    format.ts (duración, fechas), download.ts (CSV)
  services/ sin cambios
```
- Escena = orquestador delgado. Vista = clase con `render()` / `destroy()` y un `Container` raíz (reemplaza el filtro `getData('clearable')`).
- `DataTable<T>` con columnas declarativas `{ header, width, render(row), sortField }` reemplaza el posicionamiento manual; además prepara el responsivo (columnas como proporciones).
- Meta: ninguna escena por encima de ~300 líneas.
- Sin frameworks de UI; sin capas "por si acaso".

### Etapas del refactor (un commit por etapa, `npm run build` + checklist manual)

| Etapa | Qué | Riesgo |
|-------|-----|--------|
| 1 | `theme.ts` y `textStyle()`: sustituir `fontSize` y colores sueltos | Bajo, mecánico |
| 2 | `format.ts` y `download.ts` | Bajo |
| 3 | Widgets `Button`, `Modal`, `Pagination` | Bajo-medio |
| 4 | Filtros HTML: de `cssText` a clases CSS + `FilterBar` | Medio |
| 5 | `DataTable<T>` | Medio |
| 6 | Partir `StatsScene`; deduplicar resumen de `GameScene` | Medio |
| 7 | Partir `AdminScene` en `UsersView` y `UserSessionsView` (solo-escritorio, se hace al final) | Medio-alto |

El refactor **conserva el comportamiento**: sin funciones nuevas ni cambios de diseño.

---

## 4. Estrategia de pruebas (primer paso, aprobada)

Hoy el frontend no tiene tests ni linter; solo `tsc` (en `npm run build`, con `strict` y `noUnusedLocals`). El backend tiene PHPUnit para disparos y finalizar sesión (`ShotTest`, `FinishSessionTest`), pero no para listado, filtros del incremento 10 ni admin/CSV (fuera de alcance de este trabajo, que es solo frontend).

### Pirámide

| Capa | Herramienta | Cobertura |
|------|-------------|-----------|
| Unitarias | Vitest | `mathHelpers` (`generateWrongAnswers`: cantidad, únicas, positivas, distintas de la correcta), `QuestionGenerator`, `ScoreManager` (+10 / −5 / mínimo 0 / callback), `ProgressionManager` (niveles, `TABLE_ORDER`, rotación de tablas difíciles, multiplicador de velocidad, tiempo con reloj falso), `AuthManager` (login válido, token expirado, restaurar sesión, logout, singleton) |
| Integración (sin navegador) | Vitest + axios simulado | `apiService` (token Bearer, manejo de 401/403/404), servicios (URL y payload; `min_score` y `date_from` solo si tienen valor) |
| E2E | Cypress 14.5.4 (binario ya en caché) | Escenas de Phaser y HTML superpuesto en navegador real |

Phaser no carga bien en jsdom, por lo que `Card` y `CardSpawner` se cubren desde E2E.

### Cómo hacer E2E sobre un canvas
- **Backend siempre simulado** con `cy.intercept` (determinista, sin base de datos). Respuestas tomadas de las bitácoras.
- **Login:** el OAuth real de Google no se automatiza. Se siembra `localStorage` (`google_auth_token`, `google_user_data`) con un JWT falso vigente y se simula `POST /auth/verify`.
- **Acceso al juego:** `main.ts` ya expone `window.game`. TypeScript borra `private` al compilar, así que Cypress puede leer el estado de la escena **sin tocar el código fuente**.
- **Azar y tiempo:** `Math.random` con semilla en `onBeforeLoad`; el fin de sesión se fuerza llamando a `endSession` en vez de esperar 5 minutos.
- **Aislar lo frágil:** todo acceso a internos en un único `gameDriver.ts`. Las pruebas afirman sobre lo que sobrevive al refactor: llamadas HTTP (URL y payload), `localStorage` y DOM.

### Instantánea de la lista de objetos (clave para el refactor)
Stats y Admin dibujan tablas con textos de Phaser, no consultables con selectores. Se vuelca la lista de objetos de la escena (texto, posición, color, tamaño) a JSON y se compara con una versión guardada. Es determinista (sin píxeles). Si el refactor mueve algo sin querer, falla; si el cambio es intencional, se revisa y se actualiza la instantánea.

### Escenarios E2E (~25)
- **Login y menú:** pantalla de login; sesión restaurada pasa al juego; abrir/cerrar menú; salir; el botón de admin solo aparece para admin.
- **Juego:** crea sesión con dimensiones del canvas; disparo a tarjeta envía payload correcto; disparo al aire no envía nada; 40 puntos suben de nivel y cambia la tabla; al terminar llama a `PUT finish` y muestra resumen del backend; si falla el backend, resumen local; confirmación de reinicio Sí/No.
- **Estadísticas:** lista, paginación, filtros, detalle, estado vacío, error.
- **Admin:** lista, ordenar por columna, filtros, sesiones de un usuario, subir y exportar CSV, 403 para no-admin.

### Reglas
- **Caracterización:** los tests fijan el comportamiento *actual*. Los fallos preexistentes que se descubran se **anotan en bitácora y no se corrigen** durante el refactor.
- **Línea base:** todo en verde sobre el código sin cambios, en un commit, antes de refactorizar.
- **Scripts nuevos:** `npm test` (Vitest) y `npm run e2e` (Cypress).

---

## 5. Orden de ejecución

| Fase | Contenido |
|------|-----------|
| A | Instalar Vitest + pruebas unitarias y de integración (sin tocar código fuente) |
| B | Instalar Cypress + `gameDriver.ts` + escenarios de login, menú y juego |
| C | Escenarios de Stats y Admin con instantáneas de la lista de objetos |
| D | Verificar todo en verde y commit de línea base |
| E | Refactor, etapas 1–6; etapa 7 (Admin) al final |
| F | Responsivo, fases 1–3 (más `layout.ts`) |

Cada fase deja su propia bitácora al terminar.

---

## 6. Decisiones

**Aprobadas (15/10/2026):**
- Pruebas primero, antes del refactor y del responsivo.
- Vitest para unitarias e integración; Cypress solo para E2E.
- Instantánea de la lista de objetos para las tablas de Stats y Admin.
- Empezar por la fase A, sin modificar código fuente.

**Pendientes:**
- Orientación del juego en celular (recomendado: solo horizontal).
- Ejecución automática en GitHub Actions (por ahora las pruebas se corren solo en local).

---

## 7. Riesgos

- Los tests de caracterización pueden fijar comportamientos que en realidad son bugs; se documentan, no se arreglan en esta pasada.
- Las pruebas E2E que acceden a internos de Phaser dependen de nombres privados; se concentran en `gameDriver.ts` para que el refactor solo toque un archivo.
- Las instantáneas de la lista de objetos son sensibles a cualquier cambio de posición; los cambios intencionales exigen revisión explícita.
- Añadir Vitest y Cypress agrega dependencias de desarrollo (no afectan el bundle de producción).

---

**Documento creado por:** Claude (Sonnet 5.5)
**Fecha:** 15 de octubre de 2026
**Estado:** Planeación aprobada - Listo para fase A
