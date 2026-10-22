import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, gsap, useGSAP } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useRef, type ReactNode } from 'react';

interface ImageRevealProps {
  children: ReactNode;
  className?: string;
  /** Dirección por la que se descubre la imagen. */
  from?: 'bottom' | 'left' | 'right';
  /** Paralaje de la imagen dentro del marco (% de su altura); 0 lo desactiva. */
  parallax?: number;
}

const HIDDEN = { bottom: 'inset(100% 0% 0% 0%)', left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)' };

/**
 * Revelado de imagen al entrar en pantalla: el marco se descubre con una máscara y la imagen se
 * asienta desde una escala mayor (una sola vez). Con `parallax`, la imagen se desplaza algo más
 * despacio que la página. Sin efecto con movimiento reducido. El hijo debe llenar el marco.
 */
export function ImageReveal({ children, className, from = 'bottom', parallax = 0 }: ImageRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const frame = root.current;
      if (reduced || !frame) return;
      const inner = frame.firstElementChild as HTMLElement | null;
      gsap.fromTo(
        frame,
        { clipPath: HIDDEN[from] },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: EASE.out, scrollTrigger: { trigger: frame, start: 'top 88%', once: true } },
      );
      if (!inner) return;
      gsap.fromTo(inner, { scale: 1.16 }, { scale: parallax ? 1.08 : 1, duration: 1.6, ease: EASE.out, scrollTrigger: { trigger: frame, start: 'top 88%', once: true } });
      if (parallax) {
        gsap.fromTo(
          inner,
          { yPercent: -parallax / 2 },
          { yPercent: parallax / 2, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
        );
      }
    },
    { scope: root, dependencies: [reduced, from, parallax], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={cn('image-reveal', className)}>
      {children}
    </div>
  );
}
