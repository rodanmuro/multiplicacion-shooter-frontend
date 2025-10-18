# Bitácora 001 - 18/10/2025

## Análisis Inicial del Proyecto "Multiplication Shooter"

---

## 1. Descripción General del Proyecto

**Multiplication Shooter** es un juego educativo desarrollado con **Phaser 3** y **TypeScript** cuyo objetivo principal es ayudar a estudiantes a repasar las **tablas de multiplicar** de forma interactiva y divertida.

### Concepto del Juego
- Género: Shooter educativo
- Mecánica: El jugador dispara a tarjetas con números que aparecen desde los bordes de la pantalla
- Objetivo: Seleccionar la respuesta correcta a multiplicaciones mostradas en pantalla
- Duración de sesión: 5 minutos

---

## 2. Stack Tecnológico

### Dependencias de Producción
```json
{
  "phaser": "^3.90.0",      // Framework de juegos 2D para web
  "jwt-decode": "^4.0.0"    // Decodificación de tokens JWT para OAuth
}
```

### Dependencias de Desarrollo
```json
{
  "typescript": "~5.9.3",   // Lenguaje con tipado estático
  "vite": "^7.1.7"          // Build tool y servidor de desarrollo
}
```

### APIs Externas
- **Google Identity Services**: Sistema de autenticación OAuth 2.0
  - Cargado via CDN en `index.html` línea 9

---

## 3. Arquitectura del Proyecto

### Estructura de Carpetas

```
src/
├── scenes/                 # Escenas de Phaser (flujo del juego)
│   ├── PreloadScene.ts    # Precarga de assets
│   ├── LoginScene.ts      # Pantalla de autenticación con Google
│   └── GameScene.ts       # Escena principal del juego
│
├── entities/              # Entidades del juego
│   ├── Card.ts           # Tarjeta con número (objetivo a disparar)
│   ├── Crosshair.ts      # Mira personalizada del jugador
│   └── ShotMarker.ts     # Marcador visual de disparo
│
├── systems/              # Sistemas de lógica del juego
│   ├── QuestionGenerator.ts  # Generador de preguntas de multiplicación
│   ├── CardSpawner.ts        # Sistema de aparición de tarjetas
│   └── ScoreManager.ts       # Sistema de puntuación
│
├── managers/             # Gestores globales (Singleton)
│   ├── AuthManager.ts        # Gestión de autenticación OAuth
│   ├── ProgressionManager.ts # Sistema de progresión y niveles
│   └── AudioManager.ts       # Gestión de efectos de sonido
│
├── components/           # Componentes de UI dentro del canvas
│   ├── QuestionDisplay.ts    # Muestra la pregunta actual
│   ├── ScoreDisplay.ts       # Muestra puntuación en tiempo real
│   ├── QuestionTimer.ts      # Timer por pregunta
│   ├── SessionTimer.ts       # Timer de sesión (5 minutos)
│   └── UserDisplay.ts        # Información del usuario
│
├── effects/              # Efectos visuales
│   └── CardExplosion.ts     # Efecto de explosión al disparar
│
├── ui/                   # Elementos UI fuera del canvas (HTML)
│   └── UserMenu.ts          # Menú de usuario con avatar y logout
│
├── types/                # Definiciones TypeScript
│   ├── index.ts            # Tipos generales (Question, Difficulty)
│   └── auth.ts             # Tipos de autenticación Google OAuth
│
├── utils/                # Utilidades y helpers
│   ├── constants.ts        # Configuración del juego (constantes)
│   └── mathHelpers.ts      # Funciones matemáticas auxiliares
│
├── config/
│   └── gameConfig.ts       # Configuración de Phaser
│
└── main.ts                # Punto de entrada de la aplicación
```

---

## 4. Flujo del Juego

### Secuencia de Escenas

```
1. PreloadScene (src/scenes/PreloadScene.ts)
   ↓
   ├─→ Usuario autenticado? → GameScene
   └─→ Usuario no autenticado → LoginScene
                                    ↓
                                 Autenticación exitosa
                                    ↓
                                 GameScene
```

