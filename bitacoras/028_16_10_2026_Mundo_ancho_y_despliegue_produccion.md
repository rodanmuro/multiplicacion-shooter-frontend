# Bitácora 028 - 16/10/2026

## Mundo ancho para pantallas alargadas y despliegue a producción

---

## 1. Mundo ancho
En el A55 (≈ 20:9) el juego 3:2 dejaba franjas negras laterales incluso en pantalla completa. Ahora el **alto del mundo es fijo (800) y el ancho sigue la proporción de la pantalla**, entre 1200 (3:2, como antes) y 1800.

- `computeWorldWidth(ancho, alto)` en `ui/layout.ts` (función pura, probada): `800 × dimensión mayor / dimensión menor`, acotado y par. Se calcula **una sola vez al arrancar** (`config/gameConfig.ts`) con la dimensión mayor como ancho, así que abrir la página con el celular en vertical da lo mismo.
- Escritorio: una ventana 3:2 o más cuadrada (p. ej. 1280×900) sigue con 1200; ventanas más anchas ensanchan el mundo (1920×1080 → 1422). Celular 844×390 → 1730. El lienzo no se agranda por encima de 1:1.
- El código ya usaba `cameras.main.width/centerX` casi en todas partes, así que escenas y HUD se centran solos. La tabla compacta de Estadísticas se ensancha con el mundo (hasta 1,6×).
- El backend acepta `canvas_width` hasta 10000: no requiere cambios.
- **Quitado** el texto provisional "Multiplication Shooter / Game Scene Active" de `GameScene`.
- Las pruebas E2E de escritorio no cambian (1200). Soporte: `worldWidth(win)` en `gameDriver`; `clickGame` y demás convierten con el ancho real. Las pruebas de celular ahora comprueban que el lienzo llena el ancho (≈ 843×390).
- No se maneja el cambio de proporción *durante* la partida (p. ej. salir de pantalla completa): el mundo conserva su ancho y el lienzo se ajusta con franjas pequeñas.

**Verificación:** E2E 191/191, Vitest 180/180, `tsc` y build sin errores.

## 2. Despliegue a producción (16/10/2026)
**Destino:** `https://voyeducando.com/multiplicacion/` (hosting compartido, FTP con `lftp`; credenciales en `~/proyectos/web-javascript-react/.ftp-voyeducando.env`, fuera de git). Código desplegado: commit `67b3c21`.

**Pasos:**
1. Copia de seguridad de lo que servía producción (`index.html`, `.htaccess`, `vite.svg`) en `backup-produccion-frontend-2026-10-16/` (fuera del repositorio, junto a las carpetas del proyecto). Producción servía `assets/index-Bk0V_pTq.js` + `index-DiL5n4oz.css`.
2. `rm -rf dist && npm run build` (usa `.env.production`) + `.htaccess.production` → `dist/`. Comprobado en el bundle: API `https://voyeducando.com/multiplicacion/api`, Client ID de producción, **sin** `localhost:8000` ni el modo demostración.
3. Subida por FTP en este orden: los dos assets nuevos (`index-HXBJgoWv.js` 1,6 MB, `index-d-lXSS1B.css`) → comprobado que ya se servían (HTTP 200, tamaños exactos) → **`index.html` al final** (el cambio efectivo). No se tocaron `api/` (backend), `.htaccess` (idéntico al del repositorio), `sounds/` ni `vite.svg` (sin cambios).
4. Verificación: la página sirve `assets/index-HXBJgoWv.js` y `index-d-lXSS1B.css`; sonidos y `vite.svg` 200; la API responde 401 sin token (viva). Cypress en solo lectura contra producción: carga la escena de login y el mundo mide 1200×800 en escritorio y 1730×800 en celular (844×390), con el lienzo llenando el ancho.

**No verificado en producción:** el inicio de sesión real con Google ni el juego completo (requieren cuenta). Pendiente de una prueba manual del usuario.

**Reversión:** subir `backup-produccion-frontend-2026-10-16/index.html` a `public_html/multiplicacion/`. Los assets antiguos siguen en el servidor (no se borraron), así que el `index.html` antiguo funciona tal cual.

**Limpieza pendiente (opcional):** en `public_html/multiplicacion/assets/` quedan 8 JS antiguos (~1,5 MB cada uno) y 1 CSS; y en la raíz `dist/` y `frontend.zip` de despliegues anteriores. No se tocaron.

## Cierre
Con esto el trabajo de las bitácoras 012 a 028 queda completo y publicado: pruebas (Vitest + Cypress, 180 + 191), refactor en 7 etapas, juego jugable en celular (escala, tarjetas y HUD compensados, pantalla completa, aviso de rotación y de navegador incrustado, panel admin solo escritorio, Estadísticas compactas) y mundo ancho.
