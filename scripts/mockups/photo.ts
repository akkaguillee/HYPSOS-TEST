/**
 * Composición fotográfica: estampa las marcas oficiales sobre fotos de prenda lisa para que
 * parezcan impresas o bordadas de verdad, no pegadas encima.
 *
 * Todo se calcula en luz lineal y al doble de resolución que la base (SCALE), para que la
 * vista de detalle salga de la misma composición sin reescalar la tinta:
 *
 * 1. La marca se rasteriza plana con Chromium (raster.ts) y se muestrea con su giro, una
 *    curvatura cilíndrica opcional y el desplazamiento de las arrugas (mapa de luminancia).
 * 2. La tinta recibe la luz de la prenda: color × (luminancia local / luminancia de referencia),
 *    así las sombras y brillos de los pliegues pasan por encima del gráfico.
 * 3. Serigrafía: opacidad del 95 %, bordes suavizados y la textura del punto «comiéndose» la tinta.
 *    Bordado: relieve con luz difusa y brillo de hilo, puntada direccional y sombra de 1 px.
 *    Etiqueta tejida: parche con trama, pespunte y su propia sombra.
 */
import sharp, { type Sharp } from 'sharp';
import { markAspect, markMask, type Mark, type Mask } from './raster';

/** Resolución de trabajo respecto a la base (960×1280 → 1920×2560). */
export const SCALE = 2;
export const BASE_W = 960;
export const BASE_H = 1280;
export const OUT_W = 960;
export const OUT_H = 1200;

// ─── Color ──────────────────────────────────────────────────────────────────

const SRGB_TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const LUT_SIZE = 16384;
const LIN_TO_SRGB = new Uint8Array(LUT_SIZE + 1);
for (let i = 0; i <= LUT_SIZE; i++) {
  const l = i / LUT_SIZE;
  const c = l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055;
  LIN_TO_SRGB[i] = Math.round(Math.max(0, Math.min(1, c)) * 255);
}
const toSrgb8 = (l: number) => LIN_TO_SRGB[Math.round(Math.max(0, Math.min(1, l)) * LUT_SIZE)];

/** Color hex → RGB lineal. */
export function linearRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [SRGB_TO_LIN[(v >> 16) & 255], SRGB_TO_LIN[(v >> 8) & 255], SRGB_TO_LIN[v & 255]];
}

export const lumaOf = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ─── Imagen en luz lineal ───────────────────────────────────────────────────

export interface Img {
  w: number;
  h: number;
  /** RGB lineal intercalado. */
  rgb: Float32Array;
}

/** Lee una imagen (fondo plano, sin alfa) a luz lineal, opcionalmente reescalada y reflejada. */
export async function readImg(input: string | Buffer, opts: { scale?: number; mirror?: boolean } = {}): Promise<Img> {
  let pipeline = sharp(input).flatten({ background: '#ECE9E3' }).removeAlpha().toColourspace('srgb');
  const meta = await sharp(input).metadata();
  if (opts.scale && opts.scale !== 1) {
    pipeline = pipeline.resize({ width: Math.round((meta.width ?? BASE_W) * opts.scale), kernel: 'lanczos3' });
  }
  if (opts.mirror) pipeline = pipeline.flop();
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const rgb = new Float32Array(info.width * info.height * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = SRGB_TO_LIN[data[i]];
  return { w: info.width, h: info.height, rgb };
}

/** Imagen lineal → sharp (sRGB de 8 bits). */
export function toSharp(img: Img): Sharp {
  const out = Buffer.alloc(img.w * img.h * 3);
  for (let i = 0; i < out.length; i++) out[i] = toSrgb8(img.rgb[i]);
  return sharp(out, { raw: { width: img.w, height: img.h, channels: 3 } });
}

export function cloneImg(img: Img): Img {
  return { w: img.w, h: img.h, rgb: img.rgb.slice() };
}

/** Recorte rectangular (en píxeles de la imagen). */
export function cropImg(img: Img, x: number, y: number, w: number, h: number): Img {
  const rgb = new Float32Array(w * h * 3);
  for (let row = 0; row < h; row++) {
    const sy = Math.min(img.h - 1, Math.max(0, y + row));
    for (let col = 0; col < w; col++) {
      const sx = Math.min(img.w - 1, Math.max(0, x + col));
      const si = (sy * img.w + sx) * 3;
      const di = (row * w + col) * 3;
      rgb[di] = img.rgb[si];
      rgb[di + 1] = img.rgb[si + 1];
      rgb[di + 2] = img.rgb[si + 2];
    }
  }
  return { w, h, rgb };
}

/** Luminancia lineal de una zona. */
function lumaRegion(img: Img, x0: number, y0: number, w: number, h: number): Float32Array {
  const L = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.h - 1, Math.max(0, y0 + y));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.w - 1, Math.max(0, x0 + x));
      const i = (sy * img.w + sx) * 3;
      L[y * w + x] = lumaOf(img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]);
    }
  }
  return L;
}

// ─── Desenfoque gaussiano aproximado (tres cajas) ───────────────────────────

