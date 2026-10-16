/**
 * Único punto de las pruebas E2E que conoce los internos de Phaser y del juego.
 *
 * El canvas no se puede consultar con selectores, así que se usa `window.game`
 * (expuesto en main.ts) y se leen campos que en TypeScript son `private` pero que en
 * tiempo de ejecución son accesibles. Si el refactor renombra algo, SOLO debe tocarse
 * este archivo: los specs afirman sobre HTTP, localStorage, DOM y textos visibles.
 */
import { makeJwt } from '../../tests/helpers/jwt';
import { userData } from './fixtures';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyObj = any;

export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 800;

/** Zona del canvas con HUD (pregunta, puntaje, temporizador) y menú de usuario encima. */
const SAFE_BOUNDS = { minX: 100, maxX: 1100, minY: 150, maxY: 730 };

export type Profile = 'student' | 'teacher' | 'admin';

export interface VisitOptions {
  /** Siembra una sesión de Google ya iniciada (por defecto sí). */
  authenticated?: boolean;
  profile?: Profile;
  name?: string;
  /** El token guardado ya venció. */
  tokenExpired?: boolean;
  /** Define window.google con un doble que registra initialize/renderButton. */
  googleStub?: boolean;
  /** Semilla de Math.random para reducir la variación entre ejecuciones. */
  seed?: number;
}

export interface VisitResult {
  token: string;
}

// PRNG determinista (mulberry32).
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Abre la app. Devuelve el JWT sembrado para poder comprobar la cabecera Authorization. */
export function visitApp(options: VisitOptions = {}): VisitResult {
  const {
    authenticated = true,
    profile = 'student',
    name = 'Ana Pérez',
    tokenExpired = false,
    googleStub = false,
    seed = 20260301,
  } = options;

  const nowSec = Math.floor(Date.now() / 1000);
  const token = makeJwt({ name, exp: nowSec + (tokenExpired ? -60 : 3600) });

  cy.visit('/multiplicacion/', {
    onBeforeLoad(win) {
      win.Math.random = seededRandom(seed);

      if (authenticated) {
        win.localStorage.setItem('google_auth_token', token);
        win.localStorage.setItem(
          'google_user_data',
          JSON.stringify({
            id: '106839451234567890123',
            email: 'estudiante@cevu.edu.co',
            name,
            picture: '',
            given_name: name.split(' ')[0],
            family_name: name.split(' ').slice(1).join(' '),
            profile,
          })
        );
      }

      if (googleStub) {
        const w = win as AnyObj;
        w.__gsi = { initialized: null, buttonRendered: false };
        w.google = {
          accounts: {
            id: {
              initialize: (config: AnyObj) => {
                w.__gsi.initialized = config;
              },
              renderButton: (el: HTMLElement) => {
                w.__gsi.buttonRendered = true;
                el.textContent = 'Sign in with Google (stub)';
              },
              prompt: () => {},
            },
          },
        };
      }
    },
  });

  return { token };
}

/** Usuario de ejemplo coherente con la sesión sembrada por visitApp. */
export function backendUser(profile: Profile = 'student', overrides: Record<string, unknown> = {}) {
  return userData({ profile, ...overrides });
}

/* ------------------------------------------------------------------ */
/* Escenas y textos                                                    */
/* ------------------------------------------------------------------ */

export function getGame(win: Window): AnyObj {
  return (win as AnyObj).game;
}

export function getScene(win: Window, key: string): AnyObj {
  return getGame(win).scene.getScene(key);
}

/** Espera a que la escena esté activa y la entrega. */
export function waitForScene(key: string): Cypress.Chainable<AnyObj> {
  return cy
    .window({ log: false })
    .should((win) => {
      const game = getGame(win);
      expect(game, 'window.game').to.exist;
      expect(game.scene.isActive(key), `escena ${key} activa`).to.equal(true);
    })
    .then((win) => getScene(win, key));
}

function collectTexts(objects: AnyObj[], out: AnyObj[]): void {
  for (const obj of objects) {
    if (obj.type === 'Text') out.push(obj);
    else if (Array.isArray(obj.list)) collectTexts(obj.list, out);
  }
}

