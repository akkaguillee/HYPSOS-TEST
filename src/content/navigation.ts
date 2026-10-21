import { categories, collections } from '@shared/catalog';
import { paths } from '@shared/routes';

export const primaryNav = [
  { id: 'novedades', label: 'Novedades', to: paths.collection('novedades') },
  { id: 'tienda', label: 'Tienda', to: paths.collection('all'), mega: true },
  { id: 'colecciones', label: 'Colecciones', to: paths.collection('colecciones') },
  { id: 'nosotros', label: 'Nosotros', to: paths.page('nosotros') },
] as const;

const apparel = ['camisetas', 'sudaderas', 'pantalones', 'gorras'];

export const shopNav = {
  apparel: categories.filter((category) => apparel.includes(category.handle)),
  more: categories.filter((category) => !apparel.includes(category.handle)),
  collections,
};

export const helpNav = [
  { label: 'Preguntas frecuentes', to: paths.page('faq') },
  { label: 'Envíos y devoluciones', to: paths.page('envios') },
  { label: 'Guía de tallas', to: paths.page('guia-de-tallas') },
  { label: 'Contacto', to: paths.page('contacto') },
];

export const legalNav = [
  { label: 'Condiciones de compra', to: paths.page('terminos') },
  { label: 'Privacidad', to: paths.page('privacidad') },
  { label: 'Cookies', to: paths.page('cookies') },
  { label: 'Aviso legal', to: paths.page('aviso-legal') },
];

export const announcements = [
  'Envío estándar gratis desde 80 €',
  'Drop 01 — Ascenso ya disponible',
  'Devoluciones gratuitas durante 30 días',
];
