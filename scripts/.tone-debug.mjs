import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
for (const y of [300, 1500, 2600]) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, -40));
  await page.waitForTimeout(900);
  console.log(y, await page.evaluate(() => {
    const bar = document.querySelector('header [data-glass]');
    const b = bar.getBoundingClientRect();
    const els = document.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2).slice(0, 8).map((n) => `${n.tagName}.${(n.className && n.className.baseVal === undefined ? n.className : '').toString().slice(0, 40)}${n.closest('[data-surface-ignore]') ? '[ign]' : ''} theme=${n.closest('[data-theme]')?.getAttribute('data-theme')}`);
    return { tone: bar.getAttribute('data-tone'), els };
  }));
}
await browser.close();