function boxesForGauss(sigma: number, n = 3): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  return Array.from({ length: n }, (_, i) => (i < m ? wl : wu));
}

function boxBlurH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let k = -r - 1; k < r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      acc += src[row + Math.min(w - 1, x + r)] - src[row + Math.max(0, x - r - 1)];
      dst[row + x] = acc * iarr;
    }
  }
}

function boxBlurV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r - 1; k < r; k++) acc += src[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      acc += src[Math.min(h - 1, y + r) * w + x] - src[Math.max(0, y - r - 1) * w + x];
      dst[y * w + x] = acc * iarr;
    }
  }
}

/** Desenfoque gaussiano (aprox.) de un canal; devuelve un búfer nuevo. */
export function blur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const out = src.slice();
  if (sigma < 0.3) return out;
  const tmp = new Float32Array(src.length);
  for (const size of boxesForGauss(sigma)) {
    const r = (size - 1) / 2;
    boxBlurH(out, tmp, w, h, r);
    boxBlurV(tmp, out, w, h, r);
  }
  return out;
}

/** Muestreo bilineal de una máscara (0 fuera). */
function sampleMask(m: Mask, u: number, v: number): number {
  if (u < -1 || v < -1 || u > m.w || v > m.h) return 0;
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : m.a[y * m.w + x]);
  return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
}

