import { describe, expect, it } from 'vitest';
import { calculateTotals, formatPrice, includedTax, remainingForFreeShipping, shippingCost } from './pricing';

describe('precios y envío', () => {
  it('aplica envío gratuito estándar desde el umbral', () => {
    expect(shippingCost(7999, 'standard')).toBe(495);
    expect(shippingCost(8000, 'standard')).toBe(0);
    expect(shippingCost(8000, 'express')).toBe(995);
    expect(shippingCost(0, 'standard')).toBe(0);
  });

  it('calcula totales e IVA incluido', () => {
    const totals = calculateTotals([{ unitPrice: 3900, quantity: 2 }], 'standard');
    expect(totals).toMatchObject({ subtotal: 7800, shipping: 495, total: 8295, freeShippingApplied: false });
    expect(includedTax(12100)).toBe(2100);
  });

  it('indica lo que falta para el envío gratis', () => {
    expect(remainingForFreeShipping(5000)).toBe(3000);
    expect(remainingForFreeShipping(9000)).toBe(0);
  });

  it('formatea en euros con formato español', () => {
    expect(formatPrice(3900).replace(/\s/g, ' ')).toBe('39,00 €');
    expect(formatPrice(123456).replace(/\s/g, ' ')).toBe('1234,56 €');
  });
});
