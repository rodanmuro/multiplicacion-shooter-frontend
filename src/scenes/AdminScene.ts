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
  private filterContainer: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'AdminScene' });
  }

  create(): void {
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
    const tableY = 185;
    const headers = [
      { label: 'No', field: null },
      { label: 'Email', field: 'email' as const },
      { label: 'Nombre', field: 'name' as const },
      { label: 'Grupo', field: 'group' as const },
      { label: 'Sesiones', field: 'sessions_count' as const },
      { label: 'Promedio', field: 'avg_score' as const },
      { label: 'Mejor', field: null },
      { label: 'Última Sesión', field: null }
    ];
    const headerPositions = [centerX - 530, centerX - 480, centerX - 280, centerX - 100, centerX + 20, centerX + 120, centerX + 220, centerX + 340];

    this.createSortableTableHeader(centerX, tableY, headers, headerPositions);

    // Renderizar filas (14 filas visibles considerando el espacio disponible)
    const maxVisible = 14;
    const itemHeight = 40;

    // Calcular número de fila base según la página actual
    const pageOffset = ((this.usersPagination?.current_page || 1) - 1) * (this.usersFilters.per_page || 40);

    this.users.slice(0, maxVisible).forEach((user, index) => {
      const rowY = tableY + 45 + index * itemHeight;
      const rowNumber = pageOffset + index + 1;
      this.createUserRow(user, rowY, headerPositions, itemHeight, rowNumber);
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
    this.filterContainer = document.createElement('div');
    this.filterContainer.id = 'admin-filters';
    this.filterContainer.style.cssText = `
      position: absolute;
      top: 85px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: center;
      background: rgba(26, 26, 46, 0.95);
      padding: 8px 15px;
      border-radius: 8px;
      border: 1px solid #333;
      z-index: 10;
      max-width: 95%;
    `;

    const inputStyle = this.getInputStyle();

    // Label fecha
    const dateLabel = document.createElement('span');
    dateLabel.textContent = 'Desde:';
    dateLabel.style.cssText = 'color: #aaa; font-size: 13px;';

    // Input fecha desde
    const dateFromInput = document.createElement('input');
    dateFromInput.type = 'date';
    dateFromInput.value = this.usersFilters.date_from || `${new Date().getFullYear()}-01-01`;
    dateFromInput.style.cssText = inputStyle + 'width: 130px;';
    dateFromInput.onchange = () => {
      this.usersFilters.date_from = dateFromInput.value || undefined;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Label hasta
    const toLabel = document.createElement('span');
    toLabel.textContent = 'Hasta:';
    toLabel.style.cssText = 'color: #aaa; font-size: 13px;';

    // Input fecha hasta
    const dateToInput = document.createElement('input');
    dateToInput.type = 'date';
    dateToInput.value = this.usersFilters.date_to || '';
    dateToInput.style.cssText = inputStyle + 'width: 130px;';
    dateToInput.onchange = () => {
      this.usersFilters.date_to = dateToInput.value || undefined;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Label min score
    const minScoreLabel = document.createElement('span');
    minScoreLabel.textContent = 'Mín pts:';
    minScoreLabel.style.cssText = 'color: #aaa; font-size: 13px;';

    // Input puntaje mínimo
    const minScoreInput = document.createElement('input');
    minScoreInput.type = 'number';
    minScoreInput.min = '0';
    minScoreInput.step = '100';
    minScoreInput.value = String(this.usersFilters.min_score || 1000);
    minScoreInput.style.cssText = inputStyle + 'width: 80px;';
    minScoreInput.onchange = () => {
      this.usersFilters.min_score = parseInt(minScoreInput.value) || 0;
      this.usersFilters.page = 1;
      this.loadUsers();
    };

    // Select de grupo
    const groupSelect = document.createElement('select');
    groupSelect.style.cssText = this.getSelectStyle();
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
    const profileSelect = document.createElement('select');
    profileSelect.style.cssText = this.getSelectStyle();
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
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 Buscar...';
    searchInput.value = this.usersFilters.search || '';
    searchInput.style.cssText = inputStyle + 'width: 150px;';
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
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '✕ Limpiar';
    clearBtn.style.cssText = `
      padding: 8px 12px;
      border-radius: 4px;
      border: none;
      background: #444;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    `;
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
    this.filterContainer.appendChild(dateLabel);
    this.filterContainer.appendChild(dateFromInput);
    this.filterContainer.appendChild(toLabel);
    this.filterContainer.appendChild(dateToInput);
    this.filterContainer.appendChild(minScoreLabel);
    this.filterContainer.appendChild(minScoreInput);
    this.filterContainer.appendChild(groupSelect);
    this.filterContainer.appendChild(profileSelect);
    this.filterContainer.appendChild(searchInput);
    this.filterContainer.appendChild(clearBtn);

    document.body.appendChild(this.filterContainer);
  }

  /**
   * Crea una fila de usuario
   */
  private createUserRow(
    user: AdminUserListItem,
    rowY: number,
    positions: number[],
    itemHeight: number,
    rowNumber: number
  ): void {
    const centerX = this.cameras.main.width / 2;

    // Fondo de fila (interactivo)
    const rowBg = this.add
      .rectangle(centerX, rowY, 1100, itemHeight - 5, 0x16213e, 0.8)
      .setStrokeStyle(1, 0x0f3460)
      .setInteractive({ useHandCursor: true })
      .setData('clearable', true);

    rowBg.on('pointerdown', () => this.viewUserSessions(user));
    rowBg.on('pointerover', () => rowBg.setFillStyle(0x1a2744));
    rowBg.on('pointerout', () => rowBg.setFillStyle(0x16213e));

    // Número de fila
    this.createText(positions[0], rowY, rowNumber.toString(), COLOR.grayMid);

    // Email (truncado)
    const emailDisplay = user.email.length > 28 ? user.email.substring(0, 25) + '...' : user.email;
    this.createText(positions[1], rowY, emailDisplay, COLOR.white);

    // Nombre
    const fullName = `${user.name || ''} ${user.lastname || ''}`.trim() || '-';
    const nameDisplay = fullName.length > 18 ? fullName.substring(0, 15) + '...' : fullName;
    this.createText(positions[2], rowY, nameDisplay, COLOR.white);

    // Grupo
    this.createText(positions[3], rowY, user.group || '-', COLOR.grayLight);

    // Sesiones
    this.createText(positions[4], rowY, user.game_sessions_count.toString(), COLOR.mint);

    // Promedio
    const avgScore = user.avg_score !== null && user.avg_score !== undefined ? Number(user.avg_score).toFixed(1) : '-';
    this.createText(positions[5], rowY, avgScore, COLOR.teal);

    // Mejor
    const bestScore = user.best_score !== null ? user.best_score.toString() : '-';
    this.createText(positions[6], rowY, bestScore, COLOR.yellow);

    // Última sesión
    const lastPlayed = user.last_played_at
      ? formatDate(user.last_played_at)
      : '-';
    this.createText(positions[7], rowY, lastPlayed, COLOR.grayLight);
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
    const tableY = 250;
    const headers = ['#', 'Fecha', 'Hora', 'Puntuación', 'Nivel', 'Disparos', 'Aciertos', 'Precisión'];
    const positions = [centerX - 500, centerX - 430, centerX - 300, centerX - 150, centerX - 20, centerX + 100, centerX + 220, centerX + 360];

    this.createTableHeader(centerX, tableY, headers, positions);

    // Renderizar filas de sesiones
    const maxVisible = 7;
    const itemHeight = 50;

    this.userSessions.slice(0, maxVisible).forEach((session, index) => {
      const rowY = tableY + 45 + index * itemHeight;
      this.createSessionRow(session, rowY, positions, itemHeight);
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
    this.filterContainer = document.createElement('div');
    this.filterContainer.id = 'admin-filters';
    this.filterContainer.style.cssText = `
      position: absolute;
      top: 175px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      align-items: center;
      background: rgba(26, 26, 46, 0.95);
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid #333;
      z-index: 1000;
    `;

    // Label
    const label = document.createElement('span');
    label.textContent = 'Filtrar por fecha:';
    label.style.color = '#aaa';
    label.style.fontSize = '14px';

    // Input fecha desde
    const dateFrom = document.createElement('input');
    dateFrom.type = 'date';
    dateFrom.value = this.sessionsFilters.date_from || '';
    dateFrom.style.cssText = this.getInputStyle();

    // Input fecha hasta
    const dateTo = document.createElement('input');
    dateTo.type = 'date';
    dateTo.value = this.sessionsFilters.date_to || '';
    dateTo.style.cssText = this.getInputStyle();

    // Botón aplicar
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Aplicar';
    applyBtn.style.cssText = `
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      background: #0066cc;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    `;
    applyBtn.onclick = () => {
      this.sessionsFilters.date_from = dateFrom.value || undefined;
      this.sessionsFilters.date_to = dateTo.value || undefined;
      this.sessionsFilters.page = 1;
      this.reloadUserSessions();
    };

    // Botón limpiar
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '✕ Limpiar';
    clearBtn.style.cssText = `
      padding: 8px 12px;
      border-radius: 4px;
      border: none;
      background: #444;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    `;
    clearBtn.onclick = () => {
      this.sessionsFilters = { page: 1 };
      dateFrom.value = '';
      dateTo.value = '';
      this.reloadUserSessions();
    };

    this.filterContainer.appendChild(label);
    this.filterContainer.appendChild(dateFrom);
    this.filterContainer.appendChild(document.createTextNode(' a '));
    this.filterContainer.appendChild(dateTo);
    this.filterContainer.appendChild(applyBtn);
    this.filterContainer.appendChild(clearBtn);

    document.body.appendChild(this.filterContainer);
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
   * Crea una fila de sesión
   */
  private createSessionRow(
    session: SessionListItemWithRow,
    rowY: number,
    positions: number[],
    itemHeight: number
  ): void {
    const centerX = this.cameras.main.width / 2;

    this.add
      .rectangle(centerX, rowY, 1050, itemHeight - 5, 0x16213e, 0.8)
      .setStrokeStyle(1, 0x0f3460)
      .setData('clearable', true);

    // Número de fila
    this.createText(positions[0], rowY, session.row_number.toString(), COLOR.grayMid);

    // Fecha
    this.createText(positions[1], rowY, formatDate(session.started_at), COLOR.white);

    // Hora
    this.createText(positions[2], rowY, formatTime(session.started_at), COLOR.grayLight);

    // Puntuación
    this.createText(positions[3], rowY, session.final_score.toString(), COLOR.mint);

    // Nivel
    this.createText(positions[4], rowY, session.max_level_reached.toString(), COLOR.white);

    // Disparos
    this.createText(positions[5], rowY, session.total_shots.toString(), COLOR.white);

    // Aciertos
    this.createText(positions[6], rowY, session.correct_shots.toString(), COLOR.teal);

    // Precisión
    const accuracyColor = session.accuracy >= 80 ? COLOR.green : session.accuracy >= 60 ? COLOR.amber : COLOR.dangerHoverSoft;
    this.createText(positions[7], rowY, `${session.accuracy}%`, accuracyColor);
  }

  // --- Métodos auxiliares ---

  /**
   * Crea un encabezado de tabla con ordenamiento clickeable
   */
  private createSortableTableHeader(
    centerX: number,
    y: number,
    headers: Array<{ label: string; field: 'email' | 'name' | 'group' | 'sessions_count' | 'created_at' | 'avg_score' | null }>,
    positions: number[]
  ): void {
    this.add
      .rectangle(centerX, y, 1100, 35, 0x1a1a2e, 1)
      .setStrokeStyle(2, 0xffff00)
      .setDepth(100)
      .setData('clearable', true);

    headers.forEach((header, index) => {
      const sortIndicator = header.field === this.usersFilters.sort_by
        ? (this.usersFilters.order === 'asc' ? ' ▲' : ' ▼')
        : '';

      const headerText = this.add
        .text(positions[index], y, header.label + sortIndicator, {
          fontSize: FONT_SIZE.xsPlus,
          color: header.field ? COLOR.yellow : '#cccc00',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(101)
        .setData('clearable', true);

      // Hacer clickeable solo si tiene campo asociado
      if (header.field) {
        headerText.setInteractive({ useHandCursor: true });

        headerText.on('pointerdown', () => {
          if (!header.field) return;

          // Si ya está ordenado por este campo, invertir el orden
          if (this.usersFilters.sort_by === header.field) {
            this.usersFilters.order = this.usersFilters.order === 'asc' ? 'desc' : 'asc';
          } else {
            // Si es un campo nuevo, ordenar descendente por defecto
            this.usersFilters.sort_by = header.field;
            this.usersFilters.order = 'desc';
          }
          this.usersFilters.page = 1;
          this.loadUsers();
        });

        headerText.on('pointerover', () => headerText.setColor(COLOR.white));
        headerText.on('pointerout', () => headerText.setColor(COLOR.yellow));
      }
    });
  }

  /**
   * Crea un encabezado de tabla
   */
  private createTableHeader(
    centerX: number,
    y: number,
    headers: string[],
    positions: number[]
  ): void {
    this.add
      .rectangle(centerX, y, 1100, 35, 0x1a1a2e, 1)
      .setStrokeStyle(2, 0xffff00)
      .setDepth(100)
      .setData('clearable', true);

    headers.forEach((header, index) => {
      this.add
        .text(positions[index], y, header, {
          fontSize: FONT_SIZE.xsPlus,
          color: COLOR.yellow,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(101)
        .setData('clearable', true);
    });
  }

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

    const currentPage = pagination.current_page;
    const lastPage = pagination.last_page;

    if (currentPage > 1) {
      this.createButton(centerX - 150, y, '← Anterior', () => onChange(currentPage - 1), COLOR.grayDark);
    }

    this.add
      .text(centerX, y, `Página ${currentPage} de ${lastPage}`, {
        fontSize: FONT_SIZE.md,
        color: COLOR.white,
      })
      .setOrigin(0.5)
      .setData('clearable', true);

    if (currentPage < lastPage) {
      this.createButton(centerX + 150, y, 'Siguiente →', () => onChange(currentPage + 1), COLOR.grayDark);
    }
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
    const btn = this.add
      .text(x, y, text, {
        fontSize: FONT_SIZE.sm,
        color: COLOR.white,
        backgroundColor: bgColor,
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .setData('clearable', true);

    btn.on('pointerdown', onClick);
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout', () => btn.setAlpha(1));

    return btn;
  }

  /**
   * Crea un texto simple
   */
  private createText(x: number, y: number, text: string, color: string): void {
    this.add
      .text(x, y, text, { fontSize: FONT_SIZE.xs, color })
      .setOrigin(0, 0.5)
      .setData('clearable', true);
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
    if (this.filterContainer) {
      this.filterContainer.remove();
      this.filterContainer = null;
    }
  }

  /**
   * Estilo para select
   */
  private getSelectStyle(): string {
    return `
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #444;
      background: #1a1a2e;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    `;
  }

  /**
   * Estilo para input
   */
  private getInputStyle(): string {
    return `
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #444;
      background: #1a1a2e;
      color: #fff;
      font-size: 14px;
    `;
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

    this.add
      .rectangle(centerX, centerY, 500, 200, 0x000000, 0.95)
      .setStrokeStyle(3, 0xff0000)
      .setData('clearable', true);

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

  /**
   * Cleanup al salir de la escena
   */
  shutdown(): void {
    this.removeFilterContainer();
  }
}
