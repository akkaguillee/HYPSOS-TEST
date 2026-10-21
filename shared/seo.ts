import { getCategory, getCollection, getProductByHandle, isProductAvailable } from './catalog';
import { store } from './config';
import { contentPages, isContentPage, specialCollections } from './routes';

export interface PageMeta {
  title: string;
  description: string;
  /** Ruta de imagen relativa al dominio. */
  image: string;
  type: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SITE_DESCRIPTION =
  'HYPSOS — streetwear con identidad propia. Camisetas, sudaderas, pantalones, gorras, accesorios, piezas 3D y stickers. Drops de edición limitada.';
const DEFAULT_IMAGE = '/og-image.jpg';

const withBrand = (title: string) => `${title} | ${store.name}`;

/** Metadatos de cada ruta: los usa el servidor (HTML inicial) y el cliente (navegación). */
export function metaForPath(pathname: string, publicUrl = ''): PageMeta {
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
    if (special) return { ...base, title: withBrand(special.name), description: special.description };
    if (category) return { ...base, title: withBrand(category.name), description: category.description };
    if (collection)
      return { ...base, title: withBrand(`${collection.kicker} — ${collection.name}`), description: collection.description };
  }

  if (section === 'products' && handle) {
    const product = getProductByHandle(handle);
    if (product) {
      return {
        ...base,
        title: withBrand(product.name),
        description: product.shortDescription,
        type: 'product',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          sku: product.code,
          description: product.description,
          brand: { '@type': 'Brand', name: store.name },
          offers: {
            '@type': 'Offer',
            priceCurrency: store.currency,
            price: (product.price / 100).toFixed(2),
            availability: isProductAvailable(product) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${publicUrl}/products/${product.handle}`,
          },
        },
      };
    }
  }

  if (section === 'pages' && handle && isContentPage(handle)) {
    const page = contentPages[handle];
    return { ...base, title: withBrand(page.title), description: page.description };
  }

  switch (pathname) {
    case '/':
      return base;
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
