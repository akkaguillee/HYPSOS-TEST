import type { CategoryHandle, Product, StockLookup } from '../types';
import { products as allProducts } from './products';

export { categories, getCategory, isCategoryHandle } from './categories';
export { collections, getCollection } from './collections';
export { colors } from './products';

/** Todos los productos, incluidos los borradores (solo para sincronizar la base de datos). */
export const catalogProducts = allProducts;
/** Productos publicados: lo único que ve la tienda. */
export const products = allProducts.filter((product) => product.status === 'published');

/** Días durante los que un producto se considera novedad. */
const NEW_ARRIVAL_WINDOW_DAYS = 60;

export function variantKey(colorId: string, size: string): string {
  return `${colorId}:${size}`;
}

/** Identificador de variante usado por el inventario: `productId:colorId:size`. */
export function variantId(productId: string, colorId: string, size: string): string {
  return `${productId}:${colorId}:${size}`;
}

/** Referencia comercial (SKU) legible de una variante, p. ej. HYP-TS-001-NEGRO-L. */
export function variantSku(product: Product, colorId: string, size: string): string {
  return `${product.code}-${colorId.toUpperCase()}-${size === 'Única' ? 'U' : size}`;
}

/** Variantes de un producto. */
export function productVariants(product: Product) {
  return product.colors.flatMap((color) =>
    product.sizes.map((size) => ({ id: variantId(product.id, color.id, size), colorId: color.id, size })),
  );
}

/** Stock inicial del catálogo (solo para sembrar la base de datos y para pruebas). */
export const seedStock: StockLookup = (id) => {
  const [productId, colorId, size] = id.split(':');
  return allProducts.find((product) => product.id === productId)?.initialStock[variantKey(colorId, size)];
};

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

/** Totales de unidades disponibles de un producto. */
export function totalStock(product: Product, stock: StockLookup): number {
  return productVariants(product).reduce((total, variant) => total + Math.max(0, stock(variant.id) ?? 0), 0);
}

export function getProductByHandle(handle: string): Product | undefined {
  return products.find((product) => product.handle === handle);
}

/** Unidades disponibles de una variante según la fuente de stock indicada (BD en el servidor, API en la web). */
export function getStock(product: Product, colorId: string, size: string, stock: StockLookup): number {
  return stock(variantId(product.id, colorId, size)) ?? 0;
}

export function isVariantValid(product: Product, colorId: string, size: string): boolean {
  return product.colors.some((color) => color.id === colorId) && product.sizes.includes(size);
}

export function isProductAvailable(product: Product, stock: StockLookup): boolean {
  return product.colors.some((color) => isColorAvailable(product, color.id, stock));
}

export function isColorAvailable(product: Product, colorId: string, stock: StockLookup): boolean {
  return product.sizes.some((size) => getStock(product, colorId, size, stock) > 0);
}

/** Tallas con stock para un color (o para cualquier color si no se indica). */
export function availableSizes(product: Product, stock: StockLookup, colorId?: string): string[] {
  return product.sizes.filter((size) =>
    colorId
      ? getStock(product, colorId, size, stock) > 0
      : product.colors.some((color) => getStock(product, color.id, size, stock) > 0),
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

/** Productos relacionados: misma colección, categoría o etiquetas. */
export function relatedProducts(product: Product, limit = 4): Product[] {
  const score = (candidate: Product) =>
    (candidate.collections.some((handle) => product.collections.includes(handle)) ? 2 : 0) +
    (candidate.category === product.category ? 1 : 0) +
    candidate.tags.filter((tag) => product.tags.includes(tag)).length * 0.25;
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
        [product.name, product.category, product.shortDescription, product.code, ...product.tags, ...product.colors.map((c) => c.name)].join(' '),
      );
      if (!terms.every((term) => haystack.includes(term))) return null;
      const score = terms.reduce((total, term) => total + (name.includes(term) ? 2 : 1), 0);
      return { product, score };
    })
    .filter((result): result is { product: Product; score: number } => result !== null)
    .sort((a, b) => b.score - a.score || a.product.featuredRank - b.product.featuredRank)
    .map(({ product }) => product);
}
