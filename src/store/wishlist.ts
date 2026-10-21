import { apiRequest } from '@/lib/api';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WishlistState {
  productIds: string[];
  /** Con sesión iniciada, los favoritos se guardan también en la cuenta. */
  synced: boolean;
  toggle: (productId: string) => boolean;
  has: (productId: string) => boolean;
  remove: (productId: string) => void;
  /** Fusiona los favoritos del dispositivo con los de la cuenta. */
  syncWithAccount: () => Promise<void>;
  detachAccount: () => void;
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => {
      const push = () => {
        if (!get().synced) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
          apiRequest<{ productIds: string[] }>('/account/wishlist', { method: 'PUT', body: { productIds: get().productIds } }).catch(() => {
            // Sin conexión: se conserva en el dispositivo y se reintenta en la próxima sincronización.
          });
        }, 400);
      };
      return {
        productIds: [],
        synced: false,
        toggle: (productId) => {
          const saved = get().productIds.includes(productId);
          set((state) => ({
            productIds: saved ? state.productIds.filter((id) => id !== productId) : [productId, ...state.productIds],
          }));
          push();
          return !saved;
        },
        has: (productId) => get().productIds.includes(productId),
        remove: (productId) => {
          set((state) => ({ productIds: state.productIds.filter((id) => id !== productId) }));
          push();
        },
        syncWithAccount: async () => {
          try {
            const remote = await apiRequest<{ productIds: string[] }>('/account/wishlist');
            const merged = [...new Set([...get().productIds, ...remote.productIds])];
            const saved = await apiRequest<{ productIds: string[] }>('/account/wishlist', { method: 'PUT', body: { productIds: merged } });
            set({ productIds: saved.productIds, synced: true });
          } catch {
            set({ synced: false });
          }
        },
        detachAccount: () => set({ synced: false }),
      };
    },
    {
      name: 'hypsos-wishlist',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ productIds: state.productIds }),
    },
  ),
);
