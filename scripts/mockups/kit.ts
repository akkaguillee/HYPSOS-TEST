/**
 * Utilidades de dibujo para los mockups de HYPSOS en estilo «tech pack»: dibujo plano técnico,
 * rellenos lisos, contorno uniforme, costuras finas y pespuntes discontinuos.
 *
 * Cada pieza se dibuja en su propio espacio de diseño (≈ lienzo de 800×1000) y `Scene.toSVG`
 * la encuadra automáticamente en la caja segura de su categoría, para que todo el catálogo
 * se lea como una sola estantería. Los trazos usan `vector-effect: non-scaling-stroke`, así el
 * grosor de línea es idéntico en todos los productos y también en las vistas de detalle.
 */
import { mascotVector } from '../../src/assets/brand/mascot';
import { monogramVector } from '../../src/assets/brand/monogram';
import { starVector } from '../../src/assets/brand/star';
import { wordmarkVector } from '../../src/assets/brand/wordmark';

export const W = 800;
export const H = 1000;

/** Fondo de estudio: blanco roto cálido y plano (manual de marca). */
export const BG = '#ECE9E3';
/** Rojo HYPSOS de la etiqueta tejida que llevan todas las prendas, siempre en el mismo sitio. */
export const HYPSOS_RED = '#D71920';

export type Pt = [number, number];
export type Box = [number, number, number, number];
/** Curva cúbica: inicio, dos puntos de control y fin. */
export type Curve = [Pt, Pt, Pt, Pt];
export interface Seg {
  /** Puntos de control de una curva cúbica; sin ellos, el segmento es recto. */
  c?: [Pt, Pt];
  to: Pt;
}

const fmt = (p: Pt) => `${+p[0].toFixed(2)},${+p[1].toFixed(2)}`;

/** Trazado simétrico: se define la mitad izquierda (de arriba al centro inferior) y se refleja. */
export function sym(start: Pt, segs: Seg[], cx = W / 2): string {
  const m = (p: Pt): Pt => [2 * cx - p[0], p[1]];
  let d = `M${fmt(start)}`;
  for (const s of segs) d += s.c ? ` C${fmt(s.c[0])} ${fmt(s.c[1])} ${fmt(s.to)}` : ` L${fmt(s.to)}`;
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const from = i === 0 ? start : segs[i - 1].to;
    d += s.c ? ` C${fmt(m(s.c[1]))} ${fmt(m(s.c[0]))} ${fmt(m(from))}` : ` L${fmt(m(from))}`;
  }
  return `${d} Z`;
}

/** Trazado abierto a partir de segmentos. */
export function path(start: Pt, segs: Seg[]): string {
  let d = `M${fmt(start)}`;
  for (const s of segs) d += s.c ? ` C${fmt(s.c[0])} ${fmt(s.c[1])} ${fmt(s.to)}` : ` L${fmt(s.to)}`;
  return d;
}

