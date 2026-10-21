import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { isKnownRoute } from '../shared/routes';
import { createApi } from './app';
import { openDatabase } from './db';
import { loadEnv } from './env';
import { renderHtml } from './html';
import { createStripeProvider } from './payments';

// Carga .env si existe (Node ≥ 21.7). Las variables del sistema tienen prioridad.
if (existsSync('.env')) process.loadEnvFile('.env');

const env = loadEnv();
const repos = openDatabase(env.DATABASE_PATH);
const payments =
  env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
    ? createStripeProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET)
    : null;

if (!payments) {
  console.warn('[hypsos] Pagos NO configurados: define STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET para activarlos.');
}

const app = new Hono();

app.route(
  '/api',
  createApi({
    env,
    repos,
    payments,
    clientIp: (c) =>
      (env.TRUST_PROXY ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ??
      getConnInfo(c).remote.address ??
      'unknown',
  }),
);

// En producción el mismo proceso sirve la web compilada (dist/).
const distDir = resolve(import.meta.dirname, '../dist');
if (env.NODE_ENV === 'production' && existsSync(distDir)) {
  const template = readFileSync(resolve(distDir, 'index.html'), 'utf8');

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
      },
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
      referrerPolicy: 'strict-origin-when-cross-origin',
    }),
  );
  app.use('*', compress());
  app.use(
    '/assets/*',
    serveStatic({
      root: distDir,
      onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable'),
    }),
  );
  app.use(
    '*',
    serveStatic({
      root: distDir,
      onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=3600'),
    }),
  );
  app.get('*', (c) => {
    const pathname = new URL(c.req.url).pathname;
    c.header('Cache-Control', 'no-cache');
    return c.html(renderHtml(template, pathname, env.PUBLIC_URL), isKnownRoute(pathname) ? 200 : 404);
  });
}

const server = serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.info(`[hypsos] API escuchando en http://localhost:${info.port} (${env.NODE_ENV})`);
});

function shutdown() {
  server.close(() => {
    repos.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
