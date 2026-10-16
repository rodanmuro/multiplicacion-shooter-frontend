import { stubEmptyHistory, stubGameApi } from '../support/api';
import { expectSceneText, gameScene, visitApp, waitForScene } from '../support/gameDriver';
import { emptyPagination } from '../support/fixtures';

function openMenu() {
  cy.get('#user-menu-toggle').click();
  cy.get('#user-menu-dropdown').should('have.class', 'show');
}

describe('Menú de usuario', () => {
  beforeEach(() => {
    stubGameApi();
    stubEmptyHistory();
  });

  describe('visibilidad', () => {
    it('muestra solo el primer nombre del usuario', () => {
      visitApp({ name: 'Ana María Pérez' });
      gameScene();

      cy.get('#user-menu').should('be.visible');
      cy.get('#user-name').should('have.text', 'Ana');
    });

    it('arranca cerrado', () => {
      visitApp();
      gameScene();

      cy.get('#user-menu-dropdown').should('not.have.class', 'show');
      cy.get('#user-menu-toggle').should('not.have.class', 'active');
    });

    it('no se muestra en la pantalla de login', () => {
      visitApp({ authenticated: false, googleStub: true });
      waitForScene('LoginScene');

      cy.get('#user-menu').should('not.be.visible');
    });
  });

  describe('abrir y cerrar', () => {
    beforeEach(() => {
      visitApp();
      gameScene();
    });

    it('el toggle abre y cierra el desplegable', () => {
      openMenu();
      cy.get('#user-menu-toggle').should('have.class', 'active');

      cy.get('#user-menu-toggle').click();
      cy.get('#user-menu-dropdown').should('not.have.class', 'show');
      cy.get('#user-menu-toggle').should('not.have.class', 'active');
    });

    it('un click fuera del menú lo cierra', () => {
      openMenu();

      cy.get('body').click(4, 4);

      cy.get('#user-menu-dropdown').should('not.have.class', 'show');
    });
  });

  describe('botón de administración', () => {
    it('no aparece para un estudiante', () => {
      visitApp({ profile: 'student' });
      gameScene();
      openMenu();

      cy.get('#admin-btn').should('not.be.visible');
    });

    it('no aparece para un profesor', () => {
      visitApp({ profile: 'teacher' });
      gameScene();
      openMenu();

      cy.get('#admin-btn').should('not.be.visible');
    });

    it('aparece para un administrador', () => {
      visitApp({ profile: 'admin' });
      gameScene();
      openMenu();

      cy.get('#admin-btn').should('be.visible').and('contain.text', 'Panel Admin');
    });
  });

  describe('navegación', () => {
    it('"Estadísticas" abre StatsScene', () => {
      visitApp();
      gameScene();
      openMenu();

      cy.get('#stats-btn').click();

      waitForScene('StatsScene');
      cy.get('#user-menu-dropdown').should('not.have.class', 'show');
      cy.wait('@getSessions');
    });

    it('"Panel Admin" abre AdminScene', () => {
      cy.intercept({ method: 'GET', pathname: '/api/admin/groups' }, { body: { success: true, data: [] } });
      cy.intercept(
        { method: 'GET', pathname: '/api/admin/users' },
        {
          body: {
            success: true,
            data: [],
            pagination: { ...emptyPagination, per_page: 14, from: null, to: null },
            filters_applied: { group: null, profile: null, search: null },
          },
        }
      ).as('adminUsers');
      visitApp({ profile: 'admin' });
      gameScene();
      openMenu();

      cy.get('#admin-btn').click();

      waitForScene('AdminScene');
      expectSceneText('AdminScene', 'PANEL DE ADMINISTRACIÓN');
    });
  });

  describe('cerrar sesión', () => {
    it('si se cancela la confirmación, la sesión se conserva', () => {
      const messages: string[] = [];
      cy.on('window:confirm', (message) => {
        messages.push(message);
        return false;
      });
      visitApp();
      gameScene();
      cy.window().then((win) => ((win as any).__marker = 'misma-pagina'));
      openMenu();

      cy.get('#logout-btn').click();

      cy.then(() => expect(messages).to.deep.equal(['¿Estás seguro que deseas cerrar sesión?']));
      cy.window().should((win) => {
        expect(win.localStorage.getItem('google_auth_token')).to.be.a('string');
        expect((win as any).__marker, 'la página no se recargó').to.equal('misma-pagina');
      });
    });

    it('si se acepta, borra la sesión, recarga y muestra el login', () => {
      visitApp();
      gameScene();
      openMenu();

      cy.get('#logout-btn').click();

      waitForScene('LoginScene');
      cy.window().should((win) => {
        expect(win.localStorage.getItem('google_auth_token')).to.equal(null);
        expect(win.localStorage.getItem('google_user_data')).to.equal(null);
      });
    });
  });
});
