# Bitácora Frontend - INCREMENTO 7: Panel de Administración
**Fecha:** 22-23 de octubre de 2025
**Responsable:** Claude Code
**Incremento:** 7 - Panel de Administración (Frontend)

**NOTA:** Se saltó el INCREMENTO 6 (Estadísticas Avanzadas) por decisión del usuario. Se implementó directamente el INCREMENTO 7.

---

## Resumen

Implementación del panel de administración en el frontend, permitiendo a usuarios admin listar usuarios, ver sesiones de cada usuario y cargar usuarios masivamente desde archivos CSV. El sistema soporta CSV con columnas opcionales para pre-cargar nombres de usuarios.

---

## Cambios Realizados

### 1. Tipos TypeScript Actualizados

**Archivo:** `src/types/api.ts`

Actualizado `UserData` para incluir nuevos campos:
```typescript
export interface UserData {
  id: number;
  google_id: string | null;  // Ahora nullable (usuarios CSV)
  email: string;
  name: string;
  lastname: string | null;   // NUEVO
  picture: string | null;    // Ahora nullable
  profile: 'student' | 'teacher' | 'admin';
  group: string | null;      // NUEVO
  created_at: string;
  updated_at: string;
}
```

Nuevos tipos agregados:
- `AdminUserListItem`: Extiende UserData con `game_sessions_count`
- `AdminUsersResponse`: Respuesta paginada de lista de usuarios
- `AdminUserSessionsResponse`: Respuesta de sesiones de un usuario específico
- `CsvUploadResponse`: Respuesta de carga CSV con estadísticas

**Archivo:** `src/types/auth.ts`

Actualizado `GoogleUser` para incluir `profile`:
```typescript
export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  profile: 'student' | 'teacher' | 'admin';  // NUEVO
}
```

### 2. Servicio API de Administración

**Archivo:** `src/services/adminApiService.ts` (NUEVO)

Servicio singleton con tres métodos:

#### a) listUsers(page)
```typescript
GET /api/admin/users?page={page}
```
- Lista todos los usuarios del sistema
- Paginación automática
- Requiere token de autenticación
- Solo accesible para admins

#### b) getUserSessions(userId, page)
```typescript
GET /api/admin/users/{userId}/sessions?page={page}
```
- Obtiene sesiones de un usuario específico
- Incluye información del usuario
- Paginación de sesiones

#### c) uploadCsv(file)
```typescript
POST /api/admin/users/upload-csv
```
- Envía archivo CSV como FormData
- Retorna estadísticas de carga
- Formato CSV esperado: `email,group`

### 3. AdminScene (Panel de Administración)

**Archivo:** `src/scenes/AdminScene.ts` (NUEVO)

Escena completa de Phaser con dos vistas principales:

#### Vista de Lista de Usuarios
- Tabla con encabezados:
  - Email, Nombre, Perfil, Grupo, Sesiones, Fecha
