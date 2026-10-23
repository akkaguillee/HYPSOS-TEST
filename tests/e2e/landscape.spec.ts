import { expect, test } from './fixtures';

/** Móvil en horizontal (proyecto «landscape»): sin scroll lateral y con las acciones al alcance. */
const routes = ['/', '/collections/all', '/products/sudadera-capucha-ascenso', '/cart', '/checkout', '/cuenta'];

for (const route of routes) {
  test(`horizontal: ${route} sin desbordamiento lateral`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('horizontal: el hero muestra titular y llamadas a la acción', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Comprar Chapter 01' })).toBeInViewport();
  await page.getByRole('link', { name: 'Comprar Chapter 01' }).click({ trial: true });
});

test('horizontal: la ficha permite elegir talla y añadir al carrito', async ({ page }) => {
  await page.goto('/products/camiseta-ascenso-heavyweight');
  await page.locator('label').filter({ has: page.getByRole('radio', { name: /^Talla L/ }) }).click();
  await page.getByRole('button', { name: 'Añadir al carrito' }).first().click();
  await expect(page.getByRole('dialog', { name: /Carrito/ })).toBeVisible();
});

test('horizontal: el menú móvil abre y se cierra', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Menú' })).toBeHidden();
});
