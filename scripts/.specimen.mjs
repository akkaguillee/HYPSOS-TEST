import { chromium } from '@playwright/test';
const [file, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file://' + file); await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true }); await b.close();
