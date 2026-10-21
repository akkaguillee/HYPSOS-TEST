import { create } from 'zustand';

const SESSION_KEY = 'hypsos-intro-seen';

function shouldPlayIntro(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname !== '/') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (navigator.webdriver) return false; // pruebas automatizadas
  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    return false;
  }
}

type Phase = 'intro' | 'revealing' | 'done';

interface IntroState {
  /** `intro`: la intro tapa la página · `revealing`: el telón sube · `done`: sin intro. */
  phase: Phase;
  reveal: () => void;
  finish: () => void;
}

/** La intro se muestra solo en la primera visita de la sesión a la portada. */
export const useIntro = create<IntroState>()((set) => ({
  phase: shouldPlayIntro() ? 'intro' : 'done',
  reveal: () => set({ phase: 'revealing' }),
  finish: () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Almacenamiento no disponible (modo privado estricto): no pasa nada.
    }
    set({ phase: 'done' });
  },
}));
