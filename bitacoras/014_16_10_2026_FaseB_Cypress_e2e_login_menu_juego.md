# Bitácora 014 - 16/10/2026

## Fase B: Cypress y pruebas E2E de login, menú de usuario y juego

---

## Resumen

Segunda fase del plan de la bitácora 012. Se instaló Cypress y se escribieron **52 pruebas end-to-end** que ejercitan el juego real en un navegador (Electron) con el backend simulado. **No se modificó ningún archivo de `src/`.**

Al fijar el comportamiento actual aparecieron **dos errores reales del juego** y un tercero menor (sección "Errores encontrados"). Se documentan como pruebas "(comportamiento actual)" y **no se corrigieron**, según la regla de caracterización del plan.

**Estado:** ✅ Completada. `npm run e2e`: 52/52 en verde (~2 min 30 s). `npm test` (Vitest): 121/121. `npm run build`, `typecheck:tests` y `typecheck:e2e` sin errores.

---

## Cambios realizados

### Dependencias (solo desarrollo)
- `cypress@14.5.4` (el binario ya estaba en la caché de la máquina)
- `start-server-and-test` (levanta el servidor de Vite, espera a que responda y lanza Cypress)

### Archivos nuevos
```
cypress.config.ts                       baseUrl 127.0.0.1:5174, viewport 1280x900, tarea `log`
cypress/tsconfig.json
cypress/support/e2e.ts                  red de seguridad: /api/** sin simular → 501; script de Google vacío
cypress/support/fixtures.ts             respuestas de ejemplo con la forma del backend
cypress/support/api.ts                  stubGameApi() / stubEmptyHistory()
cypress/support/gameDriver.ts           ÚNICO punto que conoce los internos de Phaser
cypress/e2e/login.cy.ts                 8 pruebas
cypress/e2e/user-menu.cy.ts            12 pruebas
cypress/e2e/game-start.cy.ts            9 pruebas
cypress/e2e/game-shots.cy.ts           12 pruebas
cypress/e2e/game-end-restart.cy.ts     11 pruebas
```
`.gitignore`: se añadieron `cypress/screenshots`, `cypress/videos` y `cypress/downloads`.

### Scripts nuevos en `package.json`
| Script | Qué hace |
|--------|----------|
| `npm run e2e` | Levanta Vite en el puerto 5174 y ejecuta toda la suite en modo headless |
| `npm run e2e:open` | Igual, pero abre la interfaz interactiva de Cypress |
| `npm run dev:e2e` | Solo el servidor de pruebas |
| `npm run cypress:run` / `cypress:open` | Cypress sin levantar el servidor |
| `npm run typecheck:e2e` | `tsc -p cypress/tsconfig.json` |

Para ejecutar un spec concreto: dejar `npm run dev:e2e` corriendo en otra terminal y luego
`env -u ELECTRON_RUN_AS_NODE npx cypress run --spec cypress/e2e/login.cy.ts`.

---

## Decisiones de diseño

- **Backend siempre simulado** con `cy.intercept` (respuestas con la forma documentada en las bitácoras 006 y 007). Se hace match por `pathname` y método para no confundir `/sessions` con `/sessions?page=1`.
- **API en el mismo origen:** el servidor de pruebas arranca con `VITE_API_URL=/api`, así no hay CORS y `cy.intercept` responde sin preflight.
- **Red de seguridad:** en cada test, `/api/**` responde 501 por defecto; cualquier llamada que el test no haya simulado queda a la vista y nunca llega a un backend real.
- **Google Identity Services:** el script externo se sustituye por uno vacío y cada test define `window.google` con un doble que registra `initialize` y `renderButton` (el OAuth real no se puede automatizar). El `VITE_GOOGLE_CLIENT_ID` de pruebas es `test-client-id.apps.googleusercontent.com`.
- **Sesión sembrada:** `visitApp()` guarda en `localStorage` un JWT falso vigente (`tests/helpers/jwt.ts`, compartido con Vitest) y los datos del usuario; `Math.random` usa una semilla fija para reducir la variación entre ejecuciones.
- **Acceso al juego sin tocar `src/`:** `main.ts` ya expone `window.game`. TypeScript borra `private` al compilar, así que el driver lee `scene.cardSpawner`, `scene.scoreManager`, `scene.progressionManager` y llama a `endSession()`. Todo eso vive solo en `gameDriver.ts`; si el refactor renombra algo, es el único archivo a tocar. Los specs afirman sobre HTTP, `localStorage`, DOM y textos visibles.
- **Disparos reales:** `shootCard({ correct })` espera a que exista una tarjeta del tipo pedido, la coloca en un punto libre de la zona segura, detiene las demás durante el click y después les devuelve la velocidad. El click en el canvas, el hit-test de `CardSpawner.checkHit` y el envío del disparo son los reales.
- **Atajos acotados:** para llegar al nivel 2 se suman puntos con `scoreManager.addCorrectHit()` (cuatro disparos reales serían lentos), y para terminar la sesión se llama a `endSession()` en lugar de esperar 5 minutos.

