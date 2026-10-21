import { categories, collections as editorialCollections, getCategory, getCollection, getProductByHandle, products } from './catalog';

/** Rutas de la web. Centralizadas para que la navegación, el sitemap y el servidor usen las mismas. */
export const paths = {
  home: '/',
  collection: (handle: string) => `/collections/${handle}`,
  product: (handle: string) => `/products/${handle}`,
  page: (handle: ContentPageHandle) => `/pages/${handle}`,
  cart: '/cart',
  checkout: '/checkout',
  checkoutSuccess: '/checkout/success',
  search: '/search',
  wishlist: '/favoritos',
  account: '/cuenta',
  accountOrders: '/cuenta/pedidos',
  accountAddresses: '/cuenta/direcciones',
  accountProfile: '/cuenta/perfil',
  accountRecover: '/cuenta/recuperar',
  accountReset: '/cuenta/restablecer',
} as const;

/** Colecciones especiales que no son categorías ni colecciones editoriales. */
export const specialCollections = {
  all: { handle: 'all', name: 'Toda la tienda', description: 'Todo el catálogo HYPSOS en un solo lugar.' },
  novedades: { handle: 'novedades', name: 'Novedades', description: 'Lo último en llegar a HYPSOS.' },
  colecciones: { handle: 'colecciones', name: 'Colecciones', description: 'Cada colección es un capítulo de HYPSOS.' },
} as const;

export const contentPages = {
  nosotros: { title: 'Quiénes somos', description: 'La historia, la actitud y la comunidad detrás de HYPSOS.' },
  contacto: { title: 'Contacto', description: 'Escríbenos sobre pedidos, devoluciones, productos o colaboraciones.' },
  faq: { title: 'Preguntas frecuentes', description: 'Pedidos, envíos, devoluciones, tallas y pagos.' },
  envios: { title: 'Envíos y devoluciones', description: 'Plazos, costes de envío y cómo devolver un pedido.' },
  'guia-de-tallas': { title: 'Guía de tallas', description: 'Medidas de cada prenda HYPSOS y cómo elegir tu talla.' },
  privacidad: { title: 'Política de privacidad', description: 'Cómo tratamos tus datos personales.' },
  terminos: { title: 'Condiciones de compra', description: 'Condiciones generales de venta de la tienda HYPSOS.' },
  cookies: { title: 'Política de cookies', description: 'Qué almacenamiento usamos en este sitio y para qué.' },
  'aviso-legal': { title: 'Aviso legal', description: 'Información legal del titular del sitio web.' },
} as const;

export type ContentPageHandle = keyof typeof contentPages;

export function isContentPage(handle: string): handle is ContentPageHandle {
  return Object.prototype.hasOwnProperty.call(contentPages, handle);
}

export function isCollectionHandle(handle: string): boolean {
  return handle in specialCollections || Boolean(getCategory(handle)) || Boolean(getCollection(handle));
}

const staticRoutes = new Set<string>([
  paths.home,
  paths.cart,
  paths.checkout,
  paths.checkoutSuccess,
  paths.search,
  paths.wishlist,
  paths.account,
  paths.accountOrders,
  paths.accountAddresses,
  paths.accountProfile,
  paths.accountRecover,
  paths.accountReset,
]);

/** Todas las rutas públicas conocidas (prerenderizado para alojamientos estáticos). */
export function knownRoutes(): string[] {
  const collections = [...Object.keys(specialCollections), ...categories.map((c) => c.handle), ...editorialCollections.map((c) => c.handle)];
  return [
    ...staticRoutes,
    ...collections.map((handle) => paths.collection(handle)),
    ...products.map((product) => paths.product(product.handle)),
    ...Object.keys(contentPages).map((handle) => paths.page(handle as ContentPageHandle)),
  ];
}

/** Indica si una ruta existe (el servidor la usa para responder 404 reales). */
export function isKnownRoute(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (staticRoutes.has(path)) return true;
  const [, section, handle, ...rest] = path.split('/');
  if (rest.length > 0 || !handle) return false;
  const decoded = safeDecode(handle);
  if (section === 'collections') return isCollectionHandle(decoded);
  if (section === 'products') return Boolean(getProductByHandle(decoded));
  if (section === 'pages') return isContentPage(decoded);
  return false;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
