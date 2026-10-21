import { apiRequest } from '@/lib/api';
import { store } from '@shared/config';
import type { StockLookup } from '@shared/types';
import { useMemo } from 'react';
import { create } from 'zustand';

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface InventoryState {
  status: Status;
  available: Record<string, number>;
  fetchedAt: number;
  /** Carga el stock en vivo. Sin `force`, reutiliza datos de menos de 30 s. */
  load: (force?: boolean) => Promise<void>;
}

/**
 * Stock disponible en tiempo real (stock − reservas de pagos en curso), servido por la API.
 * Es la única fuente de disponibilidad de la web: el catálogo no contiene existencias.
 */
export const useInventory = create<InventoryState>()((set, get) => ({
  status: 'idle',
  available: {},
  fetchedAt: 0,
  load: async (force = false) => {
    const { status, fetchedAt } = get();
    if (status === 'loading' || (!force && status === 'ready' && Date.now() - fetchedAt < 30_000)) return;
    set({ status: 'loading' });
    try {
      const data = await apiRequest<{ available: Record<string, number> }>('/inventory');
      set({ status: 'ready', available: data.available, fetchedAt: Date.now() });
    } catch {
      set({ status: 'error' });
    }
  },
}));

/** Consulta de stock: solo devuelve un número cuando el dato real está cargado. */
export const liveStock = (state: Pick<InventoryState, 'status' | 'available'>): StockLookup => (id) =>
  state.status === 'ready' ? (state.available[id] ?? 0) : undefined;

/**
 * Consulta "optimista" para listados mientras carga el stock: no marca nada como agotado
 * hasta saberlo. El servidor valida siempre la disponibilidad real al pagar.
 */
export const optimisticStock = (state: Pick<InventoryState, 'status' | 'available'>): StockLookup => (id) =>
  state.status === 'ready' ? (state.available[id] ?? 0) : store.maxQuantityPerLine;

export function useStock() {
  const status = useInventory((state) => state.status);
  const available = useInventory((state) => state.available);
  return useMemo(
    () => ({ status, known: status === 'ready', lookup: optimisticStock({ status, available }), live: liveStock({ status, available }) }),
    [status, available],
  );
}
