import Stripe from 'stripe';
import { shippingMethods, store } from '../shared/config';
import type { OrderRecord } from './db';

/**
 * Pasarela de pago desacoplada del resto de la API.
 * La implementación real usa Stripe Checkout (página de pago alojada por Stripe:
 * los datos de tarjeta nunca pasan por nuestro servidor).
 */
export interface PaymentProvider {
  createCheckoutSession(order: OrderRecord, urls: { success: string; cancel: string }): Promise<{ id: string; url: string }>;
  /** Verifica la firma del webhook y devuelve el evento normalizado. */
  parseWebhook(rawBody: string, signature: string): PaymentEvent | null;
}

export type PaymentEvent =
  | { type: 'checkout.completed'; sessionId: string; paid: boolean }
  | { type: 'checkout.expired'; sessionId: string }
  | { type: 'checkout.async_payment_failed'; sessionId: string };

export function createStripeProvider(secretKey: string, webhookSecret: string): PaymentProvider {
  const stripe = new Stripe(secretKey, { appInfo: { name: 'hypsos-web' } });

  return {
    async createCheckoutSession(order, urls) {
      const method = shippingMethods.find((candidate) => candidate.id === order.shippingMethod)!;
      const address = order.shippingAddress;
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          locale: 'es',
          currency: store.currency.toLowerCase(),
          customer_email: order.email,
          client_reference_id: order.id,
          metadata: { orderId: order.id, orderNumber: order.number },
          line_items: order.items.map((item) => ({
            quantity: item.quantity,
            price_data: {
              currency: store.currency.toLowerCase(),
              unit_amount: item.unitPrice,
              product_data: {
                name: item.name,
                description: `${item.colorName} · Talla ${item.size}`,
                metadata: { sku: item.code, productId: item.productId },
              },
            },
          })),
          shipping_options: [
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                display_name: method.name,
                fixed_amount: { amount: order.totals.shipping, currency: store.currency.toLowerCase() },
              },
            },
          ],
          payment_intent_data: {
            metadata: { orderId: order.id, orderNumber: order.number },
            shipping: {
              name: `${address.firstName} ${address.lastName}`,
              phone: address.phone,
              address: {
                line1: address.address1,
                line2: address.address2 || undefined,
                postal_code: address.postalCode,
                city: address.city,
                state: address.province,
                country: address.country,
              },
            },
          },
          success_url: urls.success,
          cancel_url: urls.cancel,
        },
        { idempotencyKey: `checkout-${order.id}` },
      );
      if (!session.url) throw new Error('Stripe no devolvió la URL de pago');
      return { id: session.id, url: session.url };
    },

    parseWebhook(rawBody, signature) {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          return {
            type: 'checkout.completed',
            sessionId: event.data.object.id,
            paid: event.data.object.payment_status === 'paid',
          };
        case 'checkout.session.expired':
          return { type: 'checkout.expired', sessionId: event.data.object.id };
        case 'checkout.session.async_payment_failed':
          return { type: 'checkout.async_payment_failed', sessionId: event.data.object.id };
        default:
          return null;
      }
    },
  };
}
