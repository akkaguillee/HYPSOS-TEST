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
    expect(html).toContain('"price":"59.00"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    // Catálogo de demostración: no se indexa como producto real.
    expect(html).toContain('noindex');
  });

  it('precarga la imagen principal (LCP) de fichas y listados con el mismo srcset que la interfaz', () => {
    const product = renderHtml(template, '/products/sudadera-capucha-ascenso', 'https://hypsos.com');
    expect(product).toContain('<link rel="preload" as="image" href="/assets/products/mockups/sudadera-capucha-ascenso/negro-front-960.webp"');
    expect(product).toContain('imagesizes="(min-width: 1024px) 58vw, 100vw"');
    const listing = renderHtml(template, '/collections/camisetas', 'https://hypsos.com');
    expect(listing).toContain('rel="preload" as="image"');
    expect(renderHtml(template, '/pages/faq', 'https://hypsos.com')).not.toContain('rel="preload"');
    // Con filtros u otro orden la primera tarjeta cambia: no se precarga nada.
    expect(renderHtml(template, '/collections/camisetas', 'https://hypsos.com', undefined, '?orden=precio-asc')).not.toContain('rel="preload"');
    // ?color= elige la imagen precargada de la ficha.
    expect(renderHtml(template, '/products/llavero-monogram', 'https://hypsos.com', undefined, '?color=rojo')).toContain('llavero-monogram/rojo-front-960.webp');
  });

    it('publica la disponibilidad real si recibe el stock', () => {
    const html = renderHtml(template, '/products/sudadera-capucha-ascenso', 'https://hypsos.com', () => 0);
    expect(html).toContain('https://schema.org/OutOfStock');
  });

  it('la portada describe la organización y el buscador', () => {
    const html = renderHtml(template, '/', 'https://hypsos.com');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"SearchAction"');
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
    ['/cuenta', true],
    ['/cuenta/pedidos', true],
    ['/collections/inventada', false],
    ['/products/inventado', false],
    ['/pages/x', false],
    ['/products/gorra-monogram/extra', false],
    ['/wp-admin', false],
  ])('%s → %s', (path, expected) => {
    expect(isKnownRoute(path)).toBe(expected);
  });
});
