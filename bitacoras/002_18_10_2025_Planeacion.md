# Bitácora 002 - 18/10/2025

## Plan de Trabajo: Backend API REST - Desarrollo Incremental

---

## Principios Fundamentales del Plan

1. ✅ **Desarrollo vertical por feature** (frontend + backend juntos)
2. ✅ **Testing manual/automático después de cada incremento**
3. ✅ **No avanzar sin validar integración**
4. ✅ **Despliegue continuo en ambiente de desarrollo**
5. ✅ **Cada incremento debe ser funcional y demostrable**

---

## Decisiones Técnicas

### Framework Backend: **Laravel 11**

#### Justificación:
- **Eloquent ORM**: Relaciones entre tablas elegantes (User → GameSessions → Shots)
- **Laravel Sanctum**: Autenticación API profesional
- **Migraciones**: Control de versiones de base de datos
- **Testing integrado**: PHPUnit para garantizar calidad
- **Ecosistema rico**: Paquetes para OAuth, estadísticas, reportes
- **Escalabilidad**: Preparado para crecimiento futuro
- **API Resources**: Transformación de datos JSON elegante

### Librería HTTP Frontend: **Axios**

#### Justificación:
- Interceptors para autenticación global
- Sintaxis más limpia que fetch
- Manejo de errores centralizado
- TypeScript-friendly
- Configuración de baseURL

**Comando de instalación:** `npm install axios`

---

## Diseño de Base de Datos

### Modelo Entidad-Relación

```
┌─────────────────────────┐
│       users             │
├─────────────────────────┤
│ id (PK)                 │
│ google_id (UNIQUE)      │
│ email                   │
│ name                    │
│ picture                 │
│ profile (ENUM)          │ ← NUEVO
│ created_at              │
│ updated_at              │
└─────────────────────────┘
         │ 1
         │
         ├─────────────────────┐
         │ N                   │ N
         │                     │
┌────────▼─────────────┐  ┌────▼──────────────┐
│   user_logins        │  │  game_sessions    │
├──────────────────────┤  ├───────────────────┤
│ id (PK)              │  │ id (PK)           │
│ user_id (FK)         │  │ user_id (FK)      │
│ logged_in_at         │  │ started_at        │
│ ip_address           │  │ finished_at       │
│ user_agent           │  │ final_score       │
│ created_at           │  │ max_level_reached │
└──────────────────────┘  │ duration_seconds  │
                          │ created_at        │
                          │ updated_at        │
                          └───────────────────┘
                                   │ 1
                                   │
                                   │ N
                          ┌────────▼──────────┐
                          │      shots        │
                          ├───────────────────┤
                          │ id (PK)           │
                          │ game_session_id   │
                          │ shot_at           │
                          │ coordinate_x      │
                          │ coordinate_y      │
                          │ factor_1          │
                          │ factor_2          │
                          │ correct_answer    │
                          │ card_value        │
                          │ is_correct        │
                          │ created_at        │
                          │ updated_at        │
                          └───────────────────┘
```

---

## Descripción de Tablas

### Tabla: `users`
Almacena información básica del usuario autenticado con Google OAuth.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key autoincremental |
| `google_id` | VARCHAR(255) UNIQUE | ID del usuario en Google |
| `email` | VARCHAR(255) | Email del usuario |
| `name` | VARCHAR(255) | Nombre completo |
| `picture` | TEXT | URL de la foto de perfil de Google |
| `profile` | ENUM('student', 'teacher', 'admin') | Tipo de usuario |
| `created_at` | TIMESTAMP | Fecha de registro |
| `updated_at` | TIMESTAMP | Última actualización |

**Índices:**
- PRIMARY KEY: `id`
- UNIQUE: `google_id`
- INDEX: `email`
- INDEX: `profile`

**Valores de `profile`:**
- `student` (por defecto): Puede jugar y ver sus propias estadísticas
- `teacher`: Puede ver estadísticas de estudiantes asignados
- `admin`: Acceso total al sistema

---

### Tabla: `user_logins` ⭐ NUEVA
Registra cada inicio de sesión del usuario para auditoría y análisis.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key autoincremental |
| `user_id` | BIGINT UNSIGNED | FK a tabla users |
| `logged_in_at` | TIMESTAMP | Timestamp del login |
| `ip_address` | VARCHAR(45) NULL | Dirección IP (IPv4/IPv6) |
| `user_agent` | TEXT NULL | Navegador/dispositivo usado |
| `created_at` | TIMESTAMP | Fecha de creación del registro |

**Índices:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- INDEX: `user_id, logged_in_at` (para consultas de historial)

**Propósito:**
- Auditoría de accesos al sistema
- Análisis de frecuencia de uso
- Detección de patrones de uso
- Seguridad (detección de logins sospechosos)

---

