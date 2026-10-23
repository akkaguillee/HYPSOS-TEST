/**
 * Genera las imágenes de producto (WebP 480 y 960 px de ancho, 4:5) en public/assets/products/mockups.
 *
 *   pnpm mockups                      # todos los productos
 *   pnpm mockups --only p-tee-ascenso # uno o varios ids separados por comas
 *   pnpm mockups --preview <dir>      # además, hoja de contactos PNG en <dir>
 *
 * Tres caminos, por producto:
 * - Prendas y accesorios con base fotográfica (scripts/mockups/bases): foto de prenda lisa generada
 *   con IA + marcas oficiales compuestas como serigrafía, bordado o etiqueta (photo.ts, placements.ts).
 * - Productos con forma de marca (llavero, figura, monograma, stickers): foto virtual con filtros
 *   SVG de Chromium (objects.ts).
 * - Productos sin base fotográfica todavía: dibujo técnico plano (catalog.ts), para que la tienda
 *   nunca muestre un hueco. Se avisa en consola de qué bases faltan.
 *
 * Usa el Chromium de Playwright (PLAYWRIGHT_CHROMIUM_PATH si está definido) y sharp para codificar.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { catalogProducts } from '../../shared/catalog';
import type { MediaView, Product } from '../../shared/types';
import { mockupSVG } from './catalog';
import { FABRIC, luminance } from './kit';
import { OBJECT_SILHOUETTES, objectShot } from './objects';
import {
  applyPrint,
  cropImg,
  detailBox,
  encodeViews,
  frameShot,
  OUT_H,
  OUT_W,
  readImg,
  recolorDark,
  SCALE,
  synthHoodieBack,
  toSharp,
  type Img,
  type PlacedPrint,
} from './photo';
import { BASES_DIR, PLANS, resolveBase, zoneFor, type BaseSource, type Plan, type PrintSpec, type Side } from './placements';
import { closeChromium, markAspect, svgToPng } from './raster';

const args = process.argv.slice(2);
const option = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const only = option('only')?.split(',');
const preview = option('preview');
const OUT = resolve('public/assets/products/mockups');
const VIEWS: MediaView[] = ['front', 'back', 'detail'];

/** Tinta clara y oscura de serigrafía, e hilo claro y oscuro de bordado, tal como salen en foto. */
const INK = { screenLight: '#dedcd6', screenDark: '#1c1c1c', threadLight: '#dcd9d2', threadDark: '#202020' };

const sheet: { label: string; png: Buffer }[] = [];
let written = 0;
const notes: string[] = [];

async function write(product: Product, colorId: string, view: MediaView, image: Sharp, sharpen = false) {
  const dir = join(OUT, product.handle);
  mkdirSync(dir, { recursive: true });
  const out = await encodeViews(image, sharpen);
  writeFileSync(join(dir, `${colorId}-${view}-960.webp`), out[960]);
  writeFileSync(join(dir, `${colorId}-${view}-480.webp`), out[480]);
  written += 1;
  if (preview) sheet.push({ label: `${product.id} ${colorId} ${view}`, png: await sharp(out[960]).resize({ width: 320 }).png().toBuffer() });
  process.stdout.write('.');
}

// ─── Prendas fotografiadas ──────────────────────────────────────────────────

async function loadBase(src: BaseSource): Promise<Img> {
  const img = await readImg(join(BASES_DIR, `${src.name}.webp`), { scale: SCALE, mirror: src.mirror });
  if (src.synth === 'hoodie-back') synthHoodieBack(img);
  if (src.recolor) recolorDark(img, src.recolor);
  return img;
}

function inkFor(spec: PrintSpec, colorId: string): { ink: string; tone?: number } {
  const dark = luminance(FABRIC[colorId] ?? '#777777') < 0.3;
  const thread = spec.technique === 'embroidery' || spec.technique === 'puff';
  if (spec.ink === 'tone') return { ink: '#000000', tone: dark ? 1.9 : 0.8 };
  if (spec.ink) return { ink: spec.ink };
  if (thread) return { ink: dark ? INK.threadLight : INK.threadDark };
  return { ink: dark ? INK.screenLight : INK.screenDark };
}

/** Coloca los gráficos de una cara sobre su base (px de trabajo). */
function placePrints(specs: PrintSpec[], src: BaseSource, colorId: string): PlacedPrint[] {
  const geometryName = src.synth ? `hoodie-synth-${src.side}` : src.name;
  return specs.map((spec) => {
    const zone = zoneFor(geometryName, src.kind, src.side, spec.zone);
    if (!zone) throw new Error(`Falta la zona «${spec.zone}» para la base ${src.name} (${src.side})`);
    const w = spec.size * zone.ref;
    const h = w * markAspect(spec.mark);
    const cy = zone.top ? zone.y + h / 2 : zone.y;
    const { ink, tone } = inkFor(spec, colorId);
    const mirrorX = src.mirror ? (x: number) => 960 - x : (x: number) => x;
    return {
      mark: spec.mark,
      cx: mirrorX(zone.x) * SCALE,
      cy: cy * SCALE,
      w: w * SCALE,
      rotate: (spec.rotate ?? 0) + (zone.rotate ?? 0),
      curve: zone.curve ? zone.curve * zone.ref * SCALE : undefined,
      technique: spec.technique,
      ink,
      tone,
      patch: spec.patch,
    };
  });
}

