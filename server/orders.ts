import { randomBytes, randomUUID } from 'node:crypto';
import { getProductById, getStock, isVariantValid, variantId, variantSku } from '../shared/catalog';
import { store } from '../shared/config';
import { calculateTotals } from '../shared/pricing';
import type { CheckoutRequest } from '../shared/schemas';
import type { OrderTotals, ShippingMethod, StockLookup } from '../shared/types';
import type { NewOrder, OrderItem } from './db';

export class CheckoutError extends Error {
  constructor(
    readonly code: 'invalid_variant' | 'out_of_stock' | 'quantity_exceeded' | 'invalid_shipping_method',
    message: string,
    readonly details: { productId?: string; colorId?: string; size?: string; available?: number } = {},
  ) {
    super(message);
  }
}

export interface OrderDraft {
  items: OrderItem[];
  totals: OrderTotals;
  shippingMethod: ShippingMethod;
}

/**
 * Construye el pedido a partir del carrito usando EXCLUSIVAMENTE datos del servidor:
 * precios y nombres del catálogo, stock disponible de la base de datos y tarifas
 * de envío de la configuración. El cliente solo indica qué y cuánto.
 */
export function buildOrderDraft(
  request: Pick<CheckoutRequest, 'lines' | 'shippingMethod'>,
  stock: StockLookup,
  methods: ShippingMethod[],
): OrderDraft {
  const method = methods.find((candidate) => candidate.id === request.shippingMethod);
  if (!method) throw new CheckoutError('invalid_shipping_method', 'Selecciona un método de envío válido.');

  const merged = new Map<string, { productId: string; colorId: string; size: string; quantity: number }>();
  for (const line of request.lines) {
    const key = variantId(line.productId, line.colorId, line.size);
    const existing = merged.get(key);
    merged.set(key, { ...line, quantity: (existing?.quantity ?? 0) + line.quantity });
  }

  const items: OrderItem[] = [];
  for (const line of merged.values()) {
    const product = getProductById(line.productId);
    if (!product || !isVariantValid(product, line.colorId, line.size)) {
      throw new CheckoutError('invalid_variant', 'Uno de los productos del carrito ya no está disponible.', line);
    }
    const available = getStock(product, line.colorId, line.size, stock);
    if (available <= 0) {
      throw new CheckoutError('out_of_stock', `${product.name} (${line.size}) se ha agotado.`, { ...line, available });
    }
    const limit = Math.min(available, store.maxQuantityPerLine);
    if (line.quantity > limit) {
      throw new CheckoutError('quantity_exceeded', `Solo puedes pedir ${limit} unidades de ${product.name} (${line.size}).`, {
        ...line,
        available: limit,
      });
    }
    const color = product.colors.find((candidate) => candidate.id === line.colorId)!;
    items.push({
      productId: product.id,
      variantId: variantId(product.id, color.id, line.size),
      sku: variantSku(product, color.id, line.size),
      name: product.name,
      colorId: color.id,
      colorName: color.name,
      size: line.size,
      quantity: line.quantity,
      unitPrice: product.price,
    });
  }

  return { items, totals: calculateTotals(items, method), shippingMethod: method };
}

/** Número de pedido legible y difícil de adivinar, p. ej. HYP-MF3K9Q-7C2A. */
export function generateOrderNumber(date = new Date()): string {
  const time = date.getTime().toString(36).toUpperCase().slice(-6);
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `HYP-${time}-${random}`;
}

/**
 * Minutos que se mantiene reservado el stock mientras el cliente paga. La sesión de Stripe
 * caduca a los 31 (mínimo permitido: 30); la reserva dura algo más como margen para el webhook.
 */
export const RESERVATION_MINUTES = 35;

export function newOrderRecord(request: CheckoutRequest, draft: OrderDraft, userId: number | null, now = new Date()): NewOrder {
  return {
    id: randomUUID(),
    number: generateOrderNumber(now),
    status: 'pending_payment',
    email: request.email,
    userId,
    checkoutId: request.checkoutId,
    shippingAddress: { ...request.shippingAddress },
    shippingMethod: draft.shippingMethod.id,
    items: draft.items,
    totals: { subtotal: draft.totals.subtotal, shipping: draft.totals.shipping, total: draft.totals.total },
    currency: store.currency,
    marketingOptIn: request.marketingOptIn,
    expiresAt: new Date(now.getTime() + RESERVATION_MINUTES * 60_000).toISOString(),
  };
}

/** Mismo contenido de carrito: permite reutilizar el pedido de un intento repetido. */
export function sameItems(a: OrderItem[], b: OrderItem[]): boolean {
  const key = (items: OrderItem[]) =>
    items
      .map((item) => `${item.variantId}x${item.quantity}`)
      .sort()
      .join('|');
  return key(a) === key(b);
}
