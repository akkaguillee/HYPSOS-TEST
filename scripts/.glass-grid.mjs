// Pone un patrón de prueba (texto + rejilla) detrás de la cabecera para ver la óptica de la lente.
import { chromium } from '@playwright/test';
const [out = 'grid.png', shift = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate((shift) => {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0 0 auto 0;height:200px;z-index:5;background:
    repeating-linear-gradient(0deg,#0000 0 9px,#d71920 9px 10px),repeating-linear-gradient(90deg,#f2f0ec 0 20px,#090909 20px 40px);`;
  el.innerHTML = `<p style="position:absolute;top:${44 + Number(shift)}px;left:140px;font:900 34px Archivo;color:#fff;mix-blend-mode:difference;white-space:nowrap">BUILT FOR THE CLIMB · REACH HIGHER · KEEP CLIMBING · ABOVE ORDINARY</p>`;
  document.body.appendChild(el);
}, shift);
await page.waitForTimeout(900);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1440, height: 130 } });
await browser.close();
