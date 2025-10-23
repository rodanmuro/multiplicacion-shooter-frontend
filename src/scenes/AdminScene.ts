import Phaser from 'phaser';
import { adminApiService } from '../services/adminApiService';
import type { AdminUserListItem, SessionListItem } from '../types/api';

/**
 * Escena de administración
 * Permite al administrador:
 * - Ver lista de usuarios con paginación
 * - Ver sesiones de cada usuario
 * - Cargar usuarios masivamente desde CSV
 */
export default class AdminScene extends Phaser.Scene {
  private currentPage: number = 1;
  private totalPages: number = 1;
  private users: AdminUserListItem[] = [];
  private selectedUser: AdminUserListItem | null = null;
  private userSessions: SessionListItem[] = [];
  private sessionPage: number = 1;
  private sessionTotalPages: number = 1;
  private viewMode: 'users' | 'sessions' = 'users';

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
      .text(centerX, 50, 'PANEL DE ADMINISTRACIÓN', {
        fontSize: '48px',
        color: '#ffff00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Cargar usuarios
    this.loadUsers();
  }

  /**
   * Carga la lista de usuarios desde la API
   */
  private async loadUsers(): Promise<void> {
    try {
      const response = await adminApiService.listUsers(this.currentPage);

      this.users = response.data;
      this.totalPages = response.pagination.last_page;

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

    // Limpiar escena anterior (excepto fondo y título)
    this.children.list
      .filter((child) => child.getData('clearable'))
      .forEach((child) => child.destroy());

    // Botón volver al menú
    const backButton = this.add
      .text(50, 50, '← Volver al Juego', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 15, y: 10 },
      })
      .setInteractive()
      .setData('clearable', true);

    backButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    backButton.on('pointerover', () => {
      backButton.setStyle({ backgroundColor: '#555555' });
    });

    backButton.on('pointerout', () => {
      backButton.setStyle({ backgroundColor: '#333333' });
    });

    // Botón cargar CSV
    const uploadButton = this.add
      .text(width - 50, 50, '📄 Cargar CSV', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#0066cc',
        padding: { x: 15, y: 10 },
      })
      .setOrigin(1, 0)
      .setInteractive()
      .setData('clearable', true);

    uploadButton.on('pointerdown', () => {
      this.openCsvUpload();
    });

    uploadButton.on('pointerover', () => {
      uploadButton.setStyle({ backgroundColor: '#0088ee' });
    });

    uploadButton.on('pointerout', () => {
      uploadButton.setStyle({ backgroundColor: '#0066cc' });
    });

    // Tabla de usuarios
    const tableY = 150;
    const headerBg = this.add
      .rectangle(centerX, tableY, 1200, 40, 0x1a1a2e, 1)
      .setStrokeStyle(2, 0xffff00)
      .setDepth(100)
      .setData('clearable', true);

    const headers = ['Email', 'Nombre', 'Perfil', 'Grupo', 'Sesiones', 'Fecha'];
    const headerPositions = [centerX - 500, centerX - 250, centerX - 50, centerX + 100, centerX + 300, centerX + 450];

