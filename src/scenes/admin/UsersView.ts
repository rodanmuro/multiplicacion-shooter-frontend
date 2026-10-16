import type {
  AdminUserListItem,
  AdminUsersFilterParams,
  PaginationInfoExtended,
} from '../../types/api';
import { adminApiService } from '../../services/adminApiService';
import { COLOR, FONT_SIZE } from '../../ui/theme';
import { FilterBar } from '../../ui/html/FilterBar';
import { createDataTable, type TableCell, type TableColumn } from '../../ui/widgets/DataTable';
import { formatDate } from '../../utils/format';
import { AdminView } from './AdminView';

/**
 * Lista de usuarios del panel de administración: filtros, tabla ordenable,
 * paginación, carga de CSV y exportación.
 */
export class UsersView extends AdminView {
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

  /** Carga los grupos (esperamos a que terminen) y luego los usuarios */
  async initialize(): Promise<void> {
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
   * Carga la lista de usuarios con filtros y la dibuja
   */
  async loadUsers(): Promise<void> {
    try {
      const response = await adminApiService.listUsers(this.usersFilters);
      this.users = response.data;
      this.usersPagination = response.pagination;
      this.render();
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      this.host.showError(
        error instanceof Error ? error.message : 'Error al cargar usuarios'
      );
    }
  }

  /**
   * Dibuja la vista de lista de usuarios
   */
  private render(): void {
    const { width, height } = this.scene.cameras.main;
    const centerX = width / 2;

    this.begin();

    // Botón volver al juego
    this.button(50, 25, '← Volver al Juego', () => this.host.goToGame());

    // Botones de la esquina superior derecha. Quedan a la izquierda del menú de usuario (HTML,
    // fijo arriba a la derecha) para que este no tape ninguno.
    this.button(width - 500, 25, '📥 Exportar', () => this.exportUsers(), COLOR.successDark);
    this.button(width - 340, 25, '📄 Cargar CSV', () => this.openCsvUpload(), '#0066cc');

    // Crear filtros HTML
    this.createUsersFilterBar();

    // Contador de registros
    this.counter(155, this.usersPagination, 'usuarios');

    // Tabla de usuarios con headers clickeables
    const pageOffset = ((this.usersPagination?.current_page || 1) - 1) * (this.usersFilters.per_page || 40);

    createDataTable<AdminUserListItem>(this.scene, {
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
        onClick: (index) => this.host.openUserSessions(this.users[index]),
      },
      onCreate: (obj) => this.track(obj),
    });

    // Paginación
    this.pagination(centerX, height - 60, this.usersPagination, (newPage) => {
      this.usersFilters.page = newPage;
      this.loadUsers();
    });
  }

  /**
   * Crea la barra de filtros para usuarios (HTML)
   */
  private createUsersFilterBar(): void {
    const bar = new FilterBar('users', 'admin-filters').anchorToCanvas(this.scene, 85);
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

}
