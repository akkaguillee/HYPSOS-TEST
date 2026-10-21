import { shippingMethods, store } from './config';
import type { OrderTotals, ShippingMethodId } from './types';

/** Coste de envío para un subtotal y un método. El estándar es gratuito desde el umbral. */
export function shippingCost(subtotal: number, methodId: ShippingMethodId): number {
  const method = shippingMethods.find((candidate) => candidate.id === methodId);
  if (!method) throw new Error(`Método de envío desconocido: ${methodId}`);
  if (subtotal <= 0) return 0;
  if (methodId === 'standard' && subtotal >= store.freeShippingThreshold) return 0;
  return method.price;
}

/** IVA contenido en un importe con IVA incluido. */
export function includedTax(amount: number, rate: number = store.vatRate): number {
  return Math.round(amount - amount / (1 + rate));
}

export function calculateTotals(lines: { unitPrice: number; quantity: number }[], methodId: ShippingMethodId): OrderTotals {
  const subtotal = lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  const shipping = shippingCost(subtotal, methodId);
  const total = subtotal + shipping;
  return {
    subtotal,
    shipping,
    total,
    taxIncluded: includedTax(total),
    freeShippingApplied: methodId === 'standard' && subtotal >= store.freeShippingThreshold,
  };
}

/** Lo que falta para el envío gratuito (0 si ya se alcanza). */
export function remainingForFreeShipping(subtotal: number): number {
  return Math.max(0, store.freeShippingThreshold - subtotal);
}

export function formatPrice(cents: number, locale: string = store.locale, currency: string = store.currency): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
