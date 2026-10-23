import { Star } from '@/components/brand/BrandVector';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion';
import { Fragment, useRef } from 'react';
import styles from './TapeMarquee.module.css';

export interface TapeItem {
  text: string;
  /** Estilo tipográfico de la pieza: la cinta mezcla comprimida, ancha, gótica y stencil. */
  style: 'crushed' | 'wide' | 'gothic' | 'stencil' | 'script';
}

interface TapeMarqueeProps {
  /** Piezas de la cinta roja (va hacia la izquierda). */
  top: readonly TapeItem[];
  /** Piezas de la cinta negra (va hacia la derecha). */
  bottom: readonly TapeItem[];
  /** Texto para lectores de pantalla (las cintas son decorativas y se repiten). */
  label: string;
  className?: string;
}

const REPEAT = 4;

/**
 * Dos cintas de precinto cruzadas con texto en bucle. Su velocidad la marca el scroll: al bajar
 * rápido aceleran y se inclinan en la dirección del movimiento (skew), al subir invierten el
 * sentido y, al parar, vuelven a su ritmo con un rebote elástico. Con movimiento reducido, quietas.
 */
export function TapeMarquee({ top, bottom, label, className }: TapeMarqueeProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const section = root.current;
      if (!section || reduced) return;
      const tracks = gsap.utils.toArray<HTMLElement>(`.${styles.track}`, section);
      const loops = tracks.map((track, index) =>
        // Cada pista contiene REPEAT copias: desplazar 1/REPEAT del ancho es un ciclo exacto.
        gsap.fromTo(
          track,
          { xPercent: index ? -100 / REPEAT : 0 },
          { xPercent: index ? 0 : -100 / REPEAT, duration: index ? 26 : 22, ease: 'none', repeat: -1 },
        ),
      );
      const skews = tracks.map((track) => gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' }));
      let direction = 1;
      let idle = 0;
      const settle = () => {
        loops.forEach((loop) => gsap.to(loop, { timeScale: direction, duration: 1.2, ease: 'elastic.out(1, 0.45)', overwrite: true }));
        skews.forEach((skew) => skew(0));
      };
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate(self) {
          const velocity = self.getVelocity();
          direction = self.direction;
          const boost = Math.min(Math.abs(velocity) / 350, 7);
          loops.forEach((loop) => gsap.to(loop, { timeScale: direction * (1 + boost), duration: 0.25, ease: 'power2.out', overwrite: true }));
          const skew = gsap.utils.clamp(-12, 12, velocity / -140);
          skews.forEach((set, index) => set(index ? -skew : skew));
          window.clearTimeout(idle);
          idle = window.setTimeout(settle, 120);
        },
      });
      return () => window.clearTimeout(idle);
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  const renderItems = (items: readonly TapeItem[]) =>
    Array.from({ length: REPEAT }, (_, copy) => (
      <Fragment key={copy}>
        {items.map((item, index) => (
          <Fragment key={index}>
            <span className={cn(styles.item, styles[item.style])}>{item.text}</span>
            <Star className={styles.star} />
          </Fragment>
        ))}
      </Fragment>
    ));

  return (
    <div ref={root} className={cn(styles.tapes, className)} role="img" aria-label={label}>
      <div className={cn(styles.tape, styles.red)} aria-hidden="true">
        <div className={styles.track}>{renderItems(top)}</div>
      </div>
      <div className={cn(styles.tape, styles.black)} aria-hidden="true">
        <div className={styles.track}>{renderItems(bottom)}</div>
      </div>
    </div>
  );
}
