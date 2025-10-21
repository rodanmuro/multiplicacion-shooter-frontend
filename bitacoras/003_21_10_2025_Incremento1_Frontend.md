# Bitácora 003 - 18/10/2025

## INCREMENTO 1 - Frontend: Integración con Backend para Autenticación

---

## Objetivo del Incremento

Integrar el frontend con el backend para que al hacer login con Google OAuth:
1. El token se envíe al backend
2. Se cree/actualice el usuario en la tabla `users`
3. Se registre el login en la tabla `user_logins`
4. Se guarde el perfil del usuario (student/teacher/admin)

---

## ✅ Tareas Completadas

### 1. Instalación de Axios (v1.12.2)

**Instalado manualmente por el usuario**

Verificación en [package.json](../package.json):
```json
"dependencies": {
  "axios": "^1.12.2",
  "jwt-decode": "^4.0.0",
  "phaser": "^3.90.0"
}
```

---

### 2. Archivo de Configuración API

**Archivo creado:** [src/config/api.ts](../src/config/api.ts)

```typescript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 10000, // 10 segundos
};
```

**Propósito:**
- Centralizar la configuración de la API
- Usar variables de entorno para flexibilidad

---

### 3. Servicio API Base con Interceptores

**Archivo creado:** [src/services/apiService.ts](../src/services/apiService.ts)

**Características implementadas:**

#### Interceptor de Request:
- Agrega automáticamente el token `Authorization: Bearer {token}`
- Logs de todas las peticiones en consola
- Soporte para CORS con credenciales

#### Interceptor de Response:
- Manejo centralizado de errores HTTP
- Mensajes específicos por código de error:
  - `401`: Token inválido/expirado
  - `403`: Acceso prohibido
  - `404`: Recurso no encontrado
  - `500`: Error del servidor
- Logs de todas las respuestas

**Configuración:**
```typescript
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});
```

---

### 4. Tipos TypeScript para API

**Archivo creado:** [src/types/api.ts](../src/types/api.ts)

**Interfaces definidas:**

#### Autenticación
- `ApiResponse<T>`: Respuesta genérica de la API
- `UserData`: Datos del usuario autenticado

#### Sesiones de Juego
- `GameSessionData`: Datos de sesión
- `FinishedSessionData`: Sesión finalizada con estadísticas

#### Disparos
- `ShotData`: Datos de un disparo
- `RecordShotPayload`: Payload para registrar disparo

#### Estadísticas
- `UserStats`: Estadísticas generales
- `TableStat`: Estadísticas por tabla de multiplicar
- `SessionListItem`: Item de lista de sesiones
- `SessionDetail`: Detalle de sesión con disparos

**Total:** 12 interfaces definidas para tipado fuerte

---

### 5. Servicio de Autenticación

**Archivo creado:** [src/services/authApiService.ts](../src/services/authApiService.ts)

**Método implementado:**

```typescript
async verifyGoogleToken(token: string): Promise<UserData>
```

**Funcionalidad:**
- Envía el JWT de Google al backend
- Endpoint: `POST /api/auth/verify`
- Retorna datos del usuario (incluyendo `profile`)

**Flujo:**
1. Recibe token JWT de Google
2. Hace POST a `/api/auth/verify`
3. Backend valida token
4. Backend crea/actualiza usuario
5. Backend registra login en `user_logins`
6. Retorna datos del usuario

---

### 6. Integración con LoginScene

**Archivo modificado:** [src/scenes/LoginScene.ts](../src/scenes/LoginScene.ts)

**Cambios realizados:**

#### Import agregado:
```typescript
import { authApiService } from '../services/authApiService';
```

#### Método `handleGoogleCallback` modificado:

**ANTES:** Solo procesaba localmente con `AuthManager`

**AHORA:** Flujo completo de autenticación:

```typescript
private async handleGoogleCallback(response: GoogleCredentialResponse): Promise<void> {
  try {
    // 1. Procesar con AuthManager (local)
    const success = this.authManager.login(response.credential);

    // 2. Enviar al backend
    const userData = await authApiService.verifyGoogleToken(response.credential);

    // 3. Guardar profile en localStorage
    localStorage.setItem('user_profile', userData.profile);

    // 4. Mostrar bienvenida y redirigir
    this.showWelcomeMessage(userData.name);
    this.time.delayedCall(2000, () => {
      this.scene.start('GameScene');
    });

  } catch (error) {
    // Manejo de errores con mensaje al usuario
  }
}
```

