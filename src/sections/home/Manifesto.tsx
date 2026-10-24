import { Scramble } from '@/components/motion/Scramble';
import { manifesto } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, SplitText, useGSAP } from '@/lib/motion';
import { useRef } from 'react';
import styles from './Manifesto.module.css';

/**
 * Manifiesto en banda café (Shelby): la declaración enorme y centrada se «enciende» palabra a
 * palabra al leerla con el scroll (de tinta apagada a blanco, sin desplazamientos), la frase final
 * en rojo y el nombre del movimiento, gigante y cortado por el borde inferior.
 */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const section = root.current;
      const statement = section?.querySelector<HTMLElement>(`.${styles.statement}`);
      if (!section || !statement || reduced) return;
      const split = SplitText.create(statement, { type: 'words', wordsClass: 'split-word', autoSplit: true });
      const tween = gsap.fromTo(
        split.words,
        { color: 'rgb(255 255 255 / 0.18)' },
        {
          color: 'rgb(255 255 255 / 1)',
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 42%', scrub: 0.4 },
        },
      );
      const giant = section.querySelector(`.${styles.giant}`);
      if (giant) {
        gsap.fromTo(giant, { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      }
      return () => {
        tween.scrollTrigger?.kill();
        split.revert();
      };
    },
    { scope: root, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={`section ${styles.section}`} data-theme="dark" aria-labelledby="manifesto-title">
      <div className={`container ${styles.inner}`}>
        <h2 id="manifesto-title" className="eyebrow">
          <Scramble>{manifesto.title}</Scramble>
        </h2>
        <p className={styles.statement}>{manifesto.statement}</p>
        <p className={styles.accent}>{manifesto.accent}</p>
      </div>
      <p className={styles.giant} aria-hidden="true">
        {manifesto.movement}
      </p>
    </section>
  );
}
