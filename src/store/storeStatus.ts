import { apiRequest } from '@/lib/api';
import { create } from 'zustand';

interface StoreStatus {
  loaded: boolean;
  /** La API responde (false en un despliegue solo estático: sin pedidos, cuentas ni formularios). */
  online: boolean;
  payments: boolean;
  shipping: boolean;
  email: boolean;
  load: () => Promise<void>;
}

/** Integraciones activas en el servidor: la web no promete pagos, envíos ni emails que no funcionan. */
export const useStoreStatus = create<StoreStatus>()((set, get) => ({
  loaded: false,
  online: false,
  payments: false,
  shipping: false,
  email: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const status = await apiRequest<Record<string, unknown>>('/store-status');
      set({ online: true, payments: status.payments === true, shipping: status.shipping === true, email: status.email === true, loaded: true });
    } catch {
      set({ online: false, loaded: true });
    }
  },
}));
