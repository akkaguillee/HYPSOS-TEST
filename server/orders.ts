import { randomBytes, randomUUID } from 'node:crypto';
import { getProductById, getStock, isVariantValid, variantKey } from '../shared/catalog';
import { store } from '../shared/config';
import { calculateTotals } from '../shared/pricing';
import type { CheckoutRequest } from '../shared/schemas';
import type { OrderTotals } from '../shared/types';
import type { OrderItem, OrderRecord } from './db';

export class CheckoutError extends Error {
  constructor(
    readonly code: 'invalid_variant' | 'out_of_stock' | 'quantity_exceeded',
    message: string,
    readonly details: { productId: string; colorId: string; size: string; available?: number },
  ) {
    super(message);
  }
}

export interface OrderDraft {
  items: OrderItem[];
  totals: OrderTotals;
}

/**
 * Construye el pedido a partir del carrito usando EXCLUSIVAMENTE los datos del catálogo
 * del servidor (precios, nombres y stock). El cliente solo indica qué y cuánto.
 */
export function buildOrderDraft(request: Pick<CheckoutRequest, 'lines' | 'shippingMethod'>): OrderDraft {
  const merged = new Map<string, { productId: string; colorId: string; size: string; quantity: number }>();
  for (const line of request.lines) {
    const key = `${line.productId}|${variantKey(line.colorId, line.size)}`;
    const existing = merged.get(key);
    merged.set(key, { ...line, quantity: (existing?.quantity ?? 0) + line.quantity });
  }

  const items: OrderItem[] = [];
  for (const line of merged.values()) {
    const product = getProductById(line.productId);
    if (!product || !isVariantValid(product, line.colorId, line.size)) {
      throw new CheckoutError('invalid_variant', 'Uno de los productos del carrito ya no está disponible.', line);
    }
    const available = getStock(product, line.colorId, line.size);
    if (available <= 0) {
      throw new CheckoutError('out_of_stock', `${product.name} (${line.size}) se ha agotado.`, { ...line, available });
    }
    if (line.quantity > available || line.quantity > store.maxQuantityPerLine) {
      throw new CheckoutError(
        'quantity_exceeded',
        `Solo quedan ${Math.min(available, store.maxQuantityPerLine)} unidades de ${product.name} (${line.size}).`,
        { ...line, available },
      );
    }
    const color = product.colors.find((candidate) => candidate.id === line.colorId)!;
    items.push({
      productId: product.id,
      code: `${product.code}-${color.id.toUpperCase()}-${line.size}`,
      name: product.name,
      colorId: color.id,
      colorName: color.name,
      size: line.size,
      quantity: line.quantity,
      unitPrice: product.price,
    });
  }

  return { items, totals: calculateTotals(items, request.shippingMethod) };
}

/** Número de pedido legible y difícil de adivinar, p. ej. HYP-MF3K9Q-7C2A. */
export function generateOrderNumber(date = new Date()): string {
  const time = date.getTime().toString(36).toUpperCase().slice(-6);
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `HYP-${time}-${random}`;
}

export function newOrderRecord(
  request: CheckoutRequest,
  draft: OrderDraft,
): Omit<OrderRecord, 'createdAt' | 'updatedAt' | 'paymentSessionId'> {
  return {
    id: randomUUID(),
    number: generateOrderNumber(),
    status: 'pending_payment',
    email: request.email,
    shippingAddress: { ...request.shippingAddress },
    shippingMethod: request.shippingMethod,
    items: draft.items,
    totals: { subtotal: draft.totals.subtotal, shipping: draft.totals.shipping, total: draft.totals.total },
    currency: store.currency,
    marketingOptIn: request.marketingOptIn,
  };
}
