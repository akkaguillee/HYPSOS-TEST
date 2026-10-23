// Capturas de varias rutas (vista inicial) para revisar coherencia visual.
import { chromium } from '@playwright/test';
const [out, w = '1440', h = '900', ...routes] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) } });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
for (const route of routes) {
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/${route.replace(/[^a-z0-9]+/gi, '_') || 'root'}-${w}.png` });
  await page.close();
}
await browser.close();
