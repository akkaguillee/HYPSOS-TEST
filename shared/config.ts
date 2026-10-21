import type { ShippingMethod } from './types';

/**
 * Configuración comercial de la tienda.
 * VALORES PROVISIONALES: revisar con el propietario antes de publicar.
 */
export const store = {
  name: 'HYPSOS',
  locale: 'es-ES',
  currency: 'EUR',
  /** IVA general en España. Los precios del catálogo ya lo incluyen. */
  vatRate: 0.21,
  /** Envío estándar gratuito a partir de este subtotal (céntimos). */
  freeShippingThreshold: 8000,
  /** Unidades máximas por variante en un mismo pedido. */
  maxQuantityPerLine: 10,
  returnWindowDays: 30,
  /** Países a los que se envía. */
  shippingCountries: [
    { code: 'ES', name: 'España' },
    { code: 'PT', name: 'Portugal' },
    { code: 'FR', name: 'Francia' },
    { code: 'IT', name: 'Italia' },
    { code: 'DE', name: 'Alemania' },
  ],
  contact: {
    /** PENDIENTE: email de atención al cliente. Mientras esté vacío solo se muestra el formulario. */
    email: '' as string,
    responseTime: '24–48 h laborables',
  },
  /** PENDIENTE: sustituir por las URLs de los perfiles oficiales de HYPSOS. */
  social: [
    { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
    { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/' },
    { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/' },
  ],
} as const;

export const shippingMethods: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Envío estándar',
    description: '3–5 días laborables',
    price: 495,
  },
  {
    id: 'express',
    name: 'Envío exprés',
    description: '24–48 h laborables (península)',
    price: 995,
  },
];

export type CountryCode = (typeof store.shippingCountries)[number]['code'];