/** Ruido determinista (hash) en [0, 1). */
function hash(x: number, y: number, seed = 0): number {
  let n = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// ─── Estampación ────────────────────────────────────────────────────────────

export type Technique = 'screen' | 'embroidery' | 'puff' | 'woven' | 'knit';

export interface PlacedPrint {
  mark: Mark;
  /** Centro del gráfico, en píxeles de trabajo. */
  cx: number;
  cy: number;
  /** Ancho del gráfico, en píxeles de trabajo (el alto respeta la proporción oficial). */
  w: number;
  /** Giro en grados (horario). */
  rotate: number;
  /** Radio de la curvatura horizontal (pecho, copa de la gorra), en píxeles de trabajo. */
  curve?: number;
  technique: Technique;
  /** Color de la tinta o del hilo. */
  ink: string;
  /** Tono sobre tono: el hilo es el color medio de la tela bajo el gráfico × este factor (ignora `ink`). */
  tone?: number;
  /** Color del parche en la etiqueta tejida. */
  patch?: string;
  /** Solo la mascota: pinta también su silueta interior con este color. */
  fill?: string;
}

interface Field {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

/** Parámetros físicos por técnica. */
const TECH = {
  // Desplazamiento máximo por los pliegues (px de trabajo), opacidad y cuánto se transfiere la luz.
  screen: { disp: 6, opacity: 0.95, light: 0.9, knock: 1 },
  knit: { disp: 4, opacity: 0.97, light: 0.95, knock: 2.5 },
  embroidery: { disp: 3, opacity: 1, light: 0.6, knock: 0 },
  puff: { disp: 2, opacity: 1, light: 0.55, knock: 0 },
  woven: { disp: 3, opacity: 1, light: 0.7, knock: 0 },
} satisfies Record<Technique, { disp: number; opacity: number; light: number; knock: number }>;

/** Compone una estampación sobre la imagen (in situ). */
export async function applyPrint(img: Img, p: PlacedPrint): Promise<void> {
  const S = SCALE;
  const t = TECH[p.technique];
  const mw = p.w;
  const mh = p.w * markAspect(p.mark);
  const woven = p.technique === 'woven';
  // Parche de la etiqueta tejida alrededor de la marca.
  const padX = woven ? mh * 0.55 : 0;
  const padY = woven ? mh * 0.38 : 0;
  const pw = mw + 2 * padX;
  const ph = mh + 2 * padY;

  // Máscaras supermuestreadas (×1,5) y suavizadas ≈0,4 px de la base.
  const ss = 1.5;
  const soften = (m: Mask, sigma: number): Mask => ({ w: m.w, h: m.h, a: blur(m.a, m.w, m.h, sigma) });
  const edge = p.technique === 'screen' || p.technique === 'knit' ? 0.45 : 0.3;
  const mark = soften(await markMask(p.mark, 'd', mw * ss), edge * S * ss * 0.5);
  const fillMask = p.fill ? soften(await markMask(p.mark, 'fill', mw * ss), edge * S * ss * 0.5) : undefined;

  // Zona de trabajo: caja girada del gráfico + margen para desenfoques y sombra.
  const half = Math.hypot(pw, ph) / 2;
  const margin = Math.ceil(48 * S);
  const f: Field = {
    x0: Math.floor(p.cx - half - margin),
    y0: Math.floor(p.cy - half - margin),
    w: Math.ceil(2 * (half + margin)),
    h: Math.ceil(2 * (half + margin)),
  };
  const L = lumaRegion(img, f.x0, f.y0, f.w, f.h);
  const Lshade = blur(L, f.w, f.h, 1.2 * S); // luz de la prenda (pliegues), sin el grano del punto
  const Ldisp = blur(L, f.w, f.h, 3.5 * S);
  const Lmean = blur(L, f.w, f.h, 14 * S);

  // Geometría inversa: píxel de destino → coordenadas planas de la marca.
  const rad = (-p.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const R = p.curve ?? 0;
  const N = f.w * f.h;
  const A = new Float32Array(N); // cobertura de la marca
  const F = fillMask ? new Float32Array(N) : undefined; // silueta de la mascota
  const P = woven ? new Float32Array(N) : undefined; // parche
  const QX = woven ? new Float32Array(N) : undefined;
  const QY = woven ? new Float32Array(N) : undefined;

  // Referencia de luz y color: mediana de la tela bajo el gráfico.
  const under: number[] = [];
  const rgbUnder: number[][] = [[], [], []];
  for (let y = 0; y < f.h; y += 2) {
    for (let x = 0; x < f.w; x += 2) {
      const dx = f.x0 + x - p.cx;
      const dy = f.y0 + y - p.cy;
      const qx = dx * cos - dy * sin;
      const qy = dx * sin + dy * cos;
      if (Math.abs(qx) < pw / 2 && Math.abs(qy) < ph / 2) {
        under.push(Lshade[y * f.w + x]);
        const o = (Math.min(img.h - 1, Math.max(0, f.y0 + y)) * img.w + Math.min(img.w - 1, Math.max(0, f.x0 + x))) * 3;
        for (let c = 0; c < 3; c++) rgbUnder[c].push(img.rgb[o + c]);
      }
    }
  }
  under.sort((a, b) => a - b);
  const Lref = Math.max(1e-4, under[Math.floor(under.length / 2)] ?? 0.05);
  const fabricRgb = rgbUnder.map((v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 0.05);

  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x;
      // Desplazamiento por las arrugas: paso alto de la luminancia, normalizado.
      const hgt = Math.max(-1.2, Math.min(1.2, (Ldisp[i] - Lmean[i]) / Lref));
      const X = f.x0 + x + t.disp * S * 0.7 * hgt;
      const Y = f.y0 + y + t.disp * S * hgt;
      const dx = X - p.cx;
      const dy = Y - p.cy;
      let qx = dx * cos - dy * sin;
      const qy = dx * sin + dy * cos;
      if (R > 0) qx = R * Math.asin(Math.max(-1, Math.min(1, qx / R)));
      const u = (qx + mw / 2) * (mark.w / mw);
      const v = (qy + mh / 2) * (mark.h / mh);
      A[i] = sampleMask(mark, u, v);
      if (F && fillMask) F[i] = sampleMask(fillMask, u, v);
      if (P && QX && QY) {
        // Parche con esquinas levemente redondeadas y canto suave de 0,6 px.
        const ex = pw / 2 - Math.abs(qx);
        const ey = ph / 2 - Math.abs(qy);
        const r = 1.5 * S;
        const inside = ex > r || ey > r ? Math.min(ex, ey) : r - Math.hypot(r - ex, r - ey);
        P[i] = Math.max(0, Math.min(1, inside / (0.6 * S) + 0.5));
        QX[i] = qx;
        QY[i] = qy;
      }
    }
  }

  const ink = p.tone ? fabricRgb.map((v) => Math.min(1, v * (p.tone ?? 1))) : linearRgb(p.ink);
  const fillInk = p.fill ? linearRgb(p.fill) : undefined;

  if (p.technique === 'screen' || p.technique === 'knit') {
    // Grano del punto, normalizado por su desviación típica bajo el gráfico (igual en tela clara u oscura).
    const Lfine = blur(L, f.w, f.h, 0.55 * S);
    let acc = 0;
    let n = 0;
    for (let i = 0; i < N; i += 3) {
      if (A[i] > 0.5) {
        const d = Lfine[i] - Lshade[i];
        acc += d * d;
        n++;
      }
    }
    const gstd = Math.max(1e-5, Math.sqrt(acc / Math.max(1, n)));
    // Tinta clara sobre tela oscura (o color sobre negro) frente a tinta oscura sobre tela clara.
    const lightInk = lumaOf(ink[0], ink[1], ink[2]) > Lref;
    // En luz lineal, un 1 % de tela clara asomando ya aclara mucho una tinta oscura: casi opaca.
    const opacity = lightInk ? t.opacity : Math.max(t.opacity, 0.992);
    const texInk = (lightInk ? 0.05 : 0.1) * t.knock;
    const texHole = (lightInk ? 0.06 : 0.008) * t.knock;
    // La tinta clara tapa el jaspeado del tejido: solo recibe la luz (pliegues); la oscura, más fina, deja ver algo más.
    const Lillum = lightInk ? Ldisp : Lshade;
    for (let y = 0; y < f.h; y++) {
      const gy = f.y0 + y;
      if (gy < 0 || gy >= img.h) continue;
      for (let x = 0; x < f.w; x++) {
        const gx = f.x0 + x;
        if (gx < 0 || gx >= img.w) continue;
        const i = y * f.w + x;
        const a = A[i];
        const fa = F ? F[i] * (1 - a) : 0;
        if (a <= 0.002 && fa <= 0.002) continue;
        // Luz de la prenda sobre la tinta (pliegues y caída de luz), algo comprimida.
        const s = Math.max(0.3, Math.min(1.5, (Lillum[i] / Lref) ** t.light));
        // El relieve del punto se marca en la tinta y, en los poros, deja ver algo de tela.
        const g = Math.max(-1, Math.min(1, (Lfine[i] - Lshade[i]) / (2.5 * gstd)));
        const tone = s * (1 + texInk * g) * (0.985 + 0.03 * hash(gx, gy, 7));
        const cover = opacity * (1 - texHole * Math.max(0, -g));
        const o = (gy * img.w + gx) * 3;
        for (let c = 0; c < 3; c++) {
          let v = img.rgb[o + c];
          if (fillInk && fa > 0) v += (fillInk[c] * tone - v) * fa * cover;
          v += (ink[c] * tone - v) * a * cover;
          img.rgb[o + c] = v;
        }
      }
    }
    return;
  }

  // Bordado, relieve 3D y etiqueta tejida: mapa de alturas a partir de la cobertura.
  const puff = p.technique === 'puff';
  const Hsrc = P ?? A;
  const H = blur(Hsrc, f.w, f.h, (puff ? 2.2 : woven ? 0.8 : 1.1) * S);
  const relief = (puff ? 8 : woven ? 2.5 : 3.6) * S;
  // Sombra proyectada de ≈1 px (más en relieve 3D) hacia abajo a la derecha.
  const sh = blur(Hsrc, f.w, f.h, (puff ? 2.2 : 1.1) * S);
  const offX = Math.round((puff ? 1.6 : 0.8) * S);
  const offY = Math.round((puff ? 2.4 : 1.2) * S);
  const light = [-0.42, -0.62, 0.66];
  const ll = Math.hypot(light[0], light[1], light[2]);
  const Lx = light[0] / ll;
  const Ly = light[1] / ll;
  const Lz = light[2] / ll;
  // Vector medio para el brillo del hilo (vista frontal).
  const hl = Math.hypot(Lx, Ly, Lz + 1);
  const Hx = Lx / hl;
  const Hy = Ly / hl;
  const Hz = (Lz + 1) / hl;
  // Puntada de satén: líneas finas en diagonal respecto al gráfico.
  const stitchAngle = ((p.rotate + 62) * Math.PI) / 180;
  const sa = Math.cos(stitchAngle);
  const sb = Math.sin(stitchAngle);
  const period = (woven ? 1.1 : 1.6) * S;
  const patch = p.patch ? linearRgb(p.patch) : ink;

  for (let y = 1; y < f.h - 1; y++) {
    const gy = f.y0 + y;
    if (gy < 0 || gy >= img.h) continue;
    for (let x = 1; x < f.w - 1; x++) {
      const gx = f.x0 + x;
      if (gx < 0 || gx >= img.w) continue;
      const i = y * f.w + x;
      const cover = Hsrc[i];
      const sx = x - offX;
      const syy = y - offY;
      const shadow = sx > 0 && syy > 0 ? sh[syy * f.w + sx] : 0;
      if (cover <= 0.002 && shadow <= 0.01) continue;
      const o = (gy * img.w + gx) * 3;
      const s = Math.max(0.35, Math.min(1.4, (Ldisp[i] / Lref) ** t.light));
      // Sombra de contacto sobre la tela, fuera del bordado.
      const shade = 1 - (puff ? 0.55 : 0.42) * shadow * (1 - cover);
      if (cover <= 0.002) {
        for (let c = 0; c < 3; c++) img.rgb[o + c] *= shade;
        continue;
      }
      // Normal del relieve + ondulación de la puntada.
      let gxh = (H[i + 1] - H[i - 1]) * 0.5 * relief;
      let gyh = (H[i + f.w] - H[i - f.w]) * 0.5 * relief;
      let thread: number;
      let threadColor: readonly number[];
      if (P && QX && QY) {
        // Etiqueta: trama de tafetán en el parche; la marca va tejida con hilo de otro color.
        const qx = QX[i];
        const qy = QY[i];
        const warp = Math.sin((2 * Math.PI * qx) / period);
        const weft = Math.sin((2 * Math.PI * qy) / period);
        thread = 0.92 + 0.08 * warp * weft;
        const m = A[i];
        threadColor = [0, 1, 2].map((c) => patch[c] * (1 - m) + ink[c] * m);
        // Pespunte perimetral: puntos más claros a 1,2 px del canto.
        const ex = pw / 2 - Math.abs(qx);
        const ey = ph / 2 - Math.abs(qy);
        const d = Math.min(ex, ey);
        if (d > 0.9 * S && d < 1.6 * S && Math.sin((2 * Math.PI * (Math.abs(qx) + Math.abs(qy))) / (2.2 * S)) > 0.2) thread *= 1.18;
      } else {
        const phase = (gx * sa + gy * sb) / period + 0.35 * hash(Math.floor((gx * -sb + gy * sa) / (2.4 * S)), 0, 3);
        const ripple = Math.sin(2 * Math.PI * phase);
        gxh += ripple * sa * 0.18;
        gyh += ripple * sb * 0.18;
        thread = 0.93 + 0.07 * ripple;
        threadColor = ink;
      }
      const nl = Math.hypot(gxh, gyh, 1);
      const nx = -gxh / nl;
      const ny = -gyh / nl;
      const nz = 1 / nl;
      const diffuse = Math.max(0, nx * Lx + ny * Ly + nz * Lz) / Lz;
      const spec = Math.max(0, nx * Hx + ny * Hy + nz * Hz) ** 28 * (woven ? 0.05 : 0.11);
      const fuzz = 0.96 + 0.08 * hash(gx, gy, 11);
      const alpha = Math.min(1, cover * fuzz);
      for (let c = 0; c < 3; c++) {
        const lit = threadColor[c] * (0.25 + 0.75 * diffuse) * thread * s + spec * s;
        const under = img.rgb[o + c] * shade;
        img.rgb[o + c] = under + (lit - under) * alpha;
      }
    }
  }
}

// ─── Variantes de color derivadas ───────────────────────────────────────────

/**
 * Tiñe una prenda oscura (base negra) a otro color conservando su luz: cada píxel de tela pasa a
 * `color × (luminancia / mediana)^gamma`. El fondo, la sombra de suelo y la trabilla roja quedan
 * intactos. Solo sirve como sustituto provisional mientras falte la base fotográfica de ese color.
 */
export function recolorDark(img: Img, hex: string): void {
  const S = SCALE;
  const target = linearRgb(hex);
  const N = img.w * img.h;
  const L = new Float32Array(N);
  for (let i = 0; i < N; i++) L[i] = lumaOf(img.rgb[3 * i], img.rgb[3 * i + 1], img.rgb[3 * i + 2]);
  const Ls = blur(L, img.w, img.h, 0.8 * S);
  // Fondo de referencia: luminancia de las esquinas superiores.
  const bg = (L[img.w * 8 + 8] + L[img.w * 8 + img.w - 9]) / 2;
  const garment: number[] = [];
  for (let i = 0; i < N; i += 7) if (L[i] < bg * 0.25) garment.push(Ls[i]);
  garment.sort((a, b) => a - b);
  const med = Math.max(1e-4, garment[Math.floor(garment.length / 2)] ?? 0.02);
  // Cuanto más claro el destino, menos contraste hereda (el brillo del negro no escala igual).
  const tl = lumaOf(target[0], target[1], target[2]);
  const gamma = tl > 0.4 ? 0.55 : tl > 0.1 ? 0.62 : 0.8;
  // Núcleo de la prenda y franja de borde (2–3 px) donde el píxel mezcla tela y fondo.
  const core = new Float32Array(N);
  for (let i = 0; i < N; i++) core[i] = L[i] < bg * 0.3 ? 1 : 0;
  const near = blur(core, img.w, img.h, 1.2 * S);
  // Fondo local alrededor del borde (incluye la sombra de suelo): media de los píxeles que no son prenda.
  const away = new Float32Array(N);
  for (let i = 0; i < N; i++) away[i] = near[i] > 0.02 ? 0 : 1;
  const wsum = blur(away, img.w, img.h, 5 * S);
  const local = [0, 1, 2].map((c) => {
    const ch = new Float32Array(N);
    for (let i = 0; i < N; i++) ch[i] = img.rgb[3 * i + c] * away[i];
    return blur(ch, img.w, img.h, 5 * S);
  });
  for (let i = 0; i < N; i++) {
    const o = 3 * i;
    const r = img.rgb[o];
    const g = img.rgb[o + 1];
    const b = img.rgb[o + 2];
    if (r > 0.03 && r > 2.2 * g && r > 2.2 * b) continue; // trabilla roja
    if (core[i] === 0 && near[i] <= 0.02) continue; // fondo
    const s = Math.max(0.42, Math.min(core[i] === 1 ? 1.3 : 1, (Math.min(Ls[i], med * 2) / med) ** gamma));
    if (core[i] === 1) {
      for (let c = 0; c < 3; c++) img.rgb[o + c] = target[c] * s;
      continue;
    }
    // Borde: se separa la parte de tela de la de fondo y solo se tiñe la de tela (sin halo oscuro).
    const ws = Math.max(1e-4, wsum[i]);
    const back = [local[0][i] / ws, local[1][i] / ws, local[2][i] / ws];
    const Lb = lumaOf(back[0], back[1], back[2]);
    const alpha = Math.max(0, Math.min(1, (Lb - L[i]) / Math.max(1e-4, Lb - med)));
    for (let c = 0; c < 3; c++) img.rgb[o + c] = back[c] * (1 - alpha) + target[c] * s * alpha;
  }
}

// ─── Espalda de sudadera reconstruida ───────────────────────────────────────

type Poly = [number, number][];

/** Máscara 0–1 de un polígono (coordenadas de la base), con el borde difuminado `feather` px. */
function polygonMask(img: Img, poly: Poly, feather: number): Float32Array {
  const S = SCALE;
  const m = new Float32Array(img.w * img.h);
  const pts = poly.map(([x, y]) => [x * S, y * S]);
  for (let y = 0; y < img.h; y++) {
    // Cruces del polígono con la fila (regla par-impar).
    const xs: number[] = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k])); x < Math.min(img.w, xs[k + 1]); x++) m[y * img.w + x] = 1;
    }
  }
  return blur(m, img.w, img.h, feather * S);
}

