import { Scramble } from '@/components/motion/Scramble';
import { manifesto } from '@/content/campaign';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/motion';
import { useRef } from 'react';
import styles from './Manifesto.module.css';

/**
 * Manifiesto en banda negra (Shelby): la declaración enorme y centrada se «enciende» palabra a
 * palabra al leerla con el scroll (de tinta apagada a blanco, sin desplazamientos) y lo leído se
 * queda encendido; la frase final en rojo y el nombre del movimiento, gigante y cortado por el borde.
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
      // Lo leído no se vuelve a apagar al subir: el avance solo crece. Si la sección ya está por
      // encima al cargar (o se imprime la página), todo aparece encendido.
      const tween = gsap.fromTo(split.words, { color: 'rgb(255 255 255 / 0.22)' }, { color: 'rgb(255 255 255 / 1)', ease: 'none', stagger: 0.1, paused: true });
      const reading = ScrollTrigger.create({
        trigger: statement,
        start: 'top 80%',
        end: 'bottom 45%',
        onUpdate(self) {
          if (self.progress > tween.progress()) gsap.to(tween, { progress: self.progress, duration: 0.3, ease: 'power2.out', overwrite: true });
        },
        onLeave: () => gsap.to(tween, { progress: 1, duration: 0.3, overwrite: true }),
      });
      if (reading.progress === 1 || reading.start < window.scrollY) tween.progress(1);
      const print = () => tween.progress(1);
      window.addEventListener('beforeprint', print);
      const giant = section.querySelector(`.${styles.giant}`);
      if (giant) {
        gsap.fromTo(giant, { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      }
      return () => {
        window.removeEventListener('beforeprint', print);
        reading.kill();
        tween.kill();
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
