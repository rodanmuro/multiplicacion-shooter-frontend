import type {
  AdminSessionsFilterParams,
  AdminUserListItem,
  PaginationInfoExtended,
  SessionListItemWithRow,
  UserSessionSummary,
} from '../../types/api';
import { adminApiService } from '../../services/adminApiService';
import { COLOR, FONT_SIZE } from '../../ui/theme';
import { FilterBar } from '../../ui/html/FilterBar';
import { createDataTable, type TableCell, type TableColumn } from '../../ui/widgets/DataTable';
import { formatDate, formatTime } from '../../utils/format';
import { AdminView } from './AdminView';

/**
 * Sesiones de un usuario del panel de administración: resumen, filtro de fechas,
 * tabla, paginación y exportación.
 */
export class UserSessionsView extends AdminView {
  private selectedUser: AdminUserListItem | null = null;
  private userSessions: SessionListItemWithRow[] = [];
  private sessionsSummary: UserSessionSummary | null = null;
  private sessionsPagination: PaginationInfoExtended | null = null;
  private sessionsFilters: AdminSessionsFilterParams = { page: 1 };

  /**
   * Muestra las sesiones de un usuario
   */
  async open(user: AdminUserListItem): Promise<void> {
    this.selectedUser = user;
    this.sessionsFilters = { page: 1 };

    try {
      const response = await adminApiService.getUserSessions(user.id, this.sessionsFilters);
      this.userSessions = response.data;
      this.sessionsSummary = response.summary;
      this.sessionsPagination = response.pagination;
      this.render();
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      this.host.showError(
        error instanceof Error ? error.message : 'Error al cargar sesiones'
      );
    }
  }

  /**
   * Dibuja la vista de sesiones de un usuario
   */
  private render(): void {
    const { width, height } = this.scene.cameras.main;
    const centerX = width / 2;

    this.begin();

    if (!this.selectedUser) return;

    // Botón volver a usuarios
    this.button(50, 40, '← Volver a Usuarios', () => {
      this.selectedUser = null;
      this.host.showUsers();
    });

    // Botón exportar sesiones
    this.button(width - 180, 40, '📥 Exportar', () => this.exportUserSessions(), COLOR.successDark);

    // Info del usuario
    const userName = `${this.selectedUser.name || ''} ${this.selectedUser.lastname || ''}`.trim();
    this.track(
      this.scene.add
        .text(centerX, 80, userName || this.selectedUser.email, {
          fontSize: FONT_SIZE.xxl,
          color: COLOR.white,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    this.track(
      this.scene.add
        .text(
          centerX,
          110,
          `${this.selectedUser.email} | Grupo: ${this.selectedUser.group || 'N/A'}`,
          { fontSize: FONT_SIZE.sm, color: COLOR.grayLight }
        )
        .setOrigin(0.5)
    );

    // Resumen de estadísticas
    if (this.sessionsSummary) {
      this.createSummaryBar(centerX, 145);
    }

    // Crear filtros de fecha
    this.createSessionsFilterBar();

    // Contador de registros
    this.counter(220, this.sessionsPagination, 'sesiones');

    // Tabla de sesiones
    createDataTable<SessionListItemWithRow>(this.scene, {
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
      onCreate: (obj) => this.track(obj),
    });

    // Paginación
    this.pagination(centerX, height - 60, this.sessionsPagination, (newPage) => {
      this.sessionsFilters.page = newPage;
      this.reloadUserSessions();
    });
  }

  /**
   * Crea la barra de resumen de estadísticas
   */
  private createSummaryBar(centerX: number, y: number): void {
    if (!this.sessionsSummary) return;

    const s = this.sessionsSummary;
    const summaryText = `Total: ${s.total_sessions} sesiones | Promedio: ${s.avg_score} pts | Mejor: ${s.best_score} pts | Tiempo jugado: ${s.total_playtime_minutes} min`;

    this.track(
      this.scene.add.rectangle(centerX, y, 900, 30, 0x1a2744, 0.9).setStrokeStyle(1, 0x4ecdc4)
    );

    this.track(
      this.scene.add
        .text(centerX, y, summaryText, {
          fontSize: FONT_SIZE.xs,
          color: COLOR.teal,
        })
        .setOrigin(0.5)
    );
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
      this.render();
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

}
