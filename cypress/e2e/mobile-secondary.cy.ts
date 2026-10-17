import { stubAdminApi, stubGameApi, stubSessionsApi } from '../support/api';
import { adminUsers, listSessions } from '../support/fixtures';
import {
  clickGame,
  clickSceneText,
  endSessionNow,
  getScene,
  textObjects,
  clickUserMenu,
  expectNoSceneText,
  expectSceneText,
  gameScene,
  statsFilterBars,
  visitApp,
  waitForScene,
  worldWidth,
} from '../support/gameDriver';

const PHONE_LANDSCAPE: [number, number] = [844, 390];

function startAdminScene() {
  cy.window().then((win) => {
    (win as unknown as { game: { scene: { start: (key: string) => void } } }).game.scene.start('AdminScene');
  });
  return waitForScene('AdminScene');
}

describe('Celular: pantallas secundarias', () => {
  describe('Panel de administración (solo escritorio)', () => {
    it('en celular el menú de usuario no ofrece el panel', () => {
      cy.viewport(...PHONE_LANDSCAPE);
      stubGameApi();
      visitApp({ authenticated: true, profile: 'admin' });
      gameScene();

      cy.get('#user-menu-toggle').click();
      cy.get('#user-menu-dropdown').should('have.class', 'show');
      cy.get('#admin-btn').should('not.be.visible');
      cy.get('#stats-btn').should('be.visible');
    });

    it('si se llega al panel con el canvas reducido, avisa, no pide datos y permite volver', () => {
      cy.viewport(...PHONE_LANDSCAPE);
      stubGameApi();
      stubAdminApi({ users: adminUsers(3) });
      visitApp({ authenticated: true, profile: 'admin' });
      gameScene();

      startAdminScene();

      expectSceneText('AdminScene', 'El panel de administración\nestá disponible solo en computador.');
      expectNoSceneText('AdminScene', 'Mostrando 1-3 de 3 usuarios');
      cy.get('#admin-filters').should('not.exist');
      cy.get('@getUsers.all').should('have.length', 0);
      cy.get('@getGroups.all').should('have.length', 0);

      clickSceneText('AdminScene', '← Volver al Juego');
      gameScene();
    });

    it('en escritorio el panel sigue funcionando y el menú ofrece la opción', () => {
      stubGameApi();
      stubAdminApi({ users: adminUsers(3) });
      visitApp({ authenticated: true, profile: 'admin' });
      gameScene();
      clickUserMenu('#admin-btn');

      waitForScene('AdminScene');
      expectSceneText('AdminScene', 'PANEL DE ADMINISTRACIÓN');
      cy.get('#admin-filters').should('exist');
    });
  });

  describe('Resumen de sesión y confirmación de reinicio', () => {
    function finishSession() {
      stubGameApi();
      visitApp({ authenticated: true });
      gameScene();
      cy.wait('@createSession');
      endSessionNow();
      cy.wait('@finishSession');
      expectSceneText('GameScene', 'Haz clic para nueva sesión');
    }

    const boundsOf = (win: Window, label: string) => {
      const text = textObjects(getScene(win, 'GameScene')).find((t) => t.text === label);
      expect(!!text, `texto "${label}"`).to.equal(true);
      return text.getBounds();
    };

    it('en celular el título y las estadísticas se agrandan y no se pisan', () => {
      cy.viewport(...PHONE_LANDSCAPE);
      finishSession();

      cy.window().then((win) => {
        const title = boundsOf(win, '¡SESIÓN COMPLETADA!');
        const stats = textObjects(getScene(win, 'GameScene')).find((t) => t.text.startsWith('Puntuación Final'));
        const sb = stats.getBounds();
        const restart = boundsOf(win, 'Haz clic para nueva sesión');
        expect(stats.scaleX, 'estadísticas agrandadas').to.be.greaterThan(1.1);
        expect(title.bottom, 'el título termina sobre las estadísticas').to.be.at.most(sb.top);
        expect(sb.bottom, 'las estadísticas terminan sobre "Haz clic"').to.be.at.most(restart.top);
        expect(restart.bottom, 'todo cabe en el mundo').to.be.lessThan(800);
        expect(title.top, 'el título no sale por arriba').to.be.greaterThan(0);
      });
    });

    it('en celular los botones SÍ y NO son lo bastante grandes para el dedo', () => {
      cy.viewport(...PHONE_LANDSCAPE);
      finishSession();
      clickGame(300, 400);
      expectSceneText('GameScene', '¿Seguro que deseas iniciar\nuna nueva sesión?');

      cy.window().then((win) => {
        const scale = win.document.querySelector('canvas')!.getBoundingClientRect().width / worldWidth(win);
        for (const label of ['SÍ', 'NO']) {
          const b = boundsOf(win, label);
          expect(b.width * scale, `ancho de ${label} en pantalla`).to.be.at.least(48);
          expect(b.height * scale, `alto de ${label} en pantalla`).to.be.at.least(48);
        }
        const yes = boundsOf(win, 'SÍ');
        const no = boundsOf(win, 'NO');
        expect(no.left - yes.right, 'separación entre botones').to.be.greaterThan(20);
      });
    });

    it('en escritorio las posiciones y tamaños no cambian', () => {
      finishSession();

      cy.window().then((win) => {
        const title = textObjects(getScene(win, 'GameScene')).find((t) => t.text === '¡SESIÓN COMPLETADA!');
        const restart = textObjects(getScene(win, 'GameScene')).find((t) => t.text === 'Haz clic para nueva sesión');
        expect(title.scaleX).to.equal(1);
        expect(title.y).to.equal(250);
        expect(restart.y).to.equal(550);
      });
      clickGame(300, 400);
      expectSceneText('GameScene', 'SÍ');
      cy.window().then((win) => {
        const yes = textObjects(getScene(win, 'GameScene')).find((t) => t.text === 'SÍ');
        expect(yes.scaleX).to.equal(1);
        expect(yes.x).to.equal(500);
        expect(yes.y).to.equal(480);
      });
    });
  });

  describe('Estadísticas', () => {
    function openStats(viewport?: [number, number]) {
      if (viewport) cy.viewport(...viewport);
      stubGameApi();
      stubSessionsApi({ sessions: listSessions(12) });
      visitApp({ authenticated: true });
      gameScene();
      clickUserMenu('#stats-btn');
      waitForScene('StatsScene');
      expectSceneText('StatsScene', '1 / 2');
    }

    const statsTexts = (win: Window) => textObjects(getScene(win, 'StatsScene')) as Array<Record<string, any>>;

    /** Rectángulo del canvas y escala a la que se muestra */
    function canvasRect(win: Window) {
      const r = win.document.querySelector('canvas')!.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, centerX: r.left + r.width / 2, scale: r.width / worldWidth(win) };
    }

    describe('en celular horizontal', () => {
      beforeEach(() => openStats(PHONE_LANDSCAPE));

      it('la tabla pierde "Disparos" y usa fecha corta', () => {
        cy.window().then((win) => {
          const texts = statsTexts(win).map((t) => t.text as string);
          expect(texts).to.include('Precisión');
          expect(texts).not.to.include('Disparos');
          expect(texts.filter((t) => /^\d{2}\/\d{2} \d{2}:\d{2}$/.test(t)), 'fechas cortas').to.have.length(9);
          expect(texts.filter((t) => t === 'Ver detalle')).to.have.length(9);
        });
      });

      it('los textos de una fila no se pisan y todo cabe en el mundo', () => {
        cy.window().then((win) => {
          const cells = statsTexts(win).filter((t) => t.visible && Math.abs(t.y - 200) < 1);
          expect(cells.length, 'celdas de la primera fila').to.equal(5);
          const boxes = cells.map((t) => t.getBounds()).sort((a, b) => a.left - b.left);
          for (let i = 1; i < boxes.length; i++) {
            expect(boxes[i - 1].right, `columna ${i} termina antes de la siguiente`).to.be.at.most(boxes[i].left);
          }
          // La tabla compacta se ensancha con el mundo: 1000 de ancho a 1200, hasta 1,6 veces más
          const spread = Math.min(1.6, Math.max(1, (worldWidth(win) - 120) / 1000));
          expect(boxes[boxes.length - 1].right, 'dentro de la fila').to.be.at.most(worldWidth(win) / 2 + 500 * spread);
          const lowest = Math.max(...statsTexts(win).filter((t) => t.text !== '').map((t) => t.getBounds().bottom));
          expect(lowest, 'nada sale por abajo').to.be.at.most(800);
        });
      });

      it('la barra de filtros se ancla al canvas, es compacta y no tapa la tabla', () => {
        cy.window().then((win) => {
          const canvas = canvasRect(win);
          const bar = statsFilterBars(win)[0] as HTMLElement;
          const b = bar.getBoundingClientRect();
          expect(bar.classList.contains('filter-bar--compact'), 'variante compacta').to.equal(true);
          expect(b.top, 'borde superior').to.be.closeTo(canvas.top + 62 * canvas.scale, 1);
          expect(b.left + b.width / 2, 'centrada en el canvas').to.be.closeTo(canvas.centerX, 2);
          expect(b.width, 'no más ancha que el canvas').to.be.at.most(canvas.width);
          const header = statsTexts(win).find((t) => t.text === 'Fecha y Hora')!.getBounds();
          expect(b.bottom, 'la barra termina antes del encabezado').to.be.at.most(canvas.top + header.top * canvas.scale);
        });
        cy.get('body > div').filter(':contains("Mín pts:")').should('contain.text', 'Total: 12');
      });

      it('la paginación no pisa el indicador', () => {
        cy.window().then((win) => {
          const label = statsTexts(win).find((t) => t.text === '1 / 2')!.getBounds();
          const next = statsTexts(win).find((t) => t.text === 'Siguiente →')!.getBounds();
          expect(next.left, 'el botón empieza después del indicador').to.be.at.least(label.right);
          expect(next.bottom, 'dentro del mundo').to.be.at.most(800);
        });
      });

      it('el detalle oculta la barra de filtros HTML mientras está abierto y la devuelve al cerrar', () => {
        cy.window({ log: false }).then((win) => clickGame(worldWidth(win) / 2, 200));
        expectSceneText('StatsScene', 'Cerrar');
        cy.window().then((win) => {
          expect((statsFilterBars(win)[0] as HTMLElement).style.visibility).to.equal('hidden');
          const shots = statsTexts(win).find((t) => t.text.startsWith('Total de disparos'))!.getBounds();
          const lines = statsTexts(win).filter((t) => t.text.startsWith('Precisión:')).map((t) => t.getBounds());
          expect(lines[0].bottom, 'la última línea termina antes de "Total de disparos"').to.be.at.most(shots.top);
          const close = statsTexts(win).find((t) => t.text === 'Cerrar')!.getBounds();
          expect(shots.bottom, 'y esta antes del botón').to.be.at.most(close.top);
        });

        clickSceneText('StatsScene', 'Cerrar');
        cy.window().should((win) => {
          expect((statsFilterBars(win)[0] as HTMLElement).style.visibility).to.equal('');
        });
      });
    });

    describe('en escritorio', () => {
      beforeEach(() => openStats());

      it('la tabla conserva todas sus columnas y la fecha completa', () => {
        cy.window().then((win) => {
          const texts = statsTexts(win).map((t) => t.text as string);
          expect(texts).to.include('Disparos');
          expect(texts.some((t) => /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(t))).to.equal(true);
          expect(statsTexts(win).find((t) => t.text === 'Fecha y Hora')!.y).to.equal(110);
        });
      });

      it('la barra de filtros también queda anclada al canvas (a 70 del borde superior)', () => {
        cy.window().then((win) => {
          const canvas = canvasRect(win);
          const bar = statsFilterBars(win)[0] as HTMLElement;
          const b = bar.getBoundingClientRect();
          expect(b.top).to.be.closeTo(canvas.top + 70 * canvas.scale, 1);
          expect(b.left + b.width / 2).to.be.closeTo(canvas.centerX, 2);
          expect(bar.classList.contains('filter-bar--compact')).to.equal(false);
          expect(bar.textContent).to.contain('Total sesiones encontradas: 12');
        });
      });
    });
  });
});
