import { expect, test } from './fixtures';

/**
 * Despliegue estático (dist-static/ con las reglas de netlify.toml, servido por
 * scripts/serve-static.mjs): sin API, la web debe cargar, navegar y decir con claridad
 * qué necesita el servidor.
 */

test('la portada carga (no se queda en la pantalla de carga)', async ({ page, consoleErrors }) => {
  await page.goto('/');
  await expect(page.locator('.boot')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: /Built for the climb/i })).toBeVisible();
  expect(consoleErrors.filter((error) => !error.includes('404'))).toEqual([]);
});

test('las rutas conocidas están prerenderizadas con sus metadatos y las desconocidas dan 404', async ({ request }) => {
  const product = await request.get('/products/sudadera-capucha-ascenso');
  expect(product.status()).toBe(200);
  expect(await product.text()).toContain('<title>Sudadera Capucha Ascenso | HYPSOS</title>');
  expect((await request.get('/collections/all')).status()).toBe(200);
  expect((await request.get('/cuenta/pedidos')).status()).toBe(200);
  const missing = await request.get('/esto-no-existe');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('noindex');
  const api = await request.get('/api/inventory');
  expect(api.status()).toBe(404);
  expect(await api.json()).toMatchObject({ error: 'backend_unavailable' });
});

test('se navega, se añade al carrito y el checkout explica que no hay compra online', async ({ page }) => {
  await page.goto('/products/camiseta-ascenso-heavyweight');
  await expect(page.getByText('Stock en tiempo real no disponible en esta versión de la web.')).toBeVisible();
  await page.locator('label').filter({ has: page.getByRole('radio', { name: /^Talla L/ }) }).click();
  await page.getByRole('button', { name: 'Añadir al carrito' }).first().click();
  const drawer = page.getByRole('dialog', { name: /Carrito/ });
  await expect(drawer.getByText('Negro · Talla L')).toBeVisible();
  await drawer.getByRole('button', { name: 'Finalizar compra' }).click();
  await expect(page.getByText(/La compra online necesita el servidor de la tienda/)).toBeVisible();
});

test('una ruta con barra final se normaliza y conserva la query (enlace de restablecer contraseña)', async ({ page }) => {
  await page.goto('/cuenta/restablecer/?token=abc');
  await expect(page).toHaveURL(/\/cuenta\/restablecer\?token=abc$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nueva contraseña' })).toBeVisible();
});

test('los formularios avisan antes de rellenarlos y no se pueden enviar sin servidor', async ({ page }) => {
  await page.goto('/pages/contacto');
  await expect(page.getByText('El formulario de contacto necesita el servidor de la tienda')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled();
});

test('la página no encontrada se muestra en rutas desconocidas', async ({ page }) => {
  const response = await page.goto('/no-existe');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Esta página se ha agotado' })).toBeVisible();
});

test('las cuentas indican que necesitan el servidor', async ({ page }) => {
  await page.goto('/cuenta');
  await expect(page.getByText('Cuentas no disponibles en esta versión')).toBeVisible();
});