### Tabla: `game_sessions`
Representa una sesión de juego de 5 minutos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key autoincremental |
| `user_id` | BIGINT UNSIGNED | FK a tabla users |
| `started_at` | TIMESTAMP | Hora de inicio de la sesión |
| `finished_at` | TIMESTAMP NULL | Hora de finalización (null si en curso) |
| `final_score` | INTEGER | Puntaje final obtenido |
| `max_level_reached` | INTEGER | Nivel máximo alcanzado |
| `duration_seconds` | INTEGER | Duración real de la sesión |
| `created_at` | TIMESTAMP | Fecha de creación del registro |
| `updated_at` | TIMESTAMP | Última actualización |

**Índices:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- INDEX: `user_id, started_at` (para consultas de historial)
- INDEX: `finished_at` (para filtrar sesiones activas/finalizadas)

---

### Tabla: `shots`
Registra cada disparo que impacta un card (correcto o incorrecto).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key autoincremental |
| `game_session_id` | BIGINT UNSIGNED | FK a tabla game_sessions |
| `shot_at` | TIMESTAMP(3) | Timestamp con milisegundos del disparo |
| `coordinate_x` | DECIMAL(8,2) | Coordenada X del disparo (0-1200) |
| `coordinate_y` | DECIMAL(8,2) | Coordenada Y del disparo (0-800) |
| `factor_1` | INTEGER | Primer factor de la multiplicación |
| `factor_2` | INTEGER | Segundo factor de la multiplicación |
| `correct_answer` | INTEGER | Respuesta correcta de la multiplicación |
| `card_value` | INTEGER | Valor del card impactado |
| `is_correct` | BOOLEAN | true si acertó, false si erró |
| `created_at` | TIMESTAMP | Fecha de creación del registro |
| `updated_at` | TIMESTAMP | Última actualización |

**Índices:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `game_session_id` REFERENCES `game_sessions(id)` ON DELETE CASCADE
- INDEX: `game_session_id` (para consultas por sesión)
- INDEX: `is_correct` (para estadísticas de precisión)
- INDEX: `factor_1, factor_2` (para estadísticas por tabla)

---

## Endpoints de la API

### Autenticación
```
POST   /api/auth/verify              - Verificar token de Google y registrar login
```

### Sesiones de Juego
```
POST   /api/sessions                 - Crear nueva sesión de juego
PUT    /api/sessions/{id}/finish     - Finalizar sesión y guardar puntaje
GET    /api/sessions                 - Listar sesiones del usuario (paginado)
GET    /api/sessions/{id}            - Detalle de sesión específica + disparos
```

### Disparos
```
POST   /api/sessions/{id}/shots      - Registrar disparo que impacta card
```

### Estadísticas
```
GET    /api/stats/user               - Estadísticas generales del usuario
GET    /api/stats/tables             - Desempeño por tabla de multiplicar
GET    /api/stats/progress           - Progreso histórico (últimas 10 sesiones)
```

### Administración (solo admin)
```
GET    /api/admin/users              - Listar todos los usuarios
PUT    /api/admin/users/{id}/profile - Cambiar rol de usuario
GET    /api/admin/stats/global       - Estadísticas globales del sistema
```

---

## Incrementos de Desarrollo

### ✅ INCREMENTO 1: Autenticación Completa
**Duración estimada:** 6 horas
**Objetivo:** Usuario puede loguearse con Google OAuth y quedar registrado en la base de datos

#### Backend (2-3 horas)

**Setup inicial:**
- Crear proyecto Laravel 11 en el directorio `multiplicacion-shooter-backend`
- Instalar dependencia `google/apiclient` para verificación de tokens JWT de Google

**Tareas de configuración:**

1. **Configurar variables de entorno (.env):**
   - Configurar conexión a MySQL (host, puerto, nombre de BD, credenciales)
   - Agregar `GOOGLE_CLIENT_ID` para validación de tokens

2. **Configurar CORS:**
   - Modificar archivo `config/cors.php` para permitir peticiones desde frontend (localhost:5173)
   - Habilitar credenciales y todos los métodos HTTP necesarios
   - Exponer rutas `/api/*`

3. **Crear estructura de base de datos:**
   - Generar migración para tabla `users` con campos: google_id (único), email, name, picture, profile (enum)
   - Generar migración para tabla `user_logins` con campos: user_id (FK), logged_in_at, ip_address, user_agent
   - Ejecutar migraciones para crear tablas

4. **Crear modelos Eloquent:**
   - **Modelo User:** Definir campos fillable, relación hasMany con UserLogin, constantes para tipos de perfil (STUDENT, TEACHER, ADMIN), método helper `isAdmin()`
   - **Modelo UserLogin:** Definir campos fillable, casting de fecha para logged_in_at, relación belongsTo con User

5. **Crear servicio de autenticación:**
   - Generar clase `GoogleAuthService` para encapsular lógica de verificación de tokens
   - Implementar método para validar token JWT con librería de Google
   - Extraer información del usuario (sub, email, name, picture) del payload del token

