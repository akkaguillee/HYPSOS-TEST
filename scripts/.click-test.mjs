// Comprueba que los puntos del hero y las acciones reciben el clic.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => sessionStorage.setItem('hypsos-intro-seen', '1'));
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
await page.getByRole('link', { name: 'Camisetas' }).first().click({ trial: true });
await page.getByRole('link', { name: 'Comprar Chapter 01' }).click({ trial: true });
console.log('hotspot + CTA clickable');
await browser.close();
