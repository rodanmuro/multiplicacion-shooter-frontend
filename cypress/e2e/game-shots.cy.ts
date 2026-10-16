import { stubGameApi } from '../support/api';
import {
  addCorrectHits,
  cardsOf,
  currentQuestion,
  currentScore,
  expectSceneText,
  gameScene,
  getScene,
  shootCard,
  shootEmptySpace,
  textsOf,
  visitApp,
} from '../support/gameDriver';

describe('Juego: disparos', () => {
  beforeEach(() => {
    stubGameApi();
    visitApp();
    gameScene();
    cy.wait('@createSession');
  });

  describe('a una tarjeta correcta', () => {
    it('suma 10 puntos y registra el disparo en el backend', () => {
      shootCard({ correct: true }).then((target) => {
        cy.wait('@recordShot').then(({ request }) => {
          const body = request.body;
          expect(body.is_correct).to.equal(true);
          expect(body.card_value).to.equal(target.value);
          expect(body.correct_answer).to.equal(target.value);
          expect(body.factor_1 * body.factor_2).to.equal(body.correct_answer);
          expect(body.factor_1).to.equal(1);
          expect(body.shot_at).to.match(/^\d{4}-\d{2}-\d{2}T.*Z$/);
          expect(body.coordinate_x).to.be.closeTo(target.x, 1.5);
          expect(body.coordinate_y).to.be.closeTo(target.y, 1.5);
        });
      });
      expectSceneText('GameScene', 'Score: 10');
    });

    it('retira la tarjeta golpeada', () => {
      shootCard({ correct: true }).then((target) => {
        cy.wait('@recordShot');
        cy.window().should((win) => {
          // Se compara con booleanos: Cypress no puede inspeccionar una tarjeta de Phaser ya destruida.
          expect(cardsOf(getScene(win, 'GameScene')).includes(target.card), 'sigue en el spawner').to.equal(false);
          expect(target.card.active, 'la tarjeta fue destruida').to.equal(false);
        });
      });
    });
  });

  describe('a una tarjeta incorrecta', () => {
    it('registra is_correct=false con el valor de la tarjeta, distinto de la respuesta', () => {
      shootCard({ correct: false }).then((target) => {
        cy.wait('@recordShot').then(({ request }) => {
          expect(request.body.is_correct).to.equal(false);
          expect(request.body.card_value).to.equal(target.value);
          expect(request.body.card_value).to.not.equal(request.body.correct_answer);
        });
      });
    });

    it('con 0 puntos el puntaje se queda en 0', () => {
      shootCard({ correct: false });
      cy.wait('@recordShot');
      cy.window().should((win) => expect(currentScore(win)).to.equal(0));
      expectSceneText('GameScene', 'Score: 0');
    });

    it('resta 5 puntos cuando ya había puntaje', () => {
      shootCard({ correct: true });
      cy.wait('@recordShot');
      expectSceneText('GameScene', 'Score: 10');

      shootCard({ correct: false });
      cy.wait('@recordShot');

      expectSceneText('GameScene', 'Score: 5');
      cy.window().should((win) => expect(currentScore(win)).to.equal(5));
    });
  });

  describe('al aire', () => {
    it('no registra nada en el backend ni cambia el puntaje', () => {
      shootEmptySpace();
      cy.wait(500);

      cy.get('@recordShot.all').should('have.length', 0);
      cy.window().should((win) => expect(currentScore(win)).to.equal(0));
    });

    it('solo se registran los disparos que impactan una tarjeta', () => {
      shootEmptySpace();
      shootCard({ correct: true });
      shootEmptySpace();
      cy.wait('@recordShot');
      cy.wait(500);

      cy.get('@recordShot.all').should('have.length', 1);
    });
  });

  describe('si el backend no registra el disparo', () => {
    it('el juego sigue y el puntaje cuenta igual', () => {
      cy.intercept(
        { method: 'POST', pathname: '/api/sessions/7/shots' },
        { statusCode: 500, body: { success: false } }
      ).as('recordShot');

      shootCard({ correct: true });
      cy.wait('@recordShot');

      expectSceneText('GameScene', 'Score: 10');
    });
  });

  describe('sin sesión en el backend', () => {
    it('no intenta registrar disparos', () => {
      stubGameApi({ createFails: true });
      visitApp();
      gameScene();
      cy.wait('@createSession');

      shootCard({ correct: true });
      expectSceneText('GameScene', 'Score: 10');
      cy.wait(500);

      cy.get('@recordShot.all').should('have.length', 0);
    });
  });

  describe('subida de nivel', () => {
    it('a los 40 puntos pasa al nivel 2: avisa y cambia a la tabla del 10', () => {
      addCorrectHits(4);

      expectSceneText('GameScene', '¡NIVEL 2!\nTabla del 10');
      expectSceneText('GameScene', /^10 × (10|[1-9]) = \?$/);
      cy.window().should((win) => {
        const scene = getScene(win, 'GameScene');
        expect(scene.progressionManager.getCurrentLevel()).to.equal(2);
        expect(currentQuestion(win).factor1).to.equal(10);
      });
    });

    it('con 30 puntos todavía no sube; el cuarto acierto sí', () => {
      addCorrectHits(3);

      expectSceneText('GameScene', 'Score: 30');
      cy.wait(1500);
      cy.window().should((win) => {
        const scene = getScene(win, 'GameScene');
        expect(scene.progressionManager.getCurrentLevel()).to.equal(1);
        expect(textsOf(scene).join('\n')).to.not.include('¡NIVEL');
      });

      addCorrectHits(1);

      expectSceneText('GameScene', '¡NIVEL 2!');
    });

    it('en el nivel 2 los disparos usan la nueva tabla', () => {
      addCorrectHits(4);
      expectSceneText('GameScene', /^10 × (10|[1-9]) = \?$/);

      shootCard({ correct: true });

      cy.wait('@recordShot').its('request.body.factor_1').should('equal', 10);
    });
  });
});
