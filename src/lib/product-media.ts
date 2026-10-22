import { isProductAvailable } from '@shared/catalog';
import type { Product, ProductMedia, StockLookup } from '@shared/types';

/** Medios visibles para un color: las imágenes de ese color, o todas si no hay específicas. */
export function mediaForColor(product: Product, colorId: string): ProductMedia[] {
  const specific = product.media.filter((media) => media.type === 'image' && media.colorId === colorId);
  if (specific.length > 0) return specific;
  return product.media.filter((media) => media.type === 'mockup' || !media.colorId);
}

/**
 * Etiqueta visible de un producto: como mucho una, por prioridad Agotado > Edición limitada > Nuevo.
 * `hideNew`: en listados que ya son de novedades, «Nuevo» sobra.
 */
export function productBadges(
  product: Product,
  stock: StockLookup | null,
  { hideNew = false }: { hideNew?: boolean } = {},
): { id: string; label: string; tone: 'red' | 'light' | 'muted' }[] {
  // "Agotado" solo con el stock real cargado.
  if (stock && !isProductAvailable(product, stock)) return [{ id: 'agotado', label: 'Agotado', tone: 'muted' }];
  if (product.badges.includes('edicion-limitada')) return [{ id: 'limitada', label: 'Edición limitada', tone: 'red' }];
  if (product.badges.includes('nuevo') && !hideNew) return [{ id: 'nuevo', label: 'Nuevo', tone: 'light' }];
  return [];
}
