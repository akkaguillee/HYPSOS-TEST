/**
 * Revelado «analógico» de las fotos de campaña con modelos generadas con IA.
 *
 * Lo que delata a una imagen generada es lo que una cámara real no hace: negros perfectos, piel
 * de plástico, nitidez y microcontraste uniformes (aspecto HDR) y ausencia de defectos ópticos.
 * Este script aplica, sobre el original guardado en `originals/`, lo que sí haría una foto real
 * de editorial en película o en digital con grano:
 *
 * 1. Menos nitidez artificial (desenfoque muy leve) y menos contraste local (aspecto HDR).
 * 2. Curva de película: negros levantados (mate), hombro suave en las luces.
 * 3. Color: saturación algo menor, sombras frías y luces cálidas muy sutiles.
 * 4. Halación: las luces fuertes desprenden un halo rojizo, como en la película de cine.
 * 5. Óptica: viñeteado, esquinas algo más blandas y aberración cromática lateral leve.
 * 6. Grano: ruido luminoso con tamaño de grano, más presente en los medios tonos.
 *
 *   pnpm campaign:film                 # todas
 *   pnpm campaign:film --only portrait-cap,crew-sunset
 *
 * Escribe `public/assets/campaign/<nombre>-<ancho>.avif|webp` con los anchos de siempre.
 */
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const ORIGINALS = resolve('scripts/campaign/originals');
const OUT = resolve('public/assets/campaign');

/** Ajustes por foto: luz de la escena (nocturna con luces → más halación) e intensidad de grano. */
interface Look {
  halation: number;
  grain: number;
  /** Cuánto se rebaja el contraste local (0 = nada, 0.3 = mucho). */
  flatten: number;
  /** Desaturación (0–1). */
  desat: number;
}

const LOOKS: Record<string, Partial<Look>> = {
  'underpass-crew': { halation: 0.55, grain: 1.15 },
  'crew-sunset': { halation: 0.6, flatten: 0.16 },
  'summit-rooftop': { halation: 0.7 },
  'spray-wall': { halation: 0.45 },
  'chapter01-stairs': { flatten: 0.15 },
  'portrait-cap': { grain: 1.15, flatten: 0.14, desat: 0.16 },
  'look-tee-cargo': { grain: 0.9 },
  'look-hoodie-sweatpant': { grain: 0.9 },
};

/** Bodegones de producto: se publican tal cual (el revelado es para las fotos con modelos). */
const SKIP = new Set(['detail-collar-tab', 'accessories-flatlay']);
const DEFAULT_LOOK: Look = { halation: 0.25, grain: 1, flatten: 0.11, desat: 0.12 };

