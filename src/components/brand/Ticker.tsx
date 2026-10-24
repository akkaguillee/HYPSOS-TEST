import { Star } from '@/components/brand/BrandVector';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion';
import { Fragment, useRef } from 'react';
import styles from './Ticker.module.css';

interface TickerProps {
  /** Frases de la banda (se repiten en bucle, separadas por la estrella de la marca). */
  items: readonly string[];
  /** Texto para lectores de pantalla (la banda es decorativa y se repite). */
  label: string;
  /** Color de la banda: rojo (señal) o verde (recibo). */
  tone?: 'red' | 'lime' | 'coffee';
  className?: string;
}

const REPEAT = 4;

/**
 * Banda de texto a sangre (como el ticker de Cake o las cabeceras de sección de Shelby): recta,
 * plana y en bucle. El scroll la acelera en su dirección y, al parar, vuelve a su ritmo con un
 * rebote suave. Con movimiento reducido, quieta.
 */
export function Ticker({ items, label, tone = 'red', className }: TickerProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const band = root.current;
      if (!band || reduced) return;
      const track = band.querySelector<HTMLElement>(`.${styles.track}`);
      if (!track) return;
      // La pista contiene REPEAT copias: desplazar 1/REPEAT del ancho es un ciclo exacto.
      const loop = gsap.fromTo(track, { xPercent: 0 }, { xPercent: -100 / REPEAT, duration: 28, ease: 'none', repeat: -1 });
      let direction = 1;
      let idle = 0;
      const settle = () => gsap.to(loop, { timeScale: direction, duration: 1.1, ease: 'power3.out', overwrite: true });
      ScrollTrigger.create({
        trigger: band,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate(self) {
          direction = self.direction;
          const boost = Math.min(Math.abs(self.getVelocity()) / 400, 6);
          gsap.to(loop, { timeScale: direction * (1 + boost), duration: 0.25, ease: 'power2.out', overwrite: true });
          window.clearTimeout(idle);
          idle = window.setTimeout(settle, 120);
        },
      });
      return () => window.clearTimeout(idle);
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={cn(styles.band, styles[tone], className)} role="img" aria-label={label}>
      <div className={styles.track} aria-hidden="true">
        {Array.from({ length: REPEAT }, (_, copy) => (
          <Fragment key={copy}>
            {items.map((item, index) => (
              <Fragment key={index}>
                <span className={styles.item}>{item}</span>
                <Star className={styles.star} />
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
