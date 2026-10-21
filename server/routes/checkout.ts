import { Hono } from 'hono';
import { formatPrice } from '../../shared/pricing';
import { checkoutRequestSchema, fieldErrors } from '../../shared/schemas';
import { readJson, type AppDeps, type AppEnv } from '../context';
import { InsufficientStockError, type OrderRecord } from '../db';
import { stockSnapshot } from '../inventory';
import { buildOrderDraft, CheckoutError, newOrderRecord, sameItems } from '../orders';
import { rateLimit } from '../rate-limit';

export function checkoutRoutes(deps: AppDeps) {
  const { env, repos, payments, mailer, shippingMethods, logger } = deps;
  const app = new Hono<AppEnv>();
  const limit = rateLimit({ windowMs: 60 * 1000, max: 12, keyFor: deps.clientIp });

  app.post('/checkout/session', limit, async (c) => {
    const parsed = checkoutRequestSchema.safeParse(await readJson(c));
    if (!parsed.success) {
      return c.json({ error: 'validation_error', message: 'Revisa los datos del formulario.', fields: fieldErrors(parsed.error) }, 422);
    }
    const request = parsed.data;

    if (shippingMethods.length === 0) {
      return c.json(
        { error: 'shipping_not_configured', message: 'Los métodos y tarifas de envío todavía no están configurados en esta tienda.' },
        503,
      );
    }

    let draft;
    try {
      draft = buildOrderDraft(request, stockSnapshot(repos), shippingMethods);
    } catch (error) {
      if (error instanceof CheckoutError) return c.json({ error: error.code, message: error.message, line: error.details }, 409);
      throw error;
    }

    // Intento repetido (doble clic, reintento de red): se reutiliza el mismo pedido y la misma sesión de pago.
    const existing = repos.orders.findByCheckoutId(request.checkoutId);
    if (existing) {
      if (existing.status === 'paid') return c.json({ error: 'already_paid', message: 'Este pedido ya está pagado.', orderNumber: existing.number }, 409);
      if (existing.status === 'pending_payment' && existing.paymentUrl && sameItems(existing.items, draft.items)) {
        return c.json({ url: existing.paymentUrl, orderNumber: existing.number, reused: true }, 200);
      }
      return c.json({ error: 'checkout_id_used', message: 'El carrito ha cambiado. Vuelve a intentarlo.' }, 409);
    }

    if (!payments) {
      // Sin pasarela configurada no se crea ningún pedido ni se simula un pago.
      return c.json(
        { error: 'payments_not_configured', message: 'Los pagos online todavía no están activados en esta tienda.', totals: draft.totals },
        503,
      );
    }

    let order: OrderRecord;
    try {
      order = repos.orders.createWithReservation(newOrderRecord(request, draft, c.get('user')?.id ?? null));
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return c.json({ error: 'out_of_stock', message: 'Alguien acaba de llevarse las últimas unidades de un producto de tu carrito.' }, 409);
      }
      throw error;
    }

    try {
      const session = await payments.createCheckoutSession(order, {
        success: `${env.PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel: `${env.PUBLIC_URL}/checkout?cancelled=1`,
      });
      repos.orders.attachPaymentSession(order.id, session.id, session.url);
      if (request.marketingOptIn) repos.newsletter.subscribe(request.email, 'checkout');
      return c.json({ url: session.url, orderNumber: order.number }, 201);
    } catch (error) {
      repos.orders.delete(order.id); // libera la reserva
      logger.error('[checkout] Error al crear la sesión de pago', error);
      return c.json({ error: 'payment_provider_error', message: 'No hemos podido iniciar el pago. Inténtalo de nuevo.' }, 502);
    }
  });

  app.get('/checkout/session/:sessionId', (c) => {
    const order = repos.orders.findByPaymentSession(c.req.param('sessionId'));
    if (!order) return c.json({ error: 'not_found' }, 404);
    return c.json({
      orderNumber: order.number,
      status: order.status,
      email: order.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2'),
      total: order.totals.total,
      itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
      items: order.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
    });
  });

  // ─── Webhook de pagos (firma verificada por el proveedor) ────────────────
  app.post('/webhooks/stripe', async (c) => {
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

    if (event.type === 'checkout.completed' && event.paid && order.status !== 'paid') {
      const paid = repos.orders.markPaid(order.id);
      if (paid.needsReview) logger.warn(`[webhook] Pedido ${paid.number} pagado sin stock reservado: revisar manualmente.`);
      if (mailer) {
        const lines = paid.items.map((item) => `- ${item.name} · ${item.colorName} · ${item.size} × ${item.quantity}`).join('\n');
        mailer
          .send({
            to: paid.email,
            subject: `Pedido ${paid.number} confirmado`,
            text: `Gracias por tu compra en HYPSOS.\n\nPedido: ${paid.number}\n${lines}\n\nTotal: ${formatPrice(paid.totals.total)}`,
          })
          .catch((error) => logger.error('[mail] No se pudo enviar la confirmación de pedido', error));
      }
    }
    if (event.type === 'checkout.expired') repos.orders.release(order.id, 'expired');
    if (event.type === 'checkout.async_payment_failed') repos.orders.release(order.id, 'cancelled');
    logger.info(`[webhook] ${event.type} → pedido ${order.number}`);
    return c.json({ received: true });
  });

  return app;
}
