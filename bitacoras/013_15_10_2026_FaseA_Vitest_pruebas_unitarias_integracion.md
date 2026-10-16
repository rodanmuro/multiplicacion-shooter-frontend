# Bitácora 013 - 15/10/2026

## Fase A: Vitest y pruebas unitarias y de integración

---

## Resumen

Primera fase del plan de la bitácora 012. Se instaló Vitest y se escribieron **121 pruebas** que fijan el comportamiento actual de la lógica del juego, la autenticación y la capa HTTP. **No se modificó ningún archivo de `src/`.**

**Estado:** ✅ Completada. 121/121 pruebas en verde, `npm run build` y `npm run typecheck:tests` sin errores.

---

## Cambios realizados

### Dependencias (solo desarrollo)
- `vitest@^3.2.7`
- `jsdom@^26` — **no** la 27: exige Node ≥ 22.12 y esta máquina tiene Node 22.11.0 (falla con `ERR_REQUIRE_ESM`). Si se actualiza Node, se puede subir.

### Archivos nuevos
```
vitest.config.ts                      jsdom, incluye tests/**/*.test.ts
tests/tsconfig.json                   tipado estricto de las pruebas (tsc -p tests)
tests/helpers/setup.ts                silencia console.*; limpia localStorage y relojes
tests/helpers/jwt.ts                  makeJwt(): JWT sin firma válida (el front solo decodifica)
tests/helpers/mockAdapter.ts          mockApi() / mockApiNetworkError(): sustituye el adaptador de axios
tests/unit/mathHelpers.test.ts
tests/unit/QuestionGenerator.test.ts
tests/unit/ScoreManager.test.ts
tests/unit/ProgressionManager.test.ts
tests/unit/AuthManager.test.ts
tests/unit/constants.test.ts
tests/integration/apiService.test.ts
tests/integration/services.test.ts
tests/integration/adminApiService.test.ts
```

### Scripts nuevos en `package.json`
| Script | Qué hace |
|--------|----------|
| `npm test` | `vitest run` |
| `npm run test:watch` | Vitest en modo observación |
| `npm run typecheck:tests` | `tsc -p tests/tsconfig.json` |

---

## Qué cubren las pruebas

| Archivo | Pruebas | Cubre |
|---------|---------|-------|
| `mathHelpers` | 11 | `randomInt` (límites inclusivos), `shuffleArray` (no muta, conserva elementos), `generateWrongAnswers` (todas las combinaciones de factores 1–12: cantidad exacta, sin repetidas, enteras, positivas, distintas de la correcta) |
| `QuestionGenerator` | 10 | producto correcto, rangos por dificultad (EASY 1–5, MEDIUM 1–10, HARD 1–12), modo tabla específica (factor1 = tabla, factor2 1–10) y vuelta a modo normal |
| `ScoreManager` | 8 | +10 / −5, piso en 0, callback `(score, delta)`, `reset`, sin callback |
| `ProgressionManager` | 23 | umbrales de nivel cada 40 pts, tabla por nivel (`TABLE_ORDER` y rotación 6-7-8-9 desde el nivel 11), multiplicador de velocidad (+0,11 por nivel, tope), tiempo de sesión con reloj falso (límite exacto de 300 000 ms), `reset`, `getProgressInfo` |
| `AuthManager` | 15 | login válido/expirado/mal formado, persistencia, logout, expiración del token en `isAuthenticated`, restauración de sesión (vigente, expirada, JSON corrupto, datos incompletos), `updateUserFromBackend` |
| `constants` | 5 | solo invariantes (`TABLE_ORDER` es permutación de 1–10, `HARD_TABLES ⊂ TABLE_ORDER`, rangos crecientes, sesión de 5 min). Los valores de ajuste fino (velocidades, intervalos) **no** se fijan |
| `apiService` | 13 | token Bearer, cabeceras JSON, credenciales y timeout 10 s, respuestas 2xx, manejo de 401/403/404/500/otros, caída de red |
| `services` (auth, sesión, disparos) | 11 | método, URL y payload de cada llamada; redondeo del canvas; `getSessions` agrega `min_score` y `date_from` solo cuando tienen valor |
| `adminApiService` | 25 | exige token en las 6 llamadas, Bearer, serialización de filtros y orden, omisión de vacíos conservando el 0, errores del servidor, `uploadCsv` (multipart sin Content-Type), exportaciones (nombre del archivo, descarga y limpieza del DOM) |

### Cómo se hace la integración HTTP
`mockApi()` reemplaza únicamente el adaptador de red de axios. Los **interceptores reales** (token, manejo de errores) siguen ejecutándose, así que se prueba el cliente tal como corre en producción. `adminApiService` usa `fetch`, que se sustituye con `vi.stubGlobal`.

---

## Verificación de que las pruebas detectan errores

Se rompió el código a propósito en tres sitios, comprobando que las pruebas fallan, y luego se restauró con `git checkout`:

| Mutación | Resultado |
|----------|-----------|
| `CORRECT_HIT: 10` → `11` | 4 pruebas fallan |
| `minScore > 0` → `minScore >= 0` | 2 pruebas fallan |
| Aceptar tokens expirados en `login` | 1 prueba falla |

Tras restaurar, `src/` quedó sin cambios y las 121 pruebas vuelven a pasar.

---

## Comportamientos actuales fijados (no se corrigen en esta pasada)

Las pruebas marcadas "(comportamiento actual)" documentan cosas que podrían ser mejoras o errores. Se **conservan** durante el refactor y se deciden aparte:

1. **`ScoreManager`:** cuando el puntaje se recorta en 0, el callback sigue recibiendo `delta = −5`, aunque el puntaje no cambió.
2. **`ProgressionManager`:** el nivel puede **bajar** si baja el puntaje (`updateProgress` recalcula desde el puntaje).
3. **`apiService`:** un 401 solo escribe un aviso en consola; **no** borra el token ni redirige (el código está comentado).
4. **`adminApiService`:** si el servidor responde con un error que **no es JSON** (por ejemplo, una página HTML de error de PHP en el hosting compartido), `response.json()` lanza un `SyntaxError` y se pierde el mensaje por defecto ("Error al obtener grupos", etc.). Candidato a corregir con un `try/catch`.
5. **`adminApiService`:** `exportUsers` y `exportUserSessions` repiten ~25 líneas casi idénticas (descarga del blob). Candidato a extraer en la etapa 2 del refactor (`download.ts`).

Observación adicional: `generateWrongAnswers` genera valores en un bucle `while` sin tope de intentos. Con `count = 5` funciona para todas las combinaciones de factores de 1 a 12 (probado), pero con un `count` grande podría no terminar.

---

## Lo que queda fuera de esta fase

- `Card`, `CardSpawner`, `Crosshair` y las escenas dependen de Phaser, que no carga bien en jsdom. Se cubren con Cypress (fases B y C).
- `StatsScene` y `AdminScene` (listas, filtros, paginación, modales) → fase C.
- `UserMenu` (DOM + escena) → fase B.

---

## Próximo paso

**Fase B:** instalar Cypress, crear `gameDriver.ts` y los escenarios E2E de login, menú de usuario y flujo de juego.

---

**Documento creado por:** Claude (Sonnet 5.5)
**Fecha:** 15 de octubre de 2026
**Estado:** Fase A completada
