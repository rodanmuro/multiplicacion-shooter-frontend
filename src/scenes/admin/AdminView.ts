import Phaser from 'phaser';
import type { AdminUserListItem, PaginationInfoExtended } from '../../types/api';
import { COLOR, FONT_SIZE } from '../../ui/theme';
import { FilterBar } from '../../ui/html/FilterBar';
import { createButton, type ButtonStyle } from '../../ui/widgets/Button';
import { createPagination } from '../../ui/widgets/Pagination';

/** Lo que una vista necesita de la escena que la contiene */
export interface AdminHost {
  /** Hace visible `view`: destruye las demás vistas y el aviso de error */
  activate(view: AdminView): void;
  showError(message: string): void;
  goToGame(): void;
  /** Abre las sesiones de un usuario */
  openUserSessions(user: AdminUserListItem): void;
  /** Vuelve a la lista de usuarios (recargándola) */
  showUsers(): void;
}

/** Estilo común de los botones del panel */
export function adminButtonStyle(bg: string): ButtonStyle {
  return {
    fontSize: FONT_SIZE.sm,
    bg,
    padding: { x: 12, y: 8 },
    origin: { x: 0, y: 0.5 },
    hover: { alpha: 0.8 },
  };
}

/**
 * Pantalla del panel de administración. Cada vista lleva la cuenta de lo que dibuja
 * (objetos de Phaser y barra de filtros HTML) para poder retirarlo con `destroy()`.
 */
export abstract class AdminView {
  protected scene: Phaser.Scene;
  protected host: AdminHost;
  private objects: Phaser.GameObjects.GameObject[] = [];
  protected filterBar: FilterBar | null = null;

  constructor(scene: Phaser.Scene, host: AdminHost) {
    this.scene = scene;
    this.host = host;
  }

  /** Retira todo lo que la vista dibujó */
  destroy(): void {
    this.objects.forEach((obj) => obj.destroy());
    this.objects = [];
    this.filterBar?.destroy();
    this.filterBar = null;
  }

  /** Prepara el lienzo antes de dibujar: oculta las demás vistas y borra lo propio */
  protected begin(): void {
    this.host.activate(this);
    this.destroy();
  }

  protected track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.objects.push(obj);
    return obj;
  }

  protected button(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    bgColor: string = COLOR.grayDark
  ): Phaser.GameObjects.Text {
    return this.track(createButton(this.scene, { ...adminButtonStyle(bgColor), x, y, text, onClick }));
  }

  /** "Mostrando a-b de n …" */
  protected counter(y: number, pagination: PaginationInfoExtended | null, noun: string): void {
    if (!pagination) return;
    const from = pagination.from || 0;
    const to = pagination.to || 0;
    this.track(
      this.scene.add.text(100, y, `Mostrando ${from}-${to} de ${pagination.total} ${noun}`, {
        fontSize: FONT_SIZE.sm,
        color: COLOR.grayLight,
      })
    );
  }

  protected pagination(
    centerX: number,
    y: number,
    pagination: PaginationInfoExtended | null,
    onChange: (page: number) => void
  ): void {
    if (!pagination) return;

    createPagination(this.scene, {
      centerX,
      y,
      currentPage: pagination.current_page,
      lastPage: pagination.last_page,
      onChange,
      label: `Página ${pagination.current_page} de ${pagination.last_page}`,
      buttonOffset: 150,
      labelFontSize: FONT_SIZE.md,
      button: adminButtonStyle(COLOR.grayDark),
    }).forEach((control) => this.track(control));
  }
}
