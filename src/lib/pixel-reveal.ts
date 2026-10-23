/*
 * Revelado «pixel-resolve» (canvas 2D, sin dependencias).
 *
 * Un lienzo del color del fondo tapa la imagen. Al dispararse:
 * 1. Mosaico: la imagen aparece por baldosas en un barrido diagonal con algo de azar, ya
 *    pixelada (bloques grandes, como una carga progresiva).
 * 2. Enfoque: la resolución sube a saltos —bloques de 48, 24, 12, 6, 3 px— con un ritmo
 *    escalonado, y en el último paso se dibuja la imagen nítida y el lienzo desaparece.
 *
 * Sin fundidos, desenfoques ni deslizamientos. La <img> real está siempre debajo (SEO,
 * accesibilidad, LCP); el lienzo solo la tapa mientras dura el efecto.
 */
import { gsap } from './motion';

export interface PixelRevealOptions {
  /** Color que tapa la imagen antes de revelarla. */
  color: string;
  /** Duración total en segundos. */
  duration?: number;
  /** Semilla del orden de las baldosas (mismo dibujo en cada carga). */
  seed?: number;
}

export interface PixelReveal {
  /** Tapa la imagen (pinta el lienzo de `color`). */
  cover(): void;
  /** Espera a que la imagen esté decodificada y reproduce el revelado. */
  play(): Promise<void>;
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

/** Tamaños de bloque del enfoque, de grueso a fino (en px CSS). */
export const RESOLVE_STEPS = [48, 24, 12, 6, 3] as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Recorte de origen de `object-fit: cover`: qué parte de la imagen (natural w×h) se ve en una
 * caja de `box.w×box.h` con `object-position` en fracciones (0–1).
 */
export function coverSource(naturalW: number, naturalH: number, boxW: number, boxH: number, posX = 0.5, posY = 0.5): Rect {
  const scale = Math.max(boxW / naturalW, boxH / naturalH);
  const w = boxW / scale;
  const h = boxH / scale;
  return { x: (naturalW - w) * posX, y: (naturalH - h) * posY, w, h };
}

/** Orden de aparición de las baldosas: barrido diagonal (arriba-izquierda → abajo-derecha) con azar. */
export function tileSchedule(cols: number, rows: number, rand: () => number): number[] {
  const span = Math.max(1, cols + rows - 2);
  const times: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) times.push(Math.min(1, Math.max(0, ((c + r) / span) * 0.72 + rand() * 0.28)));
  }
  return times;
}

function parsePosition(value: string): [number, number] {
  const parts = value.split(/\s+/).map((part) => (part.endsWith('%') ? Number.parseFloat(part) / 100 : 0.5));
  return [parts[0] ?? 0.5, parts[1] ?? 0.5];
}

function waitForImage(img: HTMLImageElement, timeout = 2500): Promise<boolean> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(false), timeout);
    img.decode().then(
      () => {
        window.clearTimeout(timer);
        resolve(img.naturalWidth > 0);
      },
      () => {
        window.clearTimeout(timer);
        resolve(false);
      },
    );
  });
}

export function createPixelReveal(canvas: HTMLCanvasElement, img: HTMLImageElement, options: PixelRevealOptions): PixelReveal {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const rand = random(options.seed ?? 5);
  const duration = options.duration ?? 1.15;
  let tween: gsap.core.Timeline | null = null;
  let alive = true;

  const size = () => {
    const box = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(box.width * dpr));
    const h = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    return box;
  };

  const cover = () => {
    size();
    if (!ctx) return;
    ctx.fillStyle = options.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.style.visibility = 'visible';
  };

  /** Dónde y qué parte de la imagen hay que pintar para igualar a la <img> (con sus transformaciones). */
  const layout = () => {
    const box = size();
    const imgBox = img.getBoundingClientRect();
    const [px, py] = parsePosition(getComputedStyle(img).objectPosition);
    const source = coverSource(img.naturalWidth, img.naturalHeight, imgBox.width, imgBox.height, px, py);
    const dest: Rect = { x: (imgBox.left - box.left) * dpr, y: (imgBox.top - box.top) * dpr, w: imgBox.width * dpr, h: imgBox.height * dpr };
    return { source, dest };
  };

  /** Imagen pixelada a bloques de `block` px CSS, en un lienzo del tamaño del de destino. */
  const mosaic = (block: number, source: Rect, dest: Rect) => {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const o = out.getContext('2d')!;
    o.fillStyle = options.color;
    o.fillRect(0, 0, out.width, out.height);
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(dest.w / (block * dpr)));
    small.height = Math.max(1, Math.round(dest.h / (block * dpr)));
    small.getContext('2d')!.drawImage(img, source.x, source.y, source.w, source.h, 0, 0, small.width, small.height);
    o.imageSmoothingEnabled = false;
    o.drawImage(small, 0, 0, small.width, small.height, dest.x, dest.y, dest.w, dest.h);
    return out;
  };

  const play = async () => {
    if (!ctx) return;
    const ready = await waitForImage(img);
    if (!alive) return;
    if (!ready) {
      canvas.style.visibility = 'hidden';
      return;
    }
    const { source, dest } = layout();
    const tile = Math.max(36, Math.round(Math.min(canvas.width, canvas.height) / 7));
    const cols = Math.ceil(canvas.width / tile);
    const rows = Math.ceil(canvas.height / tile);
    const times = tileSchedule(cols, rows, rand);
    const coarse = mosaic(RESOLVE_STEPS[0], source, dest);
    const state = { tiles: 0 };
    let drawn = 0;

    tween = gsap.timeline({ onComplete: () => (canvas.style.visibility = 'hidden') });
    // 1. Mosaico: cada baldosa aparece (ya pixelada) cuando le llega su turno.
    tween.to(state, {
      tiles: 1,
      duration: duration * 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        for (let i = 0; i < times.length; i++) {
          if (times[i] > state.tiles || times[i] < 0) continue;
          const x = (i % cols) * tile;
          const y = Math.floor(i / cols) * tile;
          ctx.drawImage(coarse, x, y, tile, tile, x, y, tile, tile);
          times[i] = -1;
          drawn++;
        }
      },
    });
    tween.call(() => {
      if (drawn < times.length) ctx.drawImage(coarse, 0, 0);
    });
    // 2. Enfoque escalonado: cada paso se mantiene unos fotogramas, como una carga progresiva.
    const hold = (duration * 0.5) / RESOLVE_STEPS.length;
    RESOLVE_STEPS.slice(1).forEach((block, index) => {
      tween!.call(() => ctx.drawImage(mosaic(block, source, dest), 0, 0), [], `>${index === 0 ? 0.04 : hold}`);
    });
    tween.call(
      () => {
        ctx.fillStyle = options.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, source.x, source.y, source.w, source.h, dest.x, dest.y, dest.w, dest.h);
      },
      [],
      `>${hold}`,
    );
    tween.set({}, {}, `>${hold * 0.6}`);
  };

  return {
    cover,
    play,
    destroy() {
      alive = false;
      tween?.kill();
    },
  };
}