- Paginación (8 usuarios visibles, 15 por página del backend)
- Filas interactivas: click para ver sesiones del usuario
- Hover effect en filas
- Colores codificados:
  - Admin: rojo (#ff6b6b)
  - Otros: cyan (#4ecdc4)

#### Vista de Sesiones de Usuario
- Muestra información del usuario seleccionado
- Tabla de sesiones con encabezados:
  - Fecha, Puntuación, Nivel, Disparos, Aciertos, Precisión
- Paginación (8 sesiones visibles, 10 por página)
- Botón "Volver a Usuarios"
- Código de colores para precisión:
  - ≥80%: Verde
  - <80%: Naranja

#### Funcionalidades Adicionales
- Botón "Cargar CSV" que abre diálogo de archivo nativo
- Validación de archivo (.csv)
- Alertas con resultados de carga
- Manejo de errores con modal visual
- Botón "Volver al Juego" (regresa a GameScene)

**Características técnicas:**
- Usa `setData('clearable', true)` para gestión de memoria
- Cursor restaurado a default
- Diseño responsive centrado en 1200x800

### 4. Actualización de AuthManager

**Archivo:** `src/managers/AuthManager.ts`

Nuevo método `updateUserFromBackend(backendUser)`:
- Actualiza el perfil del usuario con datos del backend
- Guarda cambios en localStorage
- Permite sincronizar usuario de Google con datos del servidor

### 5. Actualización de LoginScene

**Archivo:** `src/scenes/LoginScene.ts`

Cambio en flujo de login:
```typescript
// Antes
localStorage.setItem('user_profile', userData.profile);

// Ahora
this.authManager.updateUserFromBackend(userData);
```

Ventajas:
- Datos sincronizados entre AuthManager y backend
- Profile disponible en `GoogleUser`
- Facilita verificación de roles en UserMenu

### 6. UserMenu con Soporte Admin

**Archivo:** `src/ui/UserMenu.ts`

Cambios principales:

#### a) Nuevo botón admin
```html
<button id="admin-btn" class="menu-item admin-btn" style="display: none;">
  ⚙️ Panel Admin
</button>
```

#### b) Visibilidad condicional
```typescript
public show(user: GoogleUser): void {
  // ... código existente ...

  // Mostrar/ocultar botón de admin según perfil
  if (user.profile === 'admin') {
    this.adminButton.style.display = 'block';
  } else {
    this.adminButton.style.display = 'none';
  }
}
```

#### c) Handler de navegación
```typescript
private handleAdmin(): void {
  const currentScene = this.gameInstance.scene.getScenes(true)[0];
  if (currentScene) {
    currentScene.scene.start('AdminScene');
  }
}
```

#### d) Estado del usuario
- Agregada propiedad `currentUser` para almacenar usuario activo
- Usada para verificaciones de perfil

### 7. HTML Actualizado

**Archivo:** `index.html`

Agregado botón de admin en menú desplegable:
```html
<div class="user-menu-dropdown" id="user-menu-dropdown">
  <button id="admin-btn" class="menu-item admin-btn" style="display: none;">
    ⚙️ Panel Admin
  </button>
  <button id="stats-btn" class="menu-item stats-btn">📊 Estadísticas</button>
  <button id="logout-btn" class="menu-item logout-btn">🚪 Salir</button>
</div>
```

### 8. Registro de AdminScene

**Archivo:** `src/config/gameConfig.ts`

AdminScene agregada a la configuración:
```typescript
import AdminScene from '../scenes/AdminScene';

scene: [PreloadScene, LoginScene, GameScene, StatsScene, AdminScene]
```

---

## Estructura de Navegación

```
LoginScene
    ↓
GameScene ←→ StatsScene
    ↕
AdminScene (solo admin)
```

Todas las escenas pueden regresar a GameScene excepto LoginScene.

---

## Flujo de Carga CSV

1. Usuario admin hace click en "📄 Cargar CSV"
2. Se abre diálogo nativo de selección de archivo (.csv)
3. Archivo se envía a `/api/admin/users/upload-csv` vía FormData
4. Backend procesa y retorna estadísticas
5. Alert muestra resultados:
   ```
   Carga completada:
   - Creados: 10
   - Actualizados: 5
   - Errores: 2

   Detalles de errores:
   Fila 5: Email inválido
   Fila 12: Formato inválido
   ```
6. Lista de usuarios se recarga automáticamente

### Formatos de CSV Soportados

**Formato Mínimo (obligatorio):**
```csv
email,group
estudiante1@ejemplo.com,Grupo A
estudiante2@ejemplo.com,Grupo B
```

**Formato Completo (con nombres opcionales):**
```csv
email,group,name,lastname
maria.garcia@school.edu,5to A,María,García
juan.perez@school.edu,5to A,Juan,Pérez
```

- Columnas obligatorias: `email`, `group`
- Columnas opcionales: `name`, `lastname`
- Si no se proporcionan nombres, se completan en el primer login con Google

---

## Estilos y UX

### Colores Utilizados
- Fondo principal: `#0f0f1e`
- Filas de tabla: `#16213e` / `#1a2744` (hover)
- Headers: `#1a1a2e` con borde amarillo `#ffff00`
- Texto principal: `#ffffff`
- Texto secundario: `#aaaaaa`
- Admin: `#ff6b6b`
- Stats: `#95e1d3`
- Success: `#4ecdc4`, `#00ff00`
- Warning: `#ffaa00`

### Interactividad
- Hover effects en botones y filas
- Cursor pointer sobre elementos clickeables
- Cursor default en canvas (no mira de juego)
- Transiciones suaves en hover

---

## Manejo de Errores

### AdminScene - showError()
Modal visual con:
- Fondo oscuro semitransparente
- Borde rojo
- Título "ERROR" en rojo
- Mensaje centrado
- Botón "Cerrar" que vuelve a GameScene

### API Service
Try-catch en todos los métodos:
```typescript
if (!response.ok) {
  const errorData = await response.json();
  throw new Error(errorData.error || 'Error genérico');
}
```

---

## Gestión de Memoria

AdminScene usa un sistema de limpieza:
```typescript
this.children.list
  .filter((child) => child.getData('clearable'))
  .forEach((child) => child.destroy());
```

Todos los elementos visuales tienen `setData('clearable', true)` excepto fondo y título principal.

---

## Testing Manual Recomendado

1. **Como Admin:**
   - Verificar que botón "⚙️ Panel Admin" sea visible
   - Entrar al panel y ver lista de usuarios
   - Click en un usuario para ver sus sesiones
   - Cargar CSV válido
   - Cargar CSV con errores y verificar reporte
   - Navegar entre páginas

2. **Como Student:**
   - Verificar que botón admin NO sea visible
   - Intentar acceder a `/api/admin/users` (debería fallar)

3. **General:**
   - Verificar navegación entre escenas
   - Verificar que cursor sea visible en AdminScene
   - Verificar paginación funcional
   - Verificar diseño responsive

---

## Archivos Creados/Modificados

### Creados
- `src/services/adminApiService.ts`
- `src/scenes/AdminScene.ts`

### Modificados
- `src/types/api.ts` - Nuevos tipos admin
- `src/types/auth.ts` - Profile en GoogleUser
- `src/managers/AuthManager.ts` - updateUserFromBackend()
- `src/scenes/LoginScene.ts` - Uso de updateUserFromBackend()
- `src/ui/UserMenu.ts` - Soporte para botón admin
- `src/config/gameConfig.ts` - Registro de AdminScene
- `src/services/adminApiService.ts` - Corregido token key (google_auth_token)
- `index.html` - Botón admin en menú

---

## Correcciones Post-Implementación

### Fix 1: Token de autenticación
**Problema:** adminApiService buscaba `google_token` en localStorage
**Solución:** Corregido a `google_auth_token` (mismo key que AuthManager)

### Fix 2: Middleware RequireAdmin
**Problema:** No accedía correctamente al usuario del request
**Solución:** Cambiado de `$request->user` a `$request->input('authenticated_user')`

---

## Estado de Implementación

✅ **Completado:**
- AdminScene con lista de usuarios y sesiones
- Paginación en ambas vistas
- CSV upload con validación de errores
- Soporte para columnas opcionales (name, lastname)
- Botón admin visible solo para admins
- Integración con backend
- Manejo de errores mejorado

## Próximos Pasos Sugeridos (Futuros incrementos)

- **Filtros avanzados:** Filtrar usuarios por perfil, grupo, fecha
- **Búsqueda:** Buscar usuarios por email o nombre en tiempo real
- **Confirmación CSV:** Modal de preview antes de cargar
- **Exportar datos:** Exportar lista de usuarios a CSV
- **Estadísticas del sistema:** Gráficos y métricas globales (INCREMENTO 6 pendiente)
- **Edición inline:** Cambiar grupo de usuarios desde la tabla
- **Gestión de perfiles:** Cambiar perfil de usuarios
- **Vista mejorada:** Reemplazar alert() por modales estilizados
