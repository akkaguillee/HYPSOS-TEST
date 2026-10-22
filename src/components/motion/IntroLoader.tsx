import { Wordmark } from '@/components/brand/BrandVector';
import { EASE, gsap, useGSAP } from '@/lib/motion';
import { useIntro } from '@/store/intro';
import { useEffect, useRef } from 'react';
import styles from './IntroLoader.module.css';

/**
 * Intro de marca (~1,6 s): el logotipo se revela, la línea roja lo subraya y el
 * telón sube. No bloquea la carga (la página se monta debajo), se puede saltar
 * con clic o tecla y tiene un límite de seguridad para no quedarse nunca en negro.
 */
export function IntroLoader() {
  const playing = useIntro((state) => state.phase !== 'done');
  const reveal = useIntro((state) => state.reveal);
  const finish = useIntro((state) => state.finish);
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!playing || !root.current) return;
      const q = gsap.utils.selector(root);
      timeline.current = gsap
        .timeline({ onComplete: finish })
        .to(q(`.${styles.wordmark}`), { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: EASE.out }, 0.1)
        .to(q(`.${styles.line}`), { scaleX: 1, duration: 0.6, ease: EASE.out }, 0.45)
        .to(q(`.${styles.meta}`), { opacity: 1, duration: 0.4 }, 0.6)
        .call(reveal, [], 1.2)
        .to(root.current, { yPercent: -100, duration: 0.8, ease: EASE.inOut }, 1.25);
    },
    { scope: root, dependencies: [playing], revertOnUpdate: true },
  );

  useEffect(() => {
    if (!playing) return;
    const skip = () => timeline.current?.timeScale(4);
    const safety = window.setTimeout(() => {
      reveal();
      finish();
    }, 4000);
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      window.clearTimeout(safety);
      window.removeEventListener('keydown', skip);
    };
  }, [playing, reveal, finish]);

  if (!playing) return null;

  return (
    <div ref={root} className={styles.intro} onClick={() => timeline.current?.timeScale(4)} aria-hidden="true">
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