### 4.1 PreloadScene
**Ubicación**: `src/scenes/PreloadScene.ts`

**Responsabilidades**:
- Cargar assets de audio (shoot, explosion, correct, wrong)
- Verificar autenticación del usuario mediante `AuthManager`
- Redirigir a `LoginScene` si no está autenticado
- Redirigir a `GameScene` si ya está autenticado

### 4.2 LoginScene
**Ubicación**: `src/scenes/LoginScene.ts`

**Características**:
- Pantalla de bienvenida con título del juego
- Integración con Google Identity Services
- Renderiza botón de "Sign in with Google"
- Muestra mensaje de bienvenida al autenticarse
- Transición automática a `GameScene` después de 2 segundos

**Flujo de autenticación**:
1. Usuario hace click en "Sign in with Google"
2. Google muestra popup de autenticación
3. Usuario selecciona cuenta
4. Google devuelve JWT credential
5. `AuthManager` decodifica y valida el token
6. Se guarda sesión en localStorage
7. Redirección a `GameScene`

### 4.3 GameScene
**Ubicación**: `src/scenes/GameScene.ts`

**Mecánica Principal**:
1. Se muestra una multiplicación (ejemplo: `7 × 8 = ?`)
2. Aparecen tarjetas con números desde los bordes de la pantalla
3. El jugador dispara (click) a la tarjeta con la respuesta correcta
4. Respuesta correcta: **+10 puntos**
5. Respuesta incorrecta: **-5 puntos**

**Sistemas integrados**:
- Crosshair (mira personalizada)
- QuestionGenerator (generador de preguntas)
- CardSpawner (aparición de tarjetas)
- ScoreManager (gestión de puntuación)
- ProgressionManager (progresión de niveles)
- AudioManager (efectos de sonido)
- SessionTimer (control de tiempo de sesión)

---

## 5. Componentes Clave

### 5.1 QuestionGenerator
**Archivo**: `src/systems/QuestionGenerator.ts`

**Funcionalidad**:
- Genera preguntas de multiplicación según configuración
- Soporta tabla específica (ej: tabla del 7) o aleatoria
- Configuración por dificultad:
  - **EASY**: factores 1-5
  - **MEDIUM**: factores 1-10
  - **HARD**: factores 1-12

**Métodos principales**:
- `generateQuestion()`: Genera una nueva pregunta
- `setSpecificTable(table: number)`: Configura tabla específica
- `setDifficulty(difficulty: Difficulty)`: Cambia dificultad

### 5.2 CardSpawner
**Archivo**: `src/systems/CardSpawner.ts`

**Funcionalidad**:
- Genera tarjetas desde bordes aleatorios (top/bottom/left/right)
- Pool de respuestas: 1 correcta + 5 incorrectas
- Control de aparición y movimiento de tarjetas

**Configuración**:
- Probabilidad de tarjeta correcta: **40%**
- Límite de tarjetas en pantalla: **20 simultáneas**
- Intervalo de spawn: **500ms**
- Velocidad base: **100-300 px/s**
- Velocidad ajustada por multiplicador de nivel

**Métodos principales**:
- `startSpawning(question: Question)`: Inicia generación de tarjetas
- `stopSpawning()`: Detiene generación
- `checkHit(x, y)`: Verifica colisión con tarjetas
- `update(delta)`: Actualiza posición de todas las tarjetas

### 5.3 Card (Entidad)
**Archivo**: `src/entities/Card.ts`

**Características**:
- Contenedor Phaser con fondo gráfico y texto
- Tamaño: **120×80 px**
- Movimiento basado en velocidad (velocityX, velocityY)
- Área de interacción definida manualmente

**Efectos visuales**:
- `showHitCorrectEffect()`: Explosión verde
- `showHitWrongEffect()`: Explosión roja

