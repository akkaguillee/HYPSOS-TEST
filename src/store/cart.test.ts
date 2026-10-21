import { beforeEach, describe, expect, it } from 'vitest';
import { cartCount, cartSubtotal, lineId, resolveCartLines, useCart } from './cart';

const tee = { productId: 'p-tee-ascenso', colorId: 'negro', size: 'L' };

describe('carrito', () => {
  beforeEach(() => useCart.setState({ lines: [], isOpen: false }));

  it('añade productos y agrupa la misma variante', () => {
    useCart.getState().add({ ...tee, quantity: 1 });
    useCart.getState().add({ ...tee, quantity: 2 });
    const { lines } = useCart.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ id: lineId(tee.productId, tee.colorId, tee.size), quantity: 3 });
  });

  it('no supera el stock disponible', () => {
    // negro:M solo tiene 2 unidades en el catálogo de ejemplo.
    const added = useCart.getState().add({ ...tee, size: 'M', quantity: 5 });
    expect(added).toBe(2);
    expect(useCart.getState().add({ ...tee, size: 'M', quantity: 1 })).toBe(0);
  });

  it('no añade variantes agotadas', () => {
    expect(useCart.getState().add({ productId: 'p-tee-ascenso', colorId: 'blanco', size: 'XS', quantity: 1 })).toBe(0);
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('actualiza cantidades respetando límites y elimina con 0', () => {
    useCart.getState().add({ ...tee, quantity: 1 });
    const id = useCart.getState().lines[0].id;
    useCart.getState().setQuantity(id, 99);
    expect(useCart.getState().lines[0].quantity).toBe(10); // límite por línea
    useCart.getState().setQuantity(id, 0);
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('calcula subtotal y unidades con precios del catálogo', () => {
    useCart.getState().add({ ...tee, quantity: 2 });
    useCart.getState().add({ productId: 'p-hoodie-ascenso', colorId: 'negro', size: 'M', quantity: 1 });
    const resolved = resolveCartLines(useCart.getState().lines);
    expect(cartCount(resolved)).toBe(3);
    expect(cartSubtotal(resolved)).toBe(2 * 3900 + 8900);
  });

  it('descarta líneas de productos que ya no existen', () => {
    useCart.setState({ lines: [{ id: 'x', productId: 'borrado', colorId: 'negro', size: 'M', quantity: 1 }] });
    expect(resolveCartLines(useCart.getState().lines)).toEqual([]);
  });
});