/** PRNG determinista (mismo grano en cada revelado). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Desenfoque gaussiano de un canal float [0,1] usando sharp (16 bits para no perder precisión). */
async function blurChannel(data: Float32Array, w: number, h: number, sigma: number): Promise<Float32Array> {
  const u16 = new Uint16Array(w * h);
  for (let i = 0; i < u16.length; i++) u16[i] = Math.max(0, Math.min(65535, Math.round(data[i] * 65535)));
  const out = await sharp(Buffer.from(u16.buffer), { raw: { width: w, height: h, channels: 1, premultiplied: false } })
    .toColourspace('grey16')
    .blur(sigma)
    .raw({ depth: 'ushort' })
    .toBuffer();
  const view = new Uint16Array(out.buffer, out.byteOffset, w * h);
  const res = new Float32Array(w * h);
  for (let i = 0; i < res.length; i++) res[i] = view[i] / 65535;
  return res;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Curva de película en sRGB: negros levantados, pie suave y hombro largo. */
function filmCurve(x: number): number {
  const lifted = 0.016 + 0.97 * x;
  const toe = lifted < 0.14 ? lifted + (0.14 - lifted) * 0.06 : lifted;
  return toe > 0.78 ? 0.78 + (toe - 0.78) * 0.72 : toe;
}

/** Muestreo bilineal de un canal. */
function sample(ch: Float32Array, w: number, h: number, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = ch[y0 * w + x0] * (1 - fx) + ch[y0 * w + x1] * fx;
  const b = ch[y1 * w + x0] * (1 - fx) + ch[y1 * w + x1] * fx;
  return a * (1 - fy) + b * fy;
}

export async function develop(name: string): Promise<Buffer> {
  const look = { ...DEFAULT_LOOK, ...LOOKS[name] };
  // 1. Original con un desenfoque mínimo: quita la nitidez «perfecta» de la IA.
  const { data, info } = await sharp(join(ORIGINALS, `${name}.webp`)).removeAlpha().blur(0.5).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const n = w * h;
  const R = new Float32Array(n);
  const G = new Float32Array(n);
  const B = new Float32Array(n);
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    R[i] = data[i * 3] / 255;
    G[i] = data[i * 3 + 1] / 255;
    B[i] = data[i * 3 + 2] / 255;
    L[i] = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i];
  }

  // 2. Menos contraste local (aspecto HDR): la luminancia se acerca a su versión muy desenfocada.
  const Lbig = await blurChannel(L, w, h, Math.max(w, h) / 45);
  // Halación: luces por encima de 0,78 desenfocadas en grande.
  const hot = new Float32Array(n);
  for (let i = 0; i < n; i++) hot[i] = Math.max(0, (L[i] - 0.74) / 0.26) ** 1.5;
  const halo = await blurChannel(hot, w, h, Math.max(w, h) / 110);
  const haloWide = await blurChannel(hot, w, h, Math.max(w, h) / 40);
  // Esquinas más blandas: versión desenfocada para mezclar según la distancia al centro.
  const soft = await sharp(data, { raw: { width: w, height: h, channels: 3 } }).blur(1.6).raw().toBuffer();
  // Grano: ruido gaussiano con tamaño de grano (desenfoque leve) y algo de color independiente.
  const rand = rng(name.length * 7919 + n);
  const gauss = () => {
    const u = rand() || 1e-9;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const noiseL = new Float32Array(n);
  const noiseC = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    noiseL[i] = 0.5 + gauss() * 0.16;
    noiseC[i] = 0.5 + gauss() * 0.16;
  }
  const grainL = await blurChannel(noiseL, w, h, 0.65);
  const grainC = await blurChannel(noiseC, w, h, 0.9);

  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);
  const out = Buffer.alloc(n * 3);
  const ca = 0.0011; // aberración cromática lateral (fracción del radio)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy) / maxR;
      // Aberración: rojo un pelo hacia fuera, azul hacia dentro (solo se nota en los bordes).
      let r0 = sample(R, w, h, cx + dx * (1 + ca), cy + dy * (1 + ca));
      let g0 = G[i];
      let b0 = sample(B, w, h, cx + dx * (1 - ca), cy + dy * (1 - ca));
      // Esquinas algo más blandas.
      const edge = Math.max(0, r - 0.55) / 0.45;
      const k = edge * edge * 0.55;
      r0 = r0 * (1 - k) + (soft[i * 3] / 255) * k;
      g0 = g0 * (1 - k) + (soft[i * 3 + 1] / 255) * k;
      b0 = b0 * (1 - k) + (soft[i * 3 + 2] / 255) * k;

      // Contraste local más bajo.
      const l = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0 + 1e-5;
      const lt = Lbig[i] + (l - Lbig[i]) * (1 - look.flatten);
      const ratio = lt / l;
      let rr = r0 * ratio;
      let gg = g0 * ratio;
      let bb = b0 * ratio;

      // Saturación algo menor.
      const lum = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
      rr = lum + (rr - lum) * (1 - look.desat);
      gg = lum + (gg - lum) * (1 - look.desat);
      bb = lum + (bb - lum) * (1 - look.desat);

      // Curva de película.
      rr = filmCurve(clamp01(rr));
      gg = filmCurve(clamp01(gg));
      bb = filmCurve(clamp01(bb));

      // Virado: sombras ligeramente frías, luces ligeramente cálidas.
      const sh = (1 - lum) * (1 - lum);
      const hi = lum * lum;
      rr += -0.006 * sh + 0.018 * hi;
      gg += 0.004 * sh + 0.006 * hi;
      bb += 0.014 * sh - 0.012 * hi;

      // Halación (en lineal, suma de luz rojiza alrededor de las luces).
      const hv = (halo[i] * 0.7 + haloWide[i] * 0.3) * look.halation;
      let lr = toLinear(clamp01(rr)) + hv * 0.42;
      let lg = toLinear(clamp01(gg)) + hv * 0.1;
      let lb = toLinear(clamp01(bb)) + hv * 0.03;

      // Viñeteado.
      const v = 1 - 0.22 * Math.pow(r, 2.4);
      lr *= v;
      lg *= v;
      lb *= v;

      rr = toSrgb(clamp01(lr));
      gg = toSrgb(clamp01(lg));
      bb = toSrgb(clamp01(lb));

      // Grano, más visible en los medios tonos.
      const m = 4 * lum * (1 - lum) * 0.75 + 0.25;
      const gl = (grainL[i] - 0.5) * 0.115 * look.grain * m;
      const gc = (grainC[i] - 0.5) * 0.028 * look.grain * m;
      out[i * 3] = Math.round(clamp01(rr + gl + gc) * 255);
      out[i * 3 + 1] = Math.round(clamp01(gg + gl) * 255);
      out[i * 3 + 2] = Math.round(clamp01(bb + gl - gc) * 255);
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

/** Anchos que se publican (los mismos que define shared/campaign.ts: 640, 960 y el original). */
function widthsFor(width: number): number[] {
  return [640, 960, width].filter((v, i, all) => v <= width && all.indexOf(v) === i);
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : undefined;
const preview = process.argv.includes('--preview') ? process.argv[process.argv.indexOf('--preview') + 1] : undefined;

if (import.meta.url === `file://${process.argv[1]}`) {
  const names = readdirSync(ORIGINALS)
    .filter((file) => file.endsWith('.webp'))
    .map((file) => file.replace(/\.webp$/, ''))
    .filter((name) => !SKIP.has(name) && (!only || only.includes(name)));
  for (const name of names) {
    const png = await develop(name);
    if (preview) await sharp(png).toFile(join(preview, `${name}.png`));
    const { width } = await sharp(png).metadata();
    for (const w of widthsFor(width!)) {
      const img = sharp(png).resize({ width: w });
      await img.clone().avif({ quality: 56, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`));
      await img.clone().webp({ quality: 84, effort: 6 }).toFile(join(OUT, `${name}-${w}.webp`));
    }
    console.log(`✓ ${name}`);
  }
}
