import Phaser from 'phaser';
import { AuthManager } from '../managers/AuthManager';
import type { GoogleCredentialResponse } from '../types/auth';
import { authApiService } from '../services/authApiService';

/**
 * Escena de login con Google OAuth
 */
export class LoginScene extends Phaser.Scene {
  private authManager!: AuthManager;
  private loginButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'LoginScene' });
  }

  create(): void {
    this.authManager = AuthManager.getInstance();

    // Fondo
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Título del juego
    const title = this.add.text(
      this.cameras.main.centerX,
      150,
      'MULTIPLICATION\nSHOOTER',
      {
        fontSize: '72px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center'
      }
    );
    title.setOrigin(0.5);

    // Subtítulo
    const subtitle = this.add.text(
      this.cameras.main.centerX,
      280,
      'Aprende las tablas de multiplicar jugando',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'italic'
      }
    );
    subtitle.setOrigin(0.5);

    // Instrucciones
    const instructions = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'Inicia sesión con tu cuenta de Google\npara guardar tu progreso',
      {
        fontSize: '24px',
        color: '#cccccc',
        align: 'center',
        lineSpacing: 10
      }
    );
    instructions.setOrigin(0.5);

    // Crear botón de Google (visual solamente)
    this.createGoogleButton();

    // Mensaje de carga
    const loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 100,
      'Cargando Google Sign-In...',
      {
        fontSize: '18px',
        color: '#888888'
      }
    );
    loadingText.setOrigin(0.5);
    loadingText.setAlpha(0);

    // Inicializar Google Identity Services
    this.time.delayedCall(500, () => {
      loadingText.setAlpha(1);
      this.initializeGoogleSignIn(loadingText);
    });

    // Créditos
    const credits = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 30,
      'Desarrollado con Phaser 3 & TypeScript',
      {
        fontSize: '16px',
        color: '#666666'
      }
    );
    credits.setOrigin(0.5);
  }

  /**
   * Crea el botón visual de Google
   */
  private createGoogleButton(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY + 80;

    // Contenedor del botón
    this.loginButton = this.add.container(centerX, centerY);

    // Fondo del botón
    const buttonBg = this.add.rectangle(0, 0, 280, 60, 0xffffff);
    buttonBg.setStrokeStyle(2, 0x4285f4);

    // Icono de Google (simulado con círculo de colores)
    const iconBg = this.add.circle(-90, 0, 18, 0xffffff);
    const googleIcon = this.add.text(-90, 0, 'G', {
      fontSize: '28px',
      color: '#4285f4',
      fontStyle: 'bold'
    });
    googleIcon.setOrigin(0.5);

    // Texto del botón
    const buttonText = this.add.text(10, 0, 'Sign in with Google', {
      fontSize: '20px',
      color: '#757575',
      fontStyle: 'bold'
    });
    buttonText.setOrigin(0.5);

    // Agregar elementos al contenedor
    this.loginButton.add([buttonBg, iconBg, googleIcon, buttonText]);

    // Hacer interactivo
    buttonBg.setInteractive({ useHandCursor: true });

    // Hover effect
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0xf8f8f8);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0xffffff);
    });

    // Aquí se agregará el div de Google más adelante
    buttonBg.setData('googleButtonPlaceholder', true);
  }

  /**
   * Inicializa Google Identity Services
   */
  private initializeGoogleSignIn(loadingText: Phaser.GameObjects.Text): void {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID no está configurado en .env');
      loadingText.setText('Error: Client ID no configurado');
      loadingText.setColor('#ff0000');
      return;
    }

    // Verificar si Google Identity Services está cargado
    if (typeof window.google === 'undefined') {
      loadingText.setText('Error: Google Identity Services no cargado');
      loadingText.setColor('#ff0000');
      return;
    }

    try {
      // Inicializar Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: this.handleGoogleCallback.bind(this)
      });

      // Renderizar el botón de Google
      const buttonDiv = document.createElement('div');
      buttonDiv.id = 'google-signin-button';
      buttonDiv.style.position = 'absolute';
      buttonDiv.style.left = '50%';
      buttonDiv.style.top = '50%';
      buttonDiv.style.transform = 'translate(-50%, -50%)';
      buttonDiv.style.marginTop = '80px';
      buttonDiv.style.zIndex = '1000';

      document.body.appendChild(buttonDiv);

      window.google.accounts.id.renderButton(
        buttonDiv,
        {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 280
        }
      );

      // Ocultar el botón visual de Phaser
      this.loginButton.setAlpha(0);

      loadingText.destroy();
    } catch (error) {
      console.error('Error al inicializar Google Sign-In:', error);
      loadingText.setText('Error al cargar Google Sign-In');
      loadingText.setColor('#ff0000');
    }
  }

  /**
   * Callback cuando el usuario se autentica con Google
   */
  private async handleGoogleCallback(response: GoogleCredentialResponse): Promise<void> {
    console.log('Google callback received');

    try {
      // 1. Primero procesar con AuthManager (almacenamiento local)
      const success = this.authManager.login(response.credential);

      if (!success) {
        throw new Error('Error al procesar login local');
      }

      // 2. Luego enviar al backend para registrar en BD
      console.log('Enviando token al backend...');
      const userData = await authApiService.verifyGoogleToken(response.credential);
      console.log('✅ Usuario registrado en backend:', userData);

      // 3. Guardar profile del usuario en localStorage
      localStorage.setItem('user_profile', userData.profile);
      console.log(`Perfil de usuario: ${userData.profile}`);

      // 4. Obtener datos del usuario local
      const user = this.authManager.getUser();

      // 5. Mostrar mensaje de bienvenida
      this.showWelcomeMessage(user?.name || userData.name);

      // 6. Remover el botón de Google del DOM
      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        buttonDiv.remove();
      }

      // 7. Transición al juego después de 2 segundos
      this.time.delayedCall(2000, () => {
        // Detener y limpiar LoginScene completamente
        this.scene.stop('LoginScene');
        // Iniciar GameScene
        this.scene.start('GameScene');
      });

    } catch (error) {
      console.error('❌ Error al verificar token con backend:', error);

      // Mostrar mensaje de error
      const errorText = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 200,
        'Error al conectar con el servidor.\nIntenta de nuevo.',
        {
          fontSize: '20px',
          color: '#ff0000',
          align: 'center'
        }
      );
      errorText.setOrigin(0.5);
    }
  }

  /**
   * Muestra mensaje de bienvenida
   */
  private showWelcomeMessage(userName: string): void {
    const welcome = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      `¡Bienvenido, ${userName}!`,
      {
        fontSize: '48px',
        color: '#00ff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    );
    welcome.setOrigin(0.5);
    welcome.setAlpha(0);

    // Animación de entrada
    this.tweens.add({
      targets: welcome,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      ease: 'Back.easeOut'
    });
  }

  /**
   * Limpieza al salir de la escena
   */
  shutdown(): void {
    // Remover el botón de Google del DOM si existe
    const buttonDiv = document.getElementById('google-signin-button');
    if (buttonDiv) {
      buttonDiv.remove();
    }
  }
}

// Declaración de tipos para Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; width: number }) => void;
          prompt: () => void;
        };
      };
    };
  }
}
