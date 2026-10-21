import { getCategory, getCollection, getProductByHandle, variantSku } from './catalog';
import { store } from './config';
import { contentPages, isContentPage, paths, specialCollections } from './routes';
import type { StockLookup } from './types';

export interface PageMeta {
  title: string;
  description: string;
  /** Ruta de imagen relativa al dominio. */
  image: string;
  type: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
}

const breadcrumbs = (publicUrl: string, items: { name: string; path?: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    ...(item.path ? { item: `${publicUrl}${item.path}` } : {}),
  })),
});

const SITE_DESCRIPTION =
  'HYPSOS — streetwear con identidad propia. Camisetas, sudaderas, pantalones, gorras, accesorios, piezas 3D y stickers.';
const DEFAULT_IMAGE = '/og-image.jpg';

const withBrand = (title: string) => `${title} | ${store.name}`;

/**
 * Metadatos de cada ruta: los usa el servidor (HTML inicial) y el cliente (navegación).
 * `stock` (solo en el servidor) permite publicar la disponibilidad real en los datos estructurados.
 */
export function metaForPath(pathname: string, publicUrl = '', stock?: StockLookup): PageMeta {
  const base: PageMeta = {
    title: `${store.name} — Streetwear por encima del ruido`,
    description: SITE_DESCRIPTION,
    image: DEFAULT_IMAGE,
    type: 'website',
  };
  const [, section, rawHandle] = pathname.split('/');
  const handle = rawHandle ? decodeURIComponent(rawHandle) : '';

  if (section === 'collections' && handle) {
    const special = specialCollections[handle as keyof typeof specialCollections];
    const category = getCategory(handle);
    const collection = getCollection(handle);
    const crumbs = (name: string) => [breadcrumbs(publicUrl, [{ name: 'Inicio', path: '/' }, { name }])];
    if (special) return { ...base, title: withBrand(special.name), description: special.description, jsonLd: crumbs(special.name) };
    if (category) return { ...base, title: withBrand(category.name), description: category.description, jsonLd: crumbs(category.name) };
    if (collection)
      return {
        ...base,
        title: withBrand(`${collection.kicker} — ${collection.name}`),
        description: collection.description,
        jsonLd: crumbs(collection.name),
      };
  }

  if (section === 'products' && handle) {
    const product = getProductByHandle(handle);
    if (product) {
      const category = getCategory(product.category)!;
      const images = product.media.filter((media) => media.type === 'image').map((media) => `${publicUrl}${media.src}`);
      const productLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        sku: product.code,
        description: product.description,
        brand: { '@type': 'Brand', name: store.name },
        category: category.name,
        ...(images.length ? { image: images } : {}),
        offers: product.colors.flatMap((color) =>
          product.sizes.map((size) => ({
            '@type': 'Offer',
            sku: variantSku(product, color.id, size),
            priceCurrency: store.currency,
            price: (product.price / 100).toFixed(2),
            itemCondition: 'https://schema.org/NewCondition',
            url: `${publicUrl}/products/${product.handle}?color=${color.id}`,
            ...(stock
              ? {
                  availability:
                    (stock(`${product.id}:${color.id}:${size}`) ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                }
              : {}),
          })),
        ),
      };
      return {
        ...base,
        title: withBrand(product.name),
        description: product.shortDescription,
        type: 'product',
        jsonLd: [
          productLd,
          breadcrumbs(publicUrl, [
            { name: 'Inicio', path: '/' },
            { name: category.name, path: paths.collection(category.handle) },
            { name: product.name },
          ]),
        ],
        // Los productos de demostración no deben indexarse como reales.
        noindex: store.demoCatalog,
      };
    }
  }

  if (section === 'pages' && handle && isContentPage(handle)) {
    const page = contentPages[handle];
    return { ...base, title: withBrand(page.title), description: page.description };
  }

  if (pathname.startsWith(paths.account)) return { ...base, title: withBrand('Mi cuenta'), noindex: true };

  switch (pathname) {
    case '/':
      return {
        ...base,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: store.name,
            url: publicUrl || undefined,
            logo: `${publicUrl}/assets/brand/hypsos-monogram.svg`,
            ...(store.social.length ? { sameAs: store.social.map((network) => network.href) } : {}),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: store.name,
            url: publicUrl || undefined,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${publicUrl}${paths.search}?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ],
      };
    case '/cart':
      return { ...base, title: withBrand('Carrito'), noindex: true };
    case '/checkout':
      return { ...base, title: withBrand('Finalizar compra'), noindex: true };
    case '/checkout/success':
      return { ...base, title: withBrand('Pedido confirmado'), noindex: true };
    case '/search':
      return { ...base, title: withBrand('Buscar'), noindex: true };
    case '/favoritos':
      return { ...base, title: withBrand('Favoritos'), noindex: true };
    default:
      return { ...base, title: withBrand('Página no encontrada'), noindex: true };
  }
}
