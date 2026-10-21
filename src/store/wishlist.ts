import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WishlistState {
  productIds: string[];
  toggle: (productId: string) => boolean;
  has: (productId: string) => boolean;
  remove: (productId: string) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggle: (productId) => {
        const saved = get().productIds.includes(productId);
        set((state) => ({
          productIds: saved ? state.productIds.filter((id) => id !== productId) : [productId, ...state.productIds],
        }));
        return !saved;
      },
      has: (productId) => get().productIds.includes(productId),
      remove: (productId) => set((state) => ({ productIds: state.productIds.filter((id) => id !== productId) })),
    }),
    { name: 'hypsos-wishlist', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
