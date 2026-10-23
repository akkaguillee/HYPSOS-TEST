import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { gsap, useGSAP } from '@/lib/motion';
import { useRef, type ReactNode } from 'react';

interface ImageRevealProps {
  children: ReactNode;
  className?: string;
  /** Se mantiene por compatibilidad: la apertura es siempre desde el centro. */
  from?: 'bottom' | 'left' | 'right';
  /** Paralaje de la imagen dentro del marco (% de su altura); 0 lo desactiva. */
  parallax?: number;
  /** Duración de la apertura en segundos. */
  duration?: number;
}

/**
 * Revelado «apertura»: al entrar en pantalla la foto asoma por una ventana redondeada en el centro
 * del marco, que se abre hasta llenarlo, mientras la imagen se aleja desde un primer plano y se
 * endereza (como una cámara que abre plano). Con `parallax`, la imagen se desplaza después algo más
 * despacio que la página. Sin efecto con movimiento reducido. El hijo debe llenar el marco.
 */
export function ImageReveal({ children, className, parallax = 0, duration = 1.6 }: ImageRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const frame = root.current;
      if (reduced || !frame) return;
      const inner = frame.firstElementChild as HTMLElement | null;
      const radius = getComputedStyle(frame).borderTopLeftRadius || '0px';
      const rest = parallax ? 1.08 : 1;
      const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 85%', once: true } });
      tl.fromTo(
        frame,
        { clipPath: `inset(22% 26% 22% 26% round 48px)` },
        { clipPath: `inset(0% 0% 0% 0% round ${radius})`, duration, ease: 'expo.inOut', clearProps: 'clipPath' },
      );
      if (inner) tl.fromTo(inner, { scale: 1.42, rotation: -2.5 }, { scale: rest, rotation: 0, duration: duration + 0.3, ease: 'expo.inOut' }, 0);
      if (inner && parallax) {
        gsap.fromTo(
          inner,
          { yPercent: -parallax / 2 },
          { yPercent: parallax / 2, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
        );
      }
    },
    { scope: root, dependencies: [reduced, parallax, duration], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={cn('image-reveal', className)}>
      {children}
    </div>
  );
}
