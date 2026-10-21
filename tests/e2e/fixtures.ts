import { test as base, expect } from '@playwright/test';

/** Página sin intro de marca y con registro de errores de consola. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      // El 503 del checkout es esperado mientras no haya pasarela configurada.
      if (message.type() === 'error' && !message.text().includes('503')) errors.push(message.text());
    });
    await page.addInitScript(() => window.sessionStorage.setItem('hypsos-intro-seen', '1'));
    await use(errors);
  },
});

export { expect };
