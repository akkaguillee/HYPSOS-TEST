import type { LensControl } from '@/components/ui/LiquidGlass';
import { gsap, prefersReducedMotion } from '@/lib/motion';
import { useEffect, type RefObject } from 'react';

/** Velocidad de scroll (px/s) a la que la lente llega a su máxima deformación. */
const FULL_SPEED = 2400;
/** Refracción extra a velocidad máxima (1.3 = +130 %). */
const MAX_EXTRA = 1.3;

/**
 * La lente de cristal se comporta como una gota: al hacer scroll se «carga» según la velocidad
 * (refracta más) y al parar vuelve a su forma con un rebote elástico amortiguado, como el agua.
 * Solo reescala el filtro SVG (sin re-render de React). Desactivado con reduced-motion.
 */
export function useLiquidWobble(lens: RefObject<LensControl | null>) {
  useEffect(() => {
    const control = lens.current;
    if (prefersReducedMotion() || !control) return;
    const state = { boost: 1 };
    const apply = () => control.setBoost(state.boost);
    let lastY = window.scrollY;
    let lastT = performance.now();
    let idle = 0;

    const settle = () => gsap.to(state, { boost: 1, duration: 1.6, ease: 'elastic.out(1, 0.28)', onUpdate: apply, overwrite: true });

    const onScroll = () => {
      const now = performance.now();
      const speed = (Math.abs(window.scrollY - lastY) / Math.max(16, now - lastT)) * 1000;
      lastY = window.scrollY;
      lastT = now;
      const target = 1 + Math.min(speed / FULL_SPEED, 1) * MAX_EXTRA;
      gsap.to(state, { boost: target, duration: 0.3, ease: 'power2.out', onUpdate: apply, overwrite: true });
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, 90);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(idle);
      gsap.killTweensOf(state);
      control.setBoost(1);
    };
  }, [lens]);
}
