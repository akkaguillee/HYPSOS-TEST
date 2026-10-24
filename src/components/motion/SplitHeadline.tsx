import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, pressIn, SplitText, useGSAP } from '@/lib/motion';
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
      // La palabra de acento (Aerosoldier) no se trocea: partirla rompería sus ligaduras de
      // rotulista. Cae entera como un sello cuando las letras ya se han prensado.
      const accents = Array.from(element.querySelectorAll<HTMLElement>('.mix-accent'));
      const scrollTrigger = trigger === 'scroll' ? { trigger: element, start: 'top 88%', once: true } : undefined;
      const split = SplitText.create(element, {
        type: 'words,chars',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        autoSplit: true,
        ignore: accents,
        onSplit(self) {
          const tween = pressIn(self.chars, { delay, paused: trigger === 'manual', scrollTrigger });
          if (trigger === 'manual') onReady?.(tween);
          return tween;
        },
      });
      const sealed = accents.length
        ? gsap.fromTo(
            accents,
            { autoAlpha: 0, scale: 1.7, rotation: -16 },
            { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: EASE.stamp, delay: delay + 0.45, stagger: 0.1, paused: trigger === 'manual', scrollTrigger },
          )
        : null;
      return () => {
        sealed?.scrollTrigger?.kill();
        sealed?.revert();
        split.revert();
      };
    },
    { scope: ref, dependencies: [reduced, text], revertOnUpdate: true },
  );

  return (
    <Tag key={text} ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