6. **Crear controlador de autenticación:**
   - Generar `AuthController` con método `verify`
   - Validar que el request contenga campo `token` obligatorio
   - Invocar servicio de Google para verificar el token
   - Buscar usuario existente por `google_id` o crear uno nuevo con perfil 'student' por defecto
   - **SIEMPRE** crear registro en `user_logins` con timestamp actual, IP del cliente y user agent
   - Retornar respuesta JSON con éxito y datos del usuario

7. **Definir ruta API:**
   - Registrar endpoint `POST /api/auth/verify` en `routes/api.php`

#### Frontend (2 horas)

**Tareas:**

1. **Instalar Axios:**
   - Ejecutar `npm install axios` en el directorio del frontend

2. **Crear configuración de API:**
   - Crear archivo `src/config/api.ts` con constantes: BASE_URL (usando variable de entorno VITE_API_URL o fallback), TIMEOUT

3. **Crear cliente Axios base:**
   - Crear `src/services/apiService.ts` con instancia de Axios configurada
   - Implementar interceptor de request para agregar token JWT en header `Authorization: Bearer {token}` (obtenido de localStorage)
   - Implementar interceptor de response para manejar errores 401 (token inválido/expirado)

4. **Crear tipos TypeScript:**
   - Definir interface `ApiResponse<T>` genérica con campos success y data
   - Definir interface `UserData` con campos del usuario (id, google_id, email, name, picture, profile, created_at)

5. **Crear servicio de autenticación:**
   - Crear `src/services/authApiService.ts` con método `verifyGoogleToken(token: string)`
   - Método debe hacer POST al endpoint `/auth/verify` y retornar los datos del usuario

6. **Integrar con LoginScene:**
   - Modificar método `handleGoogleCallback` en `LoginScene.ts`
   - Después de procesar login localmente con `AuthManager`, enviar token al backend
   - Guardar `profile` del usuario en localStorage para uso futuro
   - Manejar errores de conexión con mensaje amigable al usuario
   - Transicionar a GameScene después de login exitoso

7. **Actualizar variables de entorno:**
   - Agregar `VITE_API_URL=http://localhost:8000/api` al archivo `.env` del frontend

#### Testing Manual (30 minutos)

**Checklist de validación:**

- [ ] **Primera vez que usuario se loguea:**
  - [ ] Se crea registro en tabla `users` con `profile='student'`
  - [ ] Se crea registro en tabla `user_logins` con timestamp actual
  - [ ] Frontend recibe datos del usuario correctamente
  - [ ] Console muestra: "Usuario registrado en backend: {datos}"

- [ ] **Segunda vez que usuario se loguea (mismo google_id):**
  - [ ] NO se duplica en tabla `users`
  - [ ] SÍ se crea nuevo registro en tabla `user_logins`
  - [ ] Frontend recibe los mismos datos del usuario
  - [ ] `ip_address` y `user_agent` se guardan correctamente

- [ ] **Verificar en base de datos:**
  - [ ] Abrir phpMyAdmin/MySQL Workbench
  - [ ] Ver tabla `users`: debe haber 1 registro
  - [ ] Ver tabla `user_logins`: debe haber N registros (uno por cada login)
  - [ ] Verificar que `user_id` en `user_logins` coincide con `id` en `users`

- [ ] **Manejo de errores:**
  - [ ] Detener servidor Laravel → Frontend muestra mensaje de error
  - [ ] Token inválido → Backend retorna 401/400

#### Testing Automático

**Crear suite de tests en Laravel:**
- Generar `tests/Feature/AuthTest.php` con PHPUnit
- Implementar tests para:
  1. Primer login crea usuario y registro de login
  2. Segundo login NO duplica usuario pero SÍ crea registro de login
  3. Múltiples logins crean múltiples registros en `user_logins`
- Ejecutar tests con `php artisan test --filter AuthTest`

#### ✋ CHECKPOINT 1

**NO AVANZAR AL INCREMENTO 2 SIN VALIDAR:**
- ✅ Todos los tests automáticos pasan
- ✅ Todos los checks del testing manual están completados
- ✅ Base de datos tiene los registros esperados
- ✅ Frontend muestra datos correctamente en consola

---

### ✅ INCREMENTO 2: Crear Sesión de Juego
**Duración estimada:** 4.5 horas
**Objetivo:** Al iniciar el juego, crear una sesión en la base de datos

#### Backend (2 horas)

**Tareas:**

1. **Crear migración de game_sessions:**
   - Generar migración con comando artisan
   - Definir campos: user_id (FK), started_at, finished_at (nullable), final_score, max_level_reached, duration_seconds
   - Agregar índices para optimizar consultas: (user_id, started_at) y finished_at
   - Ejecutar migración

2. **Crear modelo GameSession:**
   - Definir campos fillable
   - Configurar casting de timestamps para started_at y finished_at
   - Implementar relación belongsTo con User
   - Implementar relación hasMany con Shot (para futuro incremento)
   - Agregar método helper `isActive()` que verifica si finished_at es null

3. **Actualizar modelo User:**
   - Agregar relación hasMany con GameSession

