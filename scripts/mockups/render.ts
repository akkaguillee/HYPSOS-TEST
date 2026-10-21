/**
 * Genera los mockups 2D de producto (WebP 480 y 960 px de ancho) en public/assets/products/mockups.
 *
 *   pnpm mockups                      # todos los productos
 *   pnpm mockups --only p-tee-ascenso # uno o varios ids separados por comas
 *   pnpm mockups --preview <dir>      # además, hoja de contactos PNG en <dir>
 *
 * Usa el Chromium de Playwright (PLAYWRIGHT_CHROMIUM_PATH si está definido) para rasterizar el SVG
 * con los mismos filtros que un navegador y sharp para codificar.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { catalogProducts } from '../../shared/catalog';
import type { MediaView } from '../../shared/types';
import { mockupSVG, type MockupJob } from './catalog';

const args = process.argv.slice(2);
const option = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const only = option('only')?.split(',');
const preview = option('preview');
const OUT = resolve('public/assets/products/mockups');
const VIEWS: MediaView[] = ['front', 'back', 'detail'];

const jobs: MockupJob[] = catalogProducts
  .filter((product) => !only || only.includes(product.id))
  .flatMap((product) => product.colors.flatMap((color) => VIEWS.map((view) => ({ product, colorId: color.id, view }))));

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, deviceScaleFactor: 1.2 });
const sheet: Buffer[] = [];

for (const job of jobs) {
  const svg = mockupSVG(job);
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`);
  const png = await page.locator('svg').first().screenshot({ type: 'png' });
  const dir = join(OUT, job.product.handle);
  mkdirSync(dir, { recursive: true });
  for (const width of [480, 960]) {
    await sharp(png).resize({ width }).webp({ quality: width > 500 ? 80 : 78, effort: 6 }).toFile(join(dir, `${job.colorId}-${job.view}-${width}.webp`));
  }
  if (preview) sheet.push(await sharp(png).resize({ width: 320 }).png().toBuffer());
  process.stdout.write('.');
}
await browser.close();

if (preview) {
  mkdirSync(preview, { recursive: true });
  const columns = 6;
  const rows = Math.ceil(sheet.length / columns);
  await sharp({ create: { width: columns * 320, height: rows * 400, channels: 3, background: '#000' } })
    .composite(sheet.map((input, i) => ({ input, left: (i % columns) * 320, top: Math.floor(i / columns) * 400 })))
    .png()
    .toFile(join(preview, 'mockups.png'));
  writeFileSync(join(preview, 'mockups.txt'), jobs.map((j) => `${j.product.id} ${j.colorId} ${j.view}`).join('\n'));
}
console.log(`\n${jobs.length} mockups generados en ${OUT}`);
