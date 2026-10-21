import { products } from '@shared/catalog';
import { describe, expect, it } from 'vitest';
import { activeFilterCount, applyFilters, emptyFilters, facetOptions, parseCatalogParams, sortProducts, toCatalogParams } from './catalog-filters';

describe('filtros del catálogo', () => {
  it('lee y escribe los filtros en la URL ignorando valores no válidos', () => {
    const { filters, sort } = parseCatalogParams(new URLSearchParams('talla=M,L&color=negro&precio=30-60,falso&categoria=camisetas,zapatos&disponible=1&orden=precio-asc'));
    expect(filters).toEqual({ sizes: ['M', 'L'], colors: ['negro'], prices: ['30-60'], categories: ['camisetas'], inStock: true });
    expect(sort).toBe('precio-asc');
    expect(toCatalogParams(filters, sort).toString()).toBe('categoria=camisetas&talla=M%2CL&color=negro&precio=30-60&disponible=1&orden=precio-asc');
    expect(parseCatalogParams(new URLSearchParams('orden=inventado')).sort).toBe('destacados');
  });

  it('filtra por talla solo si hay stock en esa talla', () => {
    const result = applyFilters(products, { ...emptyFilters, sizes: ['XXL'] });
    expect(result.map((p) => p.id)).not.toContain('p-tee-signal'); // XXL agotada
    expect(result.every((p) => p.sizes.includes('XXL'))).toBe(true);
  });

  it('combina precio, color y disponibilidad', () => {
    const result = applyFilters(products, { ...emptyFilters, prices: ['mas-90'], colors: ['negro'], inStock: true });
    expect(result.every((p) => p.price >= 9000)).toBe(true);
    expect(result.map((p) => p.id)).toContain('p-hoodie-cromo');
    expect(applyFilters(products, { ...emptyFilters, inStock: true }).map((p) => p.id)).not.toContain('p-sticker-star');
  });

  it('ordena por precio y deja los agotados al final en destacados', () => {
    const asc = sortProducts(products, 'precio-asc');
    expect(asc[0].price).toBeLessThanOrEqual(asc[asc.length - 1].price);
    const featured = sortProducts(products, 'destacados');
    expect(featured.at(-1)?.id).toBe('p-sticker-star');
  });

  it('cuenta filtros activos y calcula facetas ordenadas', () => {
    expect(activeFilterCount({ ...emptyFilters, sizes: ['M'], inStock: true })).toBe(2);
    const facets = facetOptions(products.filter((p) => p.category === 'camisetas'));
    expect(facets.sizes).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  });
});
