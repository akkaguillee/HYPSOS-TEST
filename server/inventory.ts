import { catalogProducts, productVariants, variantKey } from '../shared/catalog';
import type { StockLookup } from '../shared/types';
import type { Repositories } from './db';

/**
 * Da de alta en la base de datos las variantes nuevas del catálogo con su stock inicial.
 * Las variantes existentes no se tocan: a partir de ahí el stock real se gestiona en la BD
 * (ventas, `pnpm admin stock:set`…).
 */
export function syncCatalogInventory(repos: Repositories): number {
  const variants = catalogProducts.flatMap((product) =>
    productVariants(product).map((variant) => ({
      variantId: variant.id,
      productId: product.id,
      stock: product.initialStock[variantKey(variant.colorId, variant.size)] ?? 0,
    })),
  );
  return repos.inventory.seed(variants);
}

/** Instantánea del stock disponible para validar un pedido o publicar disponibilidad. */
export function stockSnapshot(repos: Repositories): StockLookup {
  const available = repos.inventory.available();
  return (id) => available.get(id);
}
