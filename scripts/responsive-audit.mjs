#!/usr/bin/env node
/**
 * Auditoría responsive: recorre rutas en 12 tamaños de pantalla (incluido móvil en horizontal),
 * detecta scroll horizontal y elementos que se salen de la pantalla, y guarda capturas.
 *
 *   node scripts/responsive-audit.mjs [--base http://localhost:5173] [--out ./audit] [--shots] [--routes /,/cart]
 *
 * Con un Chromium del sistema: PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chromium node scripts/responsive-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const base = option('base', 'http://localhost:5173');
const out = resolve(option('out', './audit'));
const shots = args.includes('--shots');
const routes = option(
  'routes',
  '/,/collections/all,/collections/3d,/collections/stickers,/products/sudadera-capucha-ascenso,/cart,/checkout,/cuenta,/pages/contacto,/pages/guia-de-tallas,/no-existe',
).split(',');

export const viewports = [
  { name: '320', width: 320, height: 640, mobile: true },
  { name: '375', width: 375, height: 667, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '430', width: 430, height: 932, mobile: true },
  { name: '768', width: 768, height: 1024, mobile: true },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
  { name: 'land-667', width: 667, height: 375, mobile: true },
  { name: 'land-844', width: 844, height: 390, mobile: true },
  { name: 'land-932', width: 932, height: 430, mobile: true },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const report = [];

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: Boolean(viewport.mobile),
    hasTouch: Boolean(viewport.mobile),
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const route of routes) {
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // Recorre la página para disparar revelados y cargas diferidas.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += viewport.height * 0.8) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(60);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const clipped = (element) => {
        for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) return true;
        }
        return false;
      };
      const describe = (element) =>
        `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${typeof element.className === 'string' && element.className ? `.${element.className.split(' ')[0]}` : ''}`;
      const offenders = [];
      for (const element of document.querySelectorAll('body *')) {
        const style = getComputedStyle(element);
        if (style.position === 'fixed' || style.visibility === 'hidden' || style.display === 'none') continue;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        if ((rect.right > width + 1 || rect.left < -1) && !clipped(element)) {
          offenders.push(`${describe(element)} [${Math.round(rect.left)}→${Math.round(rect.right)}]`);
          if (offenders.length >= 6) break;
        }
      }
      // Controles táctiles demasiado pequeños (< 32 px en su lado menor) visibles en pantalla.
      const smallTargets = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && rect.top < window.innerHeight && Math.min(rect.width, rect.height) < 24;
        })
        .slice(0, 5)
        .map(describe);
      return { horizontalScroll: scrollWidth > width + 1, scrollWidth, width, offenders, smallTargets };
    });

    report.push({ viewport: viewport.name, route, ...result, errors: [...errors] });
    errors.length = 0;
    if (shots) {
      const file = `${viewport.name}${route.replace(/\//g, '_') || '_home'}.png`;
      await page.screenshot({ path: join(out, file) });
    }
  }
  await context.close();
}

await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
const problems = report.filter((entry) => entry.horizontalScroll || entry.offenders.length || entry.errors.length);
for (const entry of problems) {
  console.log(`✗ ${entry.viewport} ${entry.route}${entry.horizontalScroll ? ` · scroll horizontal (${entry.scrollWidth}px > ${entry.width}px)` : ''}`);
  entry.offenders.forEach((offender) => console.log(`    fuera de pantalla: ${offender}`));
  entry.errors.forEach((error) => console.log(`    error: ${error}`));
}
console.log(`\n${report.length - problems.length}/${report.length} combinaciones sin desbordamientos ni errores. Informe: ${join(out, 'report.json')}`);
process.exitCode = problems.length ? 1 : 0;