/** Refleja horizontalmente un trazado con comandos absolutos (M, L, C, Q, Z). */
export function mirror(d: string, cx = W / 2): string {
  return d.replace(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(2 * cx - Number(x)).toFixed(2)},${y}`);
}

export const mirrorPt = (p: Pt, cx = W / 2): Pt => [2 * cx - p[0], p[1]];
export const mirrorCurve = (c: Curve, cx = W / 2): Curve => c.map((p) => mirrorPt(p, cx)) as Curve;
export const curveD = (c: Curve) => `M${fmt(c[0])} C${fmt(c[1])} ${fmt(c[2])} ${fmt(c[3])}`;

export function bez(c: Curve, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
}

function curveLength(c: Curve) {
  let len = 0;
  let prev = c[0];
  for (let i = 1; i <= 24; i++) {
    const p = bez(c, i / 24);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
}

export function hexToRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;

/** Mezcla con negro (amount < 0) o blanco (amount > 0). */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  return toHex(rgb.map((c) => (amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Relleno plano por variante (negro del manual de marca; el resto, el hex del catálogo). */
export const FABRIC: Record<string, string> = {
  negro: '#121212',
  blanco: '#f2f2f0',
  grafito: '#3a3a3a',
  gris: '#8c8c8c',
  rojo: '#c8102e',
};

export const INK_LIGHT = '#f3f3f0';
export const INK_DARK = '#141414';

/** Colores de línea: gris cálido claro sobre negro/grafito para que se lea la construcción; #2a2a2a en el resto. */
export function lineColors(fill: string): { outline: string; seam: string } {
  const l = luminance(fill);
  if (l < 0.12) return { outline: '#4a4744', seam: '#3a3836' };
  if (l < 0.3) return { outline: '#6a6763', seam: '#5a5754' };
  return { outline: '#2a2a2a', seam: l > 0.8 ? '#5c5a57' : '#2a2a2a' };
}

/** Grosor de línea en píxeles CSS del lienzo de 800 px (constante gracias a non-scaling-stroke). */
export const STROKE = { outline: 2.1, seam: 1, stitch: 1, rib: 0.75 };
const NS = 'vector-effect="non-scaling-stroke"';

export type Mark = 'monogram' | 'star' | 'wordmark' | 'mascot';
export const VECTORS = { monogram: monogramVector, star: starVector, wordmark: wordmarkVector, mascot: mascotVector };

export function markAspect(mark: Mark): number {
  const v = VECTORS[mark];
  return v.height / v.width;
}

export interface PrintOptions {
  mark: Mark;
  x: number;
  y: number;
  /** Ancho del gráfico; el alto respeta la proporción original. */
  w: number;
  color: string;
  technique: 'screen' | 'embroidery' | 'woven' | 'flat';
  rotate?: number;
  opacity?: number;
}

/** Marca oficial colocada en (x, y) con ancho w, sin alterar su forma ni sus proporciones. */
export function vectorAt(mark: Mark, x: number, y: number, w: number, inner: string, extra = '') {
  const v = VECTORS[mark];
  const h = (w * v.height) / v.width;
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${v.viewBox}" overflow="visible"${extra}><g transform="${v.transform}">${inner}</g></svg>`;
}

/** Encuadre por categoría: caja segura en el lienzo de 800×1000, centrada. */
export type Frame = 'tops' | 'bottoms' | 'accessory' | 'sticker';
const FRAMES: Record<Frame, { w: number; h: number; cy: number }> = {
  // Prendas superiores e inferiores: ≈72 % del alto del tile (ancho máximo 86 % / 78 %).
  tops: { w: 688, h: 720, cy: 500 },
  bottoms: { w: 620, h: 720, cy: 500 },
  // Gorras y accesorios: ≈50 % del ancho del tile.
  accessory: { w: 400, h: 600, cy: 500 },
  // Stickers: ≈60 % del ancho.
  sticker: { w: 480, h: 640, cy: 500 },
};

let seq = 0;

/** Escena de un mockup: capas planas en espacio de diseño + encuadre automático. */
export class Scene {
  private defs: string[] = [];
  private body: string[] = [];
  private silhouettes: string[] = [];
  private explicitBounds?: Box;
  readonly outline: string;
  readonly seamColor: string;

  constructor(
    readonly fabric: string,
    readonly frame: Frame = 'tops',
    options: { outline?: string; seam?: string } = {},
  ) {
    const c = lineColors(fabric);
    this.outline = options.outline ?? c.outline;
    this.seamColor = options.seam ?? c.seam;
  }

  uid(prefix: string) {
    seq += 1;
    return `${prefix}-${seq}`;
  }

  get dark() {
    return luminance(this.fabric) < 0.3;
  }

  add(svg: string) {
    this.body.push(svg);
  }

  def(svg: string) {
    this.defs.push(svg);
  }

  /** Registra una forma en la silueta (encuadre y sombra de suelo). */
  silhouette(d: string) {
    this.silhouettes.push(d);
  }

