import { getCategory, getCollection, getProductByHandle, isColorAvailable, mockupSrc, variantSku } from './catalog';
import { GRID_SIZES, gridColumns, listingProducts, sortFeatured } from './catalog/listing';
import { store } from './config';
import { contentPages, isContentPage, paths, specialCollections } from './routes';
import type { Product, StockLookup } from './types';

export interface PageMeta {
  title: string;
  description: string;
  /** Ruta de imagen relativa al dominio. */
  image: string;
  type: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
  /** Imagen principal de la vista (candidata a LCP): se precarga desde el HTML inicial. */
  preloadImage?: { href: string; srcset?: string; sizes: string };
}

/** Precarga de la primera imagen visible de un producto, con el mismo srcset que usa la interfaz. */
function productImagePreload(product: Product, colorId: string, sizes: string): PageMeta['preloadImage'] {
  const photo = product.media.find((media) => media.type === 'image' && (!media.colorId || media.colorId === colorId));
  if (photo?.type === 'image') return { href: photo.src, sizes };
  return {
    href: mockupSrc(product, colorId, 'front', 960),
    srcset: `${mockupSrc(product, colorId, 'front', 480)} 480w, ${mockupSrc(product, colorId, 'front', 960)} 960w`,
    sizes,
  };
}

/** Color que muestra primero la interfaz: el de `?color=` si está disponible, si no el primero disponible. */
function initialColor(product: Product, stock: StockLookup | undefined, requested: string | null): string {
  const available = (id: string) => !stock || isColorAvailable(product, id, stock);
  if (requested && product.colors.some((color) => color.id === requested) && available(requested)) return requested;
  return (product.colors.find((color) => available(color.id)) ?? product.colors[0]).id;
}

const GALLERY_SIZES = '(min-width: 1024px) 58vw, 100vw';

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
export function metaForPath(pathname: string, publicUrl = '', stock?: StockLookup, search = ''): PageMeta {
  const query = new URLSearchParams(search);
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
    // Solo con la vista por defecto: con filtros u otro orden la primera tarjeta es otra.
    const listed = search ? undefined : listingProducts(handle);
    // Sin datos de stock se asume todo disponible (mismo orden que ve la tienda antes de cargarlos).
    const first = listed ? sortFeatured(listed, stock ?? (() => 1))[0] : undefined;
    const preloadImage = first ? productImagePreload(first, initialColor(first, stock, null), GRID_SIZES[gridColumns(handle)]) : undefined;
    if (special) return { ...base, title: withBrand(special.name), description: special.description, jsonLd: crumbs(special.name), preloadImage };
    if (category) return { ...base, title: withBrand(category.name), description: category.description, jsonLd: crumbs(category.name), preloadImage };
    if (collection)
      return {
        ...base,
        title: withBrand(`${collection.kicker} — ${collection.name}`),
        description: collection.description,
        jsonLd: crumbs(collection.name),
        preloadImage,
      };
  }

  if (section === 'products' && handle) {
    const product = getProductByHandle(handle);
    if (product) {
      const category = getCategory(product.category)!;
      const photos = product.media.filter((media) => media.type === 'image').map((media) => `${publicUrl}${media.src}`);
      const images = photos.length > 0 ? photos : product.colors.map((color) => `${publicUrl}${mockupSrc(product, color.id, 'front', 960)}`);
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
        preloadImage: productImagePreload(product, initialColor(product, stock, query.get('color')), GALLERY_SIZES),
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
