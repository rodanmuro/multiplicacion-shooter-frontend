import { stubGameApi } from '../support/api';
import {
  cardsOf,
  clickGame,
  expectSceneText,
  gameScene,
  getScene,
  shootCard,
  visitApp,
  waitFrames,
  worldWidth,
} from '../support/gameDriver';

const PHONE_LANDSCAPE: [number, number] = [844, 390];

/** Deja una sola tarjeta quieta en el centro del mundo y devuelve cuánto mide su media anchura. */
function parkCardAtCenter() {
  return cy
    .window({ log: false, timeout: 20000 })
    .should((win) => expect(cardsOf(getScene(win, 'GameScene')).length).to.be.greaterThan(0))
    .then((win) => {
      const scene = getScene(win, 'GameScene');
      const [card, ...others] = cardsOf(scene);
      others.forEach((c) => c.setPosition(-2000, -2000));
      scene.cardSpawner.stopSpawning();
      card.velocityX = 0;
      card.velocityY = 0;
      const cx = worldWidth(win) / 2;
      card.setPosition(cx, 400);
      return { scale: card.scaleX as number, halfWidth: 60 * (card.scaleX as number), card, cx };
    });
}

describe('Celular: jugabilidad táctil', () => {
  beforeEach(() => {
    stubGameApi();
  });

  describe('en horizontal (844×390, canvas a ≈ 0,49×)', () => {
    beforeEach(() => {
      cy.viewport(...PHONE_LANDSCAPE);
      visitApp();
      gameScene();
      cy.wait('@createSession');
    });

    it('las tarjetas se agrandan para seguir siendo tocables', () => {
      parkCardAtCenter().then(({ scale }) => {
        expect(scale, 'escala de la tarjeta').to.be.greaterThan(1.3);
        // Alto en pantalla ≥ 56 px (o el tope de 1,6×)
        cy.window().then((win) => {
          const canvasWidth = win.document.querySelector('canvas')!.getBoundingClientRect().width;
          const screenHeight = 80 * scale * (canvasWidth / worldWidth(win));
          expect(screenHeight, 'alto de la tarjeta en pantalla').to.be.at.least(50);
        });
      });
    });

    it('un toque un poco fuera del borde de la tarjeta la acierta (tolerancia del dedo)', () => {
      parkCardAtCenter().then(({ halfWidth, card, cx }) => {
        // 8 px del mundo (≈ 4 px en pantalla) fuera del borde horizontal
        clickGame(cx + halfWidth + 8, 400);
        cy.window().should(() => expect(card.active, 'la tarjeta fue golpeada').to.equal(false));
      });
    });

    it('un toque muy lejos de la tarjeta no la acierta', () => {
      parkCardAtCenter().then(({ halfWidth, card, cx }) => {
        clickGame(cx + halfWidth + 120, 400);
        waitFrames(3);
        cy.window().should(() => expect(card.active, 'la tarjeta sigue en pantalla').to.equal(true));
      });
    });

    it('hay menos tarjetas simultáneas para no saturar el campo', () => {
      cy.window().then((win) => {
        expect(getScene(win, 'GameScene').cardSpawner.getMaxCards(), 'máximo de tarjetas').to.equal(12);
      });
    });

    it('el texto de las tarjetas se dibuja a mayor resolución al agrandarse', () => {
      cy.window({ log: false, timeout: 20000 })
        .should((win) => expect(cardsOf(getScene(win, 'GameScene')).length).to.be.greaterThan(0))
        .then((win) => {
          const card = cardsOf(getScene(win, 'GameScene'))[0];
          expect(card.numberText.style.resolution, 'resolución del número').to.equal(card.scaleX);
        });
    });

    it('el HUD se agranda y el temporizador baja con la caja de la pregunta', () => {
      cy.window().then((win) => {
        const scene = getScene(win, 'GameScene');
        const hud = scene.sessionTimerDisplay.timerText.scaleX as number;
        expect(hud, 'escala del HUD').to.be.greaterThan(1.3);
        const questionBottom = scene.questionDisplay.y + 30 * hud;
        expect(scene.sessionTimerDisplay.timerText.y, 'temporizador debajo de la caja').to.be.greaterThan(
          questionBottom
        );
      });
    });

    it('se puede jugar de punta a punta con toques: acertar suma puntos', () => {
      shootCard({ correct: true });
      expectSceneText('GameScene', 'Score: 10');
    });
  });

  describe('en escritorio (1280×900, escala 1)', () => {
    beforeEach(() => {
      visitApp();
      gameScene();
      cy.wait('@createSession');
    });

    it('nada cambia: tarjetas, HUD y mira a tamaño natural, hasta 20 tarjetas', () => {
      parkCardAtCenter().then(({ scale }) => expect(scale).to.equal(1));
      cy.window().then((win) => {
        const scene = getScene(win, 'GameScene');
        expect(scene.sessionTimerDisplay.timerText.scaleX).to.equal(1);
        expect(scene.sessionTimerDisplay.timerText.y).to.equal(90);
        expect(scene.crosshair.scaleX).to.equal(1);
        expect(scene.cardSpawner.getMaxCards()).to.equal(20);
      });
    });

    it('el impacto sigue siendo exacto: un toque fuera del borde no acierta', () => {
      parkCardAtCenter().then(({ halfWidth, card, cx }) => {
        clickGame(cx + halfWidth + 8, 400);
        waitFrames(3);
        cy.window().should(() => expect(card.active, 'la tarjeta sigue en pantalla').to.equal(true));
      });
    });
  });
});
