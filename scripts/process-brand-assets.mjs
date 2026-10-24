#!/usr/bin/env node
/**
 * Genera los recursos de marca optimizados a partir de los originales en
 * assets/brand/original/. Los originales NUNCA se modifican.
 *
 * - Vectores (logotipo, monograma, estrella, mascota): se trazan con potrace
 *   a partir de los píxeles del original, sin redibujar ni simplificar la forma,
 *   y se verifica la fidelidad comparando el SVG rasterizado con el original (IoU).
 * - Imágenes (monograma cromado): AVIF/WebP responsive.
 * - Favicon, iconos de app y imagen Open Graph.
 *
 * Requisitos: `potrace` instalado en el sistema (apt install potrace / brew install potrace).
 * Uso: pnpm assets:brand
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const ORIGINALS = join(root, 'assets/brand/original');
const OUT_VECTORS = join(root, 'src/assets/brand');
const OUT_IMAGES = join(root, 'public/assets/brand');
const OUT_PUBLIC = join(root, 'public');
const work = mkdtempSync(join(tmpdir(), 'hypsos-brand-'));

mkdirSync(OUT_VECTORS, { recursive: true });
mkdirSync(OUT_IMAGES, { recursive: true });

/** Convierte una máscara (1 = forma) en PBM para potrace. */
function writePbm(path, mask, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const body = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) body[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  writeFileSync(path, Buffer.concat([Buffer.from(`P4\n${width} ${height}\n`), body]));
}

/** Obtiene una máscara binaria a partir de un canal (alpha o luminancia). */
async function maskFrom(file, { channel, invert = false, threshold = 128, scale = 1 }) {
  let img = sharp(file);
  const meta = await img.metadata();
  const width = Math.round(meta.width * scale);
  const height = Math.round(meta.height * scale);
  img = img.resize(width, height, { kernel: 'lanczos3' });
  const raw =
    channel === 'alpha'
      ? await img.ensureAlpha().extractChannel(3).raw().toBuffer()
      : await img.flatten({ background: invert ? '#ffffff' : '#000000' }).greyscale().raw().toBuffer();
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const v = raw[i];
    mask[i] = invert ? (v < threshold ? 1 : 0) : v >= threshold ? 1 : 0;
  }
  return { mask, width, height };
}

/** Máscara de la silueta: invierte el fondo conectado al borde de la imagen (relleno por inundación). */
function outerSilhouette({ mask, width, height }) {
  const background = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const i = y * width + x;
    if (!mask[i] && !background[i]) {
      background[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  const silhouette = new Uint8Array(width * height);
  for (let i = 0; i < silhouette.length; i++) silhouette[i] = background[i] ? 0 : 1;
  return { mask: silhouette, width, height };
}

/** Traza la máscara con potrace y devuelve { viewBox, transform, d }. */
function trace(name, { mask, width, height }) {
  const pbm = join(work, `${name}.pbm`);
  const svg = join(work, `${name}.svg`);
  writePbm(pbm, mask, width, height);
  // -u 4: coordenadas a 1/4 px de la imagen de trabajo; -t 4: ignora motas de ruido;
  // -O 0.2: optimización conservadora de curvas (preserva el dibujo original).
  execFileSync('potrace', [pbm, '-b', 'svg', '--flat', '-u', '4', '-t', '4', '-O', '0.2', '-o', svg]);
  const out = readFileSync(svg, 'utf8');
  const transform = out.match(/<g transform="([^"]+)"/)[1];
  const d = [...out.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim()).join(' ');
  return { viewBox: `0 0 ${width} ${height}`, transform, d, width, height };
}

/** Rasteriza el SVG trazado y lo compara con la máscara original (IoU). */
async function verify(name, traced, source) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${traced.width}" height="${traced.height}" viewBox="${traced.viewBox}"><rect width="100%" height="100%" fill="#fff"/><g transform="${traced.transform}"><path d="${traced.d}" fill="#000"/></g></svg>`;
  const raw = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer();
  let inter = 0;
  let union = 0;
  for (let i = 0; i < source.mask.length; i++) {
    const a = source.mask[i] === 1;
    const b = raw[i] < 128;
    if (a && b) inter++;
    if (a || b) union++;
  }
  const iou = inter / union;
  console.log(`  ${name}: IoU ${(iou * 100).toFixed(2)}% (${traced.d.length} bytes de path)`);
  if (iou < 0.985) throw new Error(`${name}: el trazado no es suficientemente fiel (IoU ${iou})`);
}

/** Escribe un componente React tipado con el vector oficial. */
function writeVectorModule(fileName, exportName, traced, comment) {
  const ts = `// Archivo generado por scripts/process-brand-assets.mjs — no editar a mano.
// ${comment}
export const ${exportName} = {
  viewBox: '${traced.viewBox}',
  width: ${traced.width},
  height: ${traced.height},
  transform: '${traced.transform}',
  d: '${traced.d}',
} as const;
`;
  writeFileSync(join(OUT_VECTORS, fileName), ts);
}

function standaloneSvg(traced, fill, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${traced.viewBox}">${extra}<g transform="${traced.transform}"><path d="${traced.d}" fill="${fill}"/></g></svg>`;
}

console.log('Trazando vectores oficiales…');

