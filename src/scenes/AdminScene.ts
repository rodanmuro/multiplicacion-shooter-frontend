import Phaser from 'phaser';
import { adminApiService } from '../services/adminApiService';
import type {
  AdminUserListItem,
  SessionListItemWithRow,
  UserSessionSummary,
  AdminUsersFilterParams,
  AdminSessionsFilterParams,
  PaginationInfoExtended,
} from '../types/api';
import { FONT_SIZE, COLOR } from '../ui/theme';
import { formatDate, formatTime } from '../utils/format';
import { createButton, type ButtonStyle } from '../ui/widgets/Button';
import { createModalFrame } from '../ui/widgets/Modal';
import { createPagination } from '../ui/widgets/Pagination';
import { FilterBar } from '../ui/html/FilterBar';
import { createDataTable, type TableCell, type TableColumn } from '../ui/widgets/DataTable';

/**
 * Escena de administración mejorada
 * Permite al administrador:
 * - Ver lista de usuarios con filtros (grupo, perfil, búsqueda)
 * - Ver sesiones de cada usuario con filtro de fechas
 * - Exportar datos a CSV
 * - Cargar usuarios masivamente desde CSV
 */
export default class AdminScene extends Phaser.Scene {
  // Estado de la vista de usuarios
  private users: AdminUserListItem[] = [];
  private usersPagination: PaginationInfoExtended | null = null;
  private usersFilters: AdminUsersFilterParams = {
    page: 1,
    per_page: 14,
    sort_by: 'created_at',
    order: 'desc',
    date_from: `${new Date().getFullYear()}-01-01`,
    min_score: 1000
  };
  private availableGroups: string[] = [];

  // Estado de la vista de sesiones
  private selectedUser: AdminUserListItem | null = null;
  private userSessions: SessionListItemWithRow[] = [];
  private sessionsSummary: UserSessionSummary | null = null;
  private sessionsPagination: PaginationInfoExtended | null = null;
  private sessionsFilters: AdminSessionsFilterParams = { page: 1 };

  // Elementos HTML para filtros
  private filterBar: FilterBar | null = null;

  constructor() {
    super({ key: 'AdminScene' });
  }

  create(): void {
    // Phaser no invoca por nombre un método `shutdown()`: hay que suscribirse al evento
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeFilterContainer());

    const { width, height } = this.cameras.main;
    const centerX = width / 2;

    // Restaurar cursor
    this.input.setDefaultCursor('default');

    // Fondo oscuro
    this.add.rectangle(centerX, height / 2, width, height, 0x0f0f1e, 1);