4. **Crear middleware de autenticación:**
   - Generar `ValidateGoogleToken` middleware
   - Extraer token del header `Authorization: Bearer`
   - Verificar token con servicio de Google
   - Buscar usuario en BD por google_id del token
   - Agregar usuario autenticado al request para uso en controladores
   - Retornar error 401 si token inválido o usuario no existe

5. **Registrar middleware:**
   - Agregar alias `auth.google` para el middleware en `bootstrap/app.php`

6. **Crear request de validación:**
   - Generar `CreateSessionRequest`
   - Definir regla: campo `started_at` es requerido y debe ser fecha válida

7. **Crear controlador de sesiones:**
   - Generar `GameSessionController`
   - Implementar método `store` que:
     - Obtiene usuario autenticado del request
     - Crea registro de GameSession con user_id y started_at
     - Retorna respuesta JSON con status 201 y datos de la sesión creada

8. **Definir ruta protegida:**
   - Registrar `POST /api/sessions` dentro de grupo con middleware `auth.google`

#### Frontend (2 horas)

**Tareas:**

1. **Crear tipos TypeScript:**
   - Agregar interface `GameSessionData` en `src/types/api.ts` con todos los campos de una sesión

2. **Crear servicio de sesiones:**
   - Crear `src/services/sessionApiService.ts`
   - Implementar método `createSession(startedAt: string)` que hace POST a `/sessions`

3. **Modificar GameScene:**
   - Agregar propiedad privada `sessionId: number | null` a la clase
   - En método `create()`, llamar servicio para crear sesión en backend
   - Pasar timestamp actual en formato ISO
   - Almacenar `sessionId` retornado para uso posterior
   - Si falla la creación, mostrar mensaje de error al usuario pero permitir continuar jugando
   - Loguear en console el ID de sesión creado

#### Testing Manual (30 minutos)

**Checklist de validación:**

- [ ] **Al iniciar el juego:**
  - [ ] Console muestra: "Sesión de juego creada: {id}"
  - [ ] Se crea registro en tabla `game_sessions`
  - [ ] `user_id` corresponde al usuario logueado
  - [ ] `started_at` tiene timestamp actual
  - [ ] `finished_at` es NULL
  - [ ] `final_score` es 0
  - [ ] `max_level_reached` es 1

- [ ] **Múltiples inicios de juego:**
  - [ ] Cada inicio crea nueva sesión
  - [ ] IDs son secuenciales
  - [ ] Todas las sesiones pertenecen al usuario correcto

- [ ] **Usuario no autenticado:**
  - [ ] Si no hay token → error 401
  - [ ] Frontend maneja el error apropiadamente

- [ ] **Verificar en base de datos:**
  - [ ] phpMyAdmin/Workbench → tabla `game_sessions`
  - [ ] Verificar relación con `users`

#### Testing Automático

**Crear tests:**
- Generar `tests/Feature/GameSessionTest.php`
- Implementar tests para:
  1. Usuario autenticado puede crear sesión
  2. Usuario no autenticado NO puede crear sesión (recibe 401)
  3. Sesión creada pertenece al usuario correcto
- Ejecutar con `php artisan test --filter GameSessionTest`

#### ✋ CHECKPOINT 2

**NO AVANZAR AL INCREMENTO 3 SIN VALIDAR:**
- ✅ Todos los tests automáticos pasan
- ✅ Sesión se crea correctamente en BD
- ✅ Frontend recibe y almacena sessionId
- ✅ Console muestra sessionId claramente

---

### ✅ INCREMENTO 3: Registrar Disparos
**Duración estimada:** 7 horas
**Objetivo:** Cada disparo que impacta un card queda registrado en la base de datos

#### Backend (2-3 horas)

**Tareas:**

1. **Crear migración de shots:**
   - Generar migración con campos: game_session_id (FK), shot_at (timestamp con precisión de milisegundos), coordinate_x, coordinate_y (decimales), factor_1, factor_2, correct_answer, card_value, is_correct (booleano)
   - Agregar índices: game_session_id, is_correct, (factor_1, factor_2)
   - Ejecutar migración

2. **Crear modelo Shot:**
   - Definir fillable con todos los campos
   - Configurar castings: shot_at como datetime, is_correct como boolean, coordenadas como float
   - Implementar relación belongsTo con GameSession

3. **Crear request de validación:**
   - Generar `RecordShotRequest`
   - Definir reglas: todos los campos requeridos con sus tipos y rangos apropiados (ej: coordenadas entre 0-1200/0-800, factores entre 1-12)

4. **Crear controlador de disparos:**
   - Generar `ShotController`
   - Implementar método `store` que:
     - Recibe sessionId como parámetro de ruta
     - Busca la sesión en BD
     - Valida que la sesión existe (404 si no)
     - Valida que la sesión pertenece al usuario autenticado (403 si no)
     - Valida que la sesión está activa usando `isActive()` (400 si finalizó)
     - Crea registro de Shot con todos los datos del disparo
     - Retorna respuesta JSON con status 201 y datos del disparo

5. **Definir ruta protegida:**
   - Registrar `POST /api/sessions/{id}/shots` dentro de grupo con middleware `auth.google`

