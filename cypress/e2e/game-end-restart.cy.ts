import { stubGameApi } from '../support/api';
import {
  addCorrectHits,
  clickGame,
  clickSceneText,
  endSessionNow,
  expectNoSceneText,
  expectSceneText,
  gameScene,
  getScene,
  shootCard,
  visitApp,
} from '../support/gameDriver';

describe('Juego: fin de sesión y reinicio', () => {
  describe('con el backend disponible', () => {
    beforeEach(() => {
      stubGameApi({
        finishStats: { total_shots: 37, correct_shots: 25, wrong_shots: 12, accuracy: 67.57, duration_seconds: 300 },
      });
      visitApp();
      gameScene();
      cy.wait('@createSession');
    });

    it('envía a PUT /sessions/{id}/finish el puntaje, el nivel y la duración', () => {
      addCorrectHits(5); // 50 puntos -> nivel 2
      expectSceneText('GameScene', 'Score: 50');

      endSessionNow();

      cy.wait('@finishSession').then(({ request }) => {
        expect(request.body.final_score).to.equal(50);
        expect(request.body.max_level_reached).to.equal(2);
        expect(request.body.duration_seconds).to.be.within(0, 30);
        expect(request.body.finished_at).to.match(/^\d{4}-\d{2}-\d{2}T.*Z$/);
      });
    });

    it('muestra el resumen con las estadísticas que devuelve el backend', () => {
      endSessionNow();
      cy.wait('@finishSession');

      expectSceneText('GameScene', '¡SESIÓN COMPLETADA!');
      expectSceneText('GameScene', 'Disparos Totales: 37');
      expectSceneText('GameScene', 'Aciertos: 25 | Errores: 12');
      expectSceneText('GameScene', 'Precisión: 67.57%');
      expectSceneText('GameScene', 'Tiempo Jugado: 5:00');
      expectSceneText('GameScene', 'Haz clic para nueva sesión');
    });

    it('finaliza la sesión una sola vez', () => {
      endSessionNow();
      cy.wait('@finishSession');
      cy.wait(500);

      cy.get('@finishSession.all').should('have.length', 1);
    });

    it('después de finalizar, un click ya no dispara', () => {
      endSessionNow();
      cy.wait('@finishSession');
      expectSceneText('GameScene', '¡SESIÓN COMPLETADA!');

      clickGame(300, 400);

      expectSceneText('GameScene', '¿Seguro que deseas iniciar\nuna nueva sesión?');
      cy.get('@recordShot.all').should('have.length', 0);
    });

    describe('confirmación de reinicio', () => {
      beforeEach(() => {
        endSessionNow();
        cy.wait('@finishSession');
        expectSceneText('GameScene', 'Haz clic para nueva sesión');
        clickGame(300, 400);
        expectSceneText('GameScene', '¿Seguro que deseas iniciar\nuna nueva sesión?');
      });

      it('ofrece SÍ y NO y oculta el resumen', () => {
        expectSceneText('GameScene', 'SÍ');
        expectSceneText('GameScene', 'NO');
        expectNoSceneText('GameScene', 'Haz clic para nueva sesión');
      });

      // BUG ACTUAL (documentado en la bitácora 014): el manejador de NO llama a showSessionSummary(),
      // que registra un input.once('pointerdown'); como el mismo click sigue propagándose, ese
      // manejador se dispara de inmediato y vuelve a mostrar la confirmación. NO no lleva al resumen.
      // Cuando se corrija, esta prueba debe esperar 'Haz clic para nueva sesión' en lugar de la confirmación.
      it('(comportamiento actual) NO no vuelve al resumen: la confirmación reaparece', () => {
        clickSceneText('GameScene', 'NO');
        cy.wait(800);

        expectSceneText('GameScene', '¿Seguro que deseas iniciar\nuna nueva sesión?');
        expectNoSceneText('GameScene', 'Haz clic para nueva sesión');
        cy.get('@createSession.all').should('have.length', 1);
      });

      it('SÍ reinicia: crea una sesión nueva y el puntaje vuelve a 0', () => {
        clickSceneText('GameScene', 'SÍ');

        cy.get('@createSession.all').should('have.length', 2);
        expectSceneText('GameScene', 'Score: 0');
        expectNoSceneText('GameScene', '¡SESIÓN COMPLETADA!');
        cy.window().should((win) => {
          expect(getScene(win, 'GameScene').scoreManager.getScore()).to.equal(0);
          expect(getScene(win, 'GameScene').progressionManager.getCurrentLevel()).to.equal(1);
        });
      });

      // BUG ACTUAL (documentado en la bitácora 014): scene.restart() reutiliza la instancia de GameScene
      // y `sessionEnded` nunca vuelve a false, así que onShoot() descarta todos los disparos.
      // Cuando se corrija, esta prueba debe esperar Score: 10 y un POST a /shots.
      it('(comportamiento actual) tras reiniciar los disparos se ignoran: sessionEnded sigue en true', () => {
        clickSceneText('GameScene', 'SÍ');
        cy.get('@createSession.all').should('have.length', 2);
        expectSceneText('GameScene', 'Score: 0');
        cy.window().should((win) => expect(getScene(win, 'GameScene').sessionEnded).to.equal(true));

        shootCard({ correct: true });
        cy.wait(800);

        expectSceneText('GameScene', 'Score: 0');
        cy.get('@recordShot.all').should('have.length', 0);
      });
    });
  });

  describe('si el backend no puede finalizar la sesión', () => {
    beforeEach(() => {
      stubGameApi({ finishFails: true });
      visitApp();
      gameScene();
      cy.wait('@createSession');
    });

    it('muestra el resumen local con los datos del cliente', () => {
      addCorrectHits(5);
      endSessionNow();
      cy.wait('@finishSession');

      expectSceneText('GameScene', '¡SESIÓN COMPLETADA!');
      expectSceneText('GameScene', 'Puntuación Final: 50');
      expectSceneText('GameScene', 'Nivel Alcanzado: 2');
      expectSceneText('GameScene', 'Última Tabla: Tabla del 10');
      expectNoSceneText('GameScene', 'Disparos Totales');
    });
  });

  describe('sin sesión en el backend', () => {
    it('no llama a finish y muestra el resumen local', () => {
      stubGameApi({ createFails: true });
      visitApp();
      gameScene();
      cy.wait('@createSession');

      endSessionNow();

      expectSceneText('GameScene', '¡SESIÓN COMPLETADA!');
      expectSceneText('GameScene', 'Puntuación Final: 0');
      cy.get('@finishSession.all').should('have.length', 0);
    });
  });

  describe('menú de usuario tras reiniciar', () => {
    it('(comportamiento actual) los manejadores se duplican: "Salir" pide confirmación dos veces', () => {
      stubGameApi();
      visitApp();
      gameScene();
      cy.wait('@createSession');
      endSessionNow();
      cy.wait('@finishSession');
      clickGame(300, 400);
      clickSceneText('GameScene', 'SÍ');
      cy.get('@createSession.all').should('have.length', 2);

      const messages: string[] = [];
      cy.on('window:confirm', (message) => {
        messages.push(message);
        return false;
      });
      cy.get('#user-menu-toggle').click();
      cy.get('#logout-btn').click();

      // Cada GameScene.create() crea un UserMenu nuevo sobre los mismos elementos del DOM.
      cy.then(() => expect(messages).to.have.length(2));
    });
  });
});