// 1. Logotipo HYPSOS (negro sobre transparente, 6717×1515).
const wordmarkSrc = await maskFrom(join(ORIGINALS, 'hypsos-wordmark-black.png'), { channel: 'alpha' });
const wordmark = trace('wordmark', wordmarkSrc);
await verify('wordmark', wordmark, wordmarkSrc);
writeVectorModule('wordmark.ts', 'wordmarkVector', wordmark, 'Logotipo HYPSOS, trazado del PNG oficial (6717×1515).');

// 2. Monograma H (negro sobre blanco, JPG de 370×266 → se trabaja a ×6 para suavizar el pixelado).
const monoSrc = await maskFrom(join(ORIGINALS, 'hypsos-monogram-black-on-white.jpg'), {
  channel: 'luma',
  invert: true,
  scale: 6,
});
const monogram = trace('monogram', monoSrc);
await verify('monogram', monogram, monoSrc);
writeVectorModule('monogram.ts', 'monogramVector', monogram, 'Monograma H, trazado del JPG oficial (370×266, escalado ×6).');

// 3. Estrella (blanco sobre negro, 1000×1000). Se recorta al contenido.
const starCrop = await sharp(join(ORIGINALS, 'hypsos-star-white-on-black.jpg'))
  .extract({ left: 140, top: 330, width: 720, height: 360 })
  .toBuffer();
const starSrc = await maskFrom(starCrop, { channel: 'luma', scale: 3 });
const star = trace('star', starSrc);
await verify('star', star, starSrc);
writeVectorModule('star.ts', 'starVector', star, 'Estrella HYPSOS, trazada del JPG oficial (recortada al contenido, ×3).');

// 4. Mascota (líneas blancas sobre negro, 1378×1142). Se traza el blanco; el negro es la superficie.
const mascotSrc = await maskFrom(join(ORIGINALS, 'hypsos-mascot-on-black.png'), { channel: 'luma', scale: 2 });
const mascot = trace('mascot', mascotSrc);
await verify('mascot', mascot, mascotSrc);
// Silueta exterior: todo lo que no es fondo conectado al borde. Rellena de negro el
// interior del personaje (como en el original) para que funcione sobre cualquier superficie.
const silhouetteMask = outerSilhouette(mascotSrc);
const mascotFill = trace('mascot-fill', silhouetteMask);
await verify('mascot-fill', mascotFill, silhouetteMask);
writeFileSync(
  join(OUT_VECTORS, 'mascot.ts'),
  `// Archivo generado por scripts/process-brand-assets.mjs — no editar a mano.
// Mascota HYPSOS: trazo blanco (outline) + silueta interior negra (fill), como en el original.
export const mascotVector = {
  viewBox: '${mascot.viewBox}',
  width: ${mascot.width},
  height: ${mascot.height},
  transform: '${mascot.transform}',
  d: '${mascot.d}',
  fill: '${mascotFill.d}',
} as const;
`,
);

// Logotipos oficiales en SVG para uso externo (prensa, emails, datos estructurados).
writeFileSync(join(OUT_IMAGES, 'hypsos-wordmark.svg'), standaloneSvg(wordmark, '#0a0a0a'));
writeFileSync(join(OUT_IMAGES, 'hypsos-wordmark-white.svg'), standaloneSvg(wordmark, '#F5F5F5'));
writeFileSync(join(OUT_IMAGES, 'hypsos-monogram.svg'), standaloneSvg(monogram, '#0a0a0a'));
writeFileSync(join(OUT_IMAGES, 'hypsos-star.svg'), standaloneSvg(star, '#F5F5F5'));

console.log('Generando favicon, iconos y Open Graph…');
// Favicon: monograma oficial, negro en pestañas claras y blanco en pestañas oscuras.
writeFileSync(
  join(OUT_PUBLIC, 'favicon.svg'),
  standaloneSvg(monogram, 'currentColor', '<style>svg{color:#0a0a0a}@media (prefers-color-scheme:dark){svg{color:#fff}}</style>'),
);
// Iconos de app: versión oficial negro sobre blanco con margen de seguridad.
const monoBlack = Buffer.from(standaloneSvg(monogram, '#000'));
for (const [file, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['favicon-32.png', 32],
]) {
  const inner = Math.round(size * 0.7);
  const glyph = await sharp(monoBlack, { density: 600 }).resize({ width: inner, height: inner, fit: 'inside' }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(join(OUT_PUBLIC, file));
}
// Open Graph 1200×630: monograma H negro sobre plano claro + logotipo blanco, sobre negro.
const ogMonogram = await sharp(Buffer.from(standaloneSvg(monogram, '#0a0a0a')), { density: 300 })
  .resize({ width: 300 })
  .png()
  .toBuffer();
const ogWordmark = await sharp(Buffer.from(standaloneSvg(wordmark, '#ffffff')), { density: 300 })
  .resize({ width: 520 })
  .png()
  .toBuffer();
const ogPanel = await sharp({ create: { width: 420, height: 470, channels: 3, background: '#f5f5f5' } })
  .composite([{ input: ogMonogram, gravity: 'center' }])
  .png()
  .toBuffer();
const wordmarkHeight = Math.round((520 * wordmark.height) / wordmark.width);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0a0a0a' } })
  .composite([
    { input: ogPanel, top: 80, left: 700 },
    { input: ogWordmark, top: Math.round(315 - wordmarkHeight / 2), left: 100 },
  ])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(join(OUT_PUBLIC, 'og-image.jpg'));

rmSync(work, { recursive: true, force: true });
console.log('Listo.');