/** Relleno de membrana (Laplace) en baja resolución: interpola la luz desde el contorno de la zona. */
function membraneFill(img: Img, mask: Float32Array, cell: number): Float32Array {
  const gw = Math.ceil(img.w / cell);
  const gh = Math.ceil(img.h / cell);
  const out = new Float32Array(img.w * img.h * 3);
  for (let c = 0; c < 3; c++) {
    const g = new Float32Array(gw * gh);
    const fixed = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        let acc = 0;
        let n = 0;
        let inside = 0;
        for (let y = gy * cell; y < Math.min(img.h, (gy + 1) * cell); y++) {
          for (let x = gx * cell; x < Math.min(img.w, (gx + 1) * cell); x++) {
            const i = y * img.w + x;
            inside = Math.max(inside, mask[i]);
            // La trabilla roja no cuenta como tela (si no, el rojo se extendería por el relleno).
            const r = img.rgb[i * 3];
            if (r > 0.02 && r > 2 * img.rgb[i * 3 + 1]) continue;
            acc += img.rgb[i * 3 + c];
            n++;
          }
        }
        g[gy * gw + gx] = n ? acc / n : 0;
        fixed[gy * gw + gx] = inside < 0.02 && n > 0 ? 1 : 0;
      }
    }
    for (let it = 0; it < 900; it++) {
      for (let gy = 1; gy < gh - 1; gy++) {
        for (let gx = 1; gx < gw - 1; gx++) {
          const i = gy * gw + gx;
          if (!fixed[i]) g[i] = (g[i - 1] + g[i + 1] + g[i - gw] + g[i + gw]) / 4;
        }
      }
    }
    for (let y = 0; y < img.h; y++) {
      const fy = Math.min(gh - 1.001, Math.max(0, y / cell - 0.5));
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      for (let x = 0; x < img.w; x++) {
        const fx = Math.min(gw - 1.001, Math.max(0, x / cell - 0.5));
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const a = g[y0 * gw + x0] * (1 - tx) + g[y0 * gw + x0 + 1] * tx;
        const b = g[(y0 + 1) * gw + x0] * (1 - tx) + g[(y0 + 1) * gw + x0 + 1] * tx;
        out[(y * img.w + x) * 3 + c] = a * (1 - ty) + b * ty;
      }
    }
  }
  return out;
}

