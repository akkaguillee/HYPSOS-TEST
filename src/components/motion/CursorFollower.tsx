import { useMediaQuery, useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap } from '@/lib/motion';
import { useEffect, useRef } from 'react';
import styles from './CursorFollower.module.css';

/** Textos del anillo según `data-cursor` del elemento bajo el puntero. */
const LABELS: Record<string, string> = { view: 'Ver', drag: 'Arrastra', play: 'Play' };
const INTERACTIVE = 'a, button, [role="button"], label, summary, select';

/**
 * Anillo que sigue al puntero (sin ocultar el cursor del sistema) y botones magnéticos.
 *
 * - El anillo va con inercia (quickTo) y el punto casi pegado: la diferencia de velocidades da la
 *   sensación de peso. Sobre enlaces se encoge, sobre `[data-cursor]` crece con una etiqueta.
 * - `[data-magnetic]`: el elemento se deja atraer por el puntero y su contenido un poco más
 *   (paralaje interno); al salir vuelve con un rebote elástico.
 *
 * Solo con puntero fino y sin movimiento reducido. Delegación de eventos: cero listeners por elemento.
 */
export function CursorFollower() {
  const fine = useMediaQuery('(hover: hover) and (pointer: fine)');
  const reduced = useReducedMotion();
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const enabled = fine && !reduced;

  useEffect(() => {
    const ringEl = ring.current;
    const dotEl = dot.current;
    const labelEl = label.current;
    if (!enabled || !ringEl || !dotEl || !labelEl) return;

    const ringX = gsap.quickTo(ringEl, 'x', { duration: 0.5, ease: 'power3.out' });
    const ringY = gsap.quickTo(ringEl, 'y', { duration: 0.5, ease: 'power3.out' });
    const dotX = gsap.quickTo(dotEl, 'x', { duration: 0.12, ease: 'power2.out' });
    const dotY = gsap.quickTo(dotEl, 'y', { duration: 0.12, ease: 'power2.out' });
    let shown = false;
    let magnet: HTMLElement | null = null;
    let magnetInner: HTMLElement | null = null;

    const setMode = (mode: 'idle' | 'link' | 'label' | 'hidden', text = '') => {
      ringEl.dataset.mode = mode;
      labelEl.textContent = text;
      gsap.to(ringEl, { scale: mode === 'label' ? 2.3 : mode === 'link' ? 0.55 : mode === 'hidden' ? 0 : 1, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
      gsap.to(dotEl, { scale: mode === 'idle' ? 1 : 0, duration: 0.3, ease: 'expo.out', overwrite: 'auto' });
    };

    const release = () => {
      if (!magnet) return;
      gsap.to(magnet, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      if (magnetInner) gsap.to(magnetInner, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      magnet = magnetInner = null;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        gsap.set([ringEl, dotEl], { x: event.clientX, y: event.clientY });
        ringEl.dataset.on = dotEl.dataset.on = 'true';
      }
      ringX(event.clientX);
      ringY(event.clientY);
      dotX(event.clientX);
      dotY(event.clientY);
      if (magnet) {
        const box = magnet.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        gsap.to(magnet, { x: dx * 0.3, y: dy * 0.4, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
        if (magnetInner) gsap.to(magnetInner, { x: dx * 0.12, y: dy * 0.16, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      }
    };

    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest) return;
      const nextMagnet = target.closest<HTMLElement>('[data-magnetic]');
      if (nextMagnet !== magnet) {
        release();
        magnet = nextMagnet;
        magnetInner = nextMagnet?.firstElementChild instanceof HTMLElement ? nextMagnet.firstElementChild : null;
      }
      const tagged = target.closest<HTMLElement>('[data-cursor]');
      if (tagged) return setMode('label', LABELS[tagged.dataset.cursor ?? ''] ?? '');
      if (target.closest('input, textarea, [contenteditable="true"]')) return setMode('hidden');
      if (target.closest(INTERACTIVE)) return setMode('link');
      setMode('idle');
    };

    const onDown = () => gsap.to(ringEl, { scale: '-=0.2', duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
    const onUp = (event: PointerEvent) => onOver(event);
    const onLeave = () => {
      shown = false;
      delete ringEl.dataset.on;
      delete dotEl.dataset.on;
      release();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      release();
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ring} className={styles.ring} data-mode="idle" aria-hidden="true" data-print-hide="">
        <span ref={label} className={styles.label} />
      </div>
      <div ref={dot} className={styles.dot} aria-hidden="true" />
    </>
  );
}
