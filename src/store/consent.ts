import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const CONSENT_VERSION = 1;

interface ConsentState {
  /** `null` = el usuario aún no ha decidido. */
  analytics: boolean | null;
  decidedAt: string | null;
  version: number;
  panelOpen: boolean;
  decide: (analytics: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
}

/** Preferencias de cookies/almacenamiento no esencial. Se guardan solo en este navegador. */
export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      analytics: null,
      decidedAt: null,
      version: CONSENT_VERSION,
      panelOpen: false,
      decide: (analytics) => set({ analytics, decidedAt: new Date().toISOString(), version: CONSENT_VERSION, panelOpen: false }),
      openPanel: () => set({ panelOpen: true }),
      closePanel: () => set({ panelOpen: false }),
    }),
    {
      name: 'hypsos-consent',
      version: CONSENT_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ analytics, decidedAt, version }) => ({ analytics, decidedAt, version }),
    },
  ),
);
