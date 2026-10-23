// Fotogramas de la intro (se fuerza navigator.webdriver = false para que se reproduzca).
import { chromium } from '@playwright/test';
const [out = '.'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
let t = 0;
for (const at of [400, 1000, 1700, 2200, 2700, 4200]) {
  await page.waitForTimeout(at - t);
  t = at;
  await page.screenshot({ path: `${out}/intro-${at}.png` });
}
console.log(errors.length ? errors : 'no errors');
await browser.close();