#### Frontend (3 horas)

**Tareas:**

1. **Crear tipos TypeScript:**
   - Agregar interface `ShotData` con campos de respuesta
   - Agregar interface `RecordShotPayload` con campos de request

2. **Crear servicio de disparos:**
   - Crear `src/services/shotApiService.ts`
   - Implementar método `recordShot(sessionId, shotData)` que hace POST a `/sessions/{id}/shots`

3. **Modificar GameScene:**
   - Importar servicio de disparos
   - Modificar método `onShoot()` para que SOLO si impacta un card:
     - Registre el disparo en backend de forma asíncrona
     - Envíe todos los datos: timestamp, coordenadas, factores, respuesta correcta, valor del card, si es correcto
     - Capture errores sin interrumpir el juego
     - Loguee en console confirmación de registro

4. **Actualizar QuestionGenerator:**
   - Agregar propiedad privada `currentQuestion` para almacenar pregunta actual
   - Modificar `generateQuestion()` para guardar la pregunta generada
   - Agregar método público `getCurrentQuestion()` para que GameScene pueda acceder a los factores y respuesta

#### Testing Manual (1 hora)

**Checklist de validación:**

- [ ] **Disparo correcto a card:**
  - [ ] Se crea registro en tabla `shots`
  - [ ] `is_correct` es `true`
  - [ ] `card_value` = `correct_answer`
  - [ ] Coordenadas X, Y correctas
  - [ ] `factor_1`, `factor_2`, `correct_answer` correctos
  - [ ] Console muestra: "Disparo registrado en backend"

- [ ] **Disparo incorrecto a card:**
  - [ ] Se crea registro en tabla `shots`
  - [ ] `is_correct` es `false`
  - [ ] `card_value` ≠ `correct_answer`
  - [ ] Resto de datos correctos

- [ ] **Disparo al aire (sin impactar card):**
  - [ ] NO se crea registro en tabla `shots`
  - [ ] Juego continúa normal

- [ ] **Múltiples disparos en una sesión:**
  - [ ] Todos tienen el mismo `game_session_id`
  - [ ] Timestamps son secuenciales
  - [ ] Contador de registros aumenta correctamente

- [ ] **Sesión finalizada:**
  - [ ] Si intentamos registrar disparo → error 400
  - [ ] Frontend maneja el error sin romper el juego

- [ ] **Sesión de otro usuario:**
  - [ ] No se puede registrar disparo → error 403

- [ ] **Verificar en base de datos:**
  - [ ] Ver tabla `shots`
  - [ ] Verificar relación con `game_sessions`
  - [ ] Timestamp con precisión de milisegundos

#### Testing Automático

**Crear tests:**
- Generar `tests/Feature/ShotTest.php`
- Implementar tests para:
  1. Puede registrar disparo correcto
  2. Puede registrar disparo incorrecto
  3. NO puede registrar disparo en sesión finalizada (400)
  4. NO puede registrar disparo en sesión de otro usuario (403)
- Ejecutar con `php artisan test --filter ShotTest`

#### ✋ CHECKPOINT 3

**NO AVANZAR AL INCREMENTO 4 SIN VALIDAR:**
- ✅ Todos los tests automáticos pasan
- ✅ Disparos correctos e incorrectos se registran
- ✅ Disparos al aire NO se registran
- ✅ Validaciones de seguridad funcionan (sesión finalizada, otro usuario)
- ✅ Console muestra confirmación de registro

---

### ✅ INCREMENTO 4: Finalizar Sesión
**Duración estimada:** 4.5 horas
**Objetivo:** Al terminar la sesión de 5 minutos, guardar el puntaje final y estadísticas

#### Backend (2 horas)

**Tareas:**

1. **Crear request de validación:**
   - Generar `FinishSessionRequest`
   - Definir reglas: finished_at (fecha), final_score (entero ≥0), max_level_reached (entero ≥1), duration_seconds (entero 0-600)

2. **Implementar método finish en GameSessionController:**
   - Recibir sessionId como parámetro de ruta
   - Buscar sesión en BD
   - Validar que existe (404 si no)
   - Validar que pertenece al usuario autenticado (403 si no)
   - Validar que está activa usando `isActive()` (400 si ya finalizó)
   - Actualizar campos: finished_at, final_score, max_level_reached, duration_seconds
   - Calcular estadísticas automáticamente: total_shots, correct_shots, wrong_shots, accuracy (consultando tabla shots)
   - Retornar respuesta JSON con datos actualizados + estadísticas calculadas

3. **Definir ruta protegida:**
   - Registrar `PUT /api/sessions/{id}/finish` dentro de grupo con middleware `auth.google`

#### Frontend (2 horas)

**Tareas:**

1. **Crear tipos TypeScript:**
   - Agregar interface `FinishSessionPayload` con campos del request
   - Agregar interface `FinishedSessionData` extendiendo `GameSessionData` con campos adicionales de estadísticas

