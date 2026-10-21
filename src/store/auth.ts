import { apiRequest } from '@/lib/api';
import { create } from 'zustand';
import { useWishlist } from './wishlist';

export interface AccountUser {
  id: number;
  email: string;
  name: string;
  marketingOptIn: boolean;
  createdAt: string;
}

interface AuthState {
  status: 'unknown' | 'authenticated' | 'anonymous';
  user: AccountUser | null;
  refresh: () => Promise<void>;
  /** Tras registro/login/restablecer: guarda el usuario y sincroniza favoritos. */
  signedIn: (user: AccountUser) => Promise<void>;
  setUser: (user: AccountUser) => void;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  status: 'unknown',
  user: null,
  refresh: async () => {
    try {
      const { user } = await apiRequest<{ user: AccountUser | null }>('/auth/me');
      set({ user, status: user ? 'authenticated' : 'anonymous' });
      if (user) await useWishlist.getState().syncWithAccount();
    } catch {
      set({ user: null, status: 'anonymous' });
    }
  },
  signedIn: async (user) => {
    set({ user, status: 'authenticated' });
    await useWishlist.getState().syncWithAccount();
  },
  setUser: (user) => set({ user }),
  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Aunque el servidor no responda, la sesión se cierra en este dispositivo.
    } finally {
      set({ user: null, status: 'anonymous' });
      useWishlist.getState().detachAccount();
    }
  },
}));
