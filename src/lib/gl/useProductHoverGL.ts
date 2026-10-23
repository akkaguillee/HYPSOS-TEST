import { useEffect, type RefObject } from 'react';
import { canAttemptHoverGL, holdCssSwap, isHoverPointer } from './capabilities';

export type ProductHoverMode = 'swap' | 'lens';

type HoverModule = typeof import('./product-hover');
let loading: Promise<HoverModule> | null = null;

/** El renderizador WebGL va en su propio chunk: solo se pide en el primer hover real. */
function loadHoverModule(): Promise<HoverModule> {
  loading ??= import('./product-hover').catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

/**
 * Interacción WebGL con el cursor sobre las imágenes de producto (`[data-product-media]` dentro de `ref`).
 * - `swap`: tarjeta. El hover de `ref` pasa de la vista delantera a la trasera con una transición líquida.
 * - `lens`: galería de la ficha. Lupa, estela e inclinación por imagen, sin cambio de vista.
 *
 * Sin puntero fino, con `prefers-reduced-motion`, sin WebGL o hasta que las texturas están listas,
 * no hace nada y se queda el comportamiento CSS. Las <img> nunca se tocan: el lienzo las cubre.
 */
export function useProductHoverGL(ref: RefObject<HTMLElement | null>, { mode }: { mode: ProductHoverMode }): void {
  useEffect(() => {
    const root = ref.current;
    if (!root || !canAttemptHoverGL()) return;
    let detach: (() => void) | null = null;
    let disposed = false;

    const onFirstPointer = (event: PointerEvent) => {
      if (!isHoverPointer(event)) return;
      root.removeEventListener('pointerover', onFirstPointer);
      // Mientras llega el chunk, el fundido CSS espera un instante para que la transición nazca en WebGL.
      if (mode === 'swap') holdCssSwap(root.querySelector('[data-product-media]'));
      loadHoverModule()
        .then((module) => {
          if (!disposed) detach = module.attach(root, { mode, initialEvent: event });
        })
        .catch(() => {
          // Sin el chunk (red, despliegue nuevo…): se queda el comportamiento CSS.
        });
    };

    root.addEventListener('pointerover', onFirstPointer);
    return () => {
      disposed = true;
      root.removeEventListener('pointerover', onFirstPointer);
      detach?.();
    };
  }, [ref, mode]);
}
