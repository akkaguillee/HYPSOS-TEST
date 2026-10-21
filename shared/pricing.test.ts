import { describe, expect, it } from 'vitest';
import { freeShippingThreshold, isShippingConfigured, returnWindowDays, store } from './config';
import { calculateTotals, formatPrice, includedTax, remainingForFreeShipping, shippingCost } from './pricing';
import type { ShippingMethod } from './types';

const standard: ShippingMethod = { id: 'standard', name: 'Estándar', description: '', price: 495, freeFrom: 8000 };
const express: ShippingMethod = { id: 'express', name: 'Exprés', description: '', price: 995 };

describe('precios y envío', () => {
  it('aplica el envío gratuito solo al método que lo define', () => {
    expect(shippingCost(7999, standard)).toBe(495);
    expect(shippingCost(8000, standard)).toBe(0);
    expect(shippingCost(8000, express)).toBe(995);
    expect(shippingCost(0, standard)).toBe(0);
  });

  it('calcula totales e IVA incluido', () => {
    expect(calculateTotals([{ unitPrice: 3900, quantity: 2 }], standard)).toMatchObject({
      subtotal: 7800,
      shipping: 495,
      total: 8295,
      freeShippingApplied: false,
    });
    expect(calculateTotals([{ unitPrice: 3900, quantity: 2 }], null)).toMatchObject({ shipping: 0, total: 7800 });
    expect(includedTax(12100)).toBe(2100);
  });

  it('indica lo que falta para un umbral', () => {
    expect(remainingForFreeShipping(5000, 8000)).toBe(3000);
    expect(remainingForFreeShipping(9000, 8000)).toBe(0);
    expect(freeShippingThreshold([standard, express])).toBe(8000);
    expect(freeShippingThreshold([express])).toBeNull();
  });

  it('no inventa políticas comerciales: envíos sin configurar y plazo legal de devolución', () => {
    expect(isShippingConfigured()).toBe(false);
    expect(freeShippingThreshold()).toBeNull();
    expect(returnWindowDays()).toBe(store.legalWithdrawalDays);
  });

  it('formatea en euros con formato español', () => {
    expect(formatPrice(3900).replace(/\s/g, ' ')).toBe('39,00 €');
    expect(formatPrice(123456).replace(/\s/g, ' ')).toBe('1234,56 €');
  });
});
