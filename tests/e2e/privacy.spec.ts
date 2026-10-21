import { expect, test } from './fixtures';

test('sin proveedor de analítica configurado no hay banner ni scripts de terceros', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) external.push(url.hostname);
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('dialog', { name: /cookies/i })).toHaveCount(0);
  expect(await page.locator('meta[name="hypsos:analytics"]').count()).toBe(0);
  expect(external).toEqual([]);
});