/**
 * Reconstruye la espalda de una sudadera a partir de su frente (hoodie-negro-front) mientras no
 * exista la foto de espalda: quita el bolsillo canguro, cierra la capucha como una cúpula de dos
 * paneles con costura central y refleja la imagen (la trabilla queda en el mismo costado físico).
 * La textura de la tela se toma del propio pecho de la foto, así que el grano es el real.
 */
export function synthHoodieBack(img: Img): void {
  const S = SCALE;
  const N = img.w * img.h;
  const L = new Float32Array(N);
  for (let i = 0; i < N; i++) L[i] = lumaOf(img.rgb[3 * i], img.rgb[3 * i + 1], img.rgb[3 * i + 2]);
  const bg = L[img.w * 8 + 8];
  const garment = (i: number) => Math.max(0, Math.min(1, (bg * 0.8 - L[i]) / (bg * 0.8 - 0.12)));
  // Textura real del punto (paso alto) tomada del pecho, que en el frente está limpio.
  const Llo = blur(L, img.w, img.h, 9 * S);
  const texAt = (x: number, y: number) => {
    const sx = Math.min(img.w - 1, Math.max(0, x));
    const sy = Math.min(img.h - 1, Math.max(0, y));
    const i = sy * img.w + sx;
    return L[i] / Math.max(1e-4, Llo[i]);
  };
  const chestTex = (x: number, y: number, top: number, bottom: number) => {
    // Repite la banda limpia del pecho (top–bottom) en vertical, en espejo para que no se note la costura.
    const span = (bottom - top) * S;
    const k = Math.abs(((y - top * S) % (2 * span)) + 2 * span) % (2 * span);
    return texAt(x, Math.round(top * S + (k < span ? k : 2 * span - k)));
  };

  // 1. Bolsillo canguro fuera: luz interpolada desde el contorno + textura del pecho.
  const pocket = polygonMask(img, [[296, 704], [664, 704], [720, 900], [713, 940], [712, 1014], [242, 1014], [234, 904]], 4);
  const fill = membraneFill(img, pocket, 6 * S);
  for (let i = 0; i < N; i++) {
    const m = pocket[i];
    if (m <= 0.001) continue;
    const x = i % img.w;
    const y = (i - x) / img.w;
    const t = chestTex(x, y, 400, 680);
    for (let c = 0; c < 3; c++) {
      const o = 3 * i + c;
      img.rgb[o] += (fill[o] * t - img.rgb[o]) * m;
    }
  }

  // 2. Capucha vista desde atrás: cúpula de dos paneles con costura central.
  const hood = polygonMask(img, [[276, 110], [684, 110], [690, 318], [600, 372], [480, 398], [360, 372], [270, 318]], 2.5);
  // Color de la tela: mediana del cuerpo.
  const body: number[][] = [[], [], []];
  for (let y = 420 * S; y < 680 * S; y += 9) {
    for (let x = 300 * S; x < 660 * S; x += 9) {
      const i = y * img.w + x;
      for (let c = 0; c < 3; c++) body[c].push(img.rgb[3 * i + c]);
    }
  }
  const fabric = body.map((v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)]);
  const light = [-0.45, -0.7, 0.55];
  const ll = Math.hypot(light[0], light[1], light[2]);
  const lobes = [
    { cx: 392, cy: 268, rx: 128, ry: 168 },
    { cx: 568, cy: 268, rx: 128, ry: 168 },
  ];
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      const m = hood[i];
      if (m <= 0.001) continue;
      const g = garment(i);
      if (g <= 0.001) continue;
      const bx = x / S;
      const by = y / S;
      // Normal del panel más cercano (elipsoide), con la costura como valle en x = 480.
      const lobe = bx < 480 ? lobes[0] : lobes[1];
      const u = Math.max(-0.98, Math.min(0.98, (bx - lobe.cx) / lobe.rx));
      const v = Math.max(-0.98, Math.min(0.98, (by - lobe.cy) / lobe.ry));
      const z = Math.sqrt(Math.max(0.04, 1 - u * u - v * v));
      const nl = Math.hypot(u * 0.55, v * 0.45, z);
      const diffuse = Math.max(0, (u * 0.55 * light[0] + v * 0.45 * light[1] + z * light[2]) / (nl * ll));
      let shade = 0.38 + 0.92 * diffuse;
      // Costura central: valle oscuro de 2 px con un brillo fino al lado.
      const d = Math.abs(bx - 480 - 1.5 * Math.sin(by / 37));
      shade *= 1 - 0.32 * Math.exp(-(d * d) / 2.2) + 0.1 * Math.exp(-((d - 2.6) ** 2) / 1.5);
      // La capucha se apoya en la espalda: el borde inferior se oscurece.
      const lowEdge = Math.max(0, Math.min(1, (by - 300) / 98));
      shade *= 1 - 0.18 * lowEdge * lowEdge;
      const t = chestTex(x, y, 400, 680);
      for (let c = 0; c < 3; c++) {
        const o = 3 * i + c;
        img.rgb[o] += (fabric[c] * shade * t - img.rgb[o]) * m * g;
      }
    }
  }
  // Sombra de la capucha sobre la espalda, justo bajo su borde.
  const hoodShadow = blur(hood, img.w, img.h, 7 * S);
  for (let i = 0; i < N; i++) {
    const s = hoodShadow[i] * (1 - hood[i]);
    if (s <= 0.002) continue;
    const k = 1 - 0.5 * s * garment(i);
    for (let c = 0; c < 3; c++) img.rgb[3 * i + c] *= k;
  }

  // 3. Espejo: la espalda se ve con izquierda y derecha intercambiadas.
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w / 2; x++) {
      const a = (y * img.w + x) * 3;
      const b = (y * img.w + (img.w - 1 - x)) * 3;
      for (let c = 0; c < 3; c++) {
        const t = img.rgb[a + c];
        img.rgb[a + c] = img.rgb[b + c];
        img.rgb[b + c] = t;
      }
    }
  }
}

