import { describe, expect, it } from 'vitest';
import { catalogProducts, categories, collections, getProductByHandle, products, relatedProducts, searchProducts, variantKey, variantSku } from './index';

describe('integridad del catálogo', () => {
  it('ids, handles y referencias son únicos', () => {
    for (const key of ['id', 'handle', 'code'] as const) {
      expect(new Set(products.map((p) => p[key])).size).toBe(products.length);
    }
  });

  it('cada producto apunta a categorías y colecciones existentes', () => {
    const categoryHandles = new Set(categories.map((c) => c.handle));
    const collectionHandles = new Set(collections.map((c) => c.handle));
    for (const product of products) {
      expect(categoryHandles.has(product.category)).toBe(true);
      product.collections.forEach((handle) => expect(collectionHandles.has(handle)).toBe(true));
    }
  });

  it('el stock cubre exactamente todas las variantes', () => {
    for (const product of products) {
      const expected = product.colors.flatMap((c) => product.sizes.map((s) => variantKey(c.id, s))).sort();
      expect(Object.keys(product.initialStock).sort()).toEqual(expected);
      expect(Number.isInteger(product.price) && product.price > 0).toBe(true);
    }
  });

  it('solo publica productos con estado "published" y genera SKUs únicos', () => {
    expect(products.every((product) => product.status === 'published')).toBe(true);
    expect(catalogProducts.length).toBeGreaterThanOrEqual(products.length);
    const skus = catalogProducts.flatMap((p) => p.colors.flatMap((c) => p.sizes.map((s) => variantSku(p, c.id, s))));
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('busca sin distinguir acentos ni mayúsculas', () => {
    expect(searchProducts('PANTALON').map((p) => p.handle)).toContain('cargo-altura');
    expect(searchProducts('jogger')).toEqual([]); // retirado (borrador): no aparece
    expect(searchProducts('sudadera monogram')[0].handle).toBe('sudadera-capucha-monogram');
    expect(searchProducts('   ')).toEqual([]);
  });

  it('sugiere productos relacionados distintos del actual', () => {
    const product = getProductByHandle('sudadera-capucha-ascenso')!;
    const related = relatedProducts(product, 4);
    expect(related).toHaveLength(4);
    expect(related.map((p) => p.id)).not.toContain(product.id);
  });
});
