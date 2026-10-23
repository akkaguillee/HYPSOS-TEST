import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion';
import { createPixelReveal } from '@/lib/pixel-reveal';
import { useRef, type ReactNode } from 'react';

interface ImageRevealProps {
  children: ReactNode;
  className?: string;
  /** Se mantiene por compatibilidad (el barrido del mosaico va siempre en diagonal). */
  from?: 'bottom' | 'left' | 'right';
  /** Paralaje de la imagen dentro del marco (% de su altura); 0 lo desactiva. */
  parallax?: number;
  /** Color que tapa la imagen antes de pintarla. Por defecto, el fondo de la sección (--bg). */
  cover?: string;
  /** Duración del revelado en segundos. */
  duration?: number;
}

let seed = 11;

/**
 * Revelado «pixel-resolve»: al entrar en pantalla la foto aparece por baldosas en diagonal, ya
 * pixelada, y se enfoca a saltos hasta quedar nítida (ver src/lib/pixel-reveal.ts). Con
 * `parallax`, la imagen se desplaza algo más despacio que la página. Sin efecto con movimiento
 * reducido. El hijo debe llenar el marco y contener una <img>.
 */
export function ImageReveal({ children, className, parallax = 0, cover, duration }: ImageRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const frame = root.current;
      if (reduced || !frame) return;
      const inner = frame.firstElementChild as HTMLElement | null;
      const img = frame.querySelector('img');
      const color = cover ?? (getComputedStyle(frame).getPropertyValue('--bg').trim() || '#090909');
      const reveal = canvas.current && img ? createPixelReveal(canvas.current, img, { color, duration, seed: seed++ }) : null;
      reveal?.cover();
      if (inner && parallax) gsap.set(inner, { scale: 1.08 });
      ScrollTrigger.create({ trigger: frame, start: 'top 84%', once: true, onEnter: () => void reveal?.play() });
      if (inner && parallax) {
        gsap.fromTo(
          inner,
          { yPercent: -parallax / 2 },
          { yPercent: parallax / 2, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
        );
      }
      return () => reveal?.destroy();
    },
    { scope: root, dependencies: [reduced, parallax, cover], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={cn('image-reveal', className)}>
      {children}
      {!reduced && <canvas ref={canvas} className="reveal-canvas" aria-hidden="true" />}
    </div>
  );
}
