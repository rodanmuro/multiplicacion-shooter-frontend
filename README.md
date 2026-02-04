# Multiplication Shooter - Frontend

Juego educativo para practicar las tablas de multiplicar, desarrollado con Phaser 3 y TypeScript.

## Descripcion del Proyecto

**Multiplication Shooter** es un juego tipo shooter donde los estudiantes practican las tablas de multiplicar disparando a tarjetas con numeros. El objetivo es seleccionar la respuesta correcta a las multiplicaciones mostradas en pantalla.

### Caracteristicas principales

- Sesiones de juego de 5 minutos
- Sistema de progresion por niveles
- Tablas ordenadas por dificultad (1, 10, 2, 5, 3, 4, 6, 7, 8, 9)
- Velocidad adaptativa que aumenta con el nivel
- Autenticacion con Google OAuth
- Estadisticas e historial de partidas
- Panel de administracion para gestionar usuarios

## Tecnologias

- **Phaser 3:** 3.90.0 - Framework de juegos 2D
- **TypeScript:** 5.9.3 - Tipado estatico
- **Vite:** 7.1.x - Build tool y servidor de desarrollo
- **Axios:** 1.12.x - Cliente HTTP
- **jwt-decode:** 4.0.0 - Decodificacion de tokens JWT

## Requisitos Previos

- Node.js 18+ (recomendado 22.x)
- npm 9+
- Backend corriendo en `http://localhost:8000` (ver repositorio backend)

## Instalacion

### 1. Clonar el repositorio

```bash
git clone git@github.com:rodanmuro/multiplicacion-shooter-frontend.git
cd multiplicacion-shooter-frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la raiz del proyecto:

```env
VITE_GOOGLE_CLIENT_ID=tu_google_client_id
VITE_API_URL=http://localhost:8000/api
```

**Nota:** El `GOOGLE_CLIENT_ID` debe ser el mismo configurado en el backend.

## Levantar la Aplicacion

### Desarrollo local

```bash
npm run dev
```

La aplicacion estara disponible en `http://localhost:5173`

### Build de produccion

```bash
npm run build
```

Los archivos compilados se generan en la carpeta `dist/`

### Preview del build

```bash
npm run preview
```

## Como Jugar

1. **Login:** Inicia sesion con tu cuenta de Google
2. **Seleccionar dificultad:** Elige entre facil, medio o dificil
3. **Jugar:** Dispara (click) a las tarjetas con la respuesta correcta
4. **Puntuacion:**
   - Respuesta correcta: **+10 puntos**
   - Respuesta incorrecta: **-5 puntos**
5. **Progresion:** Cada 40 puntos subes de nivel
6. **Duracion:** Cada sesion dura 5 minutos

### Controles

- **Mouse:** Apuntar con la mira
- **Click izquierdo:** Disparar

## Estructura del Proyecto

```
src/
├── scenes/                    # Escenas de Phaser
│   ├── PreloadScene.ts       # Carga de assets
│   ├── LoginScene.ts         # Pantalla de login
│   ├── GameScene.ts          # Escena principal del juego
│   ├── StatsScene.ts         # Historial de estadisticas
│   └── AdminScene.ts         # Panel de administracion
│
├── entities/                  # Entidades del juego
│   ├── Card.ts               # Tarjeta con numero
│   ├── Crosshair.ts          # Mira del jugador
│   └── ShotMarker.ts         # Marcador de disparo
│
├── systems/                   # Sistemas de logica
│   ├── QuestionGenerator.ts  # Generador de preguntas
│   ├── CardSpawner.ts        # Aparicion de tarjetas
│   └── ScoreManager.ts       # Gestion de puntuacion
│
├── managers/                  # Gestores globales (Singleton)
│   ├── AuthManager.ts        # Autenticacion OAuth
│   ├── ProgressionManager.ts # Niveles y progresion
│   └── AudioManager.ts       # Efectos de sonido
│
├── components/                # Componentes UI del canvas
│   ├── QuestionDisplay.ts    # Muestra la pregunta
│   ├── ScoreDisplay.ts       # Muestra puntuacion
│   ├── QuestionTimer.ts      # Timer por pregunta
│   ├── SessionTimer.ts       # Timer de sesion
│   └── UserDisplay.ts        # Info del usuario
│
├── services/                  # Servicios de API
│   ├── apiService.ts         # Cliente HTTP base
│   ├── authApiService.ts     # Autenticacion
│   ├── sessionApiService.ts  # Sesiones de juego
│   ├── shotApiService.ts     # Registro de disparos
│   └── adminApiService.ts    # Administracion
│
├── ui/                        # Elementos UI (HTML)
│   └── UserMenu.ts           # Menu de usuario
│
├── types/                     # Definiciones TypeScript
│   ├── index.ts              # Tipos del juego
│   ├── api.ts                # Tipos de la API
│   └── auth.ts               # Tipos de autenticacion
│
├── utils/
│   └── constants.ts          # Configuracion del juego
│
├── config/
│   ├── gameConfig.ts         # Configuracion de Phaser
│   └── api.ts                # Configuracion de API
│
└── main.ts                    # Punto de entrada
```