### 5.4 AuthManager
**Archivo**: `src/managers/AuthManager.ts`

**Patrón**: Singleton

**Responsabilidades**:
- Gestión de login con Google OAuth
- Decodificación de JWT con librería `jwt-decode`
- Validación de expiración de tokens
- Persistencia en localStorage:
  - Key: `google_auth_token`
  - Key: `google_user_data`

**Métodos principales**:
- `getInstance()`: Obtiene instancia singleton
- `login(googleToken: string)`: Procesa login con token de Google
- `logout()`: Cierra sesión y limpia localStorage
- `isAuthenticated()`: Verifica si hay sesión activa y válida
- `getUser()`: Obtiene datos del usuario actual

**Flujo de autenticación**:
1. Recibe JWT de Google
2. Decodifica payload con `jwtDecode<GoogleTokenPayload>()`
3. Verifica fecha de expiración (`payload.exp`)
4. Extrae información del usuario (id, email, name, picture)
5. Guarda en estado interno y localStorage
6. Restaura automáticamente sesión al recargar página

### 5.5 ProgressionManager
**Archivo**: `src/managers/ProgressionManager.ts`

**Responsabilidades**:
- Gestión de niveles y progresión de dificultad
- Control de tiempo de sesión
- Determinación de tabla de multiplicar actual
- Cálculo de multiplicador de velocidad

**Sistema de Progresión**:

**Niveles**:
- Dinámicos basados en puntuación
- Cada **40 puntos** = nuevo nivel
- Sin límite superior de niveles

**Orden de tablas** (Niveles 1-10):
```javascript
[1, 10, 2, 5, 3, 4, 6, 7, 8, 9]
```
- Tablas fáciles primero: 1, 10, 2, 5
- Tablas intermedias: 3, 4
- Tablas difíciles: 6, 7, 8, 9

**Niveles 11+**:
- Rotan entre tablas difíciles: `[6, 7, 8, 9]`

**Velocidad incremental**:
- Nivel 1: **1.0x** (velocidad base)
- Nivel 10: **2.0x** (velocidad máxima)
- Incremento: **0.11x** por nivel (~10% más rápido)
- Después del nivel 10: velocidad constante en 2.0x

**Sesión**:
- Duración total: **5 minutos** (300,000 ms)
- Timer iniciado en constructor
- Verificación continua en `update()` de GameScene

### 5.6 ScoreManager
**Archivo**: `src/systems/ScoreManager.ts`

**Funcionalidad**:
- Gestión centralizada de puntuación
- Sistema de callbacks para notificar cambios

**Configuración de puntuación**:
- Acierto correcto: **+10 puntos**
- Acierto incorrecto: **-5 puntos**
- Puntuación mínima: **0** (no permite negativos)

**Métodos principales**:
- `addCorrectHit()`: Suma 10 puntos
- `addWrongHit()`: Resta 5 puntos (mínimo 0)
- `getScore()`: Obtiene puntuación actual
- `setOnScoreChange(callback)`: Configura callback de cambios

---

## 6. Configuración del Juego

### Constantes Principales
**Archivo**: `src/utils/constants.ts`

#### SCORE
```typescript
CORRECT_HIT: 10    // Puntos por acierto correcto
WRONG_HIT: -5      // Puntos por acierto incorrecto
```

#### CARD_CONFIG
```typescript
WRONG_ANSWERS_COUNT: 5              // Cantidad de respuestas incorrectas
MAX_CARDS_ON_SCREEN: 20             // Tarjetas visibles simultáneamente
SPAWN_INTERVAL: 500                 // Intervalo de spawn en ms
MIN_SPEED: 100                      // Velocidad mínima (px/s)
MAX_SPEED: 300                      // Velocidad máxima (px/s)
CARD_WIDTH: 120                     // Ancho de tarjeta
CARD_HEIGHT: 80                     // Alto de tarjeta
CARD_PADDING: 20                    // Espaciado interno
CORRECT_CARD_PROBABILITY: 0.4       // 40% correctas, 60% incorrectas
```

