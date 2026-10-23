/**
 * Matemática pura de la capa WebGL de producto (sin DOM ni GL): se prueba en Vitest.
 * Coordenadas: `uv` con origen arriba a la izquierda y `y` hacia abajo, igual que CSS.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Transformación de `object-fit: cover` (centrado, `object-position: 50% 50%`): uvTextura = uv · escala + desplazamiento. */
export function coverTransform(boxWidth: number, boxHeight: number, imageWidth: number, imageHeight: number): [number, number, number, number] {
  if (boxWidth <= 0 || boxHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) return [1, 1, 0, 0];
  const boxAspect = boxWidth / boxHeight;
  const imageAspect = imageWidth / imageHeight;
  if (boxAspect > imageAspect) {
    // Caja más ancha que la imagen: se recorta arriba y abajo.
    const scaleY = imageAspect / boxAspect;
    return [1, scaleY, 0, (1 - scaleY) / 2];
  }
  const scaleX = boxAspect / imageAspect;
  return [scaleX, 1, (1 - scaleX) / 2, 0];
}

/**
 * Tamaño de textura que pinta la imagen 1:1 con los píxeles del dispositivo (como la <img> en reposo).
 * Nunca mayor que la imagen original.
 */
export function textureTargetSize(boxWidth: number, boxHeight: number, imageWidth: number, imageHeight: number, dpr: number) {
  const [scaleX, scaleY] = coverTransform(boxWidth, boxHeight, imageWidth, imageHeight);
  const fromWidth = (boxWidth * dpr) / scaleX;
  const fromHeight = ((boxHeight * dpr) / scaleY) * (imageWidth / imageHeight);
  const width = Math.max(1, Math.min(imageWidth, Math.ceil(Math.max(fromWidth, fromHeight))));
  return { width, height: Math.max(1, Math.round((width * imageHeight) / imageWidth)) };
}

/** DPR del lienzo: máximo 2 (y 1 con renderizado por software). */
export function canvasDpr(devicePixelRatio: number, software = false): number {
  if (software) return 1;
  return Math.min(Math.max(devicePixelRatio || 1, 1), 2);
}

/** Puntero → uv de la caja (sin recortar: fuera de la caja sale < 0 o > 1). */
export function pointerToUv(clientX: number, clientY: number, rect: Rect): [number, number] {
  return [(clientX - rect.left) / Math.max(rect.width, 1), (clientY - rect.top) / Math.max(rect.height, 1)];
}

export const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export const insideUv = (u: number, v: number) => u >= 0 && u <= 1 && v >= 0 && v <= 1;

/**
 * Inclinación 3D según el puntero: el lado bajo el cursor se hunde.
 * rotateX > 0 aleja el borde superior; rotateY > 0 aleja el borde derecho.
 */
export function tiltAngles(u: number, v: number, maxDegrees: number): { rx: number; ry: number } {
  const x = clamp01(u) - 0.5;
  const y = clamp01(v) - 0.5;
  // `+ 0` normaliza -0 a 0.
  return { rx: -y * 2 * maxDegrees + 0, ry: x * 2 * maxDegrees + 0 };
}

/** Perspectiva proporcional al tamaño: la deformación se ve igual en una tarjeta que en la imagen grande. */
export function perspectiveFor(width: number, height: number, factor: number, min: number): number {
  return Math.round(Math.max(min, Math.max(width, height) * factor));
}

/**
 * Distancia máxima (en anchos de la caja) del origen de la transición a cualquier esquina:
 * normaliza el campo radial para que `progress = 1` cubra toda la imagen.
 */
export function originReach(u: number, v: number, aspect: number): number {
  const h = 1 / aspect;
  const x = clamp01(u);
  const y = clamp01(v) * h;
  return Math.max(Math.hypot(x, y), Math.hypot(1 - x, y), Math.hypot(x, h - y), Math.hypot(1 - x, h - y));
}

/** Velocidad del puntero (anchos de caja por segundo) → amplitud de la onda de estela (0 = no emite). */
export function rippleAmplitude(speed: number, threshold = 1.1, full = 6): number {
  if (!Number.isFinite(speed) || speed <= threshold) return 0;
  return Math.min(1, 0.2 + (0.8 * (speed - threshold)) / (full - threshold));
}

/** Vida de una onda de estela, en segundos. */
export const RIPPLE_LIFE = 1.1;

/** Duración proporcional al recorrido que queda: una animación interrumpida no se alarga ni se acelera de golpe. */
export function remainingDuration(from: number, to: number, full: number, min = 0.3): number {
  const distance = Math.abs(to - from);
  if (distance < 1e-4) return 0;
  return Math.max(min, full * distance);
}

/**
 * Curva cúbica de Bézier como función de easing (equivale a `cubic-bezier()` de CSS).
 * Newton–Raphson con respaldo por bisección.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-6) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-6) break;
      if (value < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solve(t)));
}

/** Escala uniforme de un `transform` calculado (`none`, `matrix()` o `matrix3d()`). */
export function parseCssScale(transform: string | null | undefined): number {
  if (!transform || transform === 'none') return 1;
  const match = /^matrix(3d)?\(([^)]+)\)$/.exec(transform.trim());
  if (!match) return 1;
  const values = match[2].split(',').map(Number);
  const scale = Math.hypot(values[0], values[1]);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** `rgb()/rgba()` calculado → [r, g, b] en 0–1 (sRGB). Devuelve null si es transparente o no se entiende. */
export function parseCssColor(value: string | null | undefined): [number, number, number] | null {
  if (!value) return null;
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(value.trim());
  if (!match) return null;
  if (match[4] !== undefined) {
    const alpha = match[4].endsWith('%') ? Number.parseFloat(match[4]) / 100 : Number(match[4]);
    if (alpha < 0.999) return null;
  }
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
}
