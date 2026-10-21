import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const STATIC_PORT = 4174;

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
    { name: 'desktop', testIgnore: /(landscape|static)\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testIgnore: /(landscape|static)\.spec/, use: { ...devices['Pixel 7'] } },
    // Móvil en horizontal (obligatorio en el brief): solo su batería específica.
    { name: 'landscape', testMatch: /landscape\.spec/, use: { ...devices['Pixel 7 landscape'] } },
    // Despliegue estático (Netlify): dist-static/ sin API, con las reglas de netlify.toml.
    { name: 'static', testMatch: /static\.spec/, use: { ...devices['iPhone 13'], browserName: 'chromium', baseURL: `http://localhost:${STATIC_PORT}` } },
  ],
  webServer: [
    {
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
        // Toda la batería sale de la misma IP: se elevan los límites por IP solo en las pruebas.
        RATE_LIMIT_SCALE: '50',
      },
    },
    { command: `node scripts/serve-static.mjs ${STATIC_PORT}`, url: `http://localhost:${STATIC_PORT}/`, reuseExistingServer: !process.env.CI },
  ],
});