#### GAME_CONFIG
```typescript
SESSION_DURATION: 300000            // 5 minutos en milisegundos
```

#### PROGRESSION_CONFIG
```typescript
TABLE_ORDER: [1, 10, 2, 5, 3, 4, 6, 7, 8, 9]  // Orden pedagógico de tablas
HARD_TABLES: [6, 7, 8, 9]                      // Tablas para niveles 11+
POINTS_PER_LEVEL: 40                           // Puntos para subir de nivel

SPEED_SCALE: {
  MIN_MULTIPLIER: 1.0,              // Velocidad inicial
  MAX_MULTIPLIER: 2.0,              // Velocidad máxima
  INCREMENT: 0.11,                  // Incremento por nivel
  MAX_LEVEL_FOR_INCREMENT: 10       // Nivel máximo para aumento
}
```

#### UI_CONFIG
```typescript
QUESTION_DISPLAY_Y: 50              // Posición Y de pregunta
QUESTION_FONT_SIZE: '42px'          // Tamaño de fuente pregunta
SCORE_DISPLAY_X: 100                // Posición X de puntuación
SCORE_DISPLAY_Y: 50                 // Posición Y de puntuación
TIMER_DISPLAY_Y: 120                // Posición Y de timer
TIMER_FONT_SIZE: '32px'             // Tamaño de fuente timer
```

---

## 7. Sistema de Audio

### Assets de Audio
**Ubicación**: `public/sounds/`

**Archivos cargados** (PreloadScene líneas 14-35):
- `shoot.ogg/mp3` - Sonido de disparo
- `explosion.ogg/mp3` - Sonido de explosión
- `correct.ogg/mp3` - Feedback de acierto correcto
- `wrong.ogg/mp3` - Feedback de acierto incorrecto

### AudioManager
**Archivo**: `src/managers/AudioManager.ts`

**Funcionalidad**:
- Registro de sonidos
- Reproducción con configuración de volumen
- Gestión centralizada de efectos de audio

---

## 8. Interfaz de Usuario

### UI dentro del Canvas (Phaser)
- Título del juego
- Pregunta de multiplicación actual
- Tarjetas flotantes con números
- Mira personalizada (cursor del sistema oculto)
- Display de puntuación con animación de cambio
- Timer de sesión restante
- Notificaciones de subida de nivel
- Pantalla de resumen al finalizar sesión

### UI fuera del Canvas (HTML/CSS)
**Archivo**: `index.html` líneas 14-20

Menú de usuario con:
- Avatar del usuario (imagen de Google)
- Nombre del usuario
- Botón de logout

**Estilos**: `src/style.css`

---

