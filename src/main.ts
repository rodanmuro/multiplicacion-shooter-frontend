import './devDemo';
import './style.css';
import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { enableFullscreenOnFirstTouch } from './ui/fullscreen';

// Inicializar el juego de Phaser
const game = new Phaser.Game(gameConfig);

// Opcional: exponer game en window para debugging
(window as any).game = game;

// En celular, el primer toque pone la página en pantalla completa y horizontal
enableFullscreenOnFirstTouch();
