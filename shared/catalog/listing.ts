import type { Product, StockLookup } from '../types';
import { getCategory, getCollection, isProductAvailable, newArrivals, products, productsByCategory, productsByCollection } from './index';

/** Orden por defecto («Destacados»): primero lo disponible y después por relevancia. */
export function sortFeatured(list: Product[], stock: StockLookup): Product[] {
  return [...list].sort((a, b) => Number(isProductAvailable(b, stock)) - Number(isProductAvailable(a, stock)) || a.featuredRank - b.featuredRank);
}

/** Productos de un listado (/collections/:handle), o undefined si no es un listado de productos. */
export function listingProducts(handle: string): Product[] | undefined {
  if (handle === 'all') return products;
  if (handle === 'novedades') return newArrivals();
  const category = getCategory(handle);
  if (category) return productsByCategory(category.handle);
  if (getCollection(handle)) return productsByCollection(handle);
  return undefined;
}

/** Columnas del grid de un listado: los stickers se muestran como un pliego más denso. */
export function gridColumns(handle: string): 3 | 4 {
  return handle === 'stickers' ? 4 : 3;
}

/** Atributo `sizes` de las tarjetas según las columnas (lo usan la interfaz y la precarga del HTML). */
export const GRID_SIZES: Record<3 | 4, string> = {
  3: '(min-width: 768px) 26vw, 48vw',
  4: '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw',
};
