import { stubGameApi, stubSessionsApi } from '../support/api';
import { listSession, listSessions } from '../support/fixtures';
import {
  clickSceneText,
  clickUserMenu,
  expectNoSceneText,
  expectSceneText,
  expectSnapshot,
  expectTextColor,
  expectTextVisible,
  gameScene,
  getScene,
  statsFilterBars,
  textsOf,
  visitApp,
  waitForScene,
} from '../support/gameDriver';

const YEAR = new Date().getFullYear();

function openStats(options: Parameters<typeof stubSessionsApi>[0]) {
  stubGameApi();
  stubSessionsApi(options);
  visitApp();
  gameScene();
  clickUserMenu('#stats-btn');
  return waitForScene('StatsScene');
}

const filterBar = () => cy.get('body > div').filter(':contains("Mín pts:")');
const minPoints = () => filterBar().find('input[type="number"]');
const dateFrom = () => filterBar().find('input[type="date"]');

describe('Estadísticas del estudiante', () => {
  describe('carga inicial', () => {
    it('pide la página 1 con los filtros por defecto: mín. 1000 pts y desde el 1 de enero', () => {
      openStats({ sessions: listSessions(3) });

      cy.wait('@getSessions').its('request.query').should('deep.include', {
        page: '1',
        min_score: '1000',
        date_from: `${YEAR}-01-01`,
      });
    });

    it('envía el token del usuario', () => {
      stubGameApi();
      stubSessionsApi({ sessions: listSessions(1) });
      const { token } = visitApp();
      gameScene();
      clickUserMenu('#stats-btn');

      cy.wait('@getSessions').its('request.headers.authorization').should('equal', `Bearer ${token}`);
    });

    it('muestra el título y el botón de volver', () => {
      openStats({ sessions: listSessions(3) });

      expectSceneText('StatsScene', 'HISTORIAL DE SESIONES');
      expectSceneText('StatsScene', '← Volver');
    });

    it('mientras el backend responde muestra "Cargando sesiones..." y luego lo oculta', () => {
      openStats({ sessions: listSessions(3), delayMs: 1500 });

      expectTextVisible('StatsScene', 'Cargando sesiones...', true);
      expectSceneText('StatsScene', 'Ver detalle');
      expectTextVisible('StatsScene', 'Cargando sesiones...', false);
    });
  });

  describe('lista de sesiones', () => {
    it('muestra los encabezados de la tabla', () => {
      openStats({ sessions: listSessions(3) });

      for (const header of ['Fecha y Hora', 'Puntaje', 'Nivel', 'Precisión', 'Disparos']) {
        expectSceneText('StatsScene', header);
      }
    });

    it('cada fila muestra puntaje, nivel, precisión y aciertos/disparos', () => {
      openStats({
        sessions: [
          listSession({ id: 2, final_score: 1250, max_level_reached: 4, accuracy: 72.5, correct_shots: 29, total_shots: 40 }),
          listSession({ id: 1, final_score: 1800, max_level_reached: 6, accuracy: 55, correct_shots: 22, total_shots: 40 }),
        ],
      });

      expectSceneText('StatsScene', '1250 pts');
      expectSceneText('StatsScene', 'Nivel 4');
      expectSceneText('StatsScene', '72.5%');
      expectSceneText('StatsScene', '29/40');
      expectSceneText('StatsScene', '1800 pts');
      expectSceneText('StatsScene', 'Nivel 6');
      expectSceneText('StatsScene', '55.0%');
      expectSceneText('StatsScene', '22/40');
    });

    it('la precisión es verde desde el 70 % y naranja por debajo', () => {
      openStats({
        sessions: [
          listSession({ id: 3, accuracy: 70 }),
          listSession({ id: 2, accuracy: 69.9 }),
          listSession({ id: 1, accuracy: 91.234 }),
        ],
      });

      expectTextColor('StatsScene', '70.0%', '#00ff00');
      expectTextColor('StatsScene', '69.9%', '#ff9900');
      expectTextColor('StatsScene', '91.2%', '#00ff00');
    });

    it('la fecha y hora se muestran como dd/mm/aaaa hh:mm', () => {
      openStats({ sessions: listSessions(2) });

      expectSceneText('StatsScene', /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    });

    it('(comportamiento actual) solo se dibujan 9 filas aunque el backend envíe más', () => {
      openStats({ sessions: listSessions(12), perPage: 12 });

      cy.window().should((win) => {
        const rows = textsOf(getScene(win, 'StatsScene')).filter((t) => t === 'Ver detalle');
        expect(rows).to.have.length(9);
      });
    });

    it('sin sesiones muestra el mensaje de estado vacío', () => {
      openStats({ sessions: [] });

      expectSceneText('StatsScene', 'No tienes sesiones de juego todavía.\n¡Juega una partida para ver tus estadísticas!');
      expectNoSceneText('StatsScene', 'Ver detalle');
      expectNoSceneText('StatsScene', 'Fecha y Hora');
    });
  });

  describe('barra de filtros (HTML)', () => {
    it('muestra "Desde" con el 1 de enero y "Mín pts" con 1000', () => {
      openStats({ sessions: listSessions(3) });

      dateFrom().should('have.value', `${YEAR}-01-01`);
      minPoints().should('have.value', '1000').and('have.attr', 'min', '0').and('have.attr', 'step', '100');
    });

    it('el contador refleja el total del backend', () => {
      openStats({ sessions: listSessions(17) });

      filterBar().should('contain.text', 'Total sesiones encontradas: 17');
    });

    it('el contador arranca en "—" y pasa a 0 cuando no hay sesiones', () => {
      openStats({ sessions: [], delayMs: 1200 });

      filterBar().should('contain.text', 'Total sesiones encontradas: —');
      filterBar().should('contain.text', 'Total sesiones encontradas: 0');
    });

    it('cambiar los puntos mínimos vuelve a pedir la página 1 con el nuevo valor (con espera de 500 ms)', () => {
      openStats({ sessions: listSessions(3) });
      cy.wait('@getSessions');

      minPoints().clear().type('2500');

      cy.wait('@getSessions').its('request.query').should('deep.include', { page: '1', min_score: '2500' });
    });

    it('con 0 o vacío no se envía min_score', () => {
      openStats({ sessions: listSessions(3) });
      cy.wait('@getSessions');

      minPoints().clear().type('0');
      cy.wait('@getSessions').its('request.query').should('not.have.property', 'min_score');

      minPoints().clear().type('300');
      cy.wait('@getSessions').its('request.query.min_score').should('equal', '300');

      minPoints().clear();
      cy.wait('@getSessions').its('request.query').should('not.have.property', 'min_score');
    });

    it('cambiar la fecha vuelve a pedir la página 1 con date_from', () => {
      openStats({ sessions: listSessions(3) });
      cy.wait('@getSessions');

      dateFrom().invoke('val', '2026-02-15').trigger('change');

      cy.wait('@getSessions').its('request.query').should('deep.include', { page: '1', date_from: '2026-02-15' });
    });

    it('un filtro nuevo regresa a la página 1 aunque se estuviera en otra', () => {
      openStats({ sessions: listSessions(20) });
      cy.wait('@getSessions');
      clickSceneText('StatsScene', 'Siguiente →');
      cy.wait('@getSessions').its('request.query.page').should('equal', '2');

      minPoints().clear().type('1500');

      cy.wait('@getSessions').its('request.query.page').should('equal', '1');
    });
  });

  describe('paginación', () => {
    it('con una sola página no hay controles', () => {
      openStats({ sessions: listSessions(5) });

      expectSceneText('StatsScene', 'Ver detalle');
      expectNoSceneText('StatsScene', 'Siguiente →');
      expectNoSceneText('StatsScene', '← Anterior');
      expectNoSceneText('StatsScene', /^\d+ \/ \d+$/);
    });

    it('en la primera página solo hay "Siguiente"; en el medio ambos; en la última solo "Anterior"', () => {
      openStats({ sessions: listSessions(20) });

      expectSceneText('StatsScene', '1 / 3');
      expectSceneText('StatsScene', 'Siguiente →');
      expectNoSceneText('StatsScene', '← Anterior');

      clickSceneText('StatsScene', 'Siguiente →');
      expectSceneText('StatsScene', '2 / 3');
      expectSceneText('StatsScene', '← Anterior');
      expectSceneText('StatsScene', 'Siguiente →');

      clickSceneText('StatsScene', 'Siguiente →');
      expectSceneText('StatsScene', '3 / 3');
      expectSceneText('StatsScene', '← Anterior');
      expectNoSceneText('StatsScene', 'Siguiente →');
    });

    it('cada cambio de página pide esa página y reemplaza las filas', () => {
      openStats({ sessions: listSessions(20) });
      expectSceneText('StatsScene', '2000 pts');

      clickSceneText('StatsScene', 'Siguiente →');

      cy.wait('@getSessions');
      cy.wait('@getSessions').its('request.query.page').should('equal', '2');
      expectSceneText('StatsScene', '1100 pts');
      expectNoSceneText('StatsScene', '2000 pts');

      clickSceneText('StatsScene', '← Anterior');
      expectSceneText('StatsScene', '2000 pts');
    });
  });

  describe('detalle de una sesión', () => {
    it('al pulsar "Ver detalle" pide la sesión y abre el modal con todos sus datos', () => {
      openStats({
        sessions: [
          listSession({
            id: 42, final_score: 1250, max_level_reached: 4, duration_seconds: 300, total_shots: 40,
            correct_shots: 29, wrong_shots: 11, accuracy: 72.5,
          }),
        ],
        detailShots: 5,
      });
      expectSceneText('StatsScene', 'Ver detalle');

      clickSceneText('StatsScene', 'Ver detalle');

      cy.wait('@getSessionDetail').its('request.url').should('match', /\/api\/sessions\/42$/);
      expectSceneText('StatsScene', /^Sesión del .+/);
      expectSceneText('StatsScene', 'Puntaje Final: 1250');
      expectSceneText('StatsScene', 'Nivel Máximo: 4');
      expectSceneText('StatsScene', 'Duración: 05:00');
      expectSceneText('StatsScene', 'Disparos Totales: 40');
      expectSceneText('StatsScene', 'Aciertos: 29');
      expectSceneText('StatsScene', 'Errores: 11');
      expectSceneText('StatsScene', 'Precisión: 72.50%');
      expectSceneText('StatsScene', 'Total de disparos: 5');
      expectSceneText('StatsScene', 'Cerrar');
    });

    it('la duración se muestra como mm:ss', () => {
      openStats({ sessions: [listSession({ id: 1, duration_seconds: 75 })] });
      expectSceneText('StatsScene', 'Ver detalle');

      clickSceneText('StatsScene', 'Ver detalle');

      expectSceneText('StatsScene', 'Duración: 01:15');
    });

    it('"Cerrar" quita el modal y deja la lista', () => {
      openStats({ sessions: [listSession({ id: 1, final_score: 1250 })] });
      expectSceneText('StatsScene', 'Ver detalle');
      clickSceneText('StatsScene', 'Ver detalle');
      expectSceneText('StatsScene', 'Puntaje Final: 1250');

      clickSceneText('StatsScene', 'Cerrar');

      expectNoSceneText('StatsScene', 'Puntaje Final: 1250');
      expectNoSceneText('StatsScene', 'Cerrar');
      expectSceneText('StatsScene', '1250 pts');
    });

    it('si el detalle falla avisa con un alert y no abre el modal', () => {
      const alerts: string[] = [];
      cy.on('window:alert', (message) => alerts.push(message));
      openStats({ sessions: listSessions(2), detailFails: true });
      expectSceneText('StatsScene', 'Ver detalle');

      clickSceneText('StatsScene', 'Ver detalle');

      cy.wait('@getSessionDetail');
      cy.wrap(alerts).should('deep.equal', ['Error al cargar el detalle de la sesión']);
      expectNoSceneText('StatsScene', 'Cerrar');
    });
  });

  describe('errores', () => {
    it('si no se pueden cargar las sesiones muestra el error en rojo', () => {
      openStats({ sessions: [], listFails: true });

      expectSceneText('StatsScene', 'Error al cargar sesiones. Intenta de nuevo.');
      expectTextColor('StatsScene', 'Error al cargar sesiones. Intenta de nuevo.', '#ff0000');
    });
  });

  describe('navegación', () => {
    it('"← Volver" regresa al juego y retira la barra de filtros', () => {
      openStats({ sessions: listSessions(3) });
      filterBar().should('exist');

      clickSceneText('StatsScene', '← Volver');

      gameScene();
      cy.window().should((win) => expect(statsFilterBars(win)).to.have.length(0));
    });

    it('se puede volver a entrar a Estadísticas desde el juego', () => {
      openStats({ sessions: listSessions(3) });
      clickSceneText('StatsScene', '← Volver');
      gameScene();

      clickUserMenu('#stats-btn');

      waitForScene('StatsScene');
      expectSceneText('StatsScene', 'HISTORIAL DE SESIONES');
      cy.window().should((win) => expect(statsFilterBars(win)).to.have.length(1));
    });

    // ERROR ACTUAL (bitácora 016): `shutdown()` es un método de la clase, pero Phaser no lo invoca por
    // nombre y la escena nunca lo registra en sus eventos. La barra de filtros HTML solo se retira
    // desde "← Volver"; al salir por el menú de usuario queda flotando sobre la escena siguiente.
    // Cuando se corrija, esta prueba debe esperar 0 barras.
    it('(comportamiento actual) al salir por el menú de usuario la barra de filtros queda en el DOM', () => {
      openStats({ sessions: listSessions(3) });
      filterBar().should('exist');

      clickUserMenu('#stats-btn');

      cy.window().should((win) => expect(statsFilterBars(win).length).to.be.greaterThan(1));
    });
  });

  describe('instantáneas de la escena', () => {
    it('lista con paginación', () => {
      openStats({ sessions: listSessions(12) });
      expectSceneText('StatsScene', '1 / 2');
      filterBar().should('contain.text', 'Total sesiones encontradas: 12');

      expectSnapshot('stats-lista-paginada', { scene: 'StatsScene', dom: (win) => statsFilterBars(win)[0] });
    });

    it('estado vacío', () => {
      openStats({ sessions: [] });
      expectSceneText('StatsScene', 'No tienes sesiones de juego todavía.');
      filterBar().should('contain.text', 'Total sesiones encontradas: 0');

      expectSnapshot('stats-vacio', { scene: 'StatsScene', dom: (win) => statsFilterBars(win)[0] });
    });

    it('error al cargar', () => {
      openStats({ sessions: [], listFails: true });
      expectSceneText('StatsScene', 'Error al cargar sesiones. Intenta de nuevo.');

      expectSnapshot('stats-error-carga', { scene: 'StatsScene' });
    });

    it('modal de detalle', () => {
      openStats({ sessions: listSessions(3) });
      expectSceneText('StatsScene', 'Ver detalle');
      clickSceneText('StatsScene', 'Ver detalle');
      expectSceneText('StatsScene', 'Total de disparos: 3');

      expectSnapshot('stats-detalle', { scene: 'StatsScene' });
    });
  });
});