**Mejoras:**
- ✅ Función async/await
- ✅ Try-catch para manejo de errores
- ✅ Logs detallados en consola
- ✅ Mensaje de error al usuario si falla backend
- ✅ Guarda `profile` del usuario en localStorage

---

### 7. Configuración de Variables de Entorno

**Archivo modificado:** [.env](../.env)

**ANTES:**
```env
# VITE_API_URL=http://localhost:8000/api  # Comentado
```

**AHORA:**
```env
VITE_API_URL=http://localhost:8000/api  # Activo
```

**Variables configuradas:**
- `VITE_GOOGLE_CLIENT_ID`: Client ID de Google OAuth
- `VITE_API_URL`: URL del backend API REST

---

## 📁 Archivos Creados/Modificados

### Archivos Creados (5):
1. ✅ `src/config/api.ts` - Configuración de API
2. ✅ `src/services/apiService.ts` - Cliente HTTP base
3. ✅ `src/types/api.ts` - Tipos TypeScript
4. ✅ `src/services/authApiService.ts` - Servicio de autenticación
5. ✅ `bitacoras/003_18_10_2025_Incremento1_Frontend.md` - Esta bitácora

### Archivos Modificados (2):
1. ✅ `src/scenes/LoginScene.ts` - Integración con backend
2. ✅ `.env` - Configuración de URL del backend

---

## 🎯 Próximos Pasos

### Para Testing Manual:

1. **Verificar que el backend esté corriendo:**
   ```bash
   cd ~/proyectos/.../multiplicacion-shooter-backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```

2. **Iniciar el frontend:**
   ```bash
   cd ~/proyectos/.../multiplicacion-shooter-frontend
   npm run dev
   ```

3. **Probar login:**
   - Abrir `http://localhost:5173`
   - Click en "Sign in with Google"
   - Verificar logs en consola del navegador
   - Verificar registros en BD

### Checklist de Validación:

- [ ] **Primera vez que usuario se loguea:**
  - [ ] Console muestra: "Enviando token al backend..."
  - [ ] Console muestra: "✅ Usuario registrado en backend: {datos}"
  - [ ] Se crea registro en tabla `users` con `profile='student'`
  - [ ] Se crea registro en tabla `user_logins`
  - [ ] Frontend recibe datos correctamente
  - [ ] Se guarda `user_profile` en localStorage

- [ ] **Segunda vez que usuario se loguea:**
  - [ ] NO se duplica en tabla `users`
  - [ ] SÍ se crea nuevo registro en `user_logins`
  - [ ] Frontend recibe los mismos datos

- [ ] **Manejo de errores:**
  - [ ] Si backend no responde → mensaje de error visible
  - [ ] Console muestra: "❌ Error al verificar token con backend: {error}"

---

## 🔍 Logs Esperados en Consola

### Login exitoso:
```
Google callback received
Enviando token al backend...
[API Request] POST /auth/verify
[API Response] 200 /auth/verify
✅ Usuario registrado en backend: {
  id: 1,
  google_id: "106839451234567890123",
  email: "usuario@gmail.com",
  name: "Juan Pérez",
  picture: "https://...",
  profile: "student"
}
Perfil de usuario: student
Usuario autenticado: Juan Pérez
```

### Error de backend:
```
Google callback received
Enviando token al backend...
[API Request] POST /auth/verify
[API Error 500] { error: "..." }
❌ Error al verificar token con backend: AxiosError {...}
```

---

## ⚠️ Pendiente para CHECKPOINT 1

**NO avanzar al backend sin:**

1. ✅ Frontend completamente implementado
2. ⏳ Backend implementado (siguiente paso)
3. ⏳ Testing manual exitoso
4. ⏳ Verificación en base de datos
5. ⏳ Tests automáticos del backend

---

## Estado Actual

### ✅ Frontend del INCREMENTO 1: COMPLETADO

**Siguiente paso:** Implementar backend del INCREMENTO 1

- Crear migraciones de `users` y `user_logins`
- Crear modelos Eloquent
- Crear `GoogleAuthService`
- Crear `AuthController`
- Endpoint: `POST /api/auth/verify`

---

**Documento creado por:** Claude (Sonnet 4.5)
**Fecha:** 18 de octubre de 2025
**Estado:** Frontend completado - Listo para backend
