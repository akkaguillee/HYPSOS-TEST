/*
 * Revelado «a espray» (sin dependencias, canvas 2D).
 *
 * Un lienzo del color del fondo tapa la imagen y una boquilla virtual lo «borra» en pasadas en
 * zigzag, como quien rellena una pared: en cada punto del recorrido se estampa (destination-out)
 * un pincel de espray —núcleo denso, borde de bruma y gotitas sueltas—. El resultado tiene el
 * borde irregular y moteado del espray de verdad, no un degradado limpio.
 *
 * La imagen real está siempre debajo en el DOM (SEO, accesibilidad, LCP): el lienzo solo la tapa
 * mientras dura el efecto y después se elimina.
 */
import { gsap } from './motion';

export interface SprayRevealOptions {
  /** Color que tapa la imagen (normalmente el fondo de la sección). */
  color: string;
  /** Duración de las pasadas en segundos. */
  duration?: number;
  /** Nº de pasadas horizontales; por defecto según la proporción. */
  passes?: number;
  /** Lado por el que empieza la primera pasada. */
  from?: 'left' | 'right' | 'bottom';
  /** Semilla del ruido (mismo dibujo en cada carga). */
  seed?: number;
}

export interface SprayReveal {
  /** Tapa la imagen (pinta el lienzo de `color`). */
  cover(): void;
  /** Animación (pausada) que la descubre; al acabar el lienzo queda vacío y oculto. */
  timeline: gsap.core.Timeline;
  destroy(): void;
}

/** PRNG determinista (mulberry32). */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal aproximada (suma de uniformes), para repartir gotitas alrededor de la boquilla. */
function gaussian(rand: () => number): number {
  return (rand() + rand() + rand() + rand() - 2) / 2;
}

const BRUSH_SIZE = 256;

/** Pincel de espray: núcleo opaco, bruma y gotas cada vez más dispersas hacia fuera. */
function makeBrush(rand: () => number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = BRUSH_SIZE;
  const ctx = canvas.getContext('2d')!;
  const c = BRUSH_SIZE / 2;
  const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.62);
  core.addColorStop(0, 'rgba(0,0,0,1)');
  core.addColorStop(0.55, 'rgba(0,0,0,0.92)');
  core.addColorStop(0.8, 'rgba(0,0,0,0.35)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, BRUSH_SIZE, BRUSH_SIZE);
  // Gotitas: densidad que cae con la distancia; tamaños variados.
  for (let i = 0; i < 900; i++) {
    const r = c * Math.min(0.98, Math.abs(gaussian(rand)) * 0.95 + 0.32);
    const a = rand() * Math.PI * 2;
    const size = 0.6 + rand() * rand() * 3.2;
    ctx.globalAlpha = 0.35 + rand() * 0.65;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvas;
}

interface PathPoint {
  x: number;
  y: number;
  /** Distancia acumulada. */
  d: number;
}

/**
 * Recorrido de la boquilla: pasadas en zigzag con algo de diagonal y ondulación, como a mano.
 * Devuelve puntos densos con su distancia acumulada y los índices donde acaba cada pasada.
 */
export function sprayPath(width: number, height: number, passes: number, from: 'left' | 'right' | 'bottom', rand: () => number) {
  const points: PathPoint[] = [];
  const row = height / passes;
  const overshoot = row * 0.35;
  const ends: number[] = [];
  let d = 0;
  const push = (x: number, y: number) => {
    const last = points[points.length - 1];
    if (last) d += Math.hypot(x - last.x, y - last.y);
    points.push({ x, y, d });
  };
  for (let p = 0; p < passes; p++) {
    // Desde abajo: las pasadas suben; si no, bajan.
    const index = from === 'bottom' ? passes - 1 - p : p;
    const cy = row * (index + 0.5);
    const leftToRight = (from === 'right' ? p + 1 : p) % 2 === 0;
    const tilt = (rand() - 0.5) * row * 0.7;
    const wobble = row * (0.08 + rand() * 0.08);
    const phase = rand() * Math.PI * 2;
    const waves = 2 + rand() * 2.5;
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = leftToRight ? t : 1 - t;
      const x = -overshoot + u * (width + overshoot * 2);
      const y = cy + (t - 0.5) * tilt + Math.sin(phase + t * Math.PI * waves) * wobble;
      push(x, y);
    }
    ends.push(points.length - 1);
  }
  return { points, ends, row };
}

