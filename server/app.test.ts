// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './app';
import { openDatabase, type Repositories } from './db';
import { loadEnv } from './env';
import type { PaymentProvider } from './payments';

const env = loadEnv({ NODE_ENV: 'test', PUBLIC_URL: 'https://hypsos.test' });
const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const validCheckout = {
  email: 'Cliente@Example.com ',
  marketingOptIn: false,
  shippingMethod: 'standard',
  acceptTerms: true,
  shippingAddress: {
    firstName: 'Ana',
    lastName: 'García',
    address1: 'Calle Mayor 1',
    postalCode: '28013',
    city: 'Madrid',
    province: 'Madrid',
    country: 'ES',
    phone: '+34 600 000 000',
  },
  lines: [{ productId: 'p-tee-ascenso', colorId: 'negro', size: 'L', quantity: 2 }],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (response: Response): Promise<any> => response.json();

function post(api: ReturnType<typeof createApi>, path: string, body: unknown, headers: Record<string, string> = {}) {
  return api.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('API', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = openDatabase(':memory:');
  });
  afterEach(() => repos.close());

  describe('sin pasarela de pago configurada', () => {
    it('informa del estado en /health', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const response = await api.request('/health');
      expect(await json(response)).toMatchObject({ status: 'ok', payments: 'not_configured' });
    });

    it('no crea pedidos ni simula pagos', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const response = await post(api, '/checkout/session', validCheckout);
      expect(response.status).toBe(503);
      const body = await json(response);
      expect(body.error).toBe('payments_not_configured');
      // 2 × 39 € = 78 € → no llega al envío gratuito (80 €).
      expect(body.totals).toMatchObject({ subtotal: 7800, shipping: 495, total: 8295 });
    });
  });

  describe('con pasarela de pago', () => {
    const createCheckoutSession = vi.fn<PaymentProvider['createCheckoutSession']>();
    const parseWebhook = vi.fn<PaymentProvider['parseWebhook']>();
    const payments: PaymentProvider = { createCheckoutSession, parseWebhook };

    beforeEach(() => {
      createCheckoutSession.mockReset().mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.test/cs_test_123' });
      parseWebhook.mockReset();
    });

    it('calcula los precios en el servidor e ignora los enviados por el cliente', async () => {
      const api = createApi({ env, repos, payments, logger: silentLogger });
      const tampered = {
        ...validCheckout,
        lines: [{ ...validCheckout.lines[0], price: 1, unitPrice: 1 }],
      };
      const response = await post(api, '/checkout/session', tampered);
      expect(response.status).toBe(201);
      expect(await json(response)).toMatchObject({ url: 'https://checkout.stripe.test/cs_test_123' });

      const [order, urls] = createCheckoutSession.mock.calls[0];
      expect(order.items[0]).toMatchObject({ unitPrice: 3900, quantity: 2, name: 'Camiseta Ascenso Heavyweight' });
      expect(order.totals.total).toBe(8295);
      expect(order.email).toBe('cliente@example.com');
      expect(urls.success).toBe('https://hypsos.test/checkout/success?session_id={CHECKOUT_SESSION_ID}');
      expect(repos.orders.findByPaymentSession('cs_test_123')?.status).toBe('pending_payment');
    });

    it('aplica el envío gratuito desde el umbral', async () => {
      const api = createApi({ env, repos, payments, logger: silentLogger });
      const response = await post(api, '/checkout/session', {
        ...validCheckout,
        lines: [{ productId: 'p-hoodie-ascenso', colorId: 'negro', size: 'M', quantity: 1 }],
      });
      expect(response.status).toBe(201);
      expect(createCheckoutSession.mock.calls[0][0].totals).toMatchObject({ subtotal: 8900, shipping: 0, total: 8900 });
    });

    it('rechaza variantes agotadas o inexistentes', async () => {
      const api = createApi({ env, repos, payments, logger: silentLogger });
      const soldOut = await post(api, '/checkout/session', {
        ...validCheckout,
        lines: [{ productId: 'p-tee-ascenso', colorId: 'blanco', size: 'XS', quantity: 1 }],
      });
      expect(soldOut.status).toBe(409);
      expect((await json(soldOut)).error).toBe('out_of_stock');

      const invalid = await post(api, '/checkout/session', {
        ...validCheckout,
        lines: [{ productId: 'p-tee-ascenso', colorId: 'rosa', size: 'L', quantity: 1 }],
      });
      expect((await json(invalid)).error).toBe('invalid_variant');
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('rechaza cantidades por encima del stock (sumando líneas duplicadas)', async () => {
      const api = createApi({ env, repos, payments, logger: silentLogger });
      const line = { productId: 'p-tee-ascenso', colorId: 'negro', size: 'M', quantity: 1 };
      const response = await post(api, '/checkout/session', { ...validCheckout, lines: [line, line, line] });
      expect(response.status).toBe(409);
      expect((await json(response)).error).toBe('quantity_exceeded');
    });

    it('elimina el pedido si la pasarela falla', async () => {
      createCheckoutSession.mockRejectedValueOnce(new Error('network'));
      const api = createApi({ env, repos, payments, logger: silentLogger });
      const response = await post(api, '/checkout/session', validCheckout);
      expect(response.status).toBe(502);
      expect(repos.orders.findByPaymentSession('cs_test_123')).toBeUndefined();
    });

    it('marca el pedido como pagado mediante el webhook firmado', async () => {
      const api = createApi({ env, repos, payments, logger: silentLogger });
      await post(api, '/checkout/session', validCheckout);
      parseWebhook.mockReturnValue({ type: 'checkout.completed', sessionId: 'cs_test_123', paid: true });

      const unsigned = await post(api, '/webhooks/stripe', '{}');
      expect(unsigned.status).toBe(400);

      const response = await post(api, '/webhooks/stripe', '{"id":"evt"}', { 'stripe-signature': 't=1,v1=abc' });
      expect(response.status).toBe(200);
      expect(parseWebhook).toHaveBeenCalledWith('{"id":"evt"}', 't=1,v1=abc');
      expect(repos.orders.findByPaymentSession('cs_test_123')?.status).toBe('paid');

      const status = await json(await api.request('/checkout/session/cs_test_123'));
      expect(status).toMatchObject({ status: 'paid', itemCount: 2, email: 'cl•••@example.com' });
    });

    it('rechaza webhooks con firma no válida', async () => {
      parseWebhook.mockImplementation(() => {
        throw new Error('bad signature');
      });
      const api = createApi({ env, repos, payments, logger: silentLogger });
      const response = await post(api, '/webhooks/stripe', '{}', { 'stripe-signature': 'forged' });
      expect(response.status).toBe(400);
    });
  });

  describe('validación de checkout', () => {
    it('devuelve errores por campo', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const response = await post(api, '/checkout/session', { ...validCheckout, email: 'no-es-email', acceptTerms: false });
      expect(response.status).toBe(422);
      const body = await json(response);
      expect(body.fields.email).toBe('Introduce un email válido');
      expect(body.fields.acceptTerms).toBe('Debes aceptar las condiciones de compra');
    });

    it('rechaza JSON mal formado', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const response = await post(api, '/checkout/session', '{oops');
      expect(response.status).toBe(422);
    });
  });

  describe('newsletter', () => {
    it('suscribe una vez y detecta duplicados', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const first = await post(api, '/newsletter', { email: 'drop@hypsos.test', consent: true });
      expect(first.status).toBe(201);
      const second = await post(api, '/newsletter', { email: 'DROP@hypsos.test', consent: true });
      expect(await json(second)).toEqual({ status: 'already_subscribed' });
    });

    it('exige consentimiento explícito', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const response = await post(api, '/newsletter', { email: 'drop@hypsos.test', consent: false });
      expect(response.status).toBe(422);
    });

    it('limita las peticiones repetidas', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger, clientIp: () => '1.2.3.4' });
      const statuses: number[] = [];
      for (let i = 0; i < 10; i++) {
        statuses.push((await post(api, '/newsletter', { email: `u${i}@hypsos.test`, consent: true })).status);
      }
      expect(statuses.slice(0, 8).every((status) => status === 201)).toBe(true);
      expect(statuses.at(-1)).toBe(429);
    });
  });

  describe('contacto', () => {
    it('guarda mensajes válidos y descarta bots silenciosamente', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const message = {
        name: 'Ana',
        email: 'ana@hypsos.test',
        subject: 'pedido',
        message: 'Hola, quería saber el estado de mi pedido.',
        consent: true,
      };
      expect((await post(api, '/contact', message)).status).toBe(201);
      expect((await post(api, '/contact', { ...message, website: 'http://spam' })).status).toBe(201);
      expect((await post(api, '/contact', { ...message, message: 'corto' })).status).toBe(422);
    });
  });
});
