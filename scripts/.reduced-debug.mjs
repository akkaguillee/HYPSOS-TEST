import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => {
  const img = document.querySelector('section[aria-labelledby="hero-title"] img');
  if (!img) return 'no img';
  const cs = getComputedStyle(img);
  const pic = img.closest('picture') ?? img;
  const chain = [];
  for (let n = img; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    chain.push(`${n.tagName}.${String(n.className).slice(0, 30)} op=${s.opacity} vis=${s.visibility} disp=${s.display} tr=${s.transform.slice(0, 40)} clip=${s.clipPath}`);
  }
  return { src: img.currentSrc, complete: img.complete, w: img.naturalWidth, rect: JSON.stringify(img.getBoundingClientRect()), chain };
}));
await browser.close();
