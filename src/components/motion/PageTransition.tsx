import { Star } from '@/components/brand/BrandVector';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, ScrollTrigger } from '@/lib/motion';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import styles from './PageTransition.module.css';

/** ¿Este clic debe pasar por la transición? Solo enlaces internos normales a otra página. */
function internalTarget(event: MouseEvent): { href: string; anchor: HTMLAnchorElement } | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!anchor || anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download') || anchor.dataset.noTransition !== undefined) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  const same = url.pathname === window.location.pathname;
  if (same && (url.hash || url.search === window.location.search)) return null;
  return { href: url.pathname + url.search + url.hash, anchor };
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/**
 * Transición entre páginas «iris» (JavaScript + GSAP; sustituye a la navegación instantánea):
 * 1. Cierre: desde el punto exacto del clic se expande un círculo negro que cubre la pantalla; la
 *    estrella de la marca entra girando en el centro.
 * 2. Cambio de ruta mientras todo está cubierto (scroll arriba, foco al contenido).
 * 3. Apertura: un agujero circular se abre desde el centro y descubre la página nueva; la estrella
 *    se encoge dentro del agujero y la página se asienta con un leve acercamiento.
 * Con movimiento reducido no se intercepta nada (navegación normal).
 */
export function PageTransition() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const overlay = useRef<HTMLDivElement>(null);
  const star = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const landed = useRef<() => void>(undefined);

  // La ruta ya está pintada: libera la espera de la apertura.
  useEffect(() => {
    landed.current?.();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (reduced) return;
    const el = overlay.current;
    const mark = star.current;
    if (!el || !mark) return;

    const onClick = async (event: MouseEvent) => {
      const target = internalTarget(event);
      if (!target) return;
      event.preventDefault();
      if (busy.current) return;
      busy.current = true;

      const x = event.clientX || window.innerWidth / 2;
      const y = event.clientY || window.innerHeight / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 40;
      // Solo la primera pieza de la página se asienta (no `main`: un transform ahí movería sus barras fijas).
      const lead = () => document.querySelector('#main > :first-child');

      gsap.killTweensOf([el, mark]);
      gsap.set(el, { visibility: 'visible', clipPath: `circle(0px at ${x}px ${y}px)`, '--hole': '0px' });
      gsap.set(mark, { scale: 0, rotation: -120 });
      await gsap
        .timeline()
        .to(el, { clipPath: `circle(${radius}px at ${x}px ${y}px)`, duration: 0.62, ease: 'expo.in' }, 0)
        .to(mark, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.2)' }, 0.32)
        .then();

      const arrived = new Promise<void>((resolve) => {
        landed.current = resolve;
      });
      await navigate(target.href);
      await Promise.race([arrived, wait(1200)]);
      landed.current = undefined;
      window.scrollTo(0, 0);
      await frames();
      ScrollTrigger.refresh();

      const full = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40;
      gsap.set(el, { clipPath: 'none' });
      await gsap
        .timeline()
        .to(mark, { scale: 0, rotation: 90, duration: 0.45, ease: 'power3.in' }, 0)
        .to(el, { '--hole': `${full}px`, duration: 0.9, ease: 'expo.inOut' }, 0.12)
        .fromTo(lead(), { scale: 1.06 }, { scale: 1, duration: 1.1, ease: 'expo.out', clearProps: 'transform' }, 0.2)
        .then();
      gsap.set(el, { visibility: 'hidden', '--hole': '0px' });
      busy.current = false;
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [reduced, navigate]);

  if (reduced) return null;
  return (
    <div ref={overlay} className={styles.overlay} aria-hidden="true" data-print-hide="">
      <div ref={star} className={styles.star}>
        <Star />
      </div>
    </div>
  );
}
