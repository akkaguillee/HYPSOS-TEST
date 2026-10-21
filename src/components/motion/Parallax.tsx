import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, useGSAP } from '@/lib/motion';
import { useRef, type ReactNode } from 'react';

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  /** Desplazamiento máximo en % de la altura del elemento. */
  amount?: number;
}

/**
 * Parallax moderado ligado al scroll. El hijo se sobredimensiona para que el
 * encuadre nunca deje huecos. Se reduce en móvil y se desactiva con movimiento reducido.
 */
export function Parallax({ children, className, amount = 8 }: ParallaxProps) {
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !root.current || !inner.current) return;
      const mm = gsap.matchMedia();
      mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' }, (context) => {
        const distance = context.conditions?.desktop ? amount : amount / 2;
        gsap.fromTo(
          inner.current,
          { yPercent: -distance },
          {
            yPercent: distance,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [reduced, amount], revertOnUpdate: true },
  );

  // `className` debe posicionar el contenedor (relative/absolute) y darle altura.
  return (
    <div ref={root} className={className} style={{ overflow: 'hidden' }}>
      <div ref={inner} style={{ position: 'absolute', inset: `-${amount}% 0`, willChange: reduced ? undefined : 'transform' }}>
        {children}
      </div>
    </div>
  );
}
