// Capturas del hero: fotogramas durante la secuencia y estado final, escritorio y móvil.
import { chromium } from '@playwright/test';
const [out = '.', route = '/'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, viewport] of [['d', { width: 1440, height: 900 }], ['m', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:5173' + route, { waitUntil: 'domcontentloaded' });
  if (name === 'd') {
    for (const t of [500, 1100, 1800]) {
      await page.waitForTimeout(t === 500 ? 500 : t - (t === 1100 ? 500 : 1100));
      await page.screenshot({ path: `${out}/hero-${name}-${t}.png` });
    }
  }
  await page.waitForTimeout(4200);
  await page.screenshot({ path: `${out}/hero-${name}-final.png` });
  console.log(name, errors.length ? errors.slice(0, 5) : 'no errors');
  await ctx.close();
}
await browser.close();
