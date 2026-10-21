import { create } from 'zustand';

type Panel = 'menu' | 'search' | null;

interface UiState {
  panel: Panel;
  /** Mensaje para lectores de pantalla (región aria-live global). */
  announcement: string;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
  announce: (message: string) => void;
}

export const useUi = create<UiState>()((set) => ({
  panel: null,
  announcement: '',
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
  // Se vacía primero para que el mismo mensaje repetido vuelva a anunciarse.
  announce: (message) => {
    set({ announcement: '' });
    requestAnimationFrame(() => set({ announcement: message }));
  },
}));
