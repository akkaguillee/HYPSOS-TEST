import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

const pages = ['/', '/collections/all', '/products/camiseta-ascenso-heavyweight', '/cart', '/pages/contacto', '/pages/faq', '/no-existe'];

for (const path of pages) {
  test(`sin infracciones graves de accesibilidad en ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  });
}

test('con movimiento reducido todo el contenido es visible sin animaciones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('.reveal')].filter((element) => getComputedStyle(element).opacity !== '1').length,
  );
  expect(hidden).toBe(0);
});

test('navegación por teclado: enlace para saltar al contenido', async ({ page }) => {
  await page.goto('/pages/faq');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});
