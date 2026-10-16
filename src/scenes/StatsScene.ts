import Phaser from 'phaser';
import { sessionApiService } from '../services/sessionApiService';
import type { SessionListItem, SessionDetail } from '../types/api';
import { FONT_SIZE, COLOR } from '../ui/theme';
import { formatDate, formatDateTime, formatDurationMMSS, formatTime } from '../utils/format';
import { createButton } from '../ui/widgets/Button';
import { createModalFrame } from '../ui/widgets/Modal';
import { createPagination } from '../ui/widgets/Pagination';
import { FilterBar } from '../ui/html/FilterBar';
import { createDataTable, type TableColumn } from '../ui/widgets/DataTable';

/**
 * Escena de estadísticas - Muestra historial de sesiones del usuario
 */
export class StatsScene extends Phaser.Scene {
  private sessions: SessionListItem[] = [];
  private currentPage: number = 1;
  private totalPages: number = 1;
  private totalSessions: number = 0;
  private minScore: number = 1000;
  private dateFrom: string = `${new Date().getFullYear()}-01-01`;
  private filterBar: FilterBar | null = null;
  private totalSpan: HTMLSpanElement | null = null;
  private sessionsList!: Phaser.GameObjects.Container;
  private loadingText!: Phaser.GameObjects.Text;
  private detailModal!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'StatsScene' });
  }

  create(): void {
    // Phaser no invoca por nombre un método `shutdown()`: hay que suscribirse al evento
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupHtmlElements());

    // Asegurar que el cursor sea visible
    this.input.setDefaultCursor('default');

    // Fondo
    this.cameras.main.setBackgroundColor(COLOR.navy);

    // Título
    const title = this.add.text(
      this.cameras.main.centerX,
      40,
      'HISTORIAL DE SESIONES',
      {
        fontSize: FONT_SIZE.display,
        color: COLOR.yellow,
        fontStyle: 'bold',
        stroke: COLOR.black,
        strokeThickness: 6,
        align: 'center'
      }
    );
    title.setOrigin(0.5);

    // Botón de volver
    createButton(this, {
      x: 50,
      y: 40,
      text: '← Volver',
      fontSize: FONT_SIZE.xl,
      bg: COLOR.slateBtn,
      padding: { x: 15, y: 10 },
      origin: { x: 0, y: 0.5 },
      hover: { bg: '#2d3748' },
      onClick: () => this.goBackToGame(),
    });

    // Texto de carga
    this.loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Cargando sesiones...',
      {
        fontSize: FONT_SIZE.title,
        color: COLOR.white
      }
    );
    this.loadingText.setOrigin(0.5);

    // Container para lista de sesiones
    this.sessionsList = this.add.container(0, 0);

    // Barra de filtros HTML
    this.createFilterBar();

    // Cargar sesiones
    this.loadSessions();
  }

  /**
   * Carga las sesiones desde el backend
   */
  private async loadSessions(): Promise<void> {
    try {
      this.loadingText.setVisible(true);

      const response = await sessionApiService.getSessions(this.currentPage, this.minScore, this.dateFrom);

      this.sessions = response.data;
      this.currentPage = response.pagination.current_page;
      this.totalPages = response.pagination.last_page;
      this.totalSessions = response.pagination.total;
      if (this.totalSpan) {
        this.totalSpan.textContent = `Total sesiones encontradas: ${this.totalSessions}`;
      }

      this.loadingText.setVisible(false);
      this.displaySessions();
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      this.loadingText.setText('Error al cargar sesiones. Intenta de nuevo.');
      this.loadingText.setColor(COLOR.red);
    }
  }

  /**
   * Crea la barra de filtros HTML
   */
  private createFilterBar(): void {
    this.filterBar = new FilterBar('stats');

    const label = this.filterBar.label('Mín pts:');

    const input = this.filterBar.input('number', 'short');
    input.min = '0';
    input.step = '100';
    input.value = String(this.minScore);
    let timeout: number;
    input.oninput = () => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        this.minScore = parseInt(input.value) || 0;
        this.currentPage = 1;
        this.sessionsList.removeAll(true);
        this.loadSessions();
      }, 500);
    };

    const dateLabel = this.filterBar.label('Desde:');

    const dateInput = this.filterBar.input('date');
    dateInput.value = this.dateFrom;
    dateInput.onchange = () => {
      this.dateFrom = dateInput.value;
      this.currentPage = 1;
      this.sessionsList.removeAll(true);
      this.loadSessions();
    };

    const separator = this.filterBar.separator('|');

    this.totalSpan = this.filterBar.total('Total sesiones encontradas: —');

    this.filterBar
      .append(dateLabel, dateInput, label, input, separator, this.totalSpan)
      .mount();
  }

  /**
   * Muestra la lista de sesiones en pantalla
   */
  private displaySessions(): void {
    // Limpiar contenedor
    this.sessionsList.removeAll(true);

    if (this.sessions.length === 0) {
      const noDataText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        'No tienes sesiones de juego todavía.\n¡Juega una partida para ver tus estadísticas!',
        {
          fontSize: FONT_SIZE.xl,
          color: COLOR.white,
          align: 'center'
        }
      );
      noDataText.setOrigin(0.5);
      this.sessionsList.add(noDataText);
      return;
    }

    createDataTable<SessionListItem>(this, {
      centerX: this.cameras.main.centerX,
      columns: this.sessionColumns(),
      rows: this.sessions,
      maxRows: 9,
      header: { y: 110, width: 1000, fontSize: FONT_SIZE.sm },
      firstRowY: 160,
      rowSpacing: 68,
      rowBackground: {
        width: 1000,
        height: 60,
        fill: 0x2d3748,
        alpha: 0.8,
        hover: { over: [0x4a5568, 0.9], out: [0x2d3748, 0.8] },
        onClick: (index) => this.showSessionDetail(this.sessions[index].id),
      },
      rowContainers: true,
      onCreate: (obj) => this.sessionsList.add(obj),
    });

    // Agregar controles de paginación si hay más de una página
    if (this.totalPages > 1) {
      this.createPaginationControls();
    }
  }

  /**
   * Columnas de la lista de sesiones
   */
  private sessionColumns(): TableColumn<SessionListItem>[] {
    return [
      {
        header: 'Fecha y Hora',
        headerX: -440,
        x: -480,
        cell: (s) => ({
          text: `${formatDate(s.started_at)} ${formatTime(s.started_at)}`,
          color: COLOR.white,
          fontSize: FONT_SIZE.md,
        }),
      },
      {
        header: 'Puntaje',
        headerX: -230,
        x: -250,
        cell: (s) => ({
          text: `${s.final_score} pts`,
          color: COLOR.yellow,
          fontSize: FONT_SIZE.lgPlus,
          fontStyle: 'bold',
        }),
      },
      {
        header: 'Nivel',
        headerX: -80,
        x: -100,
        cell: (s) => ({
          text: `Nivel ${s.max_level_reached}`,
          color: COLOR.green,
          fontSize: FONT_SIZE.md,
        }),
      },
      {
        header: 'Precisión',
        headerX: 70,
        x: 50,
        cell: (s) => ({
          text: `${s.accuracy.toFixed(1)}%`,
          color: s.accuracy >= 70 ? COLOR.green : '#ff9900',
          fontSize: FONT_SIZE.md,
        }),
      },
      {
        header: 'Disparos',
        headerX: 200,
        x: 180,
        cell: (s) => ({
          text: `${s.correct_shots}/${s.total_shots}`,
          color: COLOR.white,
          fontSize: FONT_SIZE.md,
        }),
      },
      {
        header: '',
        headerX: 350,
        x: 350,
        render: (s, x, y) =>
          createButton(this, {
            x,
            y,
            text: 'Ver detalle',
            fontSize: FONT_SIZE.sm,
            bg: '#4299e1',
            padding: { x: 10, y: 5 },
            origin: { x: 0, y: 0.5 },
            onClick: () => this.showSessionDetail(s.id),
          }),
      },
    ];
  }

  /**
   * Crea controles de paginación
   */
  private createPaginationControls(): void {
    const y = this.cameras.main.height - 40;
    const centerX = this.cameras.main.centerX;

    const controls = createPagination(this, {
      centerX,
      y,
      currentPage: this.currentPage,
      lastPage: this.totalPages,
      onChange: (page) => this.changePage(page),
      label: `${this.currentPage} / ${this.totalPages}`,
      buttonOffset: 100,
      labelFontSize: FONT_SIZE.lg,
      button: {
        fontSize: FONT_SIZE.lg,
        bg: COLOR.slateBtn,
        padding: { x: 15, y: 8 },
      },
    });
    controls.forEach((control) => this.sessionsList.add(control));
  }

  /**
   * Cambia de página
   */
  private changePage(page: number): void {
    this.currentPage = page;
    this.loadSessions();
  }

  /**
   * Muestra el detalle de una sesión específica
   */
  private async showSessionDetail(sessionId: number): Promise<void> {
    try {
      const detail = await sessionApiService.getSessionDetail(sessionId);
      this.showDetailModal(detail);
    } catch (error) {
      console.error('Error al cargar detalle de sesión:', error);
      alert('Error al cargar el detalle de la sesión');
    }
  }

  /**
   * Muestra modal con detalle completo de la sesión
   */
  private showDetailModal(detail: SessionDetail): void {
    const { backdrop, panel } = createModalFrame(this, {
      centerX: this.cameras.main.centerX,
      centerY: this.cameras.main.centerY,
      width: 900,
      height: 600,
      fill: 0x1a1a2e,
      fillAlpha: 1,
      strokeWidth: 2,
      strokeColor: 0xffff00,
      backdrop: { width: this.cameras.main.width, height: this.cameras.main.height, alpha: 0.8 },
    });
    this.detailModal = this.add.container(0, 0);
    this.detailModal.add(backdrop!);
    this.detailModal.add(panel);

    // Título del modal
    const dateStr = formatDateTime(detail.session.started_at);

    const modalTitle = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 260,
      `Sesión del ${dateStr}`,
      {
        fontSize: FONT_SIZE.xxl,
        color: COLOR.yellow,
        fontStyle: 'bold'
      }
    );
    modalTitle.setOrigin(0.5);
    this.detailModal.add(modalTitle);

    // Estadísticas generales
    const statsY = this.cameras.main.centerY - 200;
    const stats = [
      `Puntaje Final: ${detail.session.final_score}`,
      `Nivel Máximo: ${detail.session.max_level_reached}`,
      `Duración: ${formatDurationMMSS(detail.session.duration_seconds)}`,
      `Disparos Totales: ${detail.session.total_shots}`,
      `Aciertos: ${detail.session.correct_shots}`,
      `Errores: ${detail.session.wrong_shots}`,
      `Precisión: ${detail.session.accuracy.toFixed(2)}%`
    ];

    stats.forEach((stat, index) => {
      const statText = this.add.text(
        this.cameras.main.centerX - 400,
        statsY + (index * 30),
        stat,
        {
          fontSize: FONT_SIZE.lg,
          color: COLOR.white
        }
      );
      this.detailModal.add(statText);
    });

    // Total de disparos mostrados
    const shotsTitle = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 30,
      `Total de disparos: ${detail.shots.length}`,
      {
        fontSize: FONT_SIZE.md,
        color: COLOR.green
      }
    );
    shotsTitle.setOrigin(0.5);
    this.detailModal.add(shotsTitle);

    // Botón cerrar
    const closeBtn = createButton(this, {
      x: this.cameras.main.centerX,
      y: this.cameras.main.centerY + 250,
      text: 'Cerrar',
      fontSize: FONT_SIZE.xl,
      bg: COLOR.dangerBtn,
      padding: { x: 30, y: 12 },
      hover: { bg: '#c53030' },
      onClick: () => this.closeDetailModal(),
    });
    this.detailModal.add(closeBtn);
  }

  /**
   * Cierra el modal de detalle
   */
  private closeDetailModal(): void {
    if (this.detailModal) {
      this.detailModal.destroy();
    }
  }

  /**
   * Vuelve a la escena de juego
   */
  private goBackToGame(): void {
    this.cleanupHtmlElements();
    this.scene.start('GameScene');
  }

  private cleanupHtmlElements(): void {
    if (this.filterBar) {
      this.filterBar.destroy();
      this.filterBar = null;
      this.totalSpan = null;
    }
  }
}
