import { useReducedMotion } from '@/hooks/useMediaQuery';
import { pressIn, SplitText, useGSAP } from '@/lib/motion';
import { useRef, type ElementType, type ReactNode } from 'react';

interface SplitHeadlineProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** `mount`: al montar (cabeceras de página). `scroll`: al entrar en pantalla. `manual`: lo controla el padre. */
  trigger?: 'mount' | 'scroll' | 'manual';
  delay?: number;
  id?: string;
  /** Para animaciones `manual`: recibe la animación creada. */
  onReady?: (animation: gsap.core.Tween) => void;
}

/**
 * Titular «prensado»: cada letra nace aplastada contra la línea base y se estampa a su forma con
 * un rebote (ver `pressIn`). SplitText mantiene la accesibilidad (aria-label en el contenedor) y
 * vuelve a dividir si cambia el ancho o cargan las fuentes.
 */
export function SplitHeadline({ as: Tag = 'h2', className, children, trigger = 'scroll', delay = 0, id, onReady }: SplitHeadlineProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  // SplitText reescribe el DOM del titular y fija su aria-label: si el texto cambia, el elemento
  // se vuelve a montar (key) y se divide de nuevo, para no dejar un nombre accesible obsoleto.
  const text = typeof children === 'string' ? children : '';

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || reduced) return;
      const split = SplitText.create(element, {
        type: 'words,chars',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        autoSplit: true,
        onSplit(self) {
          const tween = pressIn(self.chars, {
            delay,
            paused: trigger === 'manual',
            scrollTrigger: trigger === 'scroll' ? { trigger: element, start: 'top 88%', once: true } : undefined,
          });
          if (trigger === 'manual') onReady?.(tween);
          return tween;
        },
      });
      return () => split.revert();
    },
    { scope: ref, dependencies: [reduced, text], revertOnUpdate: true },
  );

  return (
    <Tag key={text} ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
