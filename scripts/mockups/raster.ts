/**
 * Rasterizado de las marcas oficiales con Chromium (el mismo motor que pinta la web), para que
 * los bordes y las curvas de los trazados sean idénticos a los de la marca en el navegador.
 * Devuelve máscaras de cobertura (0–1) en el espacio propio de la marca: sin girar, sin deformar
 * y con su proporción original. El giro, la curvatura y el desplazamiento por la tela se aplican
 * después, al muestrear la máscara (photo.ts).
 */
import type { Browser, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mascotVector } from '../../src/assets/brand/mascot';
import { monogramVector } from '../../src/assets/brand/monogram';
import { starVector } from '../../src/assets/brand/star';
import { wordmarkVector } from '../../src/assets/brand/wordmark';

export type Mark = 'monogram' | 'star' | 'wordmark' | 'mascot';
/** Capa de una marca: el trazado principal o, en la mascota, su silueta interior. */
export type MarkLayer = 'd' | 'fill';

export const VECTORS = { monogram: monogramVector, star: starVector, wordmark: wordmarkVector, mascot: mascotVector };

/** Alto / ancho de la marca oficial. */
export const markAspect = (mark: Mark) => VECTORS[mark].height / VECTORS[mark].width;

/** Trazado de una capa de la marca (la silueta interior solo existe en la mascota). */
export function layerPath(mark: Mark, layer: MarkLayer): string {
  if (layer === 'fill') {
    if (mark !== 'mascot') throw new Error(`La marca ${mark} no tiene capa de relleno`);
    return mascotVector.fill;
  }
  return VECTORS[mark].d;
}

export interface Mask {
  w: number;
  h: number;
  /** Cobertura 0–1, fila a fila. */
  a: Float32Array;
}

let browser: Browser | undefined;
let page: Page | undefined;

/** Página de Chromium compartida (se reutiliza para todas las marcas y escenas). */
export async function chromiumPage(): Promise<Page> {
  if (page) return page;
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
  page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
  return page;
}

export async function closeChromium() {
  await browser?.close();
  browser = undefined;
  page = undefined;
}

/** Renderiza un SVG a PNG (con transparencia) del tamaño indicado. */
export async function svgToPng(svg: string, width: number, height: number, transparent = true): Promise<Buffer> {
  const p = await chromiumPage();
  await p.setViewportSize({ width, height });
  const bg = transparent ? 'transparent' : '#000';
  await p.setContent(`<!doctype html><html><body style="margin:0;background:${bg}">${svg}</body></html>`);
  return p.screenshot({ type: 'png', omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
}

const cache = new Map<string, Mask>();

/** Máscara de una capa de la marca a `w` píxeles de ancho (el alto respeta la proporción). */
export async function markMask(mark: Mark, layer: MarkLayer, w: number): Promise<Mask> {
  const v = VECTORS[mark];
  const width = Math.max(8, Math.round(w));
  const height = Math.max(8, Math.round((width * v.height) / v.width));
  const key = `${mark}:${layer}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${v.viewBox}" preserveAspectRatio="none" style="display:block"><g transform="${v.transform}"><path d="${layerPath(mark, layer)}" fill="#fff"/></g></svg>`;
  const png = await svgToPng(svg, width, height, false);
  const { data, info } = await sharp(png).removeAlpha().extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const a = new Float32Array(info.width * info.height);
  for (let i = 0; i < a.length; i++) a[i] = data[i] / 255;
  const mask = { w: info.width, h: info.height, a };
  cache.set(key, mask);
  return mask;
}
