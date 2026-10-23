import { expect, test } from './fixtures';

test('la portada carga con el hero, las secciones y sin errores', async ({ page, consoleErrors }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/HYPSOS/);
  await expect(page.getByRole('heading', { level: 1, name: /Built for the climb/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'HYPSOS, ir a la portada' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Chapter\s*01/ })).toBeAttached();
  // Ninguna capa decorativa (espray, puntos, cintas) tapa la acción principal.
  await page.getByRole('link', { name: 'Comprar Chapter 01' }).click({ trial: true });
  await expect(page.getByRole('contentinfo')).toBeAttached();
  expect(consoleErrors).toEqual([]);
});

test('navega desde el mega menú a una categoría', async ({ page, isMobile }) => {
  test.skip(isMobile, 'El mega menú es de escritorio');
  await page.goto('/');
  await page.getByRole('button', { name: 'Tienda' }).click();
  await page.getByRole('link', { name: /^Sudaderas/ }).first().click();
  await expect(page).toHaveURL(/\/collections\/sudaderas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sudaderas' })).toBeVisible();
});

test('menú móvil: abre, atrapa el foco y se cierra con Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo móvil');
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menú' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused();
});

test('el buscador encuentra productos', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Buscar' }).first().click();
  await page.getByRole('combobox', { name: 'Buscar productos' }).fill('capucha');
  await expect(page.getByText(/^\d+ resultados?$/)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=capucha/);
  await expect(page.getByRole('heading', { level: 1, name: 'Buscar' })).toBeVisible();
  await expect(page.locator('#main').getByRole('searchbox')).toHaveValue('capucha');
  await expect(page.locator('#main').getByRole('link', { name: 'Sudadera Capucha Monogram' })).toBeVisible();
});

test('buscador: navegación con flechas e Intro abre la ficha', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Buscar' }).first().click();
  const input = page.getByRole('combobox', { name: 'Buscar productos' });
  await input.fill('mascot');
  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  const activeId = await input.getAttribute('aria-activedescendant');
  expect(activeId).toBeTruthy();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/products\//);
});

test('todas las rutas del brief responden', async ({ page }) => {
  const routes = [
    '/collections/all',
    '/collections/camisetas',
    '/collections/sudaderas',
    '/collections/pantalones',
    '/collections/gorras',
    '/collections/accesorios',
    '/collections/3d',
    '/collections/stickers',
    '/collections/novedades',
    '/collections/colecciones',
    '/pages/nosotros',
    '/pages/contacto',
    '/pages/faq',
    '/pages/envios',
    '/pages/guia-de-tallas',
    '/pages/privacidad',
    '/pages/terminos',
    '/pages/cookies',
    '/pages/aviso-legal',
    '/cart',
    '/favoritos',
    '/cuenta',
    '/cuenta/recuperar',
  ];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('h1').first(), route).toBeVisible();
  }
});

test('las rutas inexistentes devuelven 404 real', async ({ page }) => {
  for (const route of ['/products/no-existe', '/collections/inventada', '/otra-cosa']) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(404);
    await expect(page.getByRole('heading', { name: 'Esta página se ha agotado' })).toBeVisible();
  }
});

test('el HTML inicial incluye metadatos SEO del producto', async ({ request }) => {
  const html = await (await request.get('/products/sudadera-capucha-ascenso')).text();
  expect(html).toContain('<title>Sudadera Capucha Ascenso | HYPSOS</title>');
  expect(html).toContain('"@type":"Product"');
  expect(html).toContain('og:image');
  // Catálogo de demostración: las fichas no se indexan.
  expect(html).toContain('noindex');
  const headers = (await request.get('/')).headers();
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
});