2. **Actualizar servicio de sesiones:**
   - Agregar método `finishSession(sessionId, finishData)` que hace PUT a `/sessions/{id}/finish`

3. **Modificar GameScene:**
   - Modificar método `endSession()` para:
     - Detener spawn de tarjetas y cancelar timers
     - Si existe sessionId, llamar servicio para finalizar sesión
     - Enviar: timestamp actual, puntaje final, nivel máximo alcanzado, duración en segundos
     - Con datos del backend, mostrar pantalla de resumen con estadísticas
     - Si falla backend, mostrar resumen con datos locales como fallback
     - Loguear en console datos de sesión finalizada

4. **Crear método de pantalla de resumen:**
   - Crear `showSessionSummary(sessionData)` que usa datos del backend
   - Mostrar overlay oscuro
   - Mostrar estadísticas: puntaje, nivel, tabla actual, disparos totales, aciertos/errores, precisión, tiempo
   - Agregar botón para reiniciar juego
   - Crear método alternativo `showSessionSummaryLocal()` para fallback con datos locales

#### Testing Manual (30 minutos)

**Checklist de validación:**

- [ ] **Al finalizar sesión (5 minutos):**
  - [ ] `finished_at` actualizado en tabla `game_sessions`
  - [ ] `final_score` correcto
  - [ ] `max_level_reached` correcto
  - [ ] `duration_seconds` ≈ 300 segundos
  - [ ] Console muestra: "Sesión finalizada en backend: {datos}"

- [ ] **Pantalla de resumen:**
  - [ ] Muestra datos del backend (no locales)
  - [ ] Total de disparos correcto
  - [ ] Aciertos y errores correctos
  - [ ] Precisión calculada correctamente
  - [ ] Tiempo mostrado en formato MM:SS

- [ ] **Intentar finalizar sesión ya finalizada:**
  - [ ] Backend retorna error 400
  - [ ] Frontend maneja el error

- [ ] **Intentar registrar disparo después de finalizar:**
  - [ ] Backend retorna error 400
  - [ ] No se crea registro en tabla `shots`

- [ ] **Verificar en base de datos:**
  - [ ] `finished_at` NO es NULL
  - [ ] Todos los campos actualizados
  - [ ] Sesión marcada como inactiva

#### Testing Automático

**Crear tests:**
- Generar `tests/Feature/FinishSessionTest.php`
- Implementar tests para:
  1. Puede finalizar sesión con datos correctos
  2. NO puede finalizar sesión ya finalizada (400)
  3. NO puede finalizar sesión de otro usuario (403)
  4. Calcula precisión correctamente (crear shots de prueba y verificar cálculo)
- Ejecutar con `php artisan test --filter FinishSessionTest`

#### ✋ CHECKPOINT 4

**NO AVANZAR AL INCREMENTO 5 SIN VALIDAR:**
- ✅ Todos los tests automáticos pasan
- ✅ Sesión se finaliza correctamente
- ✅ Estadísticas calculadas automáticamente
- ✅ Pantalla de resumen muestra datos del backend
- ✅ No se pueden registrar disparos después de finalizar

---

### ✅ INCREMENTO 5: Estadísticas Básicas
**Duración estimada:** 7 horas
**Objetivo:** Ver historial de sesiones del usuario autenticado

#### Backend (3 horas)

**Tareas:**

1. **Crear API Resources:**
   - Generar `GameSessionResource` y `ShotResource`
   - En GameSessionResource:
     - Definir transformación de datos de sesión
     - Incluir campos calculados: total_shots, correct_shots, accuracy (consultando relación shots)
     - Implementar método privado `calculateAccuracy()` para reutilización
   - En ShotResource:
     - Definir transformación de datos de disparo con campos relevantes

2. **Implementar método index en GameSessionController:**
   - Obtener usuario autenticado
   - Consultar sesiones del usuario ordenadas por started_at descendente
   - Paginar resultados (10 por página)
   - Retornar colección usando GameSessionResource

3. **Implementar método show en GameSessionController:**
   - Recibir sessionId como parámetro
   - Consultar sesión con eager loading de shots
   - Validar que pertenece al usuario autenticado (404 si no existe o no es suya)
   - Retornar respuesta JSON con session (usando Resource) y shots (colección usando Resource)

4. **Definir rutas protegidas:**
   - Registrar `GET /api/sessions` para listado
   - Registrar `GET /api/sessions/{id}` para detalle

#### Frontend (3 horas)

**Tareas:**

1. **Crear tipos TypeScript:**
   - Agregar interface `SessionListItem` con campos de sesión + estadísticas calculadas
   - Agregar interface `SessionDetail` con session y array de shots

2. **Actualizar servicio de sesiones:**
   - Agregar método `getSessions(page)` que hace GET a `/sessions?page={page}`
   - Agregar método `getSessionDetail(sessionId)` que hace GET a `/sessions/{id}`