## 9. Configuración de TypeScript

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,                      // Modo estricto activado
    "noUnusedLocals": true,              // No permite variables sin usar
    "noUnusedParameters": true,          // No permite parámetros sin usar
    "noFallthroughCasesInSwitch": true   // Valida casos en switch
  }
}
```

### Configuración de Phaser
**Archivo**: `src/config/gameConfig.ts`

```typescript
{
  type: Phaser.AUTO,                // WebGL con fallback a Canvas
  width: 1200,                      // Ancho del canvas
  height: 800,                      // Alto del canvas
  parent: 'app',                    // ID del contenedor HTML
  backgroundColor: '#1a1a2e',       // Color de fondo
  physics: {
    default: 'arcade',              // Motor de física Arcade
    arcade: {
      gravity: { x: 0, y: 0 },      // Sin gravedad
      debug: false                  // Modo debug desactivado
    }
  },
  scene: [PreloadScene, LoginScene, GameScene]  // Escenas del juego
}
```

---

## 10. Características Destacadas

### ✅ Sistema de Progresión Pedagógica
- Orden de tablas desde las más fáciles (1, 10, 2, 5) hacia las más difíciles (6, 7, 8, 9)
- Velocidad adaptativa que aumenta con el nivel del jugador
- Sesiones limitadas a 5 minutos para mantener concentración
- Sistema de niveles dinámico sin límite superior

### ✅ Autenticación Robusta
- Integración con Google OAuth 2.0
- Persistencia de sesión en localStorage
- Validación automática de tokens JWT
- Recuperación automática de sesión al recargar página
- Manejo de expiración de tokens

### ✅ Feedback Visual y Auditivo Completo
- Efectos de explosión diferenciados por tipo de acierto:
  - Verde para respuesta correcta
  - Rojo para respuesta incorrecta
- Sonidos para cada acción del jugador
- Animaciones de subida de nivel
- Marcadores visuales de disparo
- Efecto de pulse en la mira al disparar

### ✅ Arquitectura Modular y Mantenible
- Separación clara de responsabilidades
- Sistemas independientes y reutilizables:
  - CardSpawner (generación de tarjetas)
  - ScoreManager (puntuación)
  - ProgressionManager (niveles)
  - AuthManager (autenticación)
- Patrones de diseño:
  - Singleton para managers globales
  - Observer pattern en ScoreManager (callbacks)
- TypeScript con strict mode para mayor seguridad de tipos
- Constantes centralizadas para fácil configuración

### ✅ Experiencia de Usuario
- Cursor personalizado (mira)
- Pantalla de resumen al finalizar sesión
- Confirmación antes de reiniciar sesión
- Información del usuario visible en todo momento
- Timer visible con tiempo restante

---

## 11. Flujo de Datos

### Ciclo de Juego Completo

```
1. Usuario hace click (disparo)
   ↓
2. ShotMarker creado en posición del mouse
   ↓
3. Crosshair ejecuta animación de pulse
   ↓
4. AudioManager reproduce sonido de disparo
   ↓
5. CardSpawner verifica colisión (checkHit)
   ↓
   ├─→ Colisión detectada
   │   ↓
   │   ├─→ Tarjeta correcta?
   │   │   ↓
   │   │   SÍ: ScoreManager.addCorrectHit() (+10 pts)
   │   │       Card.showHitCorrectEffect() (explosión verde)
   │   │       QuestionDisplay.showCorrectFeedback()
   │   │   ↓
   │   │   NO: ScoreManager.addWrongHit() (-5 pts)
   │   │       Card.showHitWrongEffect() (explosión roja)
   │   │       QuestionDisplay.showWrongFeedback()
   │   ↓
   │   CardSpawner.removeCard()
   │   ↓
   └─→ No colisión: (solo efectos visuales/auditivos)

6. ScoreManager notifica cambio a ScoreDisplay
   ↓
7. ScoreDisplay actualiza UI con animación
   ↓
8. ProgressionManager.updateProgress(newScore)
   ↓
9. Verificar si subió de nivel
   ↓
   ├─→ SÍ: GameScene.onLevelUp()
   │       - Mostrar notificación de nivel
   │       - Actualizar tabla de multiplicar
   │       - Generar nueva pregunta
   │       - Ajustar velocidad de tarjetas
   │   ↓
   └─→ NO: Continuar juego normal

10. Loop continúa hasta que sesión termine (5 minutos)
    ↓
11. GameScene.endSession()
    ↓
12. Mostrar pantalla de resumen con estadísticas
```

### Actualización Continua (update loop)

```
GameScene.update(time, delta)
  ↓
  ├─→ Crosshair.updatePosition(mouseX, mouseY)
  ├─→ CardSpawner.update(delta)
  │   └─→ Card.updateMovement(delta) para cada tarjeta
  │       └─→ Verificar si está fuera de límites → destruir
  ├─→ SessionTimer.update(remainingTime)
  └─→ Verificar si sesión completada → endSession()
