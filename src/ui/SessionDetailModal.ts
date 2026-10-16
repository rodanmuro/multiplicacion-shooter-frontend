import Phaser from 'phaser';
import type { SessionDetail } from '../types/api';
import { formatDateTime, formatDurationMMSS } from '../utils/format';
import { COLOR, FONT_SIZE } from './theme';
import { getLayout } from './layout';
import { createButton } from './widgets/Button';
import { createModalFrame } from './widgets/Modal';

/**
 * Modal con el detalle completo de una sesión de juego (Estadísticas).
 */
export class SessionDetailModal {
  private container: Phaser.GameObjects.Container;
  private onClose: (() => void) | undefined;

  /** `onClose` se invoca al cerrar el modal (p. ej. para volver a mostrar elementos HTML) */
  constructor(scene: Phaser.Scene, detail: SessionDetail, onClose?: () => void) {
    this.onClose = onClose;
    const { centerX, centerY, width, height } = scene.cameras.main;
    const { session } = detail;
    // En pantallas pequeñas el texto crece y las líneas se separan más (0 en escritorio)
    const u = getLayout(scene).hudScale - 1;
    const textScale = 1 + u;

    const { backdrop, panel } = createModalFrame(scene, {
      centerX,
      centerY,
      width: 900,
      height: 600,
      fill: 0x1a1a2e,
      fillAlpha: 1,
      strokeWidth: 2,
      strokeColor: 0xffff00,
      backdrop: { width, height, alpha: 0.8 },
    });
    this.container = scene.add.container(0, 0);
    this.container.add(backdrop!);
    this.container.add(panel);

    this.container.add(
      scene.add
        .text(centerX, centerY - 260, `Sesión del ${formatDateTime(session.started_at)}`, {
          fontSize: FONT_SIZE.xxl,
          color: COLOR.yellow,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScale(1 + 0.4 * u)
        .setResolution(1 + 0.4 * u)
    );

    const stats = [
      `Puntaje Final: ${session.final_score}`,
      `Nivel Máximo: ${session.max_level_reached}`,
      `Duración: ${formatDurationMMSS(session.duration_seconds)}`,
      `Disparos Totales: ${session.total_shots}`,
      `Aciertos: ${session.correct_shots}`,
      `Errores: ${session.wrong_shots}`,
      `Precisión: ${session.accuracy.toFixed(2)}%`,
    ];
    stats.forEach((stat, index) => {
      this.container.add(
        scene.add
          .text(centerX - 400, centerY - 200 + index * 30 * (1 + 0.9 * u), stat, {
            fontSize: FONT_SIZE.lg,
            color: COLOR.white,
          })
          .setScale(textScale)
          .setResolution(textScale)
      );
    });

    this.container.add(
      scene.add
        .text(centerX, centerY + 30 + 200 * u, `Total de disparos: ${detail.shots.length}`, {
          fontSize: FONT_SIZE.md,
          color: COLOR.green,
        })
        .setOrigin(0.5)
        .setScale(textScale)
        .setResolution(textScale)
    );

    this.container.add(
      createButton(scene, {
        x: centerX,
        y: centerY + 250,
        text: 'Cerrar',
        fontSize: FONT_SIZE.xl,
        bg: COLOR.dangerBtn,
        padding: { x: 30, y: 12 },
        scale: textScale,
        hover: { bg: '#c53030' },
        onClick: () => this.destroy(),
      })
    );
  }

  destroy(): void {
    this.container.destroy();
    this.onClose?.();
    this.onClose = undefined;
  }
}
