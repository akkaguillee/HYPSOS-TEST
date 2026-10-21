import type { ShippingMethod } from './types';

/**
 * Configuración comercial de la tienda.
 *
 * Regla: ningún dato comercial se inventa. Los valores `null` o vacíos son
 * POLÍTICAS PENDIENTES DE CONFIRMAR por HYPSOS; mientras lo estén, la web no
 * promete nada al respecto (no muestra envío gratis, plazos ni tarifas) y el
 * checkout no permite pagar.
 */
export const store = {
  name: 'HYPSOS',
  locale: 'es-ES',
  currency: 'EUR',
  /** IVA general en España (dato legal). Los precios del catálogo ya lo incluyen. */
  vatRate: 0.21,
  /**
   * El catálogo actual es de DEMOSTRACIÓN: productos, precios y stock no son reales.
   * Ponlo a `false` cuando el catálogo definitivo esté cargado.
   */
  demoCatalog: true,
  /** Unidades máximas por variante en un mismo pedido. */
  maxQuantityPerLine: 10,
  /** Mínimo legal de desistimiento en la UE para compras a distancia (días naturales). */
  legalWithdrawalDays: 14,
  policies: {
    /** PENDIENTE: plazo de devolución propio, si es mayor que el legal. */
    returnWindowDays: null as number | null,
    /** PENDIENTE: tiempo de respuesta de atención al cliente, p. ej. "24–48 h laborables". */
    responseTime: null as string | null,
  },
  /** Países de envío. PENDIENTE de confirmar: se parte del mercado español. */
  shippingCountries: [{ code: 'ES', name: 'España' }],
  contact: {
    /** PENDIENTE: email de atención al cliente. Mientras esté vacío solo se muestra el formulario. */
    email: '' as string,
  },
  /** PENDIENTE: sustituir por las URLs de los perfiles oficiales de HYPSOS (vacío = no se muestran). */
  social: [] as { id: string; label: string; href: string }[],
};

/**
 * PENDIENTE: métodos y tarifas de envío del operador logístico.
 * Ejemplo de configuración (no activo):
 *   { id: 'standard', name: 'Envío estándar', description: '3–5 días laborables', price: 495, freeFrom: 8000 }
 */
export const shippingMethods: ShippingMethod[] = [];

export const isShippingConfigured = () => shippingMethods.length > 0;

/** Primer umbral de envío gratuito configurado, si existe. */
export function freeShippingThreshold(methods: ShippingMethod[] = shippingMethods): number | null {
  const thresholds = methods.map((method) => method.freeFrom).filter((value): value is number => typeof value === 'number');
  return thresholds.length ? Math.min(...thresholds) : null;
}

/** Plazo de devolución que se comunica: el propio si está confirmado, si no el legal. */
export const returnWindowDays = () => store.policies.returnWindowDays ?? store.legalWithdrawalDays;

export type CountryCode = (typeof store.shippingCountries)[number]['code'];