/** Todos los objetos Text de la escena, incluidos los que están dentro de contenedores. */
export function textObjects(scene: AnyObj): AnyObj[] {
  const out: AnyObj[] = [];
  collectTexts(scene.children.list, out);
  return out;
}

export function textsOf(scene: AnyObj): string[] {
  return textObjects(scene).map((t) => t.text as string);
}

/** Reintenta hasta que algún texto de la escena contenga (string) o cumpla (RegExp) lo esperado. */
export function expectSceneText(key: string, expected: string | RegExp): void {
  cy.window({ log: false }).should((win) => {
    const all = textsOf(getScene(win, key));
    const found =
      typeof expected === 'string' ? all.some((t) => t.includes(expected)) : all.some((t) => expected.test(t));
    expect(found, `texto ${String(expected)} en ${key}. Textos: ${JSON.stringify(all)}`).to.equal(true);
  });
}

export function expectNoSceneText(key: string, unexpected: string | RegExp): void {
  cy.window({ log: false }).should((win) => {
    const all = textsOf(getScene(win, key));
    const found =
      typeof unexpected === 'string' ? all.some((t) => t.includes(unexpected)) : all.some((t) => unexpected.test(t));
    expect(found, `no debe haber texto ${String(unexpected)} en ${key}`).to.equal(false);
  });
}

/* ------------------------------------------------------------------ */
/* Clicks sobre el canvas                                              */
/* ------------------------------------------------------------------ */

/** Click en coordenadas del mundo del juego (1200x800), sin importar el tamaño en pantalla. */
export function clickGame(x: number, y: number): void {
  cy.get('canvas').then(($canvas) => {
    const rect = $canvas[0].getBoundingClientRect();
    cy.wrap($canvas).click((x / GAME_WIDTH) * rect.width, (y / GAME_HEIGHT) * rect.height);
  });
}

/**
 * Espera a que Phaser dibuje `count` fotogramas más. Los objetos interactivos creados dentro de un
 * manejador de input (p. ej. los botones SÍ / NO) solo reciben clicks desde el fotograma siguiente;
 * un test es más rápido que cualquier persona y puede clickear antes de que existan para el input.
 */
export function waitFrames(count = 3): void {
  cy.window({ log: false })
    .then((win) => getGame(win).loop.frame as number)
    .then((start) => {
      cy.window({ log: false }).should((win) => {
        expect(getGame(win).loop.frame, `${count} fotogramas desde ${start}`).to.be.at.least(start + count);
      });
    });
}

/** Click en el centro de un texto interactivo (p. ej. los botones SÍ / NO). */
export function clickSceneText(key: string, label: string): void {
  waitFrames();
  cy.window({ log: false })
    .then((win) => {
      const text = textObjects(getScene(win, key)).find((t) => t.text === label);
      expect(text, `texto "${label}" en ${key}`).to.exist;
      const b = text.getBounds();
      return { x: b.centerX as number, y: b.centerY as number };
    })
    .then(({ x, y }) => clickGame(x, y));
}

/* ------------------------------------------------------------------ */
/* Juego                                                               */
/* ------------------------------------------------------------------ */

export function gameScene(): Cypress.Chainable<AnyObj> {
  return waitForScene('GameScene');
}

export function cardsOf(scene: AnyObj): AnyObj[] {
  return scene.cardSpawner.getCards();
}

/** Primer punto de la zona segura sin tarjetas a menos de 140 px (salvo `ignore`). */
function findFreeSpot(scene: AnyObj, ignore?: AnyObj): { x: number; y: number } {
  const cards = cardsOf(scene).filter((c) => c !== ignore);
  for (let y = SAFE_BOUNDS.minY; y <= SAFE_BOUNDS.maxY; y += 50) {
    for (let x = SAFE_BOUNDS.minX; x <= SAFE_BOUNDS.maxX; x += 50) {
      if (cards.every((c) => Math.hypot(c.x - x, c.y - y) > 140)) return { x, y };
    }
  }
  throw new Error('No se encontró un punto libre en el canvas');
}

/** Detiene las tarjetas guardando su velocidad para devolvérsela después del click. */
function freezeCards(scene: AnyObj): void {
  for (const card of cardsOf(scene)) {
    if (card.__frozenVelocity) continue;
    card.__frozenVelocity = [card.velocityX, card.velocityY];
    card.velocityX = 0;
    card.velocityY = 0;
  }
}