interface Shot {
  img: Img;
  prints: PlacedPrint[];
  src: BaseSource;
}

async function photoProduct(product: Product, plan: Plan, colorId: string, sources: Record<Side, BaseSource>) {
  const shots = {} as Record<Side, Shot>;
  for (const side of ['front', 'back'] as const) {
    const src = sources[side];
    const img = await loadBase(src);
    const prints = src.blank ? [] : placePrints(plan[side] ?? [], src, colorId);
    for (const p of prints) await applyPrint(img, p);
    shots[side] = { img, prints, src };
  }
  for (const view of VIEWS) {
    if (view !== 'detail') {
      await write(product, colorId, view, toSharp(await frameShot(shots[view].img)));
      continue;
    }
    const shot = shots[plan.detail];
    let cx: number;
    let cy: number;
    let span: number;
    if (shot.prints.length > 0) {
      // Caja de los gráficos de esa cara (con su giro aproximado por la diagonal).
      const xs = shot.prints.flatMap((p) => [p.cx - p.w / 2, p.cx + p.w / 2]);
      const ys = shot.prints.flatMap((p) => {
        const h = p.w * markAspect(p.mark);
        return [p.cy - h / 2, p.cy + h / 2];
      });
      cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      span = 1.9 * Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) / 1.25);
    } else {
      const zone = plan.detailZone && zoneFor(shot.src.name, shot.src.kind, shot.src.side, plan.detailZone);
      const zx = zone ? (shot.src.mirror ? 960 - zone.x : zone.x) : 480;
      cx = zx * SCALE;
      cy = (zone ? zone.y : 600) * SCALE;
      span = 0;
    }
    const [x, y, w, h] = detailBox(shot.img, cx, cy, span);
    await write(product, colorId, view, toSharp(cropImg(shot.img, x, y, w, h)), true);
  }
}

// ─── Fotos virtuales y dibujo técnico ───────────────────────────────────────

async function objectProduct(product: Product, colorId: string) {
  const shots = { front: await objectShot(product, colorId, 'front'), back: await objectShot(product, colorId, 'back') };
  await write(product, colorId, 'front', sharp(shots.front.png));
  await write(product, colorId, 'back', sharp(shots.back.png));
  const [x, y, w, h] = shots.front.detail.map((v) => Math.round(v * SCALE));
  await write(product, colorId, 'detail', sharp(shots.front.png).extract({ left: x, top: y, width: w, height: h }), true);
}

async function vectorProduct(product: Product, colorId: string) {
  for (const view of VIEWS) {
    const svg = mockupSVG({ product, colorId, view }).replace(/width="800" height="1000"/, `width="${OUT_W}" height="${OUT_H}"`);
    await write(product, colorId, view, sharp(await svgToPng(svg, OUT_W, OUT_H, false)));
  }
}

// ─── Ejecución ──────────────────────────────────────────────────────────────

const products = catalogProducts.filter((product) => !only || only.includes(product.id));
for (const product of products) {
  const plan = PLANS[product.id];
  if (OBJECT_SILHOUETTES.has(product.silhouette)) {
    for (const color of product.colors) await objectProduct(product, color.id);
    continue;
  }
  // Un producto solo pasa a foto si todas sus variantes y caras tienen base: nunca se mezclan
  // foto y dibujo en la misma galería.
  const sources = plan
    ? product.colors.map((color) => ({ colorId: color.id, front: resolveBase(product, plan, color.id, 'front'), back: resolveBase(product, plan, color.id, 'back') }))
    : [];
  const complete = plan && sources.every((s) => s.front && s.back);
  if (!plan || !complete) {
    const missing = sources.flatMap((s) => [!s.front && `${s.colorId}-front`, !s.back && `${s.colorId}-back`]).filter(Boolean);
    notes.push(`${product.id}: dibujo técnico (sin base fotográfica: ${plan ? missing.join(', ') : 'sin plan'})`);
    for (const color of product.colors) await vectorProduct(product, color.id);
    continue;
  }
  for (const s of sources) {
    for (const side of ['front', 'back'] as const) {
      const note = s[side]?.note;
      if (note) notes.push(`${product.id} ${s.colorId} ${side}: ${note}`);
    }
    await photoProduct(product, plan, s.colorId, { front: s.front!, back: s.back! });
  }
}
await closeChromium();

if (preview) {
  mkdirSync(preview, { recursive: true });
  const columns = 6;
  const rows = Math.ceil(sheet.length / columns);
  await sharp({ create: { width: columns * 320, height: rows * 400, channels: 3, background: '#000' } })
    .composite(sheet.map((tile, i) => ({ input: tile.png, left: (i % columns) * 320, top: Math.floor(i / columns) * 400 })))
    .png()
    .toFile(join(preview, 'mockups.png'));
  writeFileSync(join(preview, 'mockups.txt'), sheet.map((tile) => tile.label).join('\n'));
}
console.log(`\n${written} imágenes generadas en ${OUT}`);
if (notes.length) console.log(`\nBases sustituidas o ausentes:\n- ${notes.join('\n- ')}`);
