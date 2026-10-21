import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * Pruebas E2E contra el build de producción servido por la API (mismo proceso que en producción).
 * Ejecutar con `pnpm test:e2e` (compila antes).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node dist-server/index.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'production',
      API_PORT: String(PORT),
      PUBLIC_URL: `http://localhost:${PORT}`,
      DATABASE_PATH: ':memory:',
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
    },
  },
});