function unfreezeCards(scene: AnyObj): void {
  for (const card of cardsOf(scene)) {
    if (!card.__frozenVelocity) continue;
    [card.velocityX, card.velocityY] = card.__frozenVelocity;
    delete card.__frozenVelocity;
  }
}

export interface ShotTarget {
  value: number;
  correct: boolean;
  x: number;
  y: number;
  /** Referencia a la tarjeta, para comprobar después si fue retirada. */
  card: AnyObj;
}

/**
 * Nota: no pasar objetos de Phaser a `expect()`. Cypress los inspecciona para el log y falla con
 * los ya destruidos ("Cannot read properties of null"); comparar siempre con booleanos o valores simples.
 *
 * Dispara de verdad (click en el canvas) a una tarjeta correcta o incorrecta.
 *
 * Espera a que exista una del tipo pedido, la coloca en un punto libre de la zona segura y detiene
 * las demás mientras se hace el click, para que la elección del objetivo no dependa de dónde esté
 * cada tarjeta en ese instante. Después les devuelve su velocidad. El click, el hit-test de
 * CardSpawner.checkHit y el registro del disparo son los reales.
 */
export function shootCard(options: { correct: boolean }): Cypress.Chainable<ShotTarget> {
  const { correct } = options;
  return cy
    .window({ log: false, timeout: 20000 })
    .should((win) => {
      const scene = getScene(win, 'GameScene');
      const cards = cardsOf(scene);
      const card = cards.find((c) => c.active && c.isCorrect() === correct);
      const state = {
        tarjetas: cards.length,
        activas: cards.filter((c) => c.active).length,
        correctas: cards.filter((c) => c.isCorrect()).length,
        fps: Math.round(getGame(win).loop.actualFps),
        sessionEnded: scene.sessionEnded,
      };
      expect(card, `tarjeta ${correct ? 'correcta' : 'incorrecta'} disponible. Estado: ${JSON.stringify(state)}`).to.exist;
    })
    .then((win) => {
      const scene = getScene(win, 'GameScene');
      const card = cardsOf(scene).find((c) => c.active && c.isCorrect() === correct)!;
      freezeCards(scene);
      const spot = findFreeSpot(scene, card);
      card.setPosition(spot.x, spot.y);
      expect(scene.cardSpawner.checkHit(card.x, card.y) === card, 'el click daría a la tarjeta elegida').to.equal(true);
      return { value: card.getValue(), correct, x: card.x, y: card.y, card } as ShotTarget;
    })
    .then((target) => {
      clickGame(target.x, target.y);
      cy.window({ log: false }).then((win) => unfreezeCards(getScene(win, 'GameScene')));
      return cy.wrap(target, { log: false });
    });
}

/** Dispara a un punto del canvas donde no hay ninguna tarjeta cerca. */
export function shootEmptySpace(): void {
  cy.window({ log: false })
    .then((win) => {
      const scene = getScene(win, 'GameScene');
      freezeCards(scene);
      return findFreeSpot(scene);
    })
    .then(({ x, y }) => {
      clickGame(x, y);
      cy.window({ log: false }).then((win) => unfreezeCards(getScene(win, 'GameScene')));
    });
}

export function currentScore(win: Window): number {
  return getScene(win, 'GameScene').scoreManager.getScore();
}

/** Suma puntos sin disparar (atajo para llegar a otro nivel sin 4 disparos reales). */
export function addCorrectHits(count: number): void {
  cy.window({ log: false }).then((win) => {
    const scene = getScene(win, 'GameScene');
    for (let i = 0; i < count; i++) scene.scoreManager.addCorrectHit();
  });
}

/** Termina la sesión ya, en lugar de esperar los 5 minutos reales. */
export function endSessionNow(): void {
  cy.window({ log: false }).then((win) => {
    getScene(win, 'GameScene').endSession();
  });
}

/** Pregunta actual según el generador (factores y respuesta). */
export function currentQuestion(win: Window): { factor1: number; factor2: number; correctAnswer: number } {
  return getScene(win, 'GameScene').questionGenerator.getCurrentQuestion();
}
