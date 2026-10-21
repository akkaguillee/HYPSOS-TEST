import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { isKnownRoute } from '../shared/routes';
import { analyticsConfig, analyticsOrigins } from './analytics';
import { createApi } from './app';
import { openDatabase } from './db';
import { loadEnv } from './env';
import { renderHtml } from './html';
import { stockSnapshot, syncCatalogInventory } from './inventory';
import { createConsoleMailer, createResendMailer } from './mailer';
import { createStripeProvider } from './payments';

// Carga .env si existe (Node ≥ 21.7). Las variables del sistema tienen prioridad.
if (existsSync('.env')) process.loadEnvFile('.env');

const env = loadEnv();
const repos = openDatabase(env.DATABASE_PATH);
const seeded = syncCatalogInventory(repos);
if (seeded) console.info(`[hypsos] Inventario: ${seeded} variantes nuevas dadas de alta con su stock inicial.`);

const payments =
  env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET ? createStripeProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET) : null;
const mailer =
  env.RESEND_API_KEY && env.MAIL_FROM
    ? createResendMailer(env.RESEND_API_KEY, env.MAIL_FROM)
    : env.NODE_ENV !== 'production'
      ? createConsoleMailer()
      : null;

if (!payments) console.warn('[hypsos] Pagos NO configurados: define STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET para activarlos.');
if (!mailer) console.warn('[hypsos] Email NO configurado: define RESEND_API_KEY y MAIL_FROM para enviar emails.');
if (mailer?.kind === 'console') console.warn('[hypsos] Email en modo desarrollo: los mensajes se escriben en esta consola.');

const app = new Hono();

app.route(
  '/api',
  createApi({
    env,
    repos,
    payments,
    mailer,
    clientIp: (c) =>
      (env.TRUST_PROXY ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ?? getConnInfo(c).remote.address ?? 'unknown',
  }),
);

// Libera reservas de stock caducadas por si algún webhook de expiración no llega.
const sweep = setInterval(() => {
  for (const order of repos.orders.expiredReservations()) {
    repos.orders.release(order.id, 'expired');
    console.info(`[hypsos] Reserva caducada liberada: pedido ${order.number}`);
  }
}, 60_000);
sweep.unref();

// En producción el mismo proceso sirve la web compilada (dist/).
const distDir = resolve(import.meta.dirname, '../dist');
if (env.NODE_ENV === 'production' && existsSync(distDir)) {
  const analytics = analyticsConfig(env);
  const origins = analyticsOrigins(analytics);
  const template = readFileSync(resolve(distDir, 'index.html'), 'utf8').replace(
    '<!--analytics-->',
    `<meta name="hypsos:analytics" content="${JSON.stringify(analytics).replace(/"/g, '&quot;')}" />`,
  );

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...origins.script],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", ...origins.connect],
        workerSrc: ["'self'", 'blob:'],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
      },
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [], payment: [] },
    }),
  );
  app.use('*', compress());
  app.use(
    '/assets/*',
    serveStatic({
      root: distDir,
      onFound: (path, c) =>
        c.header('Cache-Control', /-[A-Za-z0-9_-]{8}\.(js|css|woff2?)$/.test(path) ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'),
    }),
  );
  app.use('*', serveStatic({ root: distDir, onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=3600') }));
  app.get('*', (c) => {
    const pathname = new URL(c.req.url).pathname;
    c.header('Cache-Control', 'no-cache');
    return c.html(renderHtml(template, pathname, env.PUBLIC_URL, stockSnapshot(repos)), isKnownRoute(pathname) ? 200 : 404);
  });
}

const server = serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
  console.info(`[hypsos] API escuchando en http://localhost:${info.port} (${env.NODE_ENV})`);
});

function shutdown() {
  clearInterval(sweep);
  server.close(() => {
    repos.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
