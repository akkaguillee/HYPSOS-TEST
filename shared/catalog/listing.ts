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

/**
 * Columnas del grid de un listado en escritorio según cuántos productos muestra: un trío exacto
 * va a 3 columnas y el resto a 4 (móvil 2 y tableta 3 siempre). Los huecos de la última fila los
 * completa una pieza editorial (ver ProductGrid), así ningún listado deja celdas vacías.
 */
export function listingColumns(count: number): 3 | 4 {
  return count === 3 ? 3 : 4;
}

/** Columnas del listado /collections/:handle en su vista por defecto (sin filtros). */
export function gridColumns(handle: string): 3 | 4 {
  return listingColumns(listingProducts(handle)?.length ?? 0);
}

/**
 * Atributo `sizes` de las tarjetas según las columnas de escritorio (lo usan la interfaz y la
 * precarga del HTML). Por encima de 1536 px el contenedor deja de crecer (1440 px).
 */
export const GRID_SIZES: Record<3 | 4, string> = {
  3: '(min-width: 1536px) 470px, (min-width: 768px) 31vw, 48vw',
  4: '(min-width: 1536px) 350px, (min-width: 1280px) 23vw, (min-width: 768px) 31vw, 48vw',
};
