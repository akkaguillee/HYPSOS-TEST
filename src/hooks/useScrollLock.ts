import { useEffect } from 'react';

let locks = 0;

/** Bloquea el scroll del documento mientras `active` sea true (admite varios paneles a la vez). */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (locks === 0) {
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      body.style.setProperty('padding-right', scrollbar > 0 ? `${scrollbar}px` : '');
      body.classList.add('is-scroll-locked');
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        body.classList.remove('is-scroll-locked');
        body.style.removeProperty('padding-right');
      }
    };
  }, [active]);
}