function pointAt(points: PathPoint[], distance: number): PathPoint {
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].d < distance) lo = mid + 1;
    else hi = mid;
  }
  const b = points[lo];
  const a = points[Math.max(0, lo - 1)];
  const span = b.d - a.d || 1;
  const t = Math.min(1, Math.max(0, (distance - a.d) / span));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, d: distance };
}

export function createSprayReveal(canvas: HTMLCanvasElement, options: SprayRevealOptions): SprayReveal {
  const ctx = canvas.getContext('2d');
  const rand = random(options.seed ?? 7);
  const brushes = [makeBrush(rand), makeBrush(rand), makeBrush(rand)];
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  let width = 1;
  let height = 1;

  const measure = () => {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(box.width * dpr));
    height = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  };

  const cover = () => {
    measure();
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = options.color;
    ctx.fillRect(0, 0, width, height);
    canvas.style.visibility = 'visible';
  };

  const timeline = gsap.timeline({ paused: true });
  const state = { distance: 0, clean: 0 };
  let path: ReturnType<typeof sprayPath> | null = null;
  let drawn = 0;
  let radius = 0;
  let cleaned = 0;

  const stamp = (x: number, y: number) => {
    if (!ctx) return;
    const brush = brushes[(rand() * brushes.length) | 0];
    const size = radius * (2.6 + rand() * 0.5);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.globalAlpha = 0.5 + rand() * 0.2;
    ctx.drawImage(brush, -size / 2, -size / 2, size, size);
    ctx.restore();
    // Sobrepulverizado: gotas sueltas lejos del núcleo, que perforan el color como puntos.
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 10; i++) {
      const r = radius * (1 + Math.abs(gaussian(rand)) * 1.6);
      const a = rand() * Math.PI * 2;
      const dot = (0.6 + rand() * rand() * 2.6) * dpr;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  timeline.call(() => {
    measure();
    const passes = options.passes ?? Math.min(7, Math.max(4, Math.round((height / width) * 4 + 2)));
    path = sprayPath(width, height, passes, options.from ?? 'left', rand);
    radius = path.row * 0.66;
    drawn = 0;
    if (ctx) ctx.globalCompositeOperation = 'destination-out';
  });
  // Una pasada por fila: la boquilla acelera en medio y frena al girar.
  const duration = options.duration ?? 1.5;
  timeline.to(state, {
    distance: 1,
    duration,
    ease: 'sine.inOut',
    onUpdate: () => {
      if (!path || !ctx) return;
      const total = path.points[path.points.length - 1].d;
      const target = state.distance * total;
      const step = radius * 0.2;
      while (drawn < target) {
        drawn = Math.min(target, drawn + step);
        const p = pointAt(path.points, drawn);
        stamp(p.x + gaussian(rand) * radius * 0.08, p.y + gaussian(rand) * radius * 0.08);
      }
    },
  });
  // Limpieza: el polvo de espray que haya quedado se disuelve rápido.
  timeline.to(state, {
    clean: 1,
    duration: 0.3,
    ease: 'power1.in',
    onUpdate: () => {
      if (!ctx) return;
      const delta = state.clean - cleaned;
      cleaned = state.clean;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = Math.min(1, delta * 2.2);
      ctx.fillRect(0, 0, width, height);
    },
  });
  timeline.call(() => {
    canvas.style.visibility = 'hidden';
  });

  return {
    cover,
    timeline,
    destroy() {
      timeline.kill();
    },
  };
}
