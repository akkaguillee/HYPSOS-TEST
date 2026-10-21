// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isKnownRoute } from '../shared/routes';
import { renderHtml } from './html';

const template = `<html><head><!--meta:start--><title>HYPSOS</title><!--meta:end--></head><body></body></html>`;

describe('renderHtml', () => {
  it('inyecta título, descripción y JSON-LD del producto', () => {
    const html = renderHtml(template, '/products/sudadera-capucha-ascenso', 'https://hypsos.com');
    expect(html).toContain('<title>Sudadera Capucha Ascenso | HYPSOS</title>');
    expect(html).toContain('<link rel="canonical" href="https://hypsos.com/products/sudadera-capucha-ascenso" />');
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('"price":"89.00"');
    expect(html).not.toContain('noindex');
  });

  it('marca como noindex las páginas privadas y desconocidas', () => {
    expect(renderHtml(template, '/checkout', 'https://hypsos.com')).toContain('noindex');
    expect(renderHtml(template, '/no-existe', 'https://hypsos.com')).toContain('Página no encontrada');
  });
});

describe('isKnownRoute', () => {
  it.each([
    ['/', true],
    ['/collections/all', true],
    ['/collections/camisetas', true],
    ['/collections/3d', true],
    ['/collections/drop-01-ascenso', true],
    ['/collections/colecciones', true],
    ['/products/gorra-monogram', true],
    ['/pages/envios', true],
    ['/pages/guia-de-tallas', true],
    ['/cart/', true],
    ['/collections/inventada', false],
    ['/products/inventado', false],
    ['/pages/x', false],
    ['/products/gorra-monogram/extra', false],
    ['/wp-admin', false],
  ])('%s → %s', (path, expected) => {
    expect(isKnownRoute(path)).toBe(expected);
  });
});
