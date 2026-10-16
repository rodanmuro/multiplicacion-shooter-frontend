/**
 * Tokens visuales de los objetos de texto de Phaser.
 *
 * Los valores se conservan exactamente como estaban repartidos por las
 * escenas (incluidos los tamaños "raros" como 15, 22, 36, 42, 56 y 72 px).
 * Unificarlos es una decisión de diseño que se toma al hacerlo responsivo.
 */

export const FONT_SIZE = {
  xs: '14px',
  xsPlus: '15px',
  sm: '16px',
  md: '18px',
  lg: '20px',
  lgPlus: '22px',
  xl: '24px',
  xxl: '28px',
  title: '32px',
  h2: '36px',
  h1: '42px',
  display: '48px',
  splash: '56px',
  hero: '64px',
  logo: '72px',
} as const;

export const COLOR = {
  white: '#ffffff',
  black: '#000000',
  yellow: '#ffff00',
  red: '#ff0000',
  green: '#00ff00',
  grayLight: '#aaaaaa',
  grayMid: '#888888',
  grayDark: '#333333',
  teal: '#4ecdc4',
  mint: '#95e1d3',
  amber: '#ffaa00',
  slateBtn: '#4a5568',
  navy: '#1a1a2e',
  dangerBtn: '#e53e3e',
  dangerHover: '#ff4444',
  dangerHoverSoft: '#ff6666',
  successDark: '#006633',
} as const;
