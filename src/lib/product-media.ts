import { isProductAvailable } from '@shared/catalog';
import type { Product, ProductMedia, StockLookup } from '@shared/types';

/** Medios visibles para un color: las imágenes de ese color, o todas si no hay específicas. */
export function mediaForColor(product: Product, colorId: string): ProductMedia[] {
  const specific = product.media.filter((media) => media.type === 'image' && media.colorId === colorId);
  if (specific.length > 0) return specific;
  return product.media.filter((media) => media.type === 'mockup' || !media.colorId);
}

/** Etiquetas visibles de un producto (máximo dos). */
export function productBadges(product: Product, stock: StockLookup | null): { id: string; label: string; tone: 'red' | 'light' | 'muted' }[] {
  // "Agotado" solo con el stock real cargado.
  if (stock && !isProductAvailable(product, stock)) return [{ id: 'agotado', label: 'Agotado', tone: 'muted' }];
  const badges: { id: string; label: string; tone: 'red' | 'light' | 'muted' }[] = [];
  if (product.badges.includes('edicion-limitada')) badges.push({ id: 'limitada', label: 'Edición limitada', tone: 'red' });
  if (product.badges.includes('nuevo')) badges.push({ id: 'nuevo', label: 'Nuevo', tone: 'light' });
  return badges.slice(0, 2);
}
