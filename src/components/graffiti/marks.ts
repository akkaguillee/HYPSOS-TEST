/*
 * Trazos de graffiti dibujados a mano (coordenadas en su viewBox). Son gestos genéricos —círculo
 * de rotulador, subrayado, flecha, aspa, corona, zigzag, estallido y barrido—, nunca letras ni
 * versiones del logotipo.
 */
export type MarkVariant = 'circle' | 'underline' | 'arrow' | 'cross' | 'crown' | 'scribble' | 'burst' | 'swoosh';

export interface Drip {
  x: number;
  y: number;
  /** Largo de la gota en unidades del viewBox. */
  length: number;
}

export interface MarkDef {
  viewBox: string;
  /** Trazos en orden de dibujo. */
  paths: string[];
  drips: Drip[];
  /** Grosor por defecto. */
  stroke: number;
}

export const MARKS: Record<MarkVariant, MarkDef> = {
  circle: {
    viewBox: '0 0 400 200',
    paths: ['M62 112C48 58 160 22 262 28C352 34 388 82 360 126C330 170 190 182 104 160C40 144 22 98 70 66C98 48 140 40 188 38'],
    drips: [
      { x: 132, y: 168, length: 44 },
      { x: 298, y: 152, length: 26 },
    ],
    stroke: 9,
  },
  underline: {
    viewBox: '0 0 400 80',
    paths: ['M8 34C70 22 160 18 250 24C310 28 360 30 392 22', 'M44 50C124 40 222 42 334 44'],
    drips: [
      { x: 98, y: 30, length: 30 },
      { x: 270, y: 30, length: 42 },
      { x: 180, y: 46, length: 18 },
    ],
    stroke: 10,
  },
  arrow: {
    viewBox: '0 0 300 200',
    paths: ['M18 172C60 150 120 120 160 86C196 56 226 38 262 24', 'M212 20L266 22L246 72'],
    drips: [{ x: 72, y: 156, length: 30 }],
    stroke: 8,
  },
  cross: {
    viewBox: '0 0 200 200',
    paths: ['M34 30C80 80 120 122 170 172', 'M168 26C120 74 80 126 30 170'],
    drips: [{ x: 100, y: 104, length: 40 }],
    stroke: 12,
  },
  crown: {
    viewBox: '0 0 260 160',
    paths: ['M22 130L34 40L88 96L128 22L170 94L224 36L236 130Z'],
    drips: [
      { x: 64, y: 132, length: 22 },
      { x: 192, y: 132, length: 32 },
    ],
    stroke: 8,
  },
  scribble: {
    viewBox: '0 0 400 120',
    paths: ['M10 90L40 20L70 96L102 24L134 98L168 22L200 96L236 26L270 94L306 24L340 92L390 30'],
    drips: [
      { x: 70, y: 96, length: 20 },
      { x: 200, y: 96, length: 28 },
    ],
    stroke: 7,
  },
  burst: {
    viewBox: '0 0 200 200',
    paths: ['M100 10L100 52', 'M164 36L134 66', 'M190 100L148 100', 'M164 164L134 134', 'M100 190L100 148', 'M36 164L66 134', 'M10 100L52 100', 'M36 36L66 66'],
    drips: [],
    stroke: 9,
  },
  swoosh: {
    viewBox: '0 0 600 200',
    paths: ['M20 150C120 40 220 40 260 110C300 180 380 170 440 90C480 40 540 30 590 60'],
    drips: [
      { x: 252, y: 104, length: 54 },
      { x: 412, y: 122, length: 34 },
    ],
    stroke: 16,
  },
};
