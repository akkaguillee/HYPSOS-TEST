// Portada con prefers-reduced-motion: todo visible y quieto.
import { chromium } from '@playwright/test';
const [out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
const hidden = await page.evaluate(() => [...document.querySelectorAll('canvas')].filter((c) => getComputedStyle(c).visibility !== 'hidden').length);
console.log('visible canvases', hidden);
await browser.close();
