import type { CategoryHandle, Product } from '../types';
import { products } from './products';

export { categories, getCategory, isCategoryHandle } from './categories';
export { collections, getCollection } from './collections';
export { colors, products } from './products';

/** Días durante los que un producto se considera novedad. */
const NEW_ARRIVAL_WINDOW_DAYS = 60;

export function variantKey(colorId: string, size: string): string {
  return `${colorId}:${size}`;
}

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getProductByHandle(handle: string): Product | undefined {
  return products.find((product) => product.handle === handle);
}

export function getStock(product: Product, colorId: string, size: string): number {
  return product.inventory[variantKey(colorId, size)] ?? 0;
}

export function isVariantValid(product: Product, colorId: string, size: string): boolean {
  return product.colors.some((color) => color.id === colorId) && product.sizes.includes(size);
}

export function isProductAvailable(product: Product): boolean {
  return Object.values(product.inventory).some((quantity) => quantity > 0);
}

export function isColorAvailable(product: Product, colorId: string): boolean {
  return product.sizes.some((size) => getStock(product, colorId, size) > 0);
}

/** Tallas con stock para un color (o para cualquier color si no se indica). */
export function availableSizes(product: Product, colorId?: string): string[] {
  return product.sizes.filter((size) =>
    colorId
      ? getStock(product, colorId, size) > 0
      : product.colors.some((color) => getStock(product, color.id, size) > 0),
  );
}

export function isNewArrival(product: Product, now: Date = new Date()): boolean {
  if (product.badges.includes('nuevo')) return true;
  const released = new Date(product.releasedAt).getTime();
  return now.getTime() - released <= NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000 && released <= now.getTime();
}

export function productsByCategory(handle: CategoryHandle): Product[] {
  return products.filter((product) => product.category === handle);
}

export function productsByCollection(handle: string): Product[] {
  return products.filter((product) => product.collections.includes(handle));
}

export function newArrivals(): Product[] {
  return products
    .filter((product) => product.badges.includes('nuevo'))
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt) || a.featuredRank - b.featuredRank);
}

export function featuredProducts(limit = 8): Product[] {
  return [...products].sort((a, b) => a.featuredRank - b.featuredRank).slice(0, limit);
}

/** Productos relacionados: misma colección o categoría, priorizando los disponibles. */
export function relatedProducts(product: Product, limit = 4): Product[] {
  const score = (candidate: Product) =>
    (candidate.collections.some((handle) => product.collections.includes(handle)) ? 2 : 0) +
    (candidate.category === product.category ? 1 : 0) +
    (isProductAvailable(candidate) ? 0.5 : 0);
  return products
    .filter((candidate) => candidate.id !== product.id)
    .map((candidate) => ({ candidate, score: score(candidate) }))
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score || a.candidate.featuredRank - b.candidate.featuredRank)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Búsqueda por texto en nombre, categoría, colores y descripción (sin acentos). */
export function searchProducts(query: string): Product[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return products
    .map((product) => {
      const name = normalize(product.name);
      const haystack = normalize(
        [product.name, product.category, product.shortDescription, product.code, ...product.colors.map((c) => c.name)].join(' '),
      );
      if (!terms.every((term) => haystack.includes(term))) return null;
      const score = terms.reduce((total, term) => total + (name.includes(term) ? 2 : 1), 0);
      return { product, score };
    })
    .filter((result): result is { product: Product; score: number } => result !== null)
    .sort((a, b) => b.score - a.score || a.product.featuredRank - b.product.featuredRank)
    .map(({ product }) => product);
}