---

## Qué cubren las pruebas

| Spec | Pruebas | Cubre |
|------|---------|-------|
| `login` | 8 | Pantalla de login; GIS inicializado con el Client ID y botón pintado; aviso si GIS no cargó; token guardado vencido (se descarta); login completo (verify → bienvenida → juego, perfil del backend guardado); error del backend (se queda en el login); credential vencido (sin llamar al backend); sesión vigente salta el login |
| `user-menu` | 12 | Primer nombre; arranca cerrado; oculto en el login; abrir/cerrar con el toggle y con click fuera; botón admin solo para admin; navegación a Estadísticas y Panel Admin; cerrar sesión cancelando (se conserva) y aceptando (borra, recarga, login) |
| `game-start` | 9 | `POST /sessions` con hora ISO, tamaño del canvas y token Bearer; una sola sesión; juego arranca aunque falle el backend; HUD inicial (Score 0, 5:00, tabla del 1); tarjetas (aparecen, máx. 20, valores coherentes, se mueven) |
| `game-shots` | 12 | Acierto: +10 y payload exacto; tarjeta retirada; error: `is_correct=false`; piso en 0; −5 con puntaje previo; disparo al aire (nada al backend); solo se registran impactos; fallo del backend al registrar; sin sesión en el backend; subida de nivel a los 40 puntos (aviso, tabla del 10, siguiente pregunta); 30 puntos no sube; los disparos del nivel 2 usan la nueva tabla |
| `game-end-restart` | 11 | `PUT finish` con puntaje, nivel y duración; resumen con datos del backend; finalizar una sola vez; click tras finalizar no dispara; confirmación de reinicio; SÍ reinicia; resumen local si falla el backend o no hubo sesión; errores documentados abajo |

---

## Errores encontrados (comportamiento actual, NO corregido)

Las pruebas marcadas "(comportamiento actual)" fijan estos fallos. Cuando se corrijan, esas pruebas deben invertirse.

### 1. El botón NO de la confirmación no funciona (error del juego)
Al pulsar **NO** se espera volver al resumen de sesión, pero la confirmación reaparece al instante y la única salida es **SÍ**.
- **Causa:** el manejador de NO llama a `showSessionSummary()`, que registra `this.input.once('pointerdown', …)`. Como el mismo click sigue propagándose, ese manejador recién registrado se dispara de inmediato y vuelve a llamar a `showRestartConfirmation()`. Se comprobó espiando las llamadas: tras NO se invocan `showSessionSummary` y luego `showRestartConfirmation`.
- **Prueba:** `game-end-restart` → "NO no vuelve al resumen: la confirmación reaparece".
- **Arreglo probable:** registrar el `once` en el siguiente fotograma (`time.delayedCall(0, …)`) o no reutilizar `showSessionSummary()` desde el manejador de NO.

### 2. Después de reiniciar la partida no se puede disparar (error del juego, grave)
Tras **SÍ → nueva sesión** el juego arranca, genera tarjetas y crea la sesión en el backend, pero **todos los disparos se ignoran**: el puntaje no sube y no se envía nada al backend.
- **Causa:** `scene.restart()` reutiliza la misma instancia de `GameScene`, y el campo `sessionEnded` se inicializa una sola vez (`= false` al declararlo). Tras la primera partida queda en `true`, y `onShoot()` empieza con `if (this.sessionEnded) return;`. `create()` nunca lo restablece.
- **Prueba:** `game-end-restart` → "tras reiniciar los disparos se ignoran: sessionEnded sigue en true".
- **Por revisar (no probado):** por el mismo motivo `lastFinishedSessionData` también conserva el valor de la partida anterior; si la segunda partida falla al finalizar, el resumen podría mostrar los datos de la primera. Conviene reiniciar todos los campos de estado en `create()`.
- **Arreglo probable:** restablecer `sessionEnded`, `sessionId` y `lastFinishedSessionData` al inicio de `create()`.