    // Título
    this.add
      .text(centerX, 25, 'PANEL DE ADMINISTRACIÓN', {
        fontSize: FONT_SIZE.xxl,
        color: COLOR.yellow,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Cargar grupos y usuarios (esperamos a que grupos cargue primero)
    this.initializeData();
  }

  /**
   * Inicializa la carga de datos (grupos y usuarios)
   */
  private async initializeData(): Promise<void> {
    await this.loadGroups();
    this.loadUsers();
  }

  /**
   * Carga la lista de grupos disponibles
   */
  private async loadGroups(): Promise<void> {
    try {
      const response = await adminApiService.getGroups();
      this.availableGroups = response.data;
    } catch (error) {
      console.error('Error al cargar grupos:', error);
    }
  }

  /**
   * Carga la lista de usuarios con filtros
   */
  private async loadUsers(): Promise<void> {
    try {
      const response = await adminApiService.listUsers(this.usersFilters);
      this.users = response.data;
      this.usersPagination = response.pagination;
      this.renderUsersView();
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      this.showError(
        error instanceof Error ? error.message : 'Error al cargar usuarios'
      );
    }
  }

  /**
   * Renderiza la vista de lista de usuarios
   */
  private renderUsersView(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;

    // Limpiar elementos anteriores
    this.clearScene();
    this.removeFilterContainer();

    // Botón volver al juego
    this.createButton(50, 25, '← Volver al Juego', () => {
      this.removeFilterContainer();
      this.scene.start('GameScene');
    });

    // Botón cargar CSV
    this.createButton(width - 180, 25, '📄 Cargar CSV', () => this.openCsvUpload(), '#0066cc');

    // Botón exportar
    this.createButton(width - 340, 25, '📥 Exportar', () => this.exportUsers(), COLOR.successDark);

    // Crear filtros HTML
    this.createUsersFilterBar();

    // Contador de registros
    if (this.usersPagination) {
      const from = this.usersPagination.from || 0;
      const to = this.usersPagination.to || 0;
      const total = this.usersPagination.total;
      this.add
        .text(100, 155, `Mostrando ${from}-${to} de ${total} usuarios`, {
          fontSize: FONT_SIZE.sm,
          color: COLOR.grayLight,
        })
        .setData('clearable', true);
    }

    // Tabla de usuarios con headers clickeables
    const pageOffset = ((this.usersPagination?.current_page || 1) - 1) * (this.usersFilters.per_page || 40);

    createDataTable<AdminUserListItem>(this, {
      centerX,
      columns: this.userColumns(pageOffset),
      rows: this.users,
      maxRows: 14,
      header: { y: 185, width: 1100, fontSize: FONT_SIZE.xsPlus, inactiveColor: '#cccc00' },
      sort: {
        by: this.usersFilters.sort_by,
        order: this.usersFilters.order,
        onSort: (field) => this.sortUsersBy(field),
      },
      firstRowY: 230,
      rowSpacing: 40,
      rowBackground: {
        width: 1100,
        height: 35,
        fill: 0x16213e,
        alpha: 0.8,
        stroke: { width: 1, color: 0x0f3460 },
        hover: { over: [0x1a2744], out: [0x16213e] },
        onClick: (index) => this.viewUserSessions(this.users[index]),
      },
      onCreate: (obj) => obj.setData('clearable', true),
    });

    // Paginación
    this.createPagination(
      centerX,
      height - 60,
      this.usersPagination,
      (newPage) => {
        this.usersFilters.page = newPage;
        this.loadUsers();
      }
    );
  }

  /**
   * Crea la barra de filtros para usuarios (HTML)
   */
  private createUsersFilterBar(): void {
    const bar = new FilterBar('users', 'admin-filters');
    this.filterBar = bar;

    // Label fecha
    const dateLabel = bar.label('Desde:');

    // Input fecha desde
    const dateFromInput = bar.input('date', 'date');
    dateFromInput.value = this.usersFilters.date_from || `${new Date().getFullYear()}-01-01`;
    dateFromInput.onchange = () => {
      this.usersFilters.date_from = dateFromInput.value || undefined;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Label hasta
    const toLabel = bar.label('Hasta:');

    // Input fecha hasta
    const dateToInput = bar.input('date', 'date');
    dateToInput.value = this.usersFilters.date_to || '';
    dateToInput.onchange = () => {
      this.usersFilters.date_to = dateToInput.value || undefined;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Label min score
    const minScoreLabel = bar.label('Mín pts:');

    // Input puntaje mínimo
    const minScoreInput = bar.input('number', 'narrow');
    minScoreInput.min = '0';
    minScoreInput.step = '100';
    minScoreInput.value = String(this.usersFilters.min_score || 1000);
    minScoreInput.onchange = () => {
      this.usersFilters.min_score = parseInt(minScoreInput.value) || 0;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Select de grupo
    const groupSelect = bar.select();
    groupSelect.innerHTML = `<option value="">Todos los grupos</option>`;
    this.availableGroups.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      if (this.usersFilters.group === g) opt.selected = true;
      groupSelect.appendChild(opt);
    });
    groupSelect.onchange = () => {
      this.usersFilters.group = groupSelect.value || undefined;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Select de perfil
    const profileSelect = bar.select();
    profileSelect.innerHTML = `
      <option value="">Todos los perfiles</option>
      <option value="student">Estudiante</option>
      <option value="teacher">Profesor</option>
      <option value="admin">Admin</option>
    `;
    profileSelect.value = this.usersFilters.profile || '';
    profileSelect.onchange = () => {
      this.usersFilters.profile = profileSelect.value || undefined;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Input de búsqueda
    const searchInput = bar.input('text', 'wide');
    searchInput.placeholder = '🔍 Buscar...';
    searchInput.value = this.usersFilters.search || '';
    let searchTimeout: number;
    searchInput.oninput = () => {
      clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(() => {
        this.usersFilters.search = searchInput.value || undefined;
        this.usersFilters.page = 1;
        this.loadUsers();
      }, 400);
    };

    // Botón limpiar filtros
    const clearBtn = bar.button('✕ Limpiar');
    clearBtn.onclick = () => {
      this.usersFilters = {
        page: 1,
        per_page: 14,
        sort_by: 'created_at',
        order: 'desc',
        date_from: `${new Date().getFullYear()}-01-01`,
        min_score: 1000
      };
      // Actualizar valores visuales
      dateFromInput.value = this.usersFilters.date_from || '';
      dateToInput.value = '';
      minScoreInput.value = '1000';
      groupSelect.value = '';
      profileSelect.value = '';
      searchInput.value = '';
      this.loadUsers();
    };

    // Agregar elementos en orden
    bar
      .append(
        dateLabel,
        dateFromInput,
        toLabel,
        dateToInput,
        minScoreLabel,
        minScoreInput,
        groupSelect,
        profileSelect,
        searchInput,
        clearBtn
      )
      .mount();
  }

  /**
   * Columnas de la tabla de usuarios
   */
  private userColumns(pageOffset: number): TableColumn<AdminUserListItem>[] {
    const text = (value: string, color: string): TableCell => ({ text: value, color });
    return [
      { header: 'No', headerX: -530, x: -530, cell: (_u, i) => text((pageOffset + i + 1).toString(), COLOR.grayMid) },
      {
        header: 'Email',
        headerX: -480,
        x: -480,
        sortField: 'email',
        cell: (u) => text(u.email.length > 28 ? u.email.substring(0, 25) + '...' : u.email, COLOR.white),
      },
      {
        header: 'Nombre',
        headerX: -280,
        x: -280,
        sortField: 'name',
        cell: (u) => {
          const fullName = `${u.name || ''} ${u.lastname || ''}`.trim() || '-';
          return text(fullName.length > 18 ? fullName.substring(0, 15) + '...' : fullName, COLOR.white);
        },
      },
      { header: 'Grupo', headerX: -100, x: -100, sortField: 'group', cell: (u) => text(u.group || '-', COLOR.grayLight) },
      {
        header: 'Sesiones',
        headerX: 20,
        x: 20,
        sortField: 'sessions_count',
        cell: (u) => text(u.game_sessions_count.toString(), COLOR.mint),
      },
      {
        header: 'Promedio',
        headerX: 120,
        x: 120,
        sortField: 'avg_score',
        cell: (u) =>
          text(u.avg_score !== null && u.avg_score !== undefined ? Number(u.avg_score).toFixed(1) : '-', COLOR.teal),
      },
      {
        header: 'Mejor',
        headerX: 220,
        x: 220,
        cell: (u) => text(u.best_score !== null ? u.best_score.toString() : '-', COLOR.yellow),
      },
      {
        header: 'Última Sesión',
        headerX: 340,
        x: 340,
        cell: (u) => text(u.last_played_at ? formatDate(u.last_played_at) : '-', COLOR.grayLight),
      },
    ];
  }

  /**
   * Ordena la tabla de usuarios por un campo (si ya estaba ordenada por él, invierte el orden)
   */
  private sortUsersBy(field: string): void {
    if (this.usersFilters.sort_by === field) {
      this.usersFilters.order = this.usersFilters.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.usersFilters.sort_by = field as AdminUsersFilterParams['sort_by'];
      this.usersFilters.order = 'desc';
    }
    this.usersFilters.page = 1;
    this.loadUsers();
  }

  /**
   * Muestra las sesiones de un usuario
   */
  private async viewUserSessions(user: AdminUserListItem): Promise<void> {
    this.selectedUser = user;
    this.sessionsFilters = { page: 1 };

    try {
      const response = await adminApiService.getUserSessions(user.id, this.sessionsFilters);
      this.userSessions = response.data;
      this.sessionsSummary = response.summary;
      this.sessionsPagination = response.pagination;
      this.renderSessionsView();
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      this.showError(
        error instanceof Error ? error.message : 'Error al cargar sesiones'
      );
    }
  }

  /**
   * Renderiza la vista de sesiones de un usuario
   */
  private renderSessionsView(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;

    // Limpiar elementos
    this.clearScene();
    this.removeFilterContainer();

    if (!this.selectedUser) return;

    // Botón volver a usuarios
    this.createButton(50, 40, '← Volver a Usuarios', () => {
      this.selectedUser = null;
      this.loadUsers();
    });

    // Botón exportar sesiones
    this.createButton(width - 180, 40, '📥 Exportar', () => this.exportUserSessions(), COLOR.successDark);

    // Info del usuario
    const userName = `${this.selectedUser.name || ''} ${this.selectedUser.lastname || ''}`.trim();
    this.add
      .text(centerX, 80, userName || this.selectedUser.email, {
        fontSize: FONT_SIZE.xxl,
        color: COLOR.white,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setData('clearable', true);

    this.add
      .text(
        centerX,
        110,
        `${this.selectedUser.email} | Grupo: ${this.selectedUser.group || 'N/A'}`,
        { fontSize: FONT_SIZE.sm, color: COLOR.grayLight }
      )
      .setOrigin(0.5)
      .setData('clearable', true);

    // Resumen de estadísticas
    if (this.sessionsSummary) {
      this.createSummaryBar(centerX, 145);
    }

    // Crear filtros de fecha
    this.createSessionsFilterBar();

    // Contador de registros
    if (this.sessionsPagination) {
      const from = this.sessionsPagination.from || 0;
      const to = this.sessionsPagination.to || 0;
      const total = this.sessionsPagination.total;
      this.add
        .text(100, 220, `Mostrando ${from}-${to} de ${total} sesiones`, {
          fontSize: FONT_SIZE.sm,
          color: COLOR.grayLight,
        })
        .setData('clearable', true);
    }

    // Tabla de sesiones
    createDataTable<SessionListItemWithRow>(this, {
      centerX,
      columns: this.sessionColumns(),
      rows: this.userSessions,
      maxRows: 7,
      header: { y: 250, width: 1100, fontSize: FONT_SIZE.xsPlus },
      firstRowY: 295,
      rowSpacing: 50,
      rowBackground: {
        width: 1050,
        height: 45,
        fill: 0x16213e,
        alpha: 0.8,
        stroke: { width: 1, color: 0x0f3460 },
      },
      onCreate: (obj) => obj.setData('clearable', true),
    });

    // Paginación
    this.createPagination(
      centerX,
      height - 60,
      this.sessionsPagination,
      (newPage) => {
        this.sessionsFilters.page = newPage;
        this.reloadUserSessions();
      }
    );
  }

  /**
   * Crea la barra de resumen de estadísticas
   */
  private createSummaryBar(centerX: number, y: number): void {
    if (!this.sessionsSummary) return;

    const s = this.sessionsSummary;
    const summaryText = `Total: ${s.total_sessions} sesiones | Promedio: ${s.avg_score} pts | Mejor: ${s.best_score} pts | Tiempo jugado: ${s.total_playtime_minutes} min`;

    this.add
      .rectangle(centerX, y, 900, 30, 0x1a2744, 0.9)
      .setStrokeStyle(1, 0x4ecdc4)
      .setData('clearable', true);

    this.add
      .text(centerX, y, summaryText, {
        fontSize: FONT_SIZE.xs,
        color: COLOR.teal,
      })
      .setOrigin(0.5)
      .setData('clearable', true);
  }

  /**
   * Crea la barra de filtros para sesiones (HTML)
   */
  private createSessionsFilterBar(): void {
    const bar = new FilterBar('sessions', 'admin-filters');
    this.filterBar = bar;

    const label = bar.label('Filtrar por fecha:');

    // Input fecha desde
    const dateFrom = bar.input('date');
    dateFrom.value = this.sessionsFilters.date_from || '';

    // Input fecha hasta
    const dateTo = bar.input('date');
    dateTo.value = this.sessionsFilters.date_to || '';

    // Botón aplicar
    const applyBtn = bar.button('Aplicar', true);
    applyBtn.onclick = () => {
      this.sessionsFilters.date_from = dateFrom.value || undefined;
      this.sessionsFilters.date_to = dateTo.value || undefined;
      this.sessionsFilters.page = 1;
      this.reloadUserSessions();
    };

    // Botón limpiar
    const clearBtn = bar.button('✕ Limpiar');
    clearBtn.onclick = () => {
      this.sessionsFilters = { page: 1 };
      dateFrom.value = '';
      dateTo.value = '';
      this.reloadUserSessions();
    };

    bar
      .append(label, dateFrom, document.createTextNode(' a '), dateTo, applyBtn, clearBtn)
      .mount();
  }

  /**
   * Recarga las sesiones del usuario seleccionado
   */
  private async reloadUserSessions(): Promise<void> {
    if (!this.selectedUser) return;

    try {
      const response = await adminApiService.getUserSessions(
        this.selectedUser.id,
        this.sessionsFilters
      );
      this.userSessions = response.data;
      this.sessionsSummary = response.summary;
      this.sessionsPagination = response.pagination;
      this.renderSessionsView();
    } catch (error) {
      console.error('Error al recargar sesiones:', error);
    }
  }

  /**
   * Columnas de la tabla de sesiones de un usuario
   */
  private sessionColumns(): TableColumn<SessionListItemWithRow>[] {
    const text = (value: string, color: string): TableCell => ({ text: value, color });
    return [
      { header: '#', headerX: -500, x: -500, cell: (s) => text(s.row_number.toString(), COLOR.grayMid) },
      { header: 'Fecha', headerX: -430, x: -430, cell: (s) => text(formatDate(s.started_at), COLOR.white) },
      { header: 'Hora', headerX: -300, x: -300, cell: (s) => text(formatTime(s.started_at), COLOR.grayLight) },
      { header: 'Puntuación', headerX: -150, x: -150, cell: (s) => text(s.final_score.toString(), COLOR.mint) },
      { header: 'Nivel', headerX: -20, x: -20, cell: (s) => text(s.max_level_reached.toString(), COLOR.white) },
      { header: 'Disparos', headerX: 100, x: 100, cell: (s) => text(s.total_shots.toString(), COLOR.white) },
      { header: 'Aciertos', headerX: 220, x: 220, cell: (s) => text(s.correct_shots.toString(), COLOR.teal) },
      {
        header: 'Precisión',
        headerX: 360,
        x: 360,
        cell: (s) =>
          text(
            `${s.accuracy}%`,
            s.accuracy >= 80 ? COLOR.green : s.accuracy >= 60 ? COLOR.amber : COLOR.dangerHoverSoft
          ),
      },
    ];
  }

  // --- Métodos auxiliares ---

  /**
   * Crea controles de paginación
   */
  private createPagination(
    centerX: number,
    y: number,
    pagination: PaginationInfoExtended | null,
    onChange: (page: number) => void
  ): void {
    if (!pagination) return;

    createPagination(this, {
      centerX,
      y,
      currentPage: pagination.current_page,
      lastPage: pagination.last_page,
      onChange,
      label: `Página ${pagination.current_page} de ${pagination.last_page}`,
      buttonOffset: 150,
      labelFontSize: FONT_SIZE.md,
      button: this.buttonStyle(COLOR.grayDark),
    }).forEach((control) => control.setData('clearable', true));
  }

  /**
   * Estilo común de los botones del panel
   */
  private buttonStyle(bg: string): ButtonStyle {
    return {
      fontSize: FONT_SIZE.sm,
      bg,
      padding: { x: 12, y: 8 },
      origin: { x: 0, y: 0.5 },
      hover: { alpha: 0.8 },
    };
  }

  /**
   * Crea un botón
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    bgColor: string = COLOR.grayDark
  ): Phaser.GameObjects.Text {
    return createButton(this, { ...this.buttonStyle(bgColor), x, y, text, onClick }).setData(
      'clearable',
      true
    );
  }

  /**
   * Limpia elementos marcados como 'clearable'
   */
  private clearScene(): void {
    this.children.list
      .filter((child) => child.getData('clearable'))
      .forEach((child) => child.destroy());
  }

  /**
   * Elimina el contenedor de filtros HTML
   */
  private removeFilterContainer(): void {
    if (this.filterBar) {
      this.filterBar.destroy();
      this.filterBar = null;
    }
  }

  /**
   * Abre el diálogo de carga de CSV
   */
  private openCsvUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const response = await adminApiService.uploadCsv(file);
        alert(
          `Carga completada:\n` +
            `- Creados: ${response.stats.created}\n` +
            `- Actualizados: ${response.stats.updated}\n` +
            `- Errores: ${response.stats.errors}\n\n` +
            (response.error_details.length > 0
              ? `Detalles:\n${response.error_details.join('\n')}`
              : '')
        );
        this.loadUsers();
      } catch (error) {
        alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    };

    input.click();
  }

  /**
   * Exporta la lista de usuarios
   */
  private async exportUsers(): Promise<void> {
    try {
      await adminApiService.exportUsers(this.usersFilters);
    } catch (error) {
      alert(`Error al exportar: ${error instanceof Error ? error.message : 'Error'}`);
    }
  }

  /**
   * Exporta las sesiones del usuario seleccionado
   */
  private async exportUserSessions(): Promise<void> {
    if (!this.selectedUser) return;

    try {
      await adminApiService.exportUserSessions(this.selectedUser.id, this.sessionsFilters);
    } catch (error) {
      alert(`Error al exportar: ${error instanceof Error ? error.message : 'Error'}`);
    }
  }

  /**
   * Muestra un mensaje de error
   */
  private showError(message: string): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    createModalFrame(this, {
      centerX,
      centerY,
      width: 500,
      height: 200,
      fill: 0x000000,
      fillAlpha: 0.95,
      strokeWidth: 3,
      strokeColor: 0xff0000,
    }).panel.setData('clearable', true);

    this.add
      .text(centerX, centerY - 40, 'ERROR', {
        fontSize: FONT_SIZE.xxl,
        color: COLOR.red,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setData('clearable', true);

    this.add
      .text(centerX, centerY + 10, message, {
        fontSize: FONT_SIZE.sm,
        color: COLOR.white,
        align: 'center',
        wordWrap: { width: 450 },
      })
      .setOrigin(0.5)
      .setData('clearable', true);

    this.createButton(centerX - 40, centerY + 70, 'Cerrar', () => {
      this.removeFilterContainer();
      this.scene.start('GameScene');
    });
  }
}
