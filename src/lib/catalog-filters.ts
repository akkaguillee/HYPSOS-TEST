import { categories, isProductAvailable } from '@shared/catalog';
import type { CategoryHandle, ColorOption, Product } from '@shared/types';

/** Filtros y orden del catálogo, sincronizados con la URL (?talla=M,L&orden=precio-asc). */

export const sortOptions = [
  { id: 'destacados', label: 'Destacados' },
  { id: 'novedades', label: 'Novedades' },
  { id: 'precio-asc', label: 'Precio: menor a mayor' },
  { id: 'precio-desc', label: 'Precio: mayor a menor' },
] as const;

export type SortKey = (typeof sortOptions)[number]['id'];

export const priceRanges = [
  { id: 'hasta-30', label: 'Hasta 30 €', min: 0, max: 3000 },
  { id: '30-60', label: '30 € – 60 €', min: 3000, max: 6000 },
  { id: '60-90', label: '60 € – 90 €', min: 6000, max: 9000 },
  { id: 'mas-90', label: 'Más de 90 €', min: 9000, max: Number.POSITIVE_INFINITY },
] as const;

export type PriceRangeId = (typeof priceRanges)[number]['id'];

export interface FilterState {
  sizes: string[];
  colors: string[];
  prices: PriceRangeId[];
  categories: CategoryHandle[];
  inStock: boolean;
}

export const emptyFilters: FilterState = { sizes: [], colors: [], prices: [], categories: [], inStock: false };

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '35–38', '39–42', '43–46', 'Única'];

const PARAM = { sizes: 'talla', colors: 'color', prices: 'precio', categories: 'categoria', inStock: 'disponible', sort: 'orden' } as const;

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);

export function parseCatalogParams(params: URLSearchParams): { filters: FilterState; sort: SortKey } {
  const sortParam = params.get(PARAM.sort);
  const sort = sortOptions.some((option) => option.id === sortParam) ? (sortParam as SortKey) : 'destacados';
  return {
    sort,
    filters: {
      sizes: list(params.get(PARAM.sizes)),
      colors: list(params.get(PARAM.colors)),
      prices: list(params.get(PARAM.prices)).filter((id): id is PriceRangeId => priceRanges.some((range) => range.id === id)),
      categories: list(params.get(PARAM.categories)).filter((id): id is CategoryHandle =>
        categories.some((category) => category.handle === id),
      ),
      inStock: params.get(PARAM.inStock) === '1',
    },
  };
}

export function toCatalogParams(filters: FilterState, sort: SortKey): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.categories.length) params.set(PARAM.categories, filters.categories.join(','));
  if (filters.sizes.length) params.set(PARAM.sizes, filters.sizes.join(','));
  if (filters.colors.length) params.set(PARAM.colors, filters.colors.join(','));
  if (filters.prices.length) params.set(PARAM.prices, filters.prices.join(','));
  if (filters.inStock) params.set(PARAM.inStock, '1');
  if (sort !== 'destacados') params.set(PARAM.sort, sort);
  return params;
}

export function activeFilterCount(filters: FilterState): number {
  return filters.sizes.length + filters.colors.length + filters.prices.length + filters.categories.length + (filters.inStock ? 1 : 0);
}

function matchesSize(product: Product, sizes: string[]): boolean {
  // Una talla cuenta si existe y tiene stock en algún color.
  return sizes.some((size) => product.colors.some((color) => (product.inventory[`${color.id}:${size}`] ?? 0) > 0));
}

export function applyFilters(products: Product[], filters: FilterState): Product[] {
  return products.filter((product) => {
    if (filters.categories.length && !filters.categories.includes(product.category)) return false;
    if (filters.sizes.length && !matchesSize(product, filters.sizes)) return false;
    if (filters.colors.length && !product.colors.some((color) => filters.colors.includes(color.id))) return false;
    if (
      filters.prices.length &&
      !filters.prices.some((id) => {
        const range = priceRanges.find((candidate) => candidate.id === id)!;
        return product.price >= range.min && product.price < range.max;
      })
    )
      return false;
    if (filters.inStock && !isProductAvailable(product)) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const sorted = [...products];
  switch (sort) {
    case 'novedades':
      return sorted.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt) || a.featuredRank - b.featuredRank);
    case 'precio-asc':
      return sorted.sort((a, b) => a.price - b.price || a.featuredRank - b.featuredRank);
    case 'precio-desc':
      return sorted.sort((a, b) => b.price - a.price || a.featuredRank - b.featuredRank);
    default:
      // Destacados, con los agotados al final.
      return sorted.sort(
        (a, b) => Number(isProductAvailable(b)) - Number(isProductAvailable(a)) || a.featuredRank - b.featuredRank,
      );
  }
}

/** Opciones de filtro disponibles para un conjunto de productos. */
export function facetOptions(products: Product[]) {
  const sizes = new Set<string>();
  const colorMap = new Map<string, ColorOption>();
  const categorySet = new Set<CategoryHandle>();
  for (const product of products) {
    product.sizes.forEach((size) => sizes.add(size));
    product.colors.forEach((color) => colorMap.set(color.id, color));
    categorySet.add(product.category);
  }
  return {
    sizes: [...sizes].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
    colors: [...colorMap.values()],
    categories: categories.filter((category) => categorySet.has(category.handle)),
  };
}
