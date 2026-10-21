/**
 * Administración básica de la tienda desde la terminal (misma base de datos que el servidor).
 *
 *   pnpm admin stock                         Lista el stock por variante
 *   pnpm admin stock:set <SKU> <unidades>    Fija el stock (avisa a quien pidió "Avísame" si vuelve a haber)
 *   pnpm admin orders [n]                    Últimos pedidos
 *   pnpm admin order <número>                Detalle de un pedido
 *   pnpm admin order:status <número> <shipped|cancelled>
 */
import { existsSync } from 'node:fs';
import { catalogProducts, productVariants, variantSku } from '../shared/catalog';
import { formatPrice } from '../shared/pricing';
import { openDatabase, type OrderStatus } from '../server/db';
import { loadEnv } from '../server/env';
import { syncCatalogInventory } from '../server/inventory';
import { createConsoleMailer, createResendMailer } from '../server/mailer';

if (existsSync('.env')) process.loadEnvFile('.env');
const env = loadEnv();
const repos = openDatabase(env.DATABASE_PATH);
syncCatalogInventory(repos);

const variants = catalogProducts.flatMap((product) =>
  productVariants(product).map((variant) => ({ ...variant, product, sku: variantSku(product, variant.colorId, variant.size) })),
);
const findVariant = (ref: string) => variants.find((variant) => variant.sku === ref.toUpperCase() || variant.id === ref);

const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case 'stock': {
      const rows = variants.map((variant) => {
        const row = repos.inventory.get(variant.id) ?? { stock: 0, reserved: 0 };
        return { SKU: variant.sku, producto: variant.product.name, stock: row.stock, reservado: row.reserved, disponible: row.stock - row.reserved };
      });
      console.table(rows);
      return;
    }
    case 'stock:set': {
      const [ref, qty] = args;
      const variant = ref ? findVariant(ref) : undefined;
      const units = Number(qty);
      if (!variant || !Number.isInteger(units) || units < 0) throw new Error('Uso: pnpm admin stock:set <SKU> <unidades ≥ 0>');
      const before = repos.inventory.get(variant.id);
      if (!repos.inventory.set(variant.id, units)) throw new Error(`No se puede fijar ${units}: hay ${before?.reserved ?? 0} unidades reservadas en pagos en curso.`);
      console.log(`${variant.sku}: ${before?.stock ?? 0} → ${units}`);
      const wasEmpty = (before?.stock ?? 0) - (before?.reserved ?? 0) <= 0;
      if (wasEmpty && units > 0) await notifyRestock(variant.id, variant.product.name, variant.product.handle);
      return;
    }
    case 'orders': {
      const orders = repos.orders.list(Number(args[0] ?? 20));
      console.table(
        orders.map((order) => ({
          número: order.number,
          estado: order.status + (order.needsReview ? ' (REVISAR)' : ''),
          email: order.email,
          total: formatPrice(order.totals.total),
          fecha: order.createdAt.slice(0, 16).replace('T', ' '),
        })),
      );
      return;
    }
    case 'order': {
      const order = args[0] ? repos.orders.findByNumber(args[0]) : undefined;
      if (!order) throw new Error('Pedido no encontrado');
      console.log(JSON.stringify(order, null, 2));
      return;
    }
    case 'order:status': {
      const [number, status] = args;
      const order = number ? repos.orders.findByNumber(number) : undefined;
      if (!order || !['shipped', 'cancelled'].includes(status ?? '')) throw new Error('Uso: pnpm admin order:status <número> <shipped|cancelled>');
      if (status === 'cancelled' && order.status === 'pending_payment') repos.orders.release(order.id, 'cancelled');
      else repos.orders.updateStatus(order.id, status as OrderStatus);
      console.log(`${order.number}: ${order.status} → ${status}`);
      return;
    }
    default:
      console.log(readHelp());
  }
}

async function notifyRestock(variantId: string, name: string, handle: string) {
  const pending = repos.stockAlerts.pending(variantId);
  if (!pending.length) return;
  const mailer = env.RESEND_API_KEY && env.MAIL_FROM ? createResendMailer(env.RESEND_API_KEY, env.MAIL_FROM) : env.NODE_ENV !== 'production' ? createConsoleMailer() : null;
  if (!mailer) {
    console.warn(`Hay ${pending.length} avisos de reposición pendientes, pero no hay proveedor de email configurado.`);
    return;
  }
  for (const alert of pending) {
    await mailer.send({ to: alert.email, subject: `${name} vuelve a estar disponible`, text: `Lo que esperabas ha vuelto:\n${env.PUBLIC_URL}/products/${handle}` });
  }
  repos.stockAlerts.markNotified(pending.map((alert) => alert.id));
  console.log(`Avisos de reposición enviados: ${pending.length}`);
}

function readHelp() {
  return `Comandos: stock · stock:set <SKU> <unidades> · orders [n] · order <número> · order:status <número> <shipped|cancelled>`;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => repos.close());
