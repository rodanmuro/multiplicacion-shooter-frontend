import Phaser from 'phaser';
import type { AdminUserListItem } from '../../types/api';
import { COLOR, FONT_SIZE } from '../../ui/theme';
import { getLayout } from '../../ui/layout';
import { createButton } from '../../ui/widgets/Button';
import { createModalFrame } from '../../ui/widgets/Modal';
import { AdminView, adminButtonStyle, type AdminHost } from './AdminView';
import { UsersView } from './UsersView';
import { UserSessionsView } from './UserSessionsView';

/**
 * Escena de administración (orquestador). Permite al administrador:
 * - Ver lista de usuarios con filtros (grupo, perfil, búsqueda)
 * - Ver sesiones de cada usuario con filtro de fechas
 * - Exportar datos a CSV
 * - Cargar usuarios masivamente desde CSV
 *
 * Cada pantalla es una vista (`UsersView`, `UserSessionsView`); solo una está visible a la vez.
 */
export default class AdminScene extends Phaser.Scene implements AdminHost {
  // Phaser reutiliza la instancia de la escena entre visitas, así que las vistas (y con ellas los
  // filtros y el orden elegidos) se conservan al volver a entrar, como antes del refactor.
  private usersView = new UsersView(this, this);
  private sessionsView = new UserSessionsView(this, this);
  private errorObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'AdminScene' });
  }

  create(): void {
    // Phaser no invoca por nombre un método `shutdown()`: hay que suscribirse al evento
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyViews());

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

    // El panel (tablas anchas y filtros) no es usable con el canvas tan reducido: solo escritorio
    if (getLayout(this).compact) {
      this.showDesktopOnlyNotice();
      return;
    }

    // Cargar grupos y usuarios
    this.usersView.initialize();
  }

  /**
   * Aviso en celular: el panel de administración solo está disponible en computador
   */
  private showDesktopOnlyNotice(): void {
    const { centerX, centerY } = this.cameras.main;

    this.add
      .text(centerX, centerY - 60, 'El panel de administración\nestá disponible solo en computador.', {
        fontSize: FONT_SIZE.xl,
        color: COLOR.white,
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    createButton(this, {
      ...adminButtonStyle(COLOR.grayDark),
      x: centerX,
      y: centerY + 40,
      origin: { x: 0.5, y: 0.5 },
      fontSize: FONT_SIZE.lg,
      padding: { x: 20, y: 12 },
      text: '← Volver al Juego',
      onClick: () => this.goToGame(),
    });
  }

  // --- AdminHost ---

  activate(view: AdminView): void {
    [this.usersView, this.sessionsView].filter((v) => v !== view).forEach((v) => v.destroy());
    this.clearError();
  }

  goToGame(): void {
    this.destroyViews();
    this.scene.start('GameScene');
  }

  openUserSessions(user: AdminUserListItem): void {
    this.sessionsView.open(user);
  }

  showUsers(): void {
    this.usersView.loadUsers();
  }

  /**
   * Muestra un mensaje de error
   */
  showError(message: string): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    this.errorObjects.push(
      createModalFrame(this, {
        centerX,
        centerY,
        width: 500,
        height: 200,
        fill: 0x000000,
        fillAlpha: 0.95,
        strokeWidth: 3,
        strokeColor: 0xff0000,
      }).panel,
      this.add
        .text(centerX, centerY - 40, 'ERROR', {
          fontSize: FONT_SIZE.xxl,
          color: COLOR.red,
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
      this.add
        .text(centerX, centerY + 10, message, {
          fontSize: FONT_SIZE.sm,
          color: COLOR.white,
          align: 'center',
          wordWrap: { width: 450 },
        })
        .setOrigin(0.5),
      createButton(this, {
        ...adminButtonStyle(COLOR.grayDark),
        x: centerX - 40,
        y: centerY + 70,
        text: 'Cerrar',
        onClick: () => this.goToGame(),
      })
    );
  }

  private clearError(): void {
    this.errorObjects.forEach((obj) => obj.destroy());
    this.errorObjects = [];
  }

  private destroyViews(): void {
    this.usersView.destroy();
    this.sessionsView.destroy();
  }
}
