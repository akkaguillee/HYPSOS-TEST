// Captura de página completa tras recorrerla (dispara los ScrollTrigger) — escritorio o móvil.
import { chromium } from '@playwright/test';
const [route = '/', out = 'full.png', w = '1440', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) } });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < height; y += 300) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(140);
}
await page.waitForTimeout(2600);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });
console.log(errors.length ? errors.slice(0, 5) : 'no errors', height);
await browser.close();
