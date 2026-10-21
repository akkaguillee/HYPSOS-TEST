import { useEffect, useState } from 'react';

/**
 * Estado del scroll para el header: si se ha desplazado y la dirección.
 * Se actualiza como máximo una vez por frame.
 */
export function useScrollState(threshold = 24) {
  const [state, setState] = useState({ scrolled: false, direction: 'up' as 'up' | 'down' });

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      setState((previous) => {
        const scrolled = y > threshold;
        // Pequeña histéresis para no alternar con micro-desplazamientos.
        const direction = Math.abs(delta) < 6 ? previous.direction : delta > 0 && y > 160 ? 'down' : 'up';
        return previous.scrolled === scrolled && previous.direction === direction ? previous : { scrolled, direction };
      });
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return state;
}
