import { Wordmark } from '@/components/brand/BrandVector';
import { EASE, gsap, useGSAP } from '@/lib/motion';
import { createSprayReveal } from '@/lib/spray';
import { useIntro } from '@/store/intro';
import { useEffect, useRef } from 'react';
import styles from './IntroLoader.module.css';

/**
 * Intro de marca (~2,4 s): el logotipo se estampa (escala uniforme con golpe, sin deformarlo), la
 * línea roja se traza, «Chapter 01 / Ascent» se decodifica y la marca se cierra como un obturador.
 * Después la pantalla negra se borra a espray (canvas, ver spray.ts) y descubre la portada, que ya
 * está montada debajo. Se puede acelerar con clic o tecla y tiene un límite de seguridad.
 */
export function IntroLoader() {
  const playing = useIntro((state) => state.phase !== 'done');
  const reveal = useIntro((state) => state.reveal);
  const finish = useIntro((state) => state.finish);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!playing || !root.current || !canvas.current) return;
      const q = gsap.utils.selector(root);
      const spray = createSprayReveal(canvas.current, { color: '#090909', duration: 1.2, passes: 5, seed: 3 });
      spray.cover();
      spray.timeline.paused(false);
      const [chapter, movement] = q(`.${styles.meta} span`);
      timeline.current = gsap
        .timeline({ onComplete: finish })
        .set(q(`.${styles.wordmark}`), { visibility: 'visible' }, 0.1)
        .fromTo(q(`.${styles.wordmark}`), { scale: 1.35 }, { scale: 1, duration: 0.6, ease: EASE.slap, immediateRender: false }, 0.1)
        .fromTo(q(`.${styles.line}`), { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: EASE.stroke }, 0.45)
        .to(chapter, { duration: 0.6, scrambleText: { text: 'Chapter 01', chars: '01/\\_▮▯█', speed: 0.7 } }, 0.55)
        .to(movement, { duration: 0.6, scrambleText: { text: 'Ascent', chars: '01/\\_▮▯█', speed: 0.7 } }, 0.65)
        // Obturador: la marca se cierra en una línea antes de que el espray la borre.
        .to(q(`.${styles.mark}`), { clipPath: 'inset(50% 0% 50% 0%)', duration: 0.32, ease: 'power3.in' }, 1.35)
        .set(q(`.${styles.skip}`), { visibility: 'hidden' }, 1.5)
        .call(reveal, [], 1.5)
        .add(spray.timeline, 1.5);
      return () => spray.destroy();
    },
    { scope: root, dependencies: [playing], revertOnUpdate: true },
  );

  useEffect(() => {
    if (!playing) return;
    const skip = () => timeline.current?.timeScale(4);
    const safety = window.setTimeout(() => {
      reveal();
      finish();
    }, 5000);
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      window.clearTimeout(safety);
      window.removeEventListener('keydown', skip);
    };
  }, [playing, reveal, finish]);

  if (!playing) return null;

  return (
    <div ref={root} className={styles.intro} onClick={() => timeline.current?.timeScale(4)} aria-hidden="true">
      <canvas ref={canvas} className={styles.canvas} />
      <div className={styles.mark}>
        <Wordmark className={styles.wordmark} />
        <div className={styles.line} />
        <div className={styles.meta}>
          <span>Chapter 01</span>
          <span>Ascent</span>
        </div>
      </div>
      <span className={styles.skip}>Pulsa para saltar</span>
    </div>
  );
}
