import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
const read = () => page.evaluate(() => [...document.querySelectorAll('filter[id^="lg-"] feDisplacementMap')].slice(0, 3).map((n) => n.getAttribute('scale')).join(','));
console.log('rest', await read());
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -0); await page.evaluate(() => window.scrollBy(0, 60)); await page.waitForTimeout(16); }
console.log('fast', await read());
await page.waitForTimeout(300);
const samples = [];
for (let i = 0; i < 8; i++) { samples.push(await read()); await page.waitForTimeout(120); }
console.log('settle', samples.join(' | '));
await browser.close();
