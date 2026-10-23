import { Wordmark } from '@/components/brand/BrandVector';
import { EASE, gsap, useGSAP } from '@/lib/motion';
import { useIntro } from '@/store/intro';
import { useEffect, useRef } from 'react';
import styles from './IntroLoader.module.css';

/**
 * Intro de marca (~2,2 s): el logotipo se estampa (escala uniforme con golpe, sin deformarlo), la
 * línea roja se traza y «Chapter 01 / Ascent» se decodifica. Después toda la pantalla negra se
 * colapsa sobre la línea roja —como un televisor que se apaga— y la línea se recoge hacia el
 * centro hasta desaparecer, descubriendo la portada, que ya está montada debajo.
 * Se puede acelerar con clic o tecla y tiene un límite de seguridad.
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
      const [chapter, movement] = q(`.${styles.meta} span`);
      timeline.current = gsap
        .timeline({ onComplete: finish })
        .set(q(`.${styles.wordmark}`), { visibility: 'visible' }, 0.1)
        .fromTo(q(`.${styles.wordmark}`), { scale: 1.35 }, { scale: 1, duration: 0.6, ease: EASE.slap, immediateRender: false }, 0.1)
        .fromTo(q(`.${styles.line}`), { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: EASE.stroke }, 0.45)
        .to(chapter, { duration: 0.6, scrambleText: { text: 'Chapter 01', chars: '01/\\_▮▯█', speed: 0.7 } }, 0.55)
        .to(movement, { duration: 0.6, scrambleText: { text: 'Ascent', chars: '01/\\_▮▯█', speed: 0.7 } }, 0.65)
        .set(q(`.${styles.skip}`), { visibility: 'hidden' }, 1.3)
        // La marca se cierra como un obturador y la pantalla se colapsa en una línea roja.
        .to(q(`.${styles.mark}`), { clipPath: 'inset(50% 0% 50% 0%)', duration: 0.3, ease: 'power3.in' }, 1.3)
        .call(reveal, [], 1.45)
        // fromTo con los cuatro valores explícitos: el navegador abrevia `inset(0%)` y GSAP solo
        // interpolaría el primero.
        .fromTo(root.current, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(49.8% 0% 49.8% 0%)', duration: 0.5, ease: 'expo.inOut', immediateRender: false }, 1.45)
        .to(root.current, { backgroundColor: '#d71920', duration: 0.14, ease: 'none' }, 1.82)
        .fromTo(root.current, { clipPath: 'inset(49.8% 0% 49.8% 0%)' }, { clipPath: 'inset(49.8% 50% 49.8% 50%)', duration: 0.42, ease: 'expo.in', immediateRender: false }, 1.95);
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
