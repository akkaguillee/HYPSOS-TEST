import { store } from './config';
import type { OrderTotals, ShippingMethod } from './types';

/** Coste de envío de un método para un subtotal (gratuito desde `freeFrom` si existe). */
export function shippingCost(subtotal: number, method: ShippingMethod): number {
  if (subtotal <= 0) return 0;
  if (method.freeFrom !== undefined && subtotal >= method.freeFrom) return 0;
  return method.price;
}

/** IVA contenido en un importe con IVA incluido. */
export function includedTax(amount: number, rate: number = store.vatRate): number {
  return Math.round(amount - amount / (1 + rate));
}

export function calculateTotals(lines: { unitPrice: number; quantity: number }[], method: ShippingMethod | null): OrderTotals {
  const subtotal = lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  const shipping = method ? shippingCost(subtotal, method) : 0;
  const total = subtotal + shipping;
  return {
    subtotal,
    shipping,
    total,
    taxIncluded: includedTax(total),
    freeShippingApplied: Boolean(method && method.price > 0 && shipping === 0 && subtotal > 0),
  };
}

/** Lo que falta para un umbral de envío gratuito (0 si ya se alcanza). */
export function remainingForFreeShipping(subtotal: number, threshold: number): number {
  return Math.max(0, threshold - subtotal);
}

export function formatPrice(cents: number, locale: string = store.locale, currency: string = store.currency): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
