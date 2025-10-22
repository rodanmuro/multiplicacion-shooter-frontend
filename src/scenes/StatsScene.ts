import Phaser from 'phaser';
import { sessionApiService } from '../services/sessionApiService';
import type { SessionListItem, SessionDetail } from '../types/api';

/**
 * Escena de estadísticas - Muestra historial de sesiones del usuario
 */
export class StatsScene extends Phaser.Scene {
  private sessions: SessionListItem[] = [];
  private currentPage: number = 1;
  private totalPages: number = 1;
  private sessionsList!: Phaser.GameObjects.Container;
  private loadingText!: Phaser.GameObjects.Text;
  private detailModal!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'StatsScene' });
  }

  create(): void {
    // Asegurar que el cursor sea visible
    this.input.setDefaultCursor('default');

    // Fondo
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Título
    const title = this.add.text(
      this.cameras.main.centerX,
      40,
      'HISTORIAL DE SESIONES',
      {
        fontSize: '48px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
      }
    );
    title.setOrigin(0.5);

    // Botón de volver
    const backButton = this.add.text(
      50,
      40,
      '← Volver',
      {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#4a5568',
        padding: { x: 15, y: 10 }
      }
    );
    backButton.setOrigin(0, 0.5);
    backButton.setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.goBackToGame());
    backButton.on('pointerover', () => backButton.setStyle({ backgroundColor: '#2d3748' }));
    backButton.on('pointerout', () => backButton.setStyle({ backgroundColor: '#4a5568' }));

    // Texto de carga
    this.loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Cargando sesiones...',
      {
        fontSize: '32px',
        color: '#ffffff'
      }
    );
    this.loadingText.setOrigin(0.5);

    // Container para lista de sesiones
    this.sessionsList = this.add.container(0, 0);

    // Cargar sesiones
    this.loadSessions();
  }

  /**
   * Carga las sesiones desde el backend
   */
  private async loadSessions(): Promise<void> {
    try {
      this.loadingText.setVisible(true);

      const response = await sessionApiService.getSessions(this.currentPage);

      this.sessions = response.data;
      this.currentPage = response.pagination.current_page;
      this.totalPages = response.pagination.last_page;

      this.loadingText.setVisible(false);
      this.displaySessions();
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      this.loadingText.setText('Error al cargar sesiones. Intenta de nuevo.');
      this.loadingText.setColor('#ff0000');
    }
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
          fontSize: '24px',
          color: '#ffffff',
          align: 'center'
        }
      );
      noDataText.setOrigin(0.5);
      this.sessionsList.add(noDataText);
      return;
    }

    const startY = 150; // Bajado para dar espacio a los encabezados
    const itemHeight = 68;
    const maxVisibleSessions = 9; // Máximo 9 sesiones visibles para evitar solapamiento

    // Mostrar solo las primeras 9 sesiones (o menos si hay menos)
    const sessionsToDisplay = this.sessions.slice(0, maxVisibleSessions);

    sessionsToDisplay.forEach((session, index) => {
      const y = startY + (index * itemHeight);
      const sessionItem = this.createSessionItem(session, y);
      this.sessionsList.add(sessionItem);
    });

    // Agregar controles de paginación si hay más de una página
    if (this.totalPages > 1) {
      this.createPaginationControls();
    }

    // Crear encabezados de la tabla (al final para que estén arriba en z-index)
    this.createTableHeaders();
  }

  /**
   * Crea los encabezados de la tabla de sesiones
   */
  private createTableHeaders(): void {
    const headerY = 110;
    const centerX = this.cameras.main.centerX;

    // Fondo del encabezado
    const headerBg = this.add.rectangle(centerX, headerY, 1000, 35, 0x1a1a2e, 1);
    headerBg.setStrokeStyle(2, 0xffff00);
    headerBg.setDepth(100); // Asegurar que esté arriba
    this.sessionsList.add(headerBg);

    // Encabezados de columnas
    const headers = [
      { text: 'Fecha y Hora', x: centerX - 440, align: 'left' },
      { text: 'Puntaje', x: centerX - 230, align: 'left' },
      { text: 'Nivel', x: centerX - 80, align: 'left' },
      { text: 'Precisión', x: centerX + 70, align: 'left' },
      { text: 'Disparos', x: centerX + 200, align: 'left' },
      { text: '', x: centerX + 350, align: 'left' } // Columna de acción
    ];

    headers.forEach(header => {
      const headerText = this.add.text(
        header.x,
        headerY,
        header.text,
        {
          fontSize: '16px',
          color: '#ffff00',
          fontStyle: 'bold'
        }
      );
      headerText.setOrigin(header.align === 'left' ? 0 : 0.5, 0.5);
      headerText.setDepth(101); // Asegurar que esté arriba del fondo
      this.sessionsList.add(headerText);
    });
  }

  /**
   * Crea un item visual para una sesión
   */
  private createSessionItem(session: SessionListItem, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const centerX = this.cameras.main.centerX;

    // Fondo del item
    const bg = this.add.rectangle(centerX, y, 1000, 60, 0x2d3748, 0.8);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Fecha y hora
    const date = new Date(session.started_at);
    const dateStr = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const dateText = this.add.text(
      centerX - 480,
      y,
      `${dateStr} ${timeStr}`,
      {
        fontSize: '18px',
        color: '#ffffff'
      }
    );
    dateText.setOrigin(0, 0.5);
    container.add(dateText);

    // Puntaje
    const scoreText = this.add.text(
      centerX - 250,
      y,
      `${session.final_score} pts`,
      {
        fontSize: '22px',
        color: '#ffff00',
        fontStyle: 'bold'
      }
    );
    scoreText.setOrigin(0, 0.5);
    container.add(scoreText);

    // Nivel
    const levelText = this.add.text(
      centerX - 100,
      y,
      `Nivel ${session.max_level_reached}`,
      {
        fontSize: '18px',
        color: '#00ff00'
      }
    );
    levelText.setOrigin(0, 0.5);
    container.add(levelText);

    // Precisión
    const accuracyColor = session.accuracy >= 70 ? '#00ff00' : '#ff9900';
    const accuracyText = this.add.text(
      centerX + 50,
      y,
      `${session.accuracy.toFixed(1)}%`,
      {
        fontSize: '18px',
        color: accuracyColor
      }
    );
    accuracyText.setOrigin(0, 0.5);
    container.add(accuracyText);

    // Disparos
    const shotsText = this.add.text(
      centerX + 180,
      y,
      `${session.correct_shots}/${session.total_shots}`,
      {
        fontSize: '18px',
        color: '#ffffff'
      }
    );
    shotsText.setOrigin(0, 0.5);
    container.add(shotsText);

    // Botón ver detalle
    const detailBtn = this.add.text(
      centerX + 350,
      y,
      'Ver detalle',
      {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#4299e1',
        padding: { x: 10, y: 5 }
      }
    );
    detailBtn.setOrigin(0, 0.5);
    detailBtn.setInteractive({ useHandCursor: true });
    container.add(detailBtn);

    // Eventos de hover
    bg.on('pointerover', () => {
      bg.setFillStyle(0x4a5568, 0.9);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x2d3748, 0.8);
    });

    // Click para ver detalle
    bg.on('pointerdown', () => this.showSessionDetail(session.id));
    detailBtn.on('pointerdown', () => this.showSessionDetail(session.id));

    return container;
  }

  /**
   * Crea controles de paginación
   */
  private createPaginationControls(): void {
    const y = this.cameras.main.height - 40;
    const centerX = this.cameras.main.centerX;

    // Botón anterior
    if (this.currentPage > 1) {
      const prevBtn = this.add.text(
        centerX - 100,
        y,
        '← Anterior',
        {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#4a5568',
          padding: { x: 15, y: 8 }
        }
      );
      prevBtn.setOrigin(0.5);
      prevBtn.setInteractive({ useHandCursor: true });
      prevBtn.on('pointerdown', () => this.changePage(this.currentPage - 1));
      this.sessionsList.add(prevBtn);
    }

    // Indicador de página
    const pageText = this.add.text(
      centerX,
      y,
      `${this.currentPage} / ${this.totalPages}`,
      {
        fontSize: '20px',
        color: '#ffffff'
      }
    );
    pageText.setOrigin(0.5);
    this.sessionsList.add(pageText);

    // Botón siguiente
    if (this.currentPage < this.totalPages) {
      const nextBtn = this.add.text(
        centerX + 100,
        y,
        'Siguiente →',
        {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#4a5568',
          padding: { x: 15, y: 8 }
        }
      );
      nextBtn.setOrigin(0.5);
      nextBtn.setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => this.changePage(this.currentPage + 1));
      this.sessionsList.add(nextBtn);
    }
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
    // Overlay oscuro
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    overlay.setInteractive();

    // Modal container
    this.detailModal = this.add.container(0, 0);
    this.detailModal.add(overlay);

    // Fondo del modal
    const modalBg = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      900,
      600,
      0x1a1a2e,
      1
    );
    modalBg.setStrokeStyle(2, 0xffff00);
    this.detailModal.add(modalBg);

    // Título del modal
    const date = new Date(detail.session.started_at);
    const dateStr = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const modalTitle = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 260,
      `Sesión del ${dateStr}`,
      {
        fontSize: '28px',
        color: '#ffff00',
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
      `Duración: ${this.formatDuration(detail.session.duration_seconds)}`,
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
          fontSize: '20px',
          color: '#ffffff'
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
        fontSize: '18px',
        color: '#00ff00'
      }
    );
    shotsTitle.setOrigin(0.5);
    this.detailModal.add(shotsTitle);

    // Botón cerrar
    const closeBtn = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 250,
      'Cerrar',
      {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#e53e3e',
        padding: { x: 30, y: 12 }
      }
    );
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeDetailModal());
    closeBtn.on('pointerover', () => closeBtn.setStyle({ backgroundColor: '#c53030' }));
    closeBtn.on('pointerout', () => closeBtn.setStyle({ backgroundColor: '#e53e3e' }));
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
   * Formatea la duración en formato MM:SS
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Vuelve a la escena de juego
   */
  private goBackToGame(): void {
    this.scene.start('GameScene');
  }
}