3. **Crear nueva escena de estadísticas:**
   - Crear archivo `src/scenes/StatsScene.ts`
   - Implementar scene con:
     - Fondo y título "HISTORIAL DE SESIONES"
     - Botón para volver al juego
     - Método `loadSessions()` que carga sesiones del backend
     - Método `displaySessions()` que renderiza lista de sesiones con datos resumidos (fecha, hora, puntaje, nivel, precisión, disparos)
     - Hacer cada sesión clickeable para ver detalle
     - Método `showSessionDetail(sessionId)` que carga y muestra modal con información completa
     - Método `showDetailModal(detail)` que renderiza overlay con estadísticas detalladas y lista de disparos
     - Manejar errores de carga con mensajes apropiados

4. **Registrar escena:**
   - Agregar `StatsScene` al array de scenes en `gameConfig.ts`

5. **Agregar navegación:**
   - En GameScene, agregar botón "Ver Estadísticas" que transiciona a StatsScene

#### Testing Manual (1 hora)

**Checklist de validación:**

- [ ] **Listado de sesiones:**
  - [ ] Se muestran todas las sesiones del usuario
  - [ ] Orden descendente (más reciente primero)
  - [ ] Datos mostrados correctamente
  - [ ] Paginación funciona (si hay más de 10)

- [ ] **Detalle de sesión:**
  - [ ] Click en sesión abre modal
  - [ ] Muestra todos los datos
  - [ ] Cantidad de disparos correcta
  - [ ] Botón cerrar funciona

- [ ] **Performance:**
  - [ ] Lista carga en < 1 segundo
  - [ ] Detalle carga en < 500ms

- [ ] **Seguridad:**
  - [ ] Solo se muestran sesiones del usuario autenticado
  - [ ] No se pueden ver sesiones de otros usuarios

#### Testing Automático

**Crear tests:**
- Implementar tests para:
  1. Usuario puede ver sus propias sesiones
  2. Usuario NO puede ver sesiones de otros usuarios
- Ejecutar tests

#### ✋ CHECKPOINT 5

**NO AVANZAR AL INCREMENTO 6 SIN VALIDAR:**
- ✅ Listado de sesiones funciona
- ✅ Detalle de sesión muestra disparos
- ✅ Solo se muestran datos del usuario autenticado
- ✅ Performance aceptable

---

### ✅ INCREMENTO 6: Estadísticas Avanzadas
**Duración estimada:** 8 horas
**Objetivo:** Análisis de desempeño por tabla de multiplicar

#### Backend (4 horas)

**Tareas:**

1. **Crear servicio de estadísticas:**
   - Generar clase `StatsService` para encapsular lógica de cálculos complejos
   - Implementar método `getUserStats(user)` que:
     - Consulta todas las sesiones del usuario
     - Calcula estadísticas globales: total_sessions, total_shots, total_correct, total_wrong, overall_accuracy, average_score, best_score, total_playtime_minutes
     - Retorna array asociativo con todas las métricas

2. **Implementar análisis por tabla:**
   - En StatsService, agregar método `getTableStats(user)` que:
     - Para cada tabla del 1 al 10:
       - Consulta shots donde factor_1 o factor_2 sea igual a la tabla
       - Cuenta total de intentos, aciertos y errores
       - Calcula precisión porcentual
     - Ordena tablas por precisión ascendente (identificar tablas más difíciles)
     - Retorna array de estadísticas por tabla

3. **Implementar historial de progreso:**
   - En StatsService, agregar método `getProgressHistory(user, limit)` que:
     - Consulta últimas N sesiones finalizadas del usuario
     - Para cada sesión calcula accuracy
     - Retorna array ordenado cronológicamente (más antiguo primero) para graficar evolución

4. **Crear controlador de estadísticas:**
   - Generar `StatsController` con inyección de dependencia de StatsService
   - Implementar método `userStats` que retorna estadísticas generales
   - Implementar método `tableStats` que retorna análisis por tabla
   - Implementar método `progress` que retorna historial (con parámetro opcional limit)

5. **Definir rutas protegidas:**
   - Registrar `GET /api/stats/user`
   - Registrar `GET /api/stats/tables`
   - Registrar `GET /api/stats/progress`

#### Frontend (3 horas)

**Tareas:**

1. **Crear tipos TypeScript:**
   - Agregar interface `UserStats` con todas las métricas globales
   - Agregar interface `TableStat` con datos por tabla (table, total_attempts, correct_attempts, wrong_attempts, accuracy)

2. **Crear servicio de estadísticas:**
   - Crear `src/services/statsApiService.ts`
   - Implementar método `getUserStats()` que hace GET a `/stats/user`
   - Implementar método `getTableStats()` que hace GET a `/stats/tables`

3. **Actualizar StatsScene:**
   - Agregar método `loadAdvancedStats()` que:
     - Carga estadísticas generales y por tabla en paralelo
     - Invoca métodos de renderizado con datos obtenidos
   - Implementar método `displayUserStats(stats)` que:
     - Renderiza texto con todas las métricas globales formateadas
   - Implementar método `displayTableStats(stats)` que:
     - Renderiza lista de tablas con precisión
     - Usa color verde para tablas con >70% precisión, rojo para <70%
     - Resalta la tabla más difícil con icono de advertencia
   - Manejar errores de carga