    headers.forEach((header, index) => {
      this.add
        .text(headerPositions[index], tableY, header, {
          fontSize: '18px',
          color: '#ffff00',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(101)
        .setData('clearable', true);
    });

    // Renderizar filas de usuarios
    const maxVisible = 8;
    const itemHeight = 60;

    this.users.slice(0, maxVisible).forEach((user, index) => {
      const rowY = tableY + 50 + index * itemHeight;

      // Fondo de fila (interactivo)
      const rowBg = this.add
        .rectangle(centerX, rowY, 1200, itemHeight - 5, 0x16213e, 0.8)
        .setStrokeStyle(1, 0x0f3460)
        .setInteractive()
        .setData('clearable', true);

      rowBg.on('pointerdown', () => {
        this.viewUserSessions(user);
      });

      rowBg.on('pointerover', () => {
        rowBg.setFillStyle(0x1a2744);
      });

      rowBg.on('pointerout', () => {
        rowBg.setFillStyle(0x16213e);
      });

      // Datos de la fila
      const email = this.add
        .text(headerPositions[0], rowY, user.email, {
          fontSize: '16px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const name = this.add
        .text(
          headerPositions[1],
          rowY,
          `${user.name} ${user.lastname || ''}`.trim(),
          {
            fontSize: '16px',
            color: '#ffffff',
          }
        )
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const profile = this.add
        .text(headerPositions[2], rowY, user.profile, {
          fontSize: '16px',
          color: user.profile === 'admin' ? '#ff6b6b' : '#4ecdc4',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const group = this.add
        .text(headerPositions[3], rowY, user.group || '-', {
          fontSize: '16px',
          color: '#aaaaaa',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const sessions = this.add
        .text(headerPositions[4], rowY, user.game_sessions_count.toString(), {
          fontSize: '16px',
          color: '#95e1d3',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const date = this.add
        .text(
          headerPositions[5],
          rowY,
          new Date(user.created_at).toLocaleDateString(),
          {
            fontSize: '16px',
            color: '#aaaaaa',
          }
        )
        .setOrigin(0, 0.5)
        .setData('clearable', true);
    });

    // Paginación
    const paginationY = height - 100;

    if (this.currentPage > 1) {
      const prevButton = this.add
        .text(centerX - 150, paginationY, '← Anterior', {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#333333',
          padding: { x: 15, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive()
        .setData('clearable', true);

      prevButton.on('pointerdown', () => {
        this.currentPage--;
        this.loadUsers();
      });

      prevButton.on('pointerover', () => {
        prevButton.setStyle({ backgroundColor: '#555555' });
      });

      prevButton.on('pointerout', () => {
        prevButton.setStyle({ backgroundColor: '#333333' });
      });
    }

    this.add
      .text(centerX, paginationY, `Página ${this.currentPage} de ${this.totalPages}`, {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setData('clearable', true);

    if (this.currentPage < this.totalPages) {
      const nextButton = this.add
        .text(centerX + 150, paginationY, 'Siguiente →', {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#333333',
          padding: { x: 15, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive()
        .setData('clearable', true);

      nextButton.on('pointerdown', () => {
        this.currentPage++;
        this.loadUsers();
      });

      nextButton.on('pointerover', () => {
        nextButton.setStyle({ backgroundColor: '#555555' });
      });

      nextButton.on('pointerout', () => {
        nextButton.setStyle({ backgroundColor: '#333333' });
      });
    }
  }

  /**
   * Muestra las sesiones de un usuario específico
   */
  private async viewUserSessions(user: AdminUserListItem): Promise<void> {
    this.selectedUser = user;
    this.sessionPage = 1;

    try {
      const response = await adminApiService.getUserSessions(user.id, this.sessionPage);

      this.userSessions = response.data;
      this.sessionTotalPages = response.pagination.last_page;

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

    // Limpiar escena
    this.children.list
      .filter((child) => child.getData('clearable'))
      .forEach((child) => child.destroy());

    if (!this.selectedUser) return;

    // Botón volver a lista de usuarios
    const backButton = this.add
      .text(50, 50, '← Volver a Usuarios', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 15, y: 10 },
      })
      .setInteractive()
      .setData('clearable', true);

    backButton.on('pointerdown', () => {
      this.selectedUser = null;
      this.loadUsers();
    });

    backButton.on('pointerover', () => {
      backButton.setStyle({ backgroundColor: '#555555' });
    });

    backButton.on('pointerout', () => {
      backButton.setStyle({ backgroundColor: '#333333' });
    });

    // Información del usuario
    this.add
      .text(
        centerX,
        120,
        `${this.selectedUser.name} ${this.selectedUser.lastname || ''}`.trim(),
        {
          fontSize: '32px',
          color: '#ffffff',
          fontStyle: 'bold',
        }
      )
      .setOrigin(0.5)
      .setData('clearable', true);

    this.add
      .text(
        centerX,
        160,
        `${this.selectedUser.email} | ${this.selectedUser.profile} | Grupo: ${this.selectedUser.group || 'N/A'}`,
        {
          fontSize: '18px',
          color: '#aaaaaa',
        }
      )
      .setOrigin(0.5)
      .setData('clearable', true);

    // Tabla de sesiones
    const tableY = 220;
    const headerBg = this.add
      .rectangle(centerX, tableY, 1100, 40, 0x1a1a2e, 1)
      .setStrokeStyle(2, 0xffff00)
      .setDepth(100)
      .setData('clearable', true);

    const headers = ['Fecha', 'Puntuación', 'Nivel', 'Disparos', 'Aciertos', 'Precisión'];
    const headerPositions = [centerX - 450, centerX - 250, centerX - 100, centerX + 50, centerX + 200, centerX + 400];

    headers.forEach((header, index) => {
      this.add
        .text(headerPositions[index], tableY, header, {
          fontSize: '18px',
          color: '#ffff00',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(101)
        .setData('clearable', true);
    });

    // Renderizar sesiones
    const maxVisible = 8;
    const itemHeight = 55;

    this.userSessions.slice(0, maxVisible).forEach((session, index) => {
      const rowY = tableY + 50 + index * itemHeight;

      const rowBg = this.add
        .rectangle(centerX, rowY, 1100, itemHeight - 5, 0x16213e, 0.8)
        .setStrokeStyle(1, 0x0f3460)
        .setData('clearable', true);

      const date = this.add
        .text(
          headerPositions[0],
          rowY,
          new Date(session.started_at).toLocaleString(),
          {
            fontSize: '15px',
            color: '#ffffff',
          }
        )
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const score = this.add
        .text(headerPositions[1], rowY, session.final_score.toString(), {
          fontSize: '15px',
          color: '#95e1d3',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const level = this.add
        .text(headerPositions[2], rowY, session.max_level_reached.toString(), {
          fontSize: '15px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const shots = this.add
        .text(headerPositions[3], rowY, session.total_shots.toString(), {
          fontSize: '15px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const correct = this.add
        .text(headerPositions[4], rowY, session.correct_shots.toString(), {
          fontSize: '15px',
          color: '#4ecdc4',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);

      const accuracy = this.add
        .text(headerPositions[5], rowY, `${session.accuracy}%`, {
          fontSize: '15px',
          color: session.accuracy >= 80 ? '#00ff00' : '#ffaa00',
        })
        .setOrigin(0, 0.5)
        .setData('clearable', true);
    });

    // Paginación de sesiones
    const paginationY = height - 100;

    if (this.sessionPage > 1) {
      const prevButton = this.add
        .text(centerX - 150, paginationY, '← Anterior', {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#333333',
          padding: { x: 15, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive()
        .setData('clearable', true);

      prevButton.on('pointerdown', () => {
        this.sessionPage--;
        this.viewUserSessions(this.selectedUser!);
      });

      prevButton.on('pointerover', () => {
        prevButton.setStyle({ backgroundColor: '#555555' });
      });

      prevButton.on('pointerout', () => {
        prevButton.setStyle({ backgroundColor: '#333333' });
      });
    }

    this.add
      .text(
        centerX,
        paginationY,
        `Página ${this.sessionPage} de ${this.sessionTotalPages}`,
        {
          fontSize: '20px',
          color: '#ffffff',
        }
      )
      .setOrigin(0.5)
      .setData('clearable', true);

    if (this.sessionPage < this.sessionTotalPages) {
      const nextButton = this.add
        .text(centerX + 150, paginationY, 'Siguiente →', {
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#333333',
          padding: { x: 15, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive()
        .setData('clearable', true);

      nextButton.on('pointerdown', () => {
        this.sessionPage++;
        this.viewUserSessions(this.selectedUser!);
      });

      nextButton.on('pointerover', () => {
        nextButton.setStyle({ backgroundColor: '#555555' });
      });

      nextButton.on('pointerout', () => {
        nextButton.setStyle({ backgroundColor: '#333333' });
      });
    }
  }

  /**
   * Abre el diálogo de carga de CSV usando un input file HTML
   */
  private openCsvUpload(): void {
    // Crear input file temporal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      try {
        const response = await adminApiService.uploadCsv(file);

        // Mostrar resultado
        alert(
          `Carga completada:\n` +
            `- Creados: ${response.stats.created}\n` +
            `- Actualizados: ${response.stats.updated}\n` +
            `- Errores: ${response.stats.errors}\n\n` +
            (response.error_details.length > 0
              ? `Detalles de errores:\n${response.error_details.join('\n')}`
              : '')
        );

        // Recargar usuarios
        this.loadUsers();
      } catch (error) {
        console.error('Error al cargar CSV:', error);
        alert(
          `Error al cargar CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    };

    input.click();
  }

  /**
   * Muestra un mensaje de error
   */
  private showError(message: string): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    const errorBg = this.add
      .rectangle(centerX, centerY, 600, 300, 0x000000, 0.9)
      .setStrokeStyle(3, 0xff0000)
      .setData('clearable', true);

    this.add
      .text(centerX, centerY - 50, 'ERROR', {
        fontSize: '36px',
        color: '#ff0000',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setData('clearable', true);

    this.add
      .text(centerX, centerY + 20, message, {
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 500 },
      })
      .setOrigin(0.5)
      .setData('clearable', true);

    const closeButton = this.add
      .text(centerX, centerY + 100, 'Cerrar', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#666666',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive()
      .setData('clearable', true);

    closeButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
