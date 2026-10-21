/**
 * Utilidades de dibujo para los mockups 2D (flat lay de estudio) de HYPSOS.
 * Todo se compone en un lienzo de 800×1000 (4:5) y se rasteriza con Chromium (ver render.ts).
 */
import { mascotVector } from '../../src/assets/brand/mascot';
import { monogramVector } from '../../src/assets/brand/monogram';
import { starVector } from '../../src/assets/brand/star';
import { wordmarkVector } from '../../src/assets/brand/wordmark';

export const W = 800;
export const H = 1000;

export type Pt = [number, number];
export interface Seg {
  /** Puntos de control de una curva cúbica; sin ellos, el segmento es recto. */
  c?: [Pt, Pt];
  to: Pt;
}

const fmt = (p: Pt) => `${p[0]},${p[1]}`;

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

/** Refleja horizontalmente un trazado con comandos absolutos (M, L, C, Q, Z). */
export function mirror(d: string, cx = W / 2): string {
  return d.replace(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${2 * cx - Number(x)},${y}`);
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

/** Color base de render por variante: el negro puro se fotografía como un carbón muy oscuro. */
export const FABRIC: Record<string, string> = {
  negro: '#161618',
  blanco: '#efeeea',
  grafito: '#39393c',
  gris: '#8f8f8f',
  rojo: '#b4142c',
};

export const INK_LIGHT = '#f3f3f0';
export const INK_DARK = '#141414';

export type Mark = 'monogram' | 'star' | 'wordmark' | 'mascot';
const VECTORS = { monogram: monogramVector, star: starVector, wordmark: wordmarkVector, mascot: mascotVector };

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

/**
 * Escena SVG con definiciones compartidas: sombras de estudio, sombra interior de tejido,
 * grano, pliegues y técnicas de estampación.
 */
let seq = 0;

export class Scene {
  private defs: string[] = [];
  private body: string[] = [];
  readonly clipId: string;
  private clipPaths: string[] = [];

  constructor(
    readonly fabric: string,
    readonly options: { heather?: boolean; background?: 'studio' | 'dark' } = {},
  ) {
    this.clipId = this.uid('garment');
  }

  uid(prefix: string) {
    seq += 1;
    return `${prefix}-${seq}`;
  }

  get dark() {
    return luminance(this.fabric) < 0.35;
  }

  /** Color de hilo de costura: tono sobre tono, algo más claro en tejidos oscuros. */
  get thread() {
    return this.dark ? 'rgb(255 255 255 / 0.16)' : 'rgb(0 0 0 / 0.22)';
  }

  add(svg: string) {
    this.body.push(svg);
  }

  def(svg: string) {
    this.defs.push(svg);
  }

  /** Registra una forma en la silueta global (sombra en el suelo y recortes de textura). */
  silhouette(d: string) {
    this.clipPaths.push(d);
  }

  /** Pieza de tejido: relleno, sombra interior en los bordes y un perfil muy sutil. */
  part(d: string, opts: { fill?: string; inner?: number; blur?: number; outline?: number; silhouette?: boolean } = {}) {
    const fill = opts.fill ?? this.fabric;
    const inner = opts.inner ?? (this.dark ? 0.55 : 0.32);
    if (opts.silhouette !== false) this.silhouette(d);
    const filter = opts.blur && opts.blur !== 9 ? this.innerFilter(opts.blur) : 'inner-9';
    this.add(
      `<g><path d="${d}" fill="${fill}"/>` +
        `<path d="${d}" fill="#000" opacity="${inner}" filter="url(#${filter})" style="mix-blend-mode:multiply"/>` +
        `<path d="${d}" fill="none" stroke="${shade(fill, -0.35)}" stroke-width="1.1" opacity="${opts.outline ?? 0.55}"/></g>`,
    );
  }

  private innerFilters = new Set<string>(['inner-9']);
  private innerFilter(blur: number) {
    const id = `inner-${blur}`;
    if (!this.innerFilters.has(id)) {
      this.innerFilters.add(id);
      this.def(innerShadow(id, blur));
    }
    return id;
  }

  /** Pliegue suave: sombra difusa con su luz de acompañamiento. */
  fold(d: string, strength = 1, width = 12) {
    const k = this.dark ? 1.1 : 0.85;
    width *= 1.6;
    this.add(
      `<g clip-path="url(#${this.clipId})">` +
        `<path d="${d}" fill="none" stroke="#000" stroke-width="${width}" stroke-linecap="round" opacity="${(0.2 * strength * k).toFixed(3)}" filter="url(#fold-blur)" style="mix-blend-mode:multiply"/>` +
        `<path d="${d}" fill="none" stroke="#fff" stroke-width="${width * 0.55}" stroke-linecap="round" opacity="${(this.dark ? 0.06 : 0.2) * strength}" filter="url(#fold-blur)" transform="translate(-${width * 0.4} -${width * 0.3})" style="mix-blend-mode:screen"/>` +
        `</g>`,
    );
  }

  /** Costura de unión: hendidura oscura con un filo de luz. */
  seam(d: string, opacity = 1) {
    this.add(
      `<g clip-path="url(#${this.clipId})" fill="none" stroke-linecap="round">` +
        `<path d="${d}" stroke="#000" stroke-width="2.4" opacity="${0.26 * opacity}" filter="url(#seam-blur)"/>` +
        `<path d="${d}" stroke="#fff" stroke-width="1" opacity="${(this.dark ? 0.08 : 0.25) * opacity}" transform="translate(1.2 1.2)"/>` +
        `</g>`,
    );
  }

  /** Pespunte visible (dobladillos, puños). */
  stitch(d: string) {
    this.add(`<path d="${d}" fill="none" stroke="${this.thread}" stroke-width="1.3" stroke-dasharray="5 3.5" clip-path="url(#${this.clipId})"/>`);
  }

  /** Canalé: banda con líneas finas perpendiculares. */
  rib(d: string, angle = 0, opts: { fill?: string; inner?: number } = {}) {
    const id = this.uid('rib');
    this.def(
      `<pattern id="${id}" width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">` +
        `<rect width="1.6" height="4.5" fill="#000" opacity="${this.dark ? 0.32 : 0.16}"/><rect x="2.2" width="0.8" height="4.5" fill="#fff" opacity="${this.dark ? 0.08 : 0.18}"/></pattern>`,
    );
    this.part(d, { fill: opts.fill, inner: opts.inner ?? (this.dark ? 0.4 : 0.28), blur: 5 });
    this.add(`<path d="${d}" fill="url(#${id})"/>`);
  }

  /** Estampación de una marca oficial (sin alterar su forma ni sus proporciones). */
  print(o: PrintOptions) {
    const v = VECTORS[o.mark];
    const h = o.w * (v.height / v.width);
    const filter = o.technique === 'screen' ? 'ink' : o.technique === 'embroidery' ? 'embroidery' : o.technique === 'woven' ? 'woven' : '';
    const rotate = o.rotate ? ` transform="rotate(${o.rotate} ${o.x + o.w / 2} ${o.y + h / 2})"` : '';
    const inner =
      o.mark === 'mascot'
        ? `<path d="${mascotVector.fill}" fill="${this.dark ? this.fabric : INK_DARK}"/><path d="${v.d}" fill="${o.color}"/>`
        : `<path d="${v.d}" fill="${o.color}"/>`;
    let svg = `<svg x="${o.x}" y="${o.y}" width="${o.w}" height="${h}" viewBox="${v.viewBox}" overflow="visible"><g transform="${v.transform}">${inner}</g></svg>`;
    if (o.technique === 'embroidery') {
      // Relleno de satén: rayado diagonal que capta la luz.
      svg += `<svg x="${o.x}" y="${o.y}" width="${o.w}" height="${h}" viewBox="${v.viewBox}" overflow="visible" style="mix-blend-mode:overlay"><g transform="${v.transform}"><path d="${v.d}" fill="url(#satin)"/></g></svg>`;
    }
    this.add(`<g${rotate} opacity="${o.opacity ?? (o.technique === 'screen' ? 0.95 : 1)}"${filter ? ` filter="url(#${filter})"` : ''}>${svg}</g>`);
  }

  /** Etiqueta tejida con texto o color (p. ej. etiqueta roja del gorro). */
  label(x: number, y: number, w: number, h: number, fill: string, rotate = 0) {
    this.add(
      `<g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${fill}"/>` +
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="url(#weave)" opacity="0.5"/>` +
        `<rect x="${x}" y="${y + h - 2}" width="${w}" height="2" fill="#000" opacity="0.18"/></g>`,
    );
  }

  /** Pieza incrustable en otra escena (definiciones propias + capas), sin fondo ni sombras. */
  fragment(): { defs: string; body: string } {
    return {
      defs: `<clipPath id="${this.clipId}"><path d="${this.clipPaths.join(' ')}"/></clipPath>${this.defs.join('')}`,
      body: this.body.join(''),
    };
  }

  /** Composición final: fondo de estudio, sombras de suelo, prenda, luz y grano. */
  toSVG(viewBox = `0 0 ${W} ${H}`): string {
    const union = this.clipPaths.join(' ');
    const studio =
      this.options.background === 'dark'
        ? `<rect width="${W}" height="${H}" fill="url(#bg-dark)"/>`
        : `<rect width="${W}" height="${H}" fill="url(#bg-studio)"/><rect width="${W}" height="${H}" filter="url(#paper)" opacity="0.5" style="mix-blend-mode:multiply"/>`;
    const grainOpacity = this.options.heather ? 0.5 : this.dark ? 0.2 : 0.34;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${W}" height="${H}">
<defs>
${sharedDefs}
<clipPath id="${this.clipId}"><path d="${union}"/></clipPath>
${this.defs.join('\n')}
</defs>
${studio}
<g opacity="0.34" filter="url(#ground)" transform="translate(4 16)"><path d="${union}" fill="#000"/></g>
<g opacity="0.28" filter="url(#contact)" transform="translate(0 3)"><path d="${union}" fill="#000"/></g>
${this.body.join('\n')}
<g clip-path="url(#${this.clipId})">
  <rect width="${W}" height="${H}" filter="url(#${this.options.heather ? 'heather' : 'grain'})" opacity="${grainOpacity}" style="mix-blend-mode:soft-light"/>
  <rect width="${W}" height="${H}" fill="url(#light)" style="mix-blend-mode:soft-light"/>
</g>
</svg>`;
  }
}

