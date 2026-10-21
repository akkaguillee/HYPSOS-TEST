import { Hono } from 'hono';
import { getProductByHandle, isProductAvailable, products } from '../../shared/catalog';
import { store } from '../../shared/config';
import type { AppDeps, AppEnv } from '../context';
import { stockSnapshot } from '../inventory';

export function catalogRoutes({ repos, payments, mailer, shippingMethods }: AppDeps) {
  const app = new Hono<AppEnv>();

  /** Qué integraciones están activas: la web lo usa para no prometer lo que no está disponible. */
  app.get('/store-status', (c) =>
    c.json({
      payments: Boolean(payments),
      shipping: shippingMethods.length > 0,
      email: Boolean(mailer),
      demoCatalog: store.demoCatalog,
    }),
  );

  /** Stock disponible en tiempo real (stock − reservas de pagos en curso) por variante. */
  app.get('/inventory', (c) => {
    const available = repos.inventory.available();
    return c.json({ available: Object.fromEntries(available), updatedAt: new Date().toISOString() });
  });

  app.get('/products', (c) => {
    const stock = stockSnapshot(repos);
    return c.json({
      products: products.map((product) => ({
        id: product.id,
        handle: product.handle,
        name: product.name,
        category: product.category,
        price: product.price,
        currency: store.currency,
        available: isProductAvailable(product, stock),
      })),
    });
  });

  app.get('/products/:handle', (c) => {
    const product = getProductByHandle(c.req.param('handle'));
    if (!product) return c.json({ error: 'not_found' }, 404);
    const { initialStock: _seed, ...publicProduct } = product;
    return c.json({ product: { ...publicProduct, available: isProductAvailable(product, stockSnapshot(repos)) } });
  });

  return app;
}
