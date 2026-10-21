import { getProductById, getStock } from '@shared/catalog';
import { store } from '@shared/config';
import type { Product, StockLookup } from '@shared/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { optimisticStock, useInventory } from './inventory';

export interface CartLine {
  /** `${productId}:${colorId}:${size}` */
  id: string;
  productId: string;
  colorId: string;
  size: string;
  quantity: number;
}

export interface ResolvedCartLine extends CartLine {
  product: Product;
  colorName: string;
  colorHex: string;
  unitPrice: number;
  lineTotal: number;
  /** Máximo que se puede pedir (stock y límite por línea). */
  maxQuantity: number;
}

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  /** Añade unidades; devuelve las realmente añadidas (limitadas por stock). */
  add: (input: Omit<CartLine, 'id'>) => number;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

export const lineId = (productId: string, colorId: string, size: string) => `${productId}:${colorId}:${size}`;

/** Máximo pedible de una variante según el stock en vivo (el servidor lo vuelve a comprobar al pagar). */
function maxFor(productId: string, colorId: string, size: string): number {
  const product = getProductById(productId);
  if (!product) return 0;
  return Math.min(getStock(product, colorId, size, optimisticStock(useInventory.getState())), store.maxQuantityPerLine);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      add: ({ productId, colorId, size, quantity }) => {
        const id = lineId(productId, colorId, size);
        const max = maxFor(productId, colorId, size);
        const existing = get().lines.find((line) => line.id === id);
        const current = existing?.quantity ?? 0;
        const next = Math.min(current + quantity, max);
        const added = Math.max(0, next - current);
        if (added === 0) return 0;
        set((state) => ({
          lines: existing
            ? state.lines.map((line) => (line.id === id ? { ...line, quantity: next } : line))
            : [...state.lines, { id, productId, colorId, size, quantity: next }],
        }));
        return added;
      },
      setQuantity: (id, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((line) =>
              line.id === id
                ? { ...line, quantity: Math.min(Math.max(0, Math.round(quantity)), maxFor(line.productId, line.colorId, line.size)) }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),
      remove: (id) => set((state) => ({ lines: state.lines.filter((line) => line.id !== id) })),
      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: 'hypsos-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

/** Enriquece las líneas con datos actuales del catálogo y del stock, y descarta las que ya no existen. */
export function resolveCartLines(lines: CartLine[], stock: StockLookup): ResolvedCartLine[] {
  return lines.flatMap((line) => {
    const product = getProductById(line.productId);
    const color = product?.colors.find((candidate) => candidate.id === line.colorId);
    if (!product || !color || !product.sizes.includes(line.size)) return [];
    const maxQuantity = Math.min(getStock(product, line.colorId, line.size, stock), store.maxQuantityPerLine);
    return [
      {
        ...line,
        product,
        colorName: color.name,
        colorHex: color.hex,
        unitPrice: product.price,
        lineTotal: product.price * line.quantity,
        maxQuantity,
      },
    ];
  });
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function cartSubtotal(lines: ResolvedCartLine[]): number {
  return lines.reduce((total, line) => total + line.lineTotal, 0);
}
