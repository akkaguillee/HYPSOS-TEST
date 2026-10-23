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
    let retry = 0;
    let attempts = 0;
    const measure = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const box = element.getBoundingClientRect();
      // Oculta (fuera de pantalla) o volviendo a entrar: no hay nada debajo que medir todavía.
      // Se repite hasta que la transición la deja en su sitio; si no, se quedaría el tono viejo.
      if (box.top < 0) {
        window.clearTimeout(retry);
        // Escondida del todo no cambia nada hasta el próximo scroll: se deja de insistir.
        if (attempts++ < 6) retry = window.setTimeout(() => (frame ||= requestAnimationFrame(measure)), 200);
        return;
      }
      attempts = 0;
      const below = document
        .elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        // Se ignora la propia capa fija (cabecera, barra de avisos): interesa lo que queda debajo.
        .find((node) => !element.contains(node) && !node.closest('[data-surface-ignore]'));
      setTone(below?.closest('[data-theme]')?.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    };
    const schedule = () => {
      attempts = 0;
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [ref, key]);

  return tone;
}