// ─── Encuadre 4:5 y vista de detalle ────────────────────────────────────────

/** Caja de la prenda (px de trabajo): filas y columnas con bastantes píxeles distintos del fondo. */
export function garmentBox(img: Img): [number, number, number, number] {
  const step = SCALE;
  const ref = [img.rgb[(8 * img.w + 8) * 3], img.rgb[(8 * img.w + 8) * 3 + 1], img.rgb[(8 * img.w + 8) * 3 + 2]];
  const differs = (x: number, y: number) => {
    const i = (y * img.w + x) * 3;
    return Math.abs(img.rgb[i] - ref[0]) + Math.abs(img.rgb[i + 1] - ref[1]) + Math.abs(img.rgb[i + 2] - ref[2]) > 0.07;
  };
  let x0 = img.w;
  let y0 = img.h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < img.h; y += step) {
    let count = 0;
    let first = -1;
    let last = -1;
    for (let x = 0; x < img.w; x += step) {
      if (differs(x, y)) {
        count++;
        if (first < 0) first = x;
        last = x;
      }
    }
    if (count > 6) {
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      x0 = Math.min(x0, first);
      x1 = Math.max(x1, last);
    }
  }
  return x1 > x0 ? [x0, y0, x1, y1] : [0, 0, img.w, img.h];
}