```

---

## 12. Áreas de Mejora Identificadas

### Backend
- ❌ Actualmente solo frontend
- ✨ Potencial para agregar:
  - Guardado de progreso en servidor
  - Estadísticas históricas del jugador
  - Leaderboards/rankings
  - Análisis de desempeño por tabla
  - Sistema de logros/badges

### Responsive Design
- ❌ Dimensiones fijas: 1200×800 px
- ✨ Potencial para:
  - Adaptación a diferentes tamaños de pantalla
  - Soporte para dispositivos móviles/tablets
  - Layout responsive del canvas

### Configuración de Usuario
- ❌ Configuración hardcodeada
- ✨ Potencial para agregar:
  - Selección manual de tablas de multiplicar
  - Ajuste de dificultad personalizado
  - Configuración de duración de sesión
  - Ajuste de volumen individual por sonido
  - Modo práctica (sin límite de tiempo)

### Testing
- ❌ No se observan tests unitarios o de integración
- ✨ Potencial para:
  - Tests unitarios de managers y systems
  - Tests de integración de flujo de juego
  - Tests de regresión visual

### Accesibilidad
- ❌ Solo soporta mouse
- ✨ Potencial para:
  - Soporte para teclado (teclas numéricas)
  - Modo sin audio
  - Alto contraste para personas con discapacidad visual
  - Descripción de acciones para lectores de pantalla

### Multijugador
- ❌ Solo modo single player
- ✨ Potencial para:
  - Modo competitivo (quien responde más rápido)
  - Modo cooperativo
  - Salas de juego en tiempo real

---

## 13. Puntos Técnicos Destacados

### Gestión de Estado
- Estado de autenticación centralizado en `AuthManager`
- Estado de juego distribuido en managers especializados
- Comunicación entre componentes mediante callbacks

### Rendimiento
- Límite de 20 tarjetas simultáneas para mantener rendimiento
- Destrucción automática de tarjetas fuera de pantalla
- Uso de object pooling implícito en CardSpawner

### Seguridad
- Validación de expiración de tokens JWT
- No hay lógica de backend expuesta
- Variables de entorno para credenciales de OAuth

### Mantenibilidad
- Código modular y desacoplado
- Constantes centralizadas en `utils/constants.ts`
- TypeScript strict mode para catch de errores en tiempo de compilación
- Nombres descriptivos de archivos y clases

---

## 14. Conclusiones

Este proyecto representa un **excelente ejemplo de juego educativo** que combina:

✅ **Tecnologías modernas**
- Phaser 3 (framework de juegos maduro y bien documentado)
- TypeScript (tipado estático para mayor robustez)
- Vite (build tool rápido y eficiente)
- Google OAuth (autenticación profesional)

✅ **Mecánicas de juego sólidas**
- Física de Arcade para movimiento de tarjetas
- Sistema de colisiones preciso
- Feedback inmediato al jugador

✅ **Sistema de progresión pedagógica**
- Orden de tablas basado en dificultad real
- Aumento gradual de velocidad
- Sesiones cortas para mantener atención

✅ **Código limpio y profesional**
- Arquitectura modular
- Separación de responsabilidades
- Patrones de diseño apropiados
- Configuración centralizada

### Objetivo Cumplido
El juego cumple efectivamente su objetivo de **hacer el repaso de tablas de multiplicar entretenido** mediante:
- Mecánicas de shooter accesibles
- Sistema de puntuación motivador
- Progresión adaptativa
- Retroalimentación visual y auditiva inmediata
- Seguimiento de progreso del usuario

---

## 15. Próximos Pasos Sugeridos

1. **Implementar backend** para persistencia de datos
2. **Agregar sistema de estadísticas** por tabla de multiplicar
3. **Crear modo de práctica** sin límite de tiempo
4. **Implementar leaderboards** para competición
5. **Mejorar responsive design** para móviles
6. **Agregar tests unitarios** para mayor confiabilidad
7. **Implementar sistema de logros** para mayor engagement

---

**Analizado por**: Claude (Sonnet 4.5)
**Fecha de análisis**: 18 de octubre de 2025
**Versión del proyecto**: 0.0.0