### 3. El menú de usuario duplica sus manejadores al reiniciar (error menor)
Cada `GameScene.create()` crea un `UserMenu` nuevo sobre los mismos elementos del DOM sin quitar los manejadores anteriores. Tras reiniciar, "Salir" muestra **dos** confirmaciones seguidas.
- **Prueba:** `game-end-restart` → "los manejadores se duplican: Salir pide confirmación dos veces".
- **Arreglo probable:** crear el `UserMenu` una sola vez o eliminar sus listeners en el `shutdown` de la escena.

---

## Tropiezos de entorno y de herramientas (para no repetirlos)

1. **`ELECTRON_RUN_AS_NODE` en terminales de VS Code.** Esa variable hace que el binario de Cypress falle con `bad option: --no-sandbox`. Los scripts `cypress:run` y `cypress:open` usan `env -u ELECTRON_RUN_AS_NODE`. Si se lanza Cypress a mano desde un terminal de VS Code hay que hacer lo mismo.
2. **`npm run e2e -- --spec …` no funciona** (los argumentos se los queda `start-server-and-test`); para un spec suelto, ver más arriba.
3. **No pasar objetos de Phaser a `expect()`.** Cypress inspecciona los argumentos para el log, y con una tarjeta ya destruida falla con `Cannot read properties of null (reading '0')`. Comparar siempre con booleanos o valores simples.
4. **Objetos interactivos creados dentro de un manejador de input** (los botones SÍ/NO) solo reciben clicks a partir del fotograma siguiente. Un test es más rápido que una persona, así que `clickSceneText()` espera tres fotogramas antes de hacer click (`waitFrames`).
5. **Un fallo degrada el resto de la ejecución.** Tras un test fallido, el navegador de Electron quedó a ~1 fps y los tests siguientes fallaron en cadena (incluidos los que dependen de temporizadores de Phaser). Ante varios fallos seguidos, buscar el **primero**: los demás suelen ser consecuencia.
6. **Los fps bajan con el número de tarjetas** (de 60 a ~20) porque WebGL va por software; las esperas del driver tienen margen (hasta 20 s para encontrar una tarjeta).
7. **El mensaje de error de `shootCard`** incluye el estado de las tarjetas y los fps, para diagnosticar rápido cualquier fallo futuro.

---

## Verificación de que las pruebas E2E detectan errores

Mutaciones temporales en `src/` (restauradas con `git checkout`):

| Mutación | Spec ejecutado | Resultado |
|----------|----------------|-----------|
| `canvas_width` se envía con el valor del alto | `game-start` | Falla "hace POST /sessions con … el tamaño del canvas". Fallaron además 3 pruebas más, probablemente en cadena por la degradación descrita en el punto 5 de los tropiezos |
| `is_correct` se invierte al registrar el disparo | `game-shots` | Fallan 6 o más pruebas (acierto, retirada de tarjeta, error, −5, solo impactos, fallo del backend) |
| El botón "Panel Admin" se muestra a todos los perfiles | `user-menu` | Falla exactamente "no aparece para un estudiante" |

Tras restaurar con `git checkout`, `src/` quedó sin cambios (`git status --short src` vacío) y la suite completa volvió a 52/52.

---

## Lo que queda fuera de esta fase

- `StatsScene` (lista, paginación, filtros, detalle, estados vacío y de error) y `AdminScene` (lista, orden, filtros, sesiones de un usuario, CSV): fase C, con instantáneas de la lista de objetos de la escena.
- Pantalla de resumen: verificada por texto; el diseño visual lo cubrirá la instantánea de la fase C.
- Audio, efectos visuales (explosiones, tweens) y rendimiento en celular.

---

## Próximo paso

**Fase C:** escenarios E2E de Estadísticas y Admin con instantáneas de la lista de objetos de Phaser; después, verificar todo en verde y dejar el commit de línea base antes de refactorizar.

---

**Documento creado por:** Claude (Sonnet 5.5)
**Fecha:** 16 de octubre de 2026
**Estado:** Fase B completada
