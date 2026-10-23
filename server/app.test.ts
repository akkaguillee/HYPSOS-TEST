// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShippingMethod } from '../shared/types';
import { createApi } from './app';
import { openDatabase, type Repositories } from './db';
import { loadEnv } from './env';
import { syncCatalogInventory } from './inventory';
import type { Mail, Mailer } from './mailer';
import type { PaymentProvider } from './payments';

const env = loadEnv({ NODE_ENV: 'test', PUBLIC_URL: 'https://hypsos.test' });
const silentLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const shipping: ShippingMethod[] = [{ id: 'standard', name: 'Estándar', description: 'Prueba', price: 495, freeFrom: 8000 }];

let checkoutCounter = 0;
const checkoutId = () => `00000000-0000-4000-8000-${String(++checkoutCounter).padStart(12, '0')}`;

const validCheckout = () => ({
  checkoutId: checkoutId(),
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
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (response: Response): Promise<any> => response.json();

type Api = ReturnType<typeof createApi>;

/** Cliente mínimo con cookies para probar sesiones. */
function client(api: Api) {
  let cookie = '';
  const request = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const response = await api.request(path, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0].endsWith('=') ? '' : setCookie.split(';')[0];
    return response;
  };
  return {
    get: (path: string) => request('GET', path),
    post: (path: string, body?: unknown, headers?: Record<string, string>) => request('POST', path, body, headers),
    put: (path: string, body?: unknown) => request('PUT', path, body),
    patch: (path: string, body?: unknown) => request('PATCH', path, body),
    del: (path: string, body?: unknown) => request('DELETE', path, body),
    get cookie() {
      return cookie;
    },
  };
}

describe('API', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = openDatabase(':memory:');
    syncCatalogInventory(repos);
  });
  afterEach(() => repos.close());

  const available = (variant: string) => repos.inventory.available().get(variant);

  describe('estado e inventario', () => {
    it('informa de qué integraciones están activas', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger, shippingMethods: [] });
      expect(await json(await api.request('/store-status'))).toEqual({ payments: false, shipping: false, email: false, demoCatalog: true });
    });

    it('publica el stock disponible por variante', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const body = await json(await api.request('/inventory'));
      expect(body.available['p-tee-ascenso:negro:M']).toBe(2);
      expect(body.available['p-tee-ascenso:blanco:XS']).toBe(0);
    });

    it('la sincronización del catálogo no pisa el stock ya existente', () => {
      repos.inventory.set('p-tee-ascenso:negro:M', 7);
      expect(syncCatalogInventory(repos)).toBe(0);
      expect(available('p-tee-ascenso:negro:M')).toBe(7);
    });
  });

  describe('checkout sin integraciones', () => {
    it('no cobra si no hay envíos configurados', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger, shippingMethods: [] });
      const response = await client(api).post('/checkout/session', validCheckout());
      expect(response.status).toBe(503);
      expect((await json(response)).error).toBe('shipping_not_configured');
    });

    it('no crea pedidos ni simula pagos sin pasarela', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger, shippingMethods: shipping });
      const response = await client(api).post('/checkout/session', validCheckout());
      expect(response.status).toBe(503);
      const body = await json(response);
      expect(body.error).toBe('payments_not_configured');
      expect(body.totals).toMatchObject({ subtotal: 6400, shipping: 495, total: 6895 });
      expect(available('p-tee-ascenso:negro:L')).toBe(14); // sin reservas
    });
  });

  describe('checkout con pasarela', () => {
    const createCheckoutSession = vi.fn<PaymentProvider['createCheckoutSession']>();
    const parseWebhook = vi.fn<PaymentProvider['parseWebhook']>();
    const payments: PaymentProvider = { createCheckoutSession, parseWebhook };
    let sessionCounter = 0;

    beforeEach(() => {
      createCheckoutSession.mockReset().mockImplementation(async () => {
        sessionCounter += 1;
        return { id: `cs_test_${sessionCounter}`, url: `https://checkout.stripe.test/cs_test_${sessionCounter}` };
      });
      parseWebhook.mockReset();
    });

    const makeApi = (extra: Partial<Parameters<typeof createApi>[0]> = {}) =>
      createApi({ env, repos, payments, logger: silentLogger, shippingMethods: shipping, ...extra });

    it('calcula precios en el servidor, ignora los del cliente y reserva el stock', async () => {
      const api = makeApi();
      const request = validCheckout();
      const tampered = { ...request, lines: [{ ...request.lines[0], price: 1, unitPrice: 1 }] };
      const response = await client(api).post('/checkout/session', tampered);
      expect(response.status).toBe(201);
      const [order, urls] = createCheckoutSession.mock.calls[0];
      expect(order.items[0]).toMatchObject({ unitPrice: 3200, quantity: 2, sku: 'HYP-TS-001-NEGRO-L', variantId: 'p-tee-ascenso:negro:L' });
      expect(order.totals.total).toBe(6895);
      expect(order.email).toBe('cliente@example.com');
      expect(order.reservation).toBe('held');
      expect(urls.success).toBe('https://hypsos.test/checkout/success?session_id={CHECKOUT_SESSION_ID}');
      expect(available('p-tee-ascenso:negro:L')).toBe(12);
    });

    it('un intento repetido reutiliza el mismo pedido (sin duplicados)', async () => {
      const api = makeApi();
      const request = validCheckout();
      const first = await json(await client(api).post('/checkout/session', request));
      const second = await client(api).post('/checkout/session', request);
      expect(second.status).toBe(200);
      expect(await json(second)).toMatchObject({ url: first.url, reused: true });
      expect(createCheckoutSession).toHaveBeenCalledTimes(1);
      expect(available('p-tee-ascenso:negro:L')).toBe(12);

      const changed = await client(api).post('/checkout/session', { ...request, lines: [{ ...request.lines[0], quantity: 1 }] });
      expect((await json(changed)).error).toBe('checkout_id_used');
    });

    it('aplica el envío gratuito configurado', async () => {
      const api = makeApi();
      await client(api).post('/checkout/session', { ...validCheckout(), lines: [{ productId: 'p-hoodie-ascenso', colorId: 'negro', size: 'M', quantity: 2 }] });
      expect(createCheckoutSession.mock.calls[0][0].totals).toMatchObject({ subtotal: 11800, shipping: 0, total: 11800 });
    });

    it('rechaza variantes agotadas, inexistentes, cantidades excesivas y envíos no válidos', async () => {
      const api = makeApi();
      const http = client(api);
      const base = validCheckout();
      const send = (lines: unknown[], extra = {}) => http.post('/checkout/session', { ...base, checkoutId: checkoutId(), lines, ...extra });
      expect((await json(await send([{ productId: 'p-tee-ascenso', colorId: 'blanco', size: 'XS', quantity: 1 }]))).error).toBe('out_of_stock');
      expect((await json(await send([{ productId: 'p-tee-ascenso', colorId: 'rosa', size: 'L', quantity: 1 }]))).error).toBe('invalid_variant');
      const line = { productId: 'p-tee-ascenso', colorId: 'negro', size: 'M', quantity: 1 };
      expect((await json(await send([line, line, line]))).error).toBe('quantity_exceeded');
      expect((await json(await send([line], { shippingMethod: 'teletransporte' }))).error).toBe('invalid_shipping_method');
      expect(createCheckoutSession).not.toHaveBeenCalled();
    });

    it('dos compradores no pueden reservar la última unidad', async () => {
      repos.inventory.set('p-tee-ascenso:negro:M', 1);
      const api = makeApi();
      const line = [{ productId: 'p-tee-ascenso', colorId: 'negro', size: 'M', quantity: 1 }];
      const first = await client(api).post('/checkout/session', { ...validCheckout(), lines: line });
      const second = await client(api).post('/checkout/session', { ...validCheckout(), lines: line });
      expect(first.status).toBe(201);
      expect(second.status).toBe(409);
      expect((await json(second)).error).toBe('out_of_stock');
    });

    it('libera la reserva si la pasarela falla', async () => {
      createCheckoutSession.mockRejectedValueOnce(new Error('network'));
      const api = makeApi();
      const response = await client(api).post('/checkout/session', validCheckout());
      expect(response.status).toBe(502);
      expect(available('p-tee-ascenso:negro:L')).toBe(14);
    });

    it('el webhook firmado confirma el pago y descuenta el stock una sola vez', async () => {
      const mails: Mail[] = [];
      const mailer: Mailer = { kind: 'console', send: async (mail) => void mails.push(mail) };
      const api = makeApi({ mailer });
      const http = client(api);
      await http.post('/checkout/session', validCheckout());
      const sessionId = createCheckoutSession.mock.results[0].value instanceof Promise ? (await createCheckoutSession.mock.results[0].value).id : '';
      parseWebhook.mockReturnValue({ type: 'checkout.completed', sessionId, paid: true });

      expect((await http.post('/webhooks/stripe', '{}')).status).toBe(400); // sin firma
      for (let i = 0; i < 2; i++) {
        const response = await http.post('/webhooks/stripe', '{"id":"evt"}', { 'stripe-signature': 't=1,v1=abc' });
        expect(response.status).toBe(200);
      }
      expect(parseWebhook).toHaveBeenCalledWith('{"id":"evt"}', 't=1,v1=abc');
      expect(repos.inventory.get('p-tee-ascenso:negro:L')).toEqual({ stock: 12, reserved: 0 });
      const status = await json(await http.get(`/checkout/session/${sessionId}`));
      expect(status).toMatchObject({ status: 'paid', itemCount: 2, email: 'cl•••@example.com' });
      await vi.waitFor(() => expect(mails).toHaveLength(1));
      expect(mails[0].subject).toContain('confirmado');
    });

    it('una sesión caducada libera el stock', async () => {
      const api = makeApi();
      const http = client(api);
      await http.post('/checkout/session', validCheckout());
      const { id } = await createCheckoutSession.mock.results[0].value;
      parseWebhook.mockReturnValue({ type: 'checkout.expired', sessionId: id });
      await http.post('/webhooks/stripe', '{}', { 'stripe-signature': 'sig' });
      expect(available('p-tee-ascenso:negro:L')).toBe(14);
      expect(repos.orders.findByPaymentSession(id)?.status).toBe('expired');
    });

    it('rechaza webhooks con firma no válida', async () => {
      parseWebhook.mockImplementation(() => {
        throw new Error('bad signature');
      });
      const response = await client(makeApi()).post('/webhooks/stripe', '{}', { 'stripe-signature': 'forged' });
      expect(response.status).toBe(400);
    });
  });

  describe('seguridad de las peticiones', () => {
    it('bloquea peticiones de otros orígenes y cuerpos que no son JSON', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger });
      const crossSite = await api.request('/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
        body: JSON.stringify({ email: 'a@b.co', consent: true }),
      });
      expect(crossSite.status).toBe(403);
      const form = await api.request('/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '20' },
        body: 'email=a%40b.co&consent=1',
      });
      expect(form.status).toBe(415);
    });

    it('valida y devuelve errores por campo', async () => {
      const api = createApi({ env, repos, payments: null, logger: silentLogger, shippingMethods: shipping });
      const response = await client(api).post('/checkout/session', { ...validCheckout(), email: 'no-es-email', acceptTerms: false });
      expect(response.status).toBe(422);
      const body = await json(response);
      expect(body.fields.email).toBe('Introduce un email válido');
      expect(body.fields.acceptTerms).toBe('Debes aceptar las condiciones de compra');
    });
  });

  describe('cuentas', () => {
    const mails: Mail[] = [];
    const mailer: Mailer = { kind: 'console', send: async (mail) => void mails.push(mail) };
    const makeApi = () => createApi({ env, repos, payments: null, mailer, logger: silentLogger, clientIp: () => `ip-${Math.random()}` });
    const account = { name: 'Ana', email: 'ana@hypsos.test', password: 'Ascenso2026', acceptTerms: true };

    beforeEach(() => mails.splice(0));

    it('registro, sesión con cookie segura, cierre y login', async () => {
      const http = client(makeApi());
      const registered = await http.post('/auth/register', account);
      expect(registered.status).toBe(201);
      expect(registered.headers.get('set-cookie')).toMatch(/hypsos_session=.+; Path=\/; Expires=.+; HttpOnly; SameSite=Lax/);
      expect((await json(await http.get('/auth/me'))).user).toMatchObject({ email: 'ana@hypsos.test', name: 'Ana' });
      expect((await json(await http.get('/auth/me'))).user.passwordHash).toBeUndefined();

      await http.post('/auth/logout');
      expect((await json(await http.get('/auth/me'))).user).toBeNull();

      expect((await http.post('/auth/login', { email: account.email, password: 'incorrecta1' })).status).toBe(401);
      expect((await http.post('/auth/login', { email: 'nadie@hypsos.test', password: 'incorrecta1' })).status).toBe(401);
      expect((await http.post('/auth/login', { email: 'ANA@hypsos.test', password: account.password })).status).toBe(200);
      expect((await http.post('/auth/register', account)).status).toBe(409);
    });

    it('exige contraseñas robustas', async () => {
      const response = await client(makeApi()).post('/auth/register', { ...account, password: 'corta' });
      expect((await json(response)).fields.password).toBe('La contraseña debe tener al menos 10 caracteres');
    });

    it('protege el área de cliente', async () => {
      const http = client(makeApi());
      expect((await http.get('/account/orders')).status).toBe(401);
      expect((await http.put('/account/wishlist', { productIds: [] })).status).toBe(401);
    });

    it('recupera la contraseña con un enlace de un solo uso', async () => {
      const http = client(makeApi());
      await http.post('/auth/register', account);
      await http.post('/auth/logout');
      expect((await http.post('/auth/password/forgot', { email: 'nadie@hypsos.test' })).status).toBe(200);
      expect(mails).toHaveLength(0);
      await http.post('/auth/password/forgot', { email: account.email });
      const token = decodeURIComponent(mails[0].text.match(/token=([^\s]+)/)![1]);
      expect((await http.post('/auth/password/reset', { token, password: 'NuevaClave2027' })).status).toBe(200);
      expect((await http.post('/auth/password/reset', { token, password: 'OtraClave2028' })).status).toBe(400);
      await http.post('/auth/logout');
      expect((await http.post('/auth/login', { email: account.email, password: 'NuevaClave2027' })).status).toBe(200);
    });

    it('sin proveedor de email la recuperación lo indica', async () => {
      const api = createApi({ env, repos, payments: null, mailer: null, logger: silentLogger });
      const response = await client(api).post('/auth/password/forgot', { email: account.email });
      expect((await json(response)).error).toBe('email_not_configured');
    });

    it('perfil, direcciones, favoritos y baja de la cuenta', async () => {
      const http = client(makeApi());
      await http.post('/auth/register', account);
      expect((await json(await http.patch('/account/profile', { name: 'Ana G.', marketingOptIn: true }))).user.name).toBe('Ana G.');

      const address = { ...validCheckout().shippingAddress, label: 'Casa' };
      const created = await json(await http.post('/account/addresses', address));
      expect(created.address).toMatchObject({ label: 'Casa', isDefault: true });
      const second = await json(await http.post('/account/addresses', { ...address, label: 'Trabajo', isDefault: true }));
      const list = (await json(await http.get('/account/addresses'))).addresses;
      expect(list.map((a: { label: string; isDefault: boolean }) => [a.label, a.isDefault])).toEqual([
        ['Trabajo', true],
        ['Casa', false],
      ]);
      expect((await http.del(`/account/addresses/${second.address.id}`)).status).toBe(200);

      const wishlist = await json(await http.put('/account/wishlist', { productIds: ['p-cap-monogram', 'inventado', 'p-tote'] }));
      expect(wishlist.productIds).toEqual(['p-cap-monogram', 'p-tote']);

      expect((await http.del('/account', { password: 'mal' })).status).toBe(401);
      expect((await http.del('/account', { password: account.password })).status).toBe(200);
      expect((await http.post('/auth/login', { email: account.email, password: account.password })).status).toBe(401);
    });

    it('el pedido de un cliente con sesión aparece en su historial', async () => {
      const payments: PaymentProvider = {
        createCheckoutSession: async () => ({ id: 'cs_user', url: 'https://checkout.stripe.test/cs_user' }),
        parseWebhook: () => null,
      };
      const api = createApi({ env, repos, payments, mailer, logger: silentLogger, shippingMethods: shipping, clientIp: () => 'ip-user' });
      const http = client(api);
      await http.post('/auth/register', account);
      await http.post('/checkout/session', validCheckout());
      const orders = (await json(await http.get('/account/orders'))).orders;
      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({ status: 'pending_payment', total: 6895 });
    });
  });

  describe('formularios', () => {
    it('newsletter: suscribe una vez y exige consentimiento', async () => {
      const http = client(createApi({ env, repos, payments: null, logger: silentLogger }));
      expect((await http.post('/newsletter', { email: 'drop@hypsos.test', consent: true })).status).toBe(201);
      expect(await json(await http.post('/newsletter', { email: 'DROP@hypsos.test', consent: true }))).toEqual({ status: 'already_subscribed' });
      expect((await http.post('/newsletter', { email: 'x@hypsos.test', consent: false })).status).toBe(422);
    });

    it('limita las peticiones repetidas', async () => {
      const http = client(createApi({ env, repos, payments: null, logger: silentLogger, clientIp: () => '1.2.3.4' }));
      const statuses: number[] = [];
      for (let i = 0; i < 10; i++) statuses.push((await http.post('/newsletter', { email: `u${i}@hypsos.test`, consent: true })).status);
      expect(statuses.slice(0, 8).every((status) => status === 201)).toBe(true);
      expect(statuses.at(-1)).toBe(429);
    });

    it('registra avisos de reposición de variantes reales', async () => {
      const http = client(createApi({ env, repos, payments: null, logger: silentLogger }));
      const alert = { email: 'fan@hypsos.test', productId: 'p-tee-ascenso', colorId: 'blanco', size: 'XS', consent: true };
      expect((await http.post('/stock-alerts', alert)).status).toBe(201);
      expect(repos.stockAlerts.pending('p-tee-ascenso:blanco:XS')).toHaveLength(1);
      expect((await http.post('/stock-alerts', { ...alert, size: 'XXXL' })).status).toBe(404);
    });

    it('contacto: guarda mensajes válidos y descarta bots silenciosamente', async () => {
      const http = client(createApi({ env, repos, payments: null, logger: silentLogger }));
      const message = { name: 'Ana', email: 'ana@hypsos.test', subject: 'pedido', message: 'Hola, quería saber el estado de mi pedido.', consent: true };
      expect((await http.post('/contact', message)).status).toBe(201);
      expect((await http.post('/contact', { ...message, website: 'http://spam' })).status).toBe(201);
      expect((await http.post('/contact', { ...message, message: 'corto' })).status).toBe(422);
    });
  });
});