## Configuracion del Juego

Las constantes principales estan en `src/utils/constants.ts`:

### Puntuacion
```typescript
CORRECT_HIT: 10    // Puntos por acierto
WRONG_HIT: -5      // Puntos por error
```

### Tarjetas
```typescript
MAX_CARDS_ON_SCREEN: 20        // Maximo en pantalla
SPAWN_INTERVAL: 500            // Intervalo de aparicion (ms)
CORRECT_CARD_PROBABILITY: 0.4  // 40% correctas
```

### Progresion
```typescript
POINTS_PER_LEVEL: 40           // Puntos para subir nivel
TABLE_ORDER: [1, 10, 2, 5, 3, 4, 6, 7, 8, 9]  // Orden de tablas
```

### Sesion
```typescript
SESSION_DURATION: 300000       // 5 minutos en ms
```

## Flujo de Escenas

```
PreloadScene (carga assets)
       │
       ├─→ Usuario autenticado? → GameScene
       │
       └─→ No autenticado → LoginScene
                               │
                            Login OK
                               │
                               ▼
                           GameScene ←──→ StatsScene
                               │
                               └────────→ AdminScene (solo admin)
```

## Integracion con Backend

El frontend se comunica con el backend via API REST:

| Accion | Endpoint | Momento |
|--------|----------|---------|
| Login | POST `/auth/verify` | Al autenticarse con Google |
| Crear sesion | POST `/sessions` | Al iniciar partida |
| Registrar disparo | POST `/sessions/{id}/shots` | Al impactar tarjeta |
| Finalizar sesion | PUT `/sessions/{id}/finish` | Al terminar los 5 min |
| Ver historial | GET `/sessions` | En StatsScene |

## Despliegue en Produccion

### 1. Crear archivo `.env.production`

```env
VITE_API_URL=https://tu-dominio.com/api
VITE_GOOGLE_CLIENT_ID=tu_google_client_id
```

### 2. Configurar `vite.config.ts`

```typescript
export default defineConfig({
  base: '/ruta-en-servidor/',  // Si esta en subdirectorio
  build: {
    outDir: 'dist',
    minify: 'esbuild'
  }
})
```

### 3. Build y deploy

```bash
npm run build
# Subir contenido de dist/ al servidor
```

Ver bitacora: `bitacoras/009_28_10_2025_Despliegue_Produccion_vite_google_oauth.md`

## Google OAuth Setup

1. Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crear credenciales OAuth 2.0
3. Configurar **Origenes autorizados de JavaScript:**
   - `http://localhost:5173` (desarrollo)
   - `https://tu-dominio.com` (produccion)
4. Copiar el Client ID al archivo `.env`

## Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo

# Build
npm run build        # Compilar para produccion
npm run preview      # Preview del build

# Linting
npm run lint         # Ejecutar ESLint
```

## Bitacoras de Desarrollo

El desarrollo se documento en incrementos:

1. `001` - Analisis inicial del proyecto
2. `002` - Planeacion del desarrollo
3. `003` - Integracion Axios y login
4. `004` - Crear sesion en backend
5. `005` - Registrar disparos
6. `006` - Finalizar sesion y resumen
7. `007` - Historial y estadisticas UI
8. `008` - Panel de administracion
9. `009` - Despliegue a produccion

## Resolucion de Problemas

### El login con Google no funciona

1. Verificar que el `GOOGLE_CLIENT_ID` es correcto
2. Verificar que el origen esta autorizado en Google Console
3. Revisar la consola del navegador para errores

### No se conecta al backend

1. Verificar que el backend esta corriendo
2. Verificar `VITE_API_URL` en `.env`
3. Verificar configuracion CORS en el backend

### Los sonidos no funcionan

Los navegadores bloquean autoplay de audio. El usuario debe interactuar con la pagina primero (click en login o play).

## Licencia

Proyecto educativo desarrollado para el Colegio CEVU.
