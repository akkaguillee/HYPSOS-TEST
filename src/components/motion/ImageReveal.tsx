import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion';
import { createSprayReveal } from '@/lib/spray';
import { useRef, type ReactNode } from 'react';

interface ImageRevealProps {
  children: ReactNode;
  className?: string;
  /** Lado por el que empieza a pintarse. */
  from?: 'bottom' | 'left' | 'right';
  /** Paralaje de la imagen dentro del marco (% de su altura); 0 lo desactiva. */
  parallax?: number;
  /** Color que tapa la imagen antes de pintarla. Por defecto, el fondo de la sección (--bg). */
  cover?: string;
  /** Duración del pintado en segundos. */
  duration?: number;
}

let seed = 11;

/**
 * Revelado de imagen a espray: al entrar en pantalla, una boquilla «pinta» la foto en pasadas en
 * zigzag sobre el color del fondo (ver src/lib/spray.ts) mientras la imagen se asienta con un
 * leve empuje de cámara. Con `parallax`, la imagen se desplaza algo más despacio que la página.
 * Sin efecto con movimiento reducido. El hijo debe llenar el marco.
 */
export function ImageReveal({ children, className, from = 'left', parallax = 0, cover, duration }: ImageRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const frame = root.current;
      if (reduced || !frame) return;
      const inner = frame.firstElementChild as HTMLElement | null;
      const color = cover ?? (getComputedStyle(frame).getPropertyValue('--bg').trim() || '#090909');
      const spray = canvas.current ? createSprayReveal(canvas.current, { color, from, duration, seed: seed++ }) : null;
      spray?.cover();
      const push = inner ? gsap.fromTo(inner, { scale: 1.14 }, { scale: parallax ? 1.08 : 1, duration: 1.9, ease: 'expo.out', paused: true }) : null;
      ScrollTrigger.create({
        trigger: frame,
        start: 'top 84%',
        once: true,
        onEnter: () => {
          spray?.timeline.play();
          push?.play();
        },
      });
      if (inner && parallax) {
        gsap.fromTo(
          inner,
          { yPercent: -parallax / 2 },
          { yPercent: parallax / 2, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
        );
      }
      return () => spray?.destroy();
    },
    { scope: root, dependencies: [reduced, from, parallax, cover], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={cn('image-reveal', className)}>
      {children}
      {!reduced && <canvas ref={canvas} className="spray-canvas" aria-hidden="true" />}
    </div>
  );
}
