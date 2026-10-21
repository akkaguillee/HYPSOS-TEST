import { useInventory } from '@/store/inventory';
import { catalogProducts, productVariants, seedStock } from '@shared/catalog';

/** Carga en el store de inventario el stock inicial del catálogo (como lo serviría la API recién sembrada). */
export function loadSeedInventory(overrides: Record<string, number> = {}) {
  const available: Record<string, number> = {};
  for (const product of catalogProducts) {
    for (const variant of productVariants(product)) available[variant.id] = seedStock(variant.id) ?? 0;
  }
  useInventory.setState({ status: 'ready', available: { ...available, ...overrides }, fetchedAt: Date.now() });
}