  /** Fija la caja de la pieza cuando la silueta no se puede deducir de trazados (marcas vectoriales). */
  bounds(box: Box) {
    this.explicitBounds = box;
  }

  /** Pieza plana: relleno liso y contorno uniforme. */
  part(d: string, opts: { fill?: string; stroke?: string; width?: number; silhouette?: boolean } = {}) {
    if (opts.silhouette !== false) this.silhouette(d);
    this.add(
      `<path d="${d}" fill="${opts.fill ?? this.fabric}" stroke="${opts.stroke ?? this.outline}" stroke-width="${opts.width ?? STROKE.outline}" stroke-linejoin="round" stroke-linecap="round" ${NS}/>`,
    );
  }

  /** Línea de contorno sin relleno (bordes interiores que también son canto de tejido). */
  edge(d: string, width = STROKE.outline) {
    this.add(`<path d="${d}" fill="none" stroke="${this.outline}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${NS}/>`);
  }

  /** Costura: línea fina continua. */
  seam(d: string) {
    this.add(`<path d="${d}" fill="none" stroke="${this.seamColor}" stroke-width="${STROKE.seam}" stroke-linecap="round" ${NS}/>`);
  }

  /** Pespunte visible: línea discontinua. */
  stitch(d: string) {
    this.add(`<path d="${d}" fill="none" stroke="${this.seamColor}" stroke-width="${STROKE.stitch}" stroke-dasharray="4 3" ${NS}/>`);
  }

