import './style.css';
import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

// Inicializar el juego de Phaser
const game = new Phaser.Game(gameConfig);

// Opcional: exponer game en window para debugging
(window as any).game = game;
