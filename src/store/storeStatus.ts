import { apiRequest } from '@/lib/api';
import { create } from 'zustand';

interface StoreStatus {
  loaded: boolean;
  payments: boolean;
  shipping: boolean;
  email: boolean;
  load: () => Promise<void>;
}

/** Integraciones activas en el servidor: la web no promete pagos, envíos ni emails que no funcionan. */
export const useStoreStatus = create<StoreStatus>()((set, get) => ({
  loaded: false,
  payments: false,
  shipping: false,
  email: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const status = await apiRequest<{ payments: boolean; shipping: boolean; email: boolean }>('/store-status');
      set({ ...status, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