#### Testing Manual (1 hora)

**Checklist:**
- [ ] Estadísticas generales correctas
- [ ] Tabla más difícil identificada
- [ ] Performance < 1 segundo
- [ ] Colores apropiados por precisión

#### ✋ CHECKPOINT 6

**NO AVANZAR AL INCREMENTO 7 SIN VALIDAR:**
- ✅ Estadísticas globales se calculan correctamente
- ✅ Análisis por tabla funciona
- ✅ Tabla más difícil se identifica correctamente
- ✅ Performance aceptable

---

### ✅ INCREMENTO 7: Panel de Admin (Opcional)
**Duración estimada:** 7 horas
**Objetivo:** Admin puede ver todos los usuarios y cambiar roles

#### Backend (3 horas)

**Descripción general:**
- Crear middleware `RequireAdmin` que valida que el usuario autenticado tiene `profile='admin'`
- Crear `AdminController` con métodos para:
  - Listar todos los usuarios con paginación y búsqueda
  - Cambiar rol/perfil de un usuario
  - Ver estadísticas globales del sistema (total usuarios, sesiones, disparos, tablas más practicadas)
- Definir rutas bajo `/api/admin/*` protegidas con middleware de admin
- Crear tests para verificar que solo admins pueden acceder

#### Frontend (3 horas)

**Descripción general:**
- Crear `AdminScene` con:
  - Listado de usuarios con filtros
  - Modal para cambiar perfil de usuario
  - Panel de estadísticas globales
  - Gráficos de uso del sistema
- Agregar botón "Panel Admin" en GameScene solo visible para usuarios con `profile='admin'`
- Implementar confirmaciones para acciones sensibles

#### Testing (1 hora)

**Descripción general:**
- Validar que usuarios no-admin no pueden acceder a endpoints de admin (403)
- Validar que admin puede cambiar roles correctamente
- Validar que estadísticas globales se calculan bien

---

## Resumen de Estimación de Tiempo

| # | Incremento | Backend | Frontend | Testing | Total |
|---|-----------|---------|----------|---------|-------|
| 1 | Autenticación + Logins | 3h | 2h | 1h | 6h |
| 2 | Crear Sesión | 2h | 2h | 0.5h | 4.5h |
| 3 | Registrar Disparos | 3h | 3h | 1h | 7h |
| 4 | Finalizar Sesión | 2h | 2h | 0.5h | 4.5h |
| 5 | Estadísticas Básicas | 3h | 3h | 1h | 7h |
| 6 | Estadísticas Avanzadas | 4h | 3h | 1h | 8h |
| 7 | Panel Admin (opcional) | 3h | 3h | 1h | 7h |

**TOTAL SIN ADMIN:** 37 horas (≈ 5 días laborales)
**TOTAL CON ADMIN:** 44 horas (≈ 6 días laborales)

---

## Workflow Diario Recomendado

**Cada día:**
1. ⚙️ Desarrollar backend del incremento (2-4h)
2. ✅ Ejecutar tests automáticos backend (`php artisan test`)
3. 🎮 Desarrollar frontend del incremento (2-3h)
4. 🧪 Testing manual de integración (30min-1h)
5. 📝 Documentar progreso en bitácora
6. ✋ **CHECKPOINT:** Validar antes de avanzar

---

## Herramientas de Testing

### Backend
- **PHPUnit**: Tests automáticos
  - `php artisan test` (todos los tests)
  - `php artisan test --filter AuthTest` (test específico)
- **Postman/Insomnia**: Probar endpoints manualmente
- **Laravel Log**: `storage/logs/laravel.log` para debugging

### Frontend
- **Browser DevTools**: Network tab para ver requests/responses
- **Console**: Verificar logs y errores JavaScript
- **Vue DevTools / React DevTools**: Si se agregan después

### Base de Datos
- **phpMyAdmin**: Interfaz web para MySQL
- **MySQL Workbench**: Cliente desktop profesional
- **TablePlus**: Cliente moderno multiplataforma

---

## Próximos Pasos Inmediatos

1. ✅ Aprobar este plan de trabajo
2. ✅ Confirmar Laravel 11 como framework backend
3. ✅ Configurar entorno de desarrollo local:
   - Instalar PHP 8.2+, Composer, MySQL
   - Crear proyecto Laravel 11
   - Crear base de datos `multiplication_shooter`
   - Configurar archivo `.env` con credenciales
4. ✅ Iniciar **INCREMENTO 1: Autenticación**

---

**Documento creado por:** Claude (Sonnet 4.5)
**Fecha:** 18 de octubre de 2025
**Versión:** 2.0
**Estado:** Listo para implementación

**Changelog v2.0:**
- ✅ Transformado de tutorial con código a documento de planeación
- ✅ Reemplazados bloques de código por descripciones detalladas
- ✅ Mantenida estructura de incrementos y checkpoints
- ✅ Conservadas justificaciones técnicas y objetivos
