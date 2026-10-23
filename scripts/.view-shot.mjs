// Captura de la vista inicial de una ruta tras esperar a que acaben las animaciones de entrada.
import { chromium } from '@playwright/test';
const [route, out, w = '1440', h = '900', wait = '5000'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, hasTouch: Number(w) < 1024 });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' });
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
await browser.close();