  /** Pespunte paralelo a una curva, desplazado `offset` unidades hacia su normal (signo = lado). */
  stitchAlong(c: Curve, offset: number, from = 0, to = 1) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = from + ((to - from) * i) / 20;
      const p = bez(c, t);
      const q = bez(c, Math.min(1, t + 0.01));
      const r = bez(c, Math.max(0, t - 0.01));
      const dx = q[0] - r[0];
      const dy = q[1] - r[1];
      const len = Math.hypot(dx, dy) || 1;
      pts.push([p[0] - (dy / len) * offset, p[1] + (dx / len) * offset]);
    }
    this.stitch(`M${pts.map(fmt).join(' L')}`);
  }

  /**
   * Canalé: banda entre dos curvas (borde a y borde b, mismo sentido) con líneas finas
   * paralelas que unen ambos bordes.
   */
  rib(a: Curve | Curve[], b: Curve | Curve[], opts: { spacing?: number; fill?: string; closeWith?: 'line' } = {}) {
    const as = (Array.isArray(a[0][0]) ? a : [a]) as Curve[];
    const bs = (Array.isArray(b[0][0]) ? b : [b]) as Curve[];
    let d = `M${fmt(as[0][0])}`;
    for (const c of as) d += ` C${fmt(c[1])} ${fmt(c[2])} ${fmt(c[3])}`;
    const rb = [...bs].reverse();
    d += ` L${fmt(rb[0][3])}`;
    for (const c of rb) d += ` C${fmt(c[2])} ${fmt(c[1])} ${fmt(c[0])}`;
    d += ' Z';
    this.part(d, { fill: opts.fill });
    const spacing = opts.spacing ?? 6.5;
    let lines = '';
    for (let k = 0; k < as.length; k++) {
      const n = Math.max(2, Math.round(Math.max(curveLength(as[k]), curveLength(bs[k])) / spacing));
      for (let i = k === 0 ? 1 : 0; i < n; i++) {
        const p = bez(as[k], i / n);
        const q = bez(bs[k], i / n);
        lines += `M${fmt(p)} L${fmt(q)}`;
      }
    }
    this.add(`<path d="${lines}" fill="none" stroke="${this.seamColor}" stroke-width="${STROKE.rib}" opacity="0.85" ${NS}/>`);
  }

  /**
   * Etiqueta tejida roja HYPSOS saliendo de una costura en (x, y). `side` indica hacia dónde
   * asoma (-1 izquierda, 1 derecha); `angle` gira la etiqueta con la costura.
   */
  tab(x: number, y: number, side: -1 | 1, opts: { len?: number; h?: number; angle?: number } = {}) {
    const len = opts.len ?? 15;
    const h = opts.h ?? 11;
    const x0 = side < 0 ? x - len : x - 2;
    const fold = side < 0 ? x0 + 3.5 : x0 + len - 3.5;
    this.add(
      `<g transform="rotate(${opts.angle ?? 0} ${x} ${y})">` +
        `<rect x="${x0}" y="${y - h / 2}" width="${len + 2}" height="${h}" rx="1.2" fill="${HYPSOS_RED}" stroke="${this.dark ? '#4a4744' : '#2a2a2a'}" stroke-width="1.2" ${NS}/>` +
        `<path d="M${fold},${y - h / 2 + 1.5} L${fold},${y + h / 2 - 1.5}" stroke="#8e0f16" stroke-width="0.8" ${NS}/>` +
        `</g>`,
    );
  }

  /** Estampación de una marca oficial, plana (sin alterar su forma ni sus proporciones). */
  print(o: PrintOptions) {
    const v = VECTORS[o.mark];
    const h = o.w * (v.height / v.width);
    const rotate = o.rotate ? ` transform="rotate(${o.rotate} ${o.x + o.w / 2} ${o.y + h / 2})"` : '';
    const inner =
      o.mark === 'mascot'
        ? `<path d="${mascotVector.fill}" fill="${this.dark ? this.fabric : INK_DARK}"/><path d="${v.d}" fill="${o.color}"/>`
        : `<path d="${v.d}" fill="${o.color}"/>`;
    this.add(`<g${rotate} opacity="${o.opacity ?? 1}">${vectorAt(o.mark, o.x, o.y, o.w, inner)}</g>`);
  }

  /** Capas de la escena para incrustarlas (transformadas) en otra escena. */
  fragment(): string {
    return this.body.join('');
  }

  /** Caja de la pieza en espacio de diseño. */
  bbox(): Box {
    if (this.explicitBounds) return this.explicitBounds;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const d of this.silhouettes) {
      for (const m of d.matchAll(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)) {
        const x = Number(m[1]);
        const y = Number(m[2]);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    return [x0, y0, x1 - x0, y1 - y0];
  }

  /** Transformación que lleva el espacio de diseño a la caja segura de la categoría. */
  fit() {
    const [x, y, w, h] = this.bbox();
    const f = FRAMES[this.frame];
    const s = Math.min(f.w / w, f.h / h);
    return { s, tx: W / 2 - (x + w / 2) * s, ty: f.cy - (y + h / 2) * s };
  }

  /** Composición final: fondo plano, sombra de suelo muy suave y pieza encuadrada. */
  toSVG(detail?: Box): string {
    const { s, tx, ty } = this.fit();
    let viewBox = `0 0 ${W} ${H}`;
    if (detail) {
      const [x, y, w, h] = detail;
      viewBox = `${+(x * s + tx).toFixed(2)} ${+(y * s + ty).toFixed(2)} ${+(w * s).toFixed(2)} ${+(h * s).toFixed(2)}`;
    }
    const union = this.silhouettes.join(' ');
    const shadow = union
      ? `<g opacity="0.07" filter="url(#floor)"><path d="${union}" fill="#2b2620" transform="translate(0 7)"/></g>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${W}" height="${H}">
<defs>
<filter id="floor" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
${this.defs.join('\n')}
</defs>
<rect x="-2000" y="-2000" width="${W + 4000}" height="${H + 4000}" fill="${BG}"/>
<g transform="translate(${+tx.toFixed(2)} ${+ty.toFixed(2)}) scale(${+s.toFixed(4)})">
${shadow}
${this.body.join('\n')}
</g>
</svg>`;
  }
}
