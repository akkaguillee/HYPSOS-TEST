import { ApiError, apiRequest } from '@/lib/api';
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
    } catch (error) {
      // Solo un alojamiento sin API se marca como tal; un fallo puntual permite reintentar.
      if (error instanceof ApiError && error.code === 'backend_unavailable') set({ online: false, loaded: true });
      else set({ loaded: false });
    }
  },
}));

/** true solo cuando se sabe con certeza que esta versión de la web no tiene servidor. */
export const useServerOffline = () => useStoreStatus((state) => state.loaded && !state.online);
