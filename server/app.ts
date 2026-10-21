import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { getProductByHandle, isProductAvailable, products } from '../shared/catalog';
import { checkoutRequestSchema, contactSchema, fieldErrors, newsletterSchema } from '../shared/schemas';
import type { Repositories } from './db';
import type { Env } from './env';
import { buildOrderDraft, CheckoutError, newOrderRecord } from './orders';
import type { PaymentProvider } from './payments';
import { rateLimit } from './rate-limit';

export interface AppDeps {
  env: Env;
  repos: Repositories;
  /** `null` cuando las credenciales de pago no están configuradas. */
  payments: PaymentProvider | null;
  /** Obtiene la IP del cliente (inyectable para tests). */
  clientIp?: (c: Context) => string;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

const jsonLimit = bodyLimit({
  maxSize: 32 * 1024,
  onError: (c) => c.json({ error: 'payload_too_large', message: 'La solicitud es demasiado grande.' }, 413),
});

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

export function createApi(deps: AppDeps) {
  const { env, repos, payments } = deps;
  const logger = deps.logger ?? console;
  const clientIp =
    deps.clientIp ??
    ((c: Context) => (env.TRUST_PROXY ? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ?? 'local');

  const api = new Hono();

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

  const limitForms = rateLimit({ windowMs: 10 * 60 * 1000, max: 8, keyFor: clientIp });
  const limitCheckout = rateLimit({ windowMs: 60 * 1000, max: 12, keyFor: clientIp });

  api.get('/health', (c) =>
    c.json({ status: 'ok', payments: payments ? 'configured' : 'not_configured', time: new Date().toISOString() }),
  );

  // ─── Catálogo (lectura) ─────────────────────────────────────────────────
  api.get('/products', (c) =>
    c.json({
      products: products.map((product) => ({
        id: product.id,
        handle: product.handle,
        name: product.name,
        category: product.category,
        price: product.price,
        available: isProductAvailable(product),
      })),
    }),
  );

  api.get('/products/:handle', (c) => {
    const product = getProductByHandle(c.req.param('handle'));
    if (!product) return c.json({ error: 'not_found' }, 404);
    return c.json({ product: { ...product, available: isProductAvailable(product) } });
  });

  // ─── Checkout ───────────────────────────────────────────────────────────
  api.post('/checkout/session', limitCheckout, jsonLimit, async (c) => {
    const parsed = checkoutRequestSchema.safeParse(await readJson(c));
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: 'Revisa los datos del formulario.', fields: fieldErrors(parsed.error) }, 422);
    }

    let draft;
    try {
      draft = buildOrderDraft(parsed.data);
    } catch (error) {
      if (error instanceof CheckoutError) {
        return c.json({ error: error.code, message: error.message, line: error.details }, 409);
      }
      throw error;
    }

    if (!payments) {
      // Sin pasarela configurada no se crea ningún pedido ni se simula un pago.
      return c.json(
        {
          error: 'payments_not_configured',
          message: 'Los pagos online todavía no están activados en esta tienda.',
          totals: draft.totals,
        },
        503,
      );
    }

    const order = repos.orders.create(newOrderRecord(parsed.data, draft));
    try {
      const session = await payments.createCheckoutSession(order, {
        success: `${env.PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel: `${env.PUBLIC_URL}/checkout?cancelled=1`,
      });
      repos.orders.attachPaymentSession(order.id, session.id);
      if (parsed.data.marketingOptIn) repos.newsletter.subscribe(parsed.data.email, 'checkout');
      return c.json({ url: session.url, orderNumber: order.number }, 201);
    } catch (error) {
      repos.orders.delete(order.id);
      logger.error('[checkout] Error al crear la sesión de pago', error);
      return c.json({ error: 'payment_provider_error', message: 'No hemos podido iniciar el pago. Inténtalo de nuevo.' }, 502);
    }
  });

  api.get('/checkout/session/:sessionId', (c) => {
    const order = repos.orders.findByPaymentSession(c.req.param('sessionId'));
    if (!order) return c.json({ error: 'not_found' }, 404);
    return c.json({
      orderNumber: order.number,
      status: order.status,
      email: order.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2'),
      total: order.totals.total,
      itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    });
  });

  // ─── Webhook de pagos ───────────────────────────────────────────────────
  api.post('/webhooks/stripe', async (c) => {
    if (!payments) return c.json({ error: 'payments_not_configured' }, 503);
    const signature = c.req.header('stripe-signature');
    if (!signature) return c.json({ error: 'missing_signature' }, 400);
    const rawBody = await c.req.text();
    let event;
    try {
      event = payments.parseWebhook(rawBody, signature);
    } catch (error) {
      logger.warn('[webhook] Firma no válida', error instanceof Error ? error.message : error);
      return c.json({ error: 'invalid_signature' }, 400);
    }
    if (!event) return c.json({ received: true });

    const order = repos.orders.findByPaymentSession(event.sessionId);
    if (!order) {
      logger.warn(`[webhook] Pedido no encontrado para la sesión ${event.sessionId}`);
      return c.json({ received: true });
    }
    if (event.type === 'checkout.completed' && event.paid) repos.orders.updateStatus(order.id, 'paid');
    if (event.type === 'checkout.expired' && order.status === 'pending_payment') repos.orders.updateStatus(order.id, 'expired');
    if (event.type === 'checkout.async_payment_failed') repos.orders.updateStatus(order.id, 'cancelled');
    logger.info(`[webhook] ${event.type} → pedido ${order.number}`);
    return c.json({ received: true });
  });

  // ─── Newsletter ─────────────────────────────────────────────────────────
  api.post('/newsletter', limitForms, jsonLimit, async (c) => {
    const parsed = newsletterSchema.safeParse(await readJson(c));
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: 'Revisa los datos.', fields: fieldErrors(parsed.error) }, 422);
    }
    const created = repos.newsletter.subscribe(parsed.data.email, parsed.data.source);
    return c.json({ status: created ? 'subscribed' : 'already_subscribed' }, created ? 201 : 200);
  });

  // ─── Contacto ───────────────────────────────────────────────────────────
  api.post('/contact', limitForms, jsonLimit, async (c) => {
    const body = await readJson(c);
    if (body && typeof body === 'object' && 'website' in body && (body as { website?: string }).website) {
      // Honeypot relleno: respuesta neutra para no dar pistas a los bots.
      return c.json({ status: 'received' }, 201);
    }
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: 'Revisa los datos del formulario.', fields: fieldErrors(parsed.error) }, 422);
    }
    repos.contact.create(parsed.data);
    return c.json({ status: 'received' }, 201);
  });

  api.notFound((c) => c.json({ error: 'not_found' }, 404));
  api.onError((error, c) => {
    logger.error('[api] Error no controlado', error);
    return c.json({ error: 'internal_error', message: 'Ha ocurrido un error inesperado.' }, 500);
  });

  return api;
}
