import Phaser from 'phaser';
import { AuthManager } from '../managers/AuthManager';
import type { GoogleUser } from '../types/auth';

/**
 * Gestiona el menú de usuario en HTML (fuera del canvas de Phaser)
 * Muestra el avatar, nombre y botón de logout
 */
export class UserMenu {
  private userMenuElement: HTMLElement;
  private menuToggle: HTMLElement;
  private menuDropdown: HTMLElement;
  private userAvatarElement: HTMLImageElement;
  private userNameElement: HTMLElement;
  private statsButton: HTMLButtonElement;
  private logoutButton: HTMLButtonElement;
  private authManager: AuthManager;
  private gameInstance: Phaser.Game | null = null;
  private isMenuOpen: boolean = false;

  constructor() {
    this.authManager = AuthManager.getInstance();

    // Obtener elementos del DOM
    this.userMenuElement = document.getElementById('user-menu') as HTMLElement;
    this.menuToggle = document.getElementById('user-menu-toggle') as HTMLElement;
    this.menuDropdown = document.getElementById('user-menu-dropdown') as HTMLElement;
    this.userAvatarElement = document.getElementById('user-avatar') as HTMLImageElement;
    this.userNameElement = document.getElementById('user-name') as HTMLElement;
    this.statsButton = document.getElementById('stats-btn') as HTMLButtonElement;
    this.logoutButton = document.getElementById('logout-btn') as HTMLButtonElement;

    if (!this.userMenuElement || !this.menuToggle || !this.menuDropdown || !this.userAvatarElement || !this.userNameElement || !this.statsButton || !this.logoutButton) {
      console.error('User menu elements not found in DOM');
      return;
    }

    // Configurar eventos
    this.menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
    this.statsButton.addEventListener('click', () => {
      this.closeMenu();
      this.handleStats();
    });
    this.logoutButton.addEventListener('click', () => {
      this.closeMenu();
      this.handleLogout();
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', (e) => {
      if (this.isMenuOpen && !this.userMenuElement.contains(e.target as Node)) {
        this.closeMenu();
      }
    });
  }

  /**
   * Alterna la visibilidad del menú desplegable
   */
  private toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;

    if (this.isMenuOpen) {
      this.menuDropdown.classList.add('show');
      this.menuToggle.classList.add('active');
    } else {
      this.menuDropdown.classList.remove('show');
      this.menuToggle.classList.remove('active');
    }
  }

  /**
   * Cierra el menú desplegable
   */
  private closeMenu(): void {
    this.isMenuOpen = false;
    this.menuDropdown.classList.remove('show');
    this.menuToggle.classList.remove('active');
  }

  /**
   * Muestra el menú de usuario con la información del usuario autenticado
   */
  public show(user: GoogleUser): void {
    // Obtener solo el primer nombre
    const firstName = this.getFirstName(user.name || user.email.split('@')[0]);

    // Configurar avatar
    if (user.picture) {
      this.userAvatarElement.src = user.picture;
      this.userAvatarElement.alt = firstName;
    } else {
      // Si no hay imagen, usar un placeholder con iniciales
      this.userAvatarElement.src = this.createAvatarPlaceholder(firstName);
      this.userAvatarElement.alt = firstName;
    }

    // Configurar nombre
    this.userNameElement.textContent = firstName;

    // Mostrar el menú
    this.userMenuElement.style.display = 'block';

    console.log('User menu shown for:', firstName);
  }

  /**
   * Oculta el menú de usuario
   */
  public hide(): void {
    this.userMenuElement.style.display = 'none';
  }

  /**
   * Establece la instancia del juego para poder cambiar escenas
   */
  public setGameInstance(game: Phaser.Game): void {
    this.gameInstance = game;
  }

  /**
   * Maneja la navegación a la pantalla de estadísticas
   */
  private handleStats(): void {
    if (!this.gameInstance) {
      console.error('Game instance not set in UserMenu');
      return;
    }

    // Obtener la escena activa
    const currentScene = this.gameInstance.scene.getScenes(true)[0];

    if (currentScene) {
      // Cambiar a la escena de estadísticas
      currentScene.scene.start('StatsScene');
    }
  }

  /**
   * Maneja el logout del usuario
   */
  private handleLogout(): void {
    // Pedir confirmación antes de cerrar sesión
    const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');

    if (!confirmed) {
      return;
    }

    // Cerrar sesión
    this.authManager.logout();

    console.log('Logging out...');

    // Ocultar el menú
    this.hide();

    // Recargar la página para volver al login
    window.location.reload();
  }

  /**
   * Obtiene solo el primer nombre
   */
  private getFirstName(fullName: string): string {
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);

    if (nameParts.length === 0) {
      return 'Usuario';
    }

    return nameParts[0];
  }

  /**
   * Crea un placeholder SVG con las iniciales del usuario
   */
  private createAvatarPlaceholder(name: string): string {
    const initials = this.getInitials(name);

    const svg = `
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#4285f4"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="18" font-weight="bold" fill="white">
          ${initials}
        </text>
      </svg>
    `;

    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  /**
   * Obtiene las iniciales del nombre
   */
  private getInitials(name: string): string {
    const nameParts = name.trim().split(' ').filter(part => part.length > 0);

    if (nameParts.length === 0) {
      return '?';
    }

    if (nameParts.length === 1) {
      return nameParts[0][0].toUpperCase();
    }

    const firstInitial = nameParts[0][0].toUpperCase();
    const lastInitial = nameParts[nameParts.length - 1][0].toUpperCase();

    return firstInitial + lastInitial;
  }
}
