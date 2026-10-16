import { stubGameApi } from '../support/api';
import {
  cardsOf,
  currentQuestion,
  expectSceneText,
  gameScene,
  getScene,
  visitApp,
} from '../support/gameDriver';

describe('Juego: inicio de sesión', () => {
  describe('creación de la sesión en el backend', () => {
    it('hace POST /sessions con la hora de inicio, el tamaño del canvas y el token', () => {
      stubGameApi();
      const { token } = visitApp();
      gameScene();

      cy.wait('@createSession').then(({ request }) => {
        expect(request.headers.authorization).to.equal(`Bearer ${token}`);
        expect(request.body.started_at).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(request.body.canvas_width).to.equal(1200);
        expect(request.body.canvas_height).to.equal(800);
      });
    });

    it('crea una sola sesión por partida', () => {
      stubGameApi();
      visitApp();
      gameScene();
      cy.wait('@createSession');

      cy.get('@createSession.all').should('have.length', 1);
    });

    it('si el backend falla, el juego arranca igual', () => {
      stubGameApi({ createFails: true });
      visitApp();
      gameScene();
      cy.wait('@createSession');

      expectSceneText('GameScene', /^Score: 0$/);
      cy.window().should((win) => {
        expect(cardsOf(getScene(win, 'GameScene')).length).to.be.greaterThan(0);
      });
    });
  });

  describe('HUD inicial', () => {
    beforeEach(() => {
      stubGameApi();
      visitApp();
      gameScene();
    });

    it('muestra el puntaje en 0', () => {
      expectSceneText('GameScene', 'Score: 0');
    });

    it('muestra el temporizador con la duración de la sesión (5:00)', () => {
      expectSceneText('GameScene', /^[45]:\d{2}$/);
    });

    it('arranca en el nivel 1: tabla del 1, con el otro factor entre 1 y 10', () => {
      expectSceneText('GameScene', /^1 × (10|[1-9]) = \?$/);
      cy.window().should((win) => {
        const q = currentQuestion(win);
        expect(q.factor1).to.equal(1);
        expect(q.factor2).to.be.within(1, 10);
        expect(q.correctAnswer).to.equal(q.factor1 * q.factor2);
      });
    });
  });

  describe('tarjetas', () => {
    beforeEach(() => {
      stubGameApi();
      visitApp();
      gameScene();
    });

    it('aparecen con el tiempo, nunca más de 20 a la vez', () => {
      cy.window().should((win) => {
        expect(cardsOf(getScene(win, 'GameScene')).length).to.be.greaterThan(2);
      });
      cy.wait(3000);
      cy.window().then((win) => {
        expect(cardsOf(getScene(win, 'GameScene')).length).to.be.at.most(20);
      });
    });

    it('hay exactamente una respuesta correcta posible y todas las tarjetas correctas llevan ese valor', () => {
      cy.window().should((win) => {
        const scene = getScene(win, 'GameScene');
        const answer = currentQuestion(win).correctAnswer;
        const cards = cardsOf(scene);
        expect(cards.length).to.be.greaterThan(3);
        for (const card of cards) {
          if (card.isCorrect()) expect(card.getValue()).to.equal(answer);
          else expect(card.getValue()).to.not.equal(answer);
        }
      });
    });

    it('se mueven (no están quietas)', () => {
      cy.window().then((win) => {
        const scene = getScene(win, 'GameScene');
        const before = cardsOf(scene).map((c) => ({ c, x: c.x, y: c.y }));
        expect(before.length).to.be.greaterThan(0);
        cy.wait(600).then(() => {
          const moved = before.some(({ c, x, y }) => c.active && (c.x !== x || c.y !== y));
          expect(moved, 'alguna tarjeta cambió de posición').to.equal(true);
        });
      });
    });
  });
});