/**
 * Encuadre de catálogo 4:5 con aire de estudio: la prenda se reduce si hace falta para ocupar como
 * mucho el 84 % del ancho y el 86 % del alto, y el fondo se prolonga con su mismo color, degradado
 * y grano (ajustados sobre los bordes de la foto), fundido con la foto en 40 px.
 */
export async function frameShot(img: Img): Promise<Img> {
  const S = SCALE;
  const W = OUT_W * S;
  const H = OUT_H * S;
  const [bx0, by0, bx1, by1] = garmentBox(img);
  const k = Math.min(1, (0.84 * W) / (bx1 - bx0), (0.86 * H) / (by1 - by0));
  const sw = Math.round(img.w * k);
  const sh = Math.round(img.h * k);
  const scaled = k < 1 ? await readImg(await toSharp(img).png().toBuffer(), { scale: k }) : img;
  // Posición: el centro de la prenda en el centro del lienzo (un pelo por encima: la sombra cae abajo).
  const ox = Math.round(W / 2 - ((bx0 + bx1) / 2) * k);
  const oy = Math.round(H * 0.49 - ((by0 + by1) / 2) * k);

  // Modelo del fondo: color lineal en función de y (columnas laterales) + grano medido arriba.
  const fit = [0, 1, 2].map((c) => {
    let n = 0;
    let sy = 0;
    let sv = 0;
    let syy = 0;
    let syv = 0;
    for (let y = 0; y < img.h; y += 4) {
      for (const x of [6, 14, img.w - 15, img.w - 7]) {
        const v = img.rgb[(y * img.w + x) * 3 + c];
        n++;
        sy += y;
        sv += v;
        syy += y * y;
        syv += y * v;
      }
    }
    const b = (n * syv - sy * sv) / Math.max(1e-9, n * syy - sy * sy);
    return { a: (sv - b * sy) / n, b };
  });
  let gacc = 0;
  let gn = 0;
  for (let y = 10; y < 60 * S; y += 3) {
    for (let x = 10; x < img.w - 10; x += 7) {
      const i = (y * img.w + x) * 3;
      const j = (y * img.w + x + 3) * 3;
      gacc += (img.rgb[i + 1] - img.rgb[j + 1]) ** 2;
      gn++;
    }
  }
  const grain = Math.sqrt(gacc / Math.max(1, gn) / 2);

  const out: Img = { w: W, h: H, rgb: new Float32Array(W * H * 3) };
  const feather = 40 * S;
  for (let y = 0; y < H; y++) {
    const sy = y - oy;
    // y equivalente en la foto original para el degradado del fondo.
    const yy = Math.max(0, Math.min(img.h - 1, sy / k));
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      const n = (hash(x, y, 5) + hash(x, y, 9) - 1) * grain * 2.4;
      const sx = x - ox;
      const inside = sx >= 0 && sy >= 0 && sx < sw && sy < sh;
      const m = inside ? Math.min(1, Math.min(sx, sy, sw - 1 - sx, sh - 1 - sy) / feather) : 0;
      for (let c = 0; c < 3; c++) {
        const bgv = fit[c].a + fit[c].b * yy + n;
        out.rgb[o + c] = m > 0 ? scaled.rgb[(sy * scaled.w + sx) * 3 + c] * m + bgv * (1 - m) : bgv;
      }
    }
  }
  return out;
}

