import Phaser from 'phaser';
import type { GoogleUser } from '../types/auth';

/**
 * Muestra la información del usuario autenticado en la esquina superior derecha
 */
export class UserDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private avatarCircle: Phaser.GameObjects.Graphics;
  private avatarText: Phaser.GameObjects.Text | null = null;
  private nameText: Phaser.GameObjects.Text;
  private avatarImage: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, user: GoogleUser) {
    this.scene = scene;

    const x = this.scene.cameras.main.width - 20;
    const y = 20;

    // Contenedor principal
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(2000);

    // Obtener solo el primer nombre
    const fullName = user.name || user.email.split('@')[0];
    const firstName = this.getFirstName(fullName);

    // Crear avatar circular
    this.avatarCircle = this.scene.add.graphics();
    this.avatarCircle.fillStyle(0x4285f4, 1);
    this.avatarCircle.fillCircle(-25, 25, 22);
    this.avatarCircle.lineStyle(2, 0xffffff, 1);
    this.avatarCircle.strokeCircle(-25, 25, 22);

    // Intentar cargar la imagen de perfil de Google
    if (user.picture) {
      this.loadAvatarImage(user.picture);
    } else {
      // Si no hay imagen, mostrar iniciales
      this.createAvatarInitials(fullName);
    }

    // Texto con el primer nombre del usuario
    this.nameText = this.scene.add.text(-55, 25, firstName, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 }
    });
    this.nameText.setOrigin(1, 0.5);

    // Agregar elementos al contenedor
    this.container.add([this.avatarCircle, this.nameText]);

    // Animación de entrada
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });

    console.log('UserDisplay creado para:', firstName);
  }

  /**
   * Carga la imagen de avatar de Google
   */
  private loadAvatarImage(pictureUrl: string): void {
    // Crear un loader temporal para la imagen del avatar
    const loader = new Phaser.Loader.LoaderPlugin(this.scene);

    // Generar key única para la imagen
    const imageKey = `avatar_${Date.now()}`;

    loader.image(imageKey, pictureUrl);

    loader.once('complete', () => {
      // Crear la imagen del avatar
      this.avatarImage = this.scene.add.image(-25, 25, imageKey);
      this.avatarImage.setDisplaySize(44, 44);
      this.avatarImage.setOrigin(0.5);

      // Crear máscara circular para la imagen
      const mask = this.scene.make.graphics({});
      mask.fillStyle(0xffffff);
      mask.fillCircle(-25, 25, 22);

      const geomMask = mask.createGeometryMask();
      this.avatarImage.setMask(geomMask);

      // Agregar la imagen al contenedor
      this.container.add(this.avatarImage);

      // Remover el círculo de fondo ya que tenemos la imagen
      this.avatarCircle.clear();
      this.avatarCircle.lineStyle(2, 0xffffff, 1);
      this.avatarCircle.strokeCircle(-25, 25, 22);
    });

    loader.once('loaderror', () => {
      console.warn('Error al cargar imagen de avatar, usando iniciales');
      // Si falla, usar iniciales
      const user = { name: this.nameText.text, email: '' } as GoogleUser;
      this.createAvatarInitials(user.name);
    });

    loader.start();
  }

  /**
   * Crea las iniciales del usuario en el avatar
   */
  private createAvatarInitials(fullName: string): void {
    const initials = this.getInitials(fullName);

    this.avatarText = this.scene.add.text(-25, 25, initials, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.avatarText.setOrigin(0.5);

    this.container.add(this.avatarText);
  }

  /**
   * Obtiene solo el primer nombre
   * Ejemplos:
   * - "Juan" → "Juan"
   * - "Juan Pérez" → "Juan"
   * - "María José López" → "María"
   */
  private getFirstName(fullName: string): string {
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);

    if (nameParts.length === 0) {
      return 'Usuario';
    }

    return nameParts[0];
  }

  /**
   * Obtiene las iniciales del nombre
   * Ejemplos:
   * - "Juan" → "J"
   * - "Juan Pérez" → "JP"
   * - "María José López" → "ML" (primera y última)
   */
  private getInitials(name: string): string {
    const nameParts = name.trim().split(' ').filter(part => part.length > 0);

    if (nameParts.length === 0) {
      return '?';
    }

    if (nameParts.length === 1) {
      // Un solo nombre: primera letra
      return nameParts[0][0].toUpperCase();
    }

    // Múltiples nombres: primera letra del primero y del último
    const firstInitial = nameParts[0][0].toUpperCase();
    const lastInitial = nameParts[nameParts.length - 1][0].toUpperCase();

    return firstInitial + lastInitial;
  }

  /**
   * Actualiza el nombre mostrado
   */
  public updateName(newName: string): void {
    this.nameText.setText(newName);
  }

  /**
   * Destruye el componente
   */
  public destroy(): void {
    if (this.avatarImage) {
      this.avatarImage.destroy();
    }
    this.container.destroy();
  }
}
