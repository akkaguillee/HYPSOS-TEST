import { useReducedMotion } from '@/hooks/useMediaQuery';
import { DURATION, EASE, gsap, SplitText, useGSAP } from '@/lib/motion';
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
 * Titular que se revela línea a línea a través de una máscara.
 * SplitText mantiene la accesibilidad (aria-label en el contenedor) y re-divide
 * las líneas si cambia el ancho o cargan las fuentes.
 */
export function SplitHeadline({ as: Tag = 'h2', className, children, trigger = 'scroll', delay = 0, id, onReady }: SplitHeadlineProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || reduced) return;
      const split = SplitText.create(element, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit(self) {
          const tween = gsap.from(self.lines, {
            yPercent: 110,
            duration: DURATION.editorial,
            ease: EASE.out,
            stagger: 0.08,
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
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