/** Caja de detalle (px de trabajo, 4:5) centrada en (cx, cy) con ancho w, dentro de la foto. */
export function detailBox(img: Img, cx: number, cy: number, w: number): [number, number, number, number] {
  const minW = 0.45 * OUT_W * SCALE;
  const bw = Math.min(img.w, Math.max(minW, w));
  const bh = Math.min(img.h, bw * 1.25);
  const x = Math.max(0, Math.min(img.w - bw, cx - bw / 2));
  const y = Math.max(0, Math.min(img.h - bh, cy - bh / 2));
  return [Math.round(x), Math.round(y), Math.round(bh / 1.25), Math.round(bh)];
}

/** Codifica una vista (960 y 480 px de ancho) desde una imagen sRGB ya recortada a 4:5. */
export async function encodeViews(image: Sharp, sharpen: boolean): Promise<{ 960: Buffer; 480: Buffer }> {
  const png = await image.png().toBuffer();
  const big = sharp(png).resize({ width: OUT_W, height: OUT_H, kernel: 'lanczos3' });
  const b960 = await (sharpen ? big.sharpen({ sigma: 0.6, m1: 0.6, m2: 1.2 }) : big).webp({ quality: 84, effort: 6, smartSubsample: true }).toBuffer();
  const b480 = await sharp(png).resize({ width: 480, height: 600, kernel: 'lanczos3' }).sharpen({ sigma: 0.5 }).webp({ quality: 82, effort: 6, smartSubsample: true }).toBuffer();
  return { 960: b960, 480: b480 };
}
