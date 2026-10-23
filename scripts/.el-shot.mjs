// Captura de un elemento (selector) tras llevarlo a pantalla y esperar sus animaciones.
import { chromium } from '@playwright/test';
const [route, selector, out, w = '1440', h = '900', wait = '3000'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) } });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' });
const el = page.locator(selector).first();
await el.scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, 120));
await page.waitForTimeout(Number(wait));
await el.screenshot({ path: out });
await browser.close();
