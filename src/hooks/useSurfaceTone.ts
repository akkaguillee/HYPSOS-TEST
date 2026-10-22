import { useEffect, useState, type RefObject } from 'react';

export type SurfaceTone = 'light' | 'dark';

/**
 * Tono de la superficie que queda bajo un elemento fijo (la cabecera de cristal), para que su
 * material cambie a la variante clara sobre secciones `[data-theme="light"]`.
 * Mide como máximo una vez por frame al hacer scroll o redimensionar; `key` fuerza otra medida
 * (cambio de página, fin de la intro).
 */
export function useSurfaceTone(ref: RefObject<HTMLElement | null>, key?: unknown): SurfaceTone {
  const [tone, setTone] = useState<SurfaceTone>('dark');

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const box = element.getBoundingClientRect();
      const below = document
        .elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        .find((node) => !element.contains(node));
      setTone(below?.closest('[data-theme]')?.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, [ref, key]);

  return tone;
}
