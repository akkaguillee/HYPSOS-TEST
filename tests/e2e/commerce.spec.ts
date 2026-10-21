import { expect, test } from './fixtures';

test('filtros sincronizados con la URL y estado vacío', async ({ page, isMobile }) => {
  await page.goto('/collections/all');
  if (isMobile) await page.getByRole('button', { name: /Filtrar/ }).click();
  const scope = isMobile ? page.getByRole('dialog', { name: 'Filtrar' }) : page.getByRole('complementary', { name: 'Filtros' });
  await scope.getByRole('button', { name: 'Talla XXL' }).click();
  await expect(page).toHaveURL(/talla=XXL/);
  await scope.getByRole('button', { name: /^Más de 90 €/ }).click();
  await scope.getByRole('switch', { name: 'Solo disponibles' }).click();
  await expect(page).toHaveURL(/precio=mas-90/);
  if (isMobile) await page.getByRole('button', { name: /^Ver \d+ productos?$/ }).click();
  await expect(page.getByText(/^\d+ resultados?$/)).toBeVisible();
  // Recarga: los filtros persisten en la URL.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Quitar filtro Talla XXL' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar todo' }).click();
  await expect(page).toHaveURL(/\/collections\/all$/);
});

test('compra: talla obligatoria, carrito, checkout validado y pagos no configurados', async ({ page, consoleErrors }) => {
  await page.goto('/products/sudadera-capucha-ascenso');
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Selecciona una talla' })).toBeVisible();

  await page.locator('label').filter({ has: page.getByRole('radio', { name: 'Talla M' }) }).click();
  await expect(page.getByRole('radio', { name: 'Talla M' })).toBeChecked();
  await page.getByRole('button', { name: 'Añadir al carrito' }).click();
  const drawer = page.getByRole('dialog', { name: /Carrito/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Negro · Talla M')).toBeVisible();
  await expect(drawer.getByText('Tienes envío estándar gratuito.')).toBeVisible();

  await drawer.getByRole('button', { name: /Añadir una unidad/ }).click();
  await expect(drawer.getByRole('group', { name: /Cantidad/ })).toContainText('2');
  await drawer.getByRole('button', { name: 'Finalizar compra' }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByRole('button', { name: /^Pagar/ }).click();
  await expect(page.getByText('Introduce tu email')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();

  await page.getByLabel('Email').fill('cliente@example.com');
  await page.getByLabel('Nombre', { exact: true }).fill('Ana');
  await page.getByLabel('Apellidos').fill('García López');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle Mayor 1');
  await page.getByLabel('Código postal').fill('28013');
  await page.getByLabel('Ciudad').fill('Madrid');
  await page.getByLabel('Provincia').fill('Madrid');
  await page.getByLabel('Teléfono').fill('+34 600 000 000');
  await page.getByRole('radio', { name: /Envío exprés/ }).check();
  await expect(page.getByRole('button', { name: /^Pagar/ })).toContainText('187,95');
  await page.getByRole('checkbox', { name: /condiciones de compra/ }).check();
  await page.getByRole('button', { name: /^Pagar/ }).click();

  await expect(page.getByText('Pagos online aún no disponibles')).toBeVisible();
  // El carrito se conserva.
  await page.goto('/cart');
  await expect(page.locator('#main').getByRole('link', { name: 'Sudadera Capucha Ascenso' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('barra de compra fija en móvil al pasar el botón principal', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo móvil');
  await page.goto('/products/camiseta-ascenso-heavyweight');
  const bar = page.locator('[class*="stickyBar"]');
  await expect(bar).toHaveAttribute('data-visible', 'false');
  await page.mouse.wheel(0, 2200);
  await expect(bar).toHaveAttribute('data-visible', 'true');
});

test('favoritos persisten entre páginas', async ({ page }) => {
  await page.goto('/collections/gorras');
  await page.getByRole('button', { name: 'Guardar Gorra Monogram en favoritos' }).click();
  await page.goto('/favoritos');
  await expect(page.locator('#main').getByRole('link', { name: 'Gorra Monogram' })).toBeVisible();
});

test('newsletter y contacto guardan en la API', async ({ page }) => {
  await page.goto('/');
  const newsletter = page.locator('section[aria-labelledby="newsletter-title"]');
  await newsletter.getByLabel('Email').fill(`e2e-${Date.now()}@example.com`);
  await newsletter.getByRole('button', { name: 'Suscribirme' }).click();
  await expect(newsletter.getByText('Necesitamos tu consentimiento')).toBeVisible();
  await newsletter.getByRole('checkbox').check();
  await newsletter.getByRole('button', { name: 'Suscribirme' }).click();
  await expect(newsletter.getByText('Estás dentro')).toBeVisible();

  await page.goto('/pages/contacto');
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByLabel('Motivo').selectOption('producto');
  await page.getByLabel('Mensaje').fill('¿Cuándo vuelve la sudadera gris en talla S?');
  await page.getByRole('checkbox', { name: /política de privacidad/ }).check();
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText('Mensaje recibido')).toBeVisible();
});
