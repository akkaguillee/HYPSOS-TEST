import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { shippingMethods as configuredShipping } from '../shared/config';
import { currentUser } from './auth';
import type { AppDeps, AppEnv } from './context';
import { authRoutes } from './routes/auth';
import { catalogRoutes } from './routes/catalog';
import { checkoutRoutes } from './routes/checkout';
import { formRoutes } from './routes/forms';

export type { AppDeps } from './context';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createApi(input: Omit<AppDeps, 'clientIp' | 'logger' | 'mailer' | 'shippingMethods'> & Partial<AppDeps>) {
  const deps: AppDeps = {
    mailer: null,
    shippingMethods: configuredShipping,
    logger: console,
    clientIp: (c) => (input.env.TRUST_PROXY ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ?? socketAddress(c),
    ...input,
  };
  const { env, repos, logger } = deps;
  const allowedOrigin = new URL(env.PUBLIC_URL).origin;

  const api = new Hono<AppEnv>();

  api.use(
    '*',
    secureHeaders({
      crossOriginResourcePolicy: 'same-origin',
      referrerPolicy: 'strict-origin-when-cross-origin',
    }),
  );
  api.use('*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  // Protección CSRF: las peticiones que modifican datos deben venir de la propia web y en JSON.
  api.use('*', async (c, next) => {
    if (!MUTATING.has(c.req.method) || c.req.path.includes('/webhooks/')) return next();
    const origin = c.req.header('origin');
    const site = c.req.header('sec-fetch-site');
    const requestOrigin = new URL(c.req.url).origin;
    if ((origin && origin !== allowedOrigin && origin !== requestOrigin) || site === 'cross-site') {
      return c.json({ error: 'forbidden_origin', message: 'Origen no permitido.' }, 403);
    }
    const length = Number(c.req.header('content-length') ?? '0');
    const type = c.req.header('content-type') ?? '';
    if (length > 0 && !type.startsWith('application/json')) {
      return c.json({ error: 'unsupported_media_type', message: 'Se esperaba JSON.' }, 415);
    }
    return next();
  });

  api.use(
    '*',
    bodyLimit({
      maxSize: 64 * 1024,
      onError: (c) => c.json({ error: 'payload_too_large', message: 'La solicitud es demasiado grande.' }, 413),
    }),
  );

  // Usuario de la sesión (si la hay) disponible para todas las rutas.
  api.use('*', async (c, next) => {
    c.set('user', currentUser(c, repos));
    await next();
  });

  api.get('/health', (c) =>
    c.json({ status: 'ok', payments: deps.payments ? 'configured' : 'not_configured', time: new Date().toISOString() }),
  );

  api.route('/', catalogRoutes(deps));
  api.route('/', checkoutRoutes(deps));
  api.route('/', formRoutes(deps));
  api.route('/', authRoutes(deps));

  api.notFound((c) => c.json({ error: 'not_found' }, 404));
  api.onError((error, c) => {
    logger.error('[api] Error no controlado', error);
    return c.json({ error: 'internal_error', message: 'Ha ocurrido un error inesperado.' }, 500);
  });

  return api;
}

/** IP de la conexión TCP (servidor Node). Fuera de él (pruebas con app.request) no existe. */
function socketAddress(c: Context): string {
  try {
    return getConnInfo(c).remote.address ?? 'local';
  } catch {
    return 'local';
  }
}
