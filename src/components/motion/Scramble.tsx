import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { useRef, type ElementType } from 'react';

interface ScrambleProps {
  as?: ElementType;
  children: string;
  className?: string;
  id?: string;
  /** `scroll`: al entrar en pantalla; `mount`: al montar. */
  trigger?: 'scroll' | 'mount';
  delay?: number;
}

/** Caracteres de la decodificación: los del propio sistema de etiquetas (cifras, barras, bloques). */
const CHARS = '01/\\_—▮▯█#ASCENT';

/**
 * Etiqueta técnica que se decodifica: los caracteres giran como en un panel de salidas hasta fijar
 * el texto. Solo para etiquetas cortas en monoespaciada. El texto final es el del DOM (accesible y
 * sin JavaScript); con movimiento reducido no se anima.
 */
export function Scramble({ as: Tag = 'span', children, className, id, trigger = 'scroll', delay = 0 }: ScrambleProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || reduced) return;
      gsap.to(element, {
        duration: Math.min(1.4, 0.5 + children.length * 0.025),
        delay,
        ease: 'none',
        scrambleText: { text: children, chars: CHARS, speed: 0.7, revealDelay: 0.15 },
        scrollTrigger: trigger === 'scroll' ? { trigger: element, start: 'top 92%', once: true } : undefined,
      });
    },
    { scope: ref, dependencies: [reduced, children], revertOnUpdate: true },
  );

  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
