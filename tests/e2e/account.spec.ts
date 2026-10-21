import { expect, test } from './fixtures';

const strongPassword = 'Ascenso2026x';

test('cuenta: rutas protegidas, registro, cierre de sesión y acceso', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  // Sin sesión, las zonas privadas redirigen al acceso conservando el destino.
  await page.goto('/cuenta/pedidos');
  await expect(page).toHaveURL(/\/cuenta\?next=%2Fcuenta%2Fpedidos/);

  await page.getByRole('tab', { name: 'Crear cuenta' }).click();
  await page.getByLabel('Nombre').fill('Ana García');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('corta');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('La contraseña debe tener al menos 10 caracteres')).toBeVisible();

  await page.getByLabel('Contraseña', { exact: true }).fill(strongPassword);
  await page.getByRole('checkbox', { name: /política de privacidad/ }).check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/cuenta\/pedidos$/);
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/cuenta');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Incorrecta2026');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /incorrect/i })).toBeVisible();
  await page.getByLabel('Contraseña', { exact: true }).fill(strongPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Hola, Ana' })).toBeVisible();
});

test('recuperación de contraseña sin email configurado lo indica sin fingir el envío', async ({ page }) => {
  await page.goto('/cuenta/recuperar');
  await page.getByLabel('Email de tu cuenta').fill('alguien@example.com');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'aún no está disponible' })).toBeVisible();
});