function innerShadow(id: string, blur: number) {
  return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/>
  <feComposite in="SourceAlpha" in2="b" operator="arithmetic" k2="1" k3="-1" result="edge"/>
  <feFlood flood-color="#000"/>
  <feComposite in2="edge" operator="in"/>
</filter>`;
}

const sharedDefs = `
<radialGradient id="bg-studio" cx="50%" cy="38%" r="75%">
  <stop offset="0" stop-color="#f0f0ee"/>
  <stop offset="0.65" stop-color="#e4e4e2"/>
  <stop offset="1" stop-color="#d6d6d4"/>
</radialGradient>
<radialGradient id="bg-dark" cx="50%" cy="38%" r="80%">
  <stop offset="0" stop-color="#2a2a2a"/>
  <stop offset="1" stop-color="#121212"/>
</radialGradient>
<linearGradient id="light" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity="0.12"/>
  <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
  <stop offset="1" stop-color="#000" stop-opacity="0.24"/>
</linearGradient>
${innerShadow('inner-9', 9)}
<filter id="ground" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="contact" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.5"/></filter>
<filter id="fold-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="seam-blur"><feGaussianBlur stdDeviation="0.8"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
  <feColorMatrix type="saturate" values="0"/>
</filter>
<filter id="heather" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.55 1.6" numOctaves="3" seed="11"/>
  <feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncR type="linear" slope="1.6" intercept="-0.3"/><feFuncG type="linear" slope="1.6" intercept="-0.3"/><feFuncB type="linear" slope="1.6" intercept="-0.3"/></feComponentTransfer>
</filter>
<filter id="paper" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="2"/>
  <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.12 0"/>
</filter>
<filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="embroidery" x="-10%" y="-10%" width="120%" height="120%">
  <feDropShadow dx="0" dy="1.4" stdDeviation="0.9" flood-color="#000" flood-opacity="0.55"/>
</filter>
<filter id="woven" x="-10%" y="-10%" width="120%" height="120%">
  <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" flood-color="#000" flood-opacity="0.4"/>
</filter>
<pattern id="satin" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
  <rect width="1.4" height="3" fill="#fff" opacity="0.55"/><rect x="1.6" width="1.4" height="3" fill="#000" opacity="0.4"/>
</pattern>
<pattern id="weave" width="2" height="2" patternUnits="userSpaceOnUse">
  <rect width="1" height="1" fill="#000" opacity="0.4"/><rect x="1" y="1" width="1" height="1" fill="#000" opacity="0.4"/>
</pattern>`;
